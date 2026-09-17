/**
 * Server-side reads that Next.js can actually cache.
 *
 * The existing server helpers (`libs/query/server-api-client.ts`, `libs/api/serverAPI.ts`) use
 * axios, which Next cannot see: every render re-hit Main-server, and nothing could be purged by
 * tag. This module is the cacheable path — plain `fetch` with `next: { revalidate, tags }` — and
 * it is what every statically-rendered page should use.
 *
 * Three things here are load-bearing and easy to get wrong:
 *
 * 1. **Headers are part of the Data Cache key.** `serverAPI` attaches a random `X-Request-ID` per
 *    request, so a cached entry could never be hit again. We send `Accept` only.
 *
 * 2. **Failures throw.** Every other helper in this codebase returns `null`/`[]` on error, which
 *    was harmless while pages rendered per request. Under ISR a swallowed error would be baked
 *    into a page and served for the next 12 hours. Throwing means Next keeps serving the last good
 *    render instead. Callers that legitimately expect a miss (a deleted product) use
 *    `cachedGetOrNull`, which only absorbs 404.
 *
 * 3. **`AbortSignal.timeout` opts a fetch out of React's request memoization**, so two components
 *    asking for the same product in one render would fetch twice. `memoFetch` below is wrapped in
 *    `React.cache` keyed on the final URL, which restores the dedupe. (Next strips the signal when
 *    it revalidates in the background, so a slow refresh can't be killed mid-flight.)
 *
 * This file is server-only — it has no 'server-only' import because the package isn't installed,
 * so don't import it from a 'use client' module.
 */
import { cache } from 'react';
import axios from 'axios';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { DEFAULT_REVALIDATE } from './cacheTags';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Used only to turn `(path, params)` into a URL. It is a bare axios instance — no interceptors,
 * no auth — so that query strings serialise exactly as the client hooks produce them
 * (`sort[]=newest`) and a server-seeded react-query entry lines up with the client's own fetch.
 */
const urlBuilder = axios.create({ baseURL: API_URL });

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    message?: string
  ) {
    super(message ?? `API ${status} for ${url}`);
    this.name = 'ApiError';
  }
}

export interface CachedResult<T> {
  data: T;
  /** Pagination/aggregate block when the endpoint sends one. */
  meta: Record<string, unknown> | null;
  /** When the upstream response was produced — survives Data Cache hits, so it is the real age. */
  fetchedAt: number;
}

export interface CachedGetOptions {
  params?: Record<string, unknown>;
  /** Tags Main-server can purge; see `cacheTags.ts`. */
  tags?: readonly string[];
  /** Seconds. Defaults to 12h. `0` means never cache. */
  revalidate?: number;
}

interface RawResult {
  status: number;
  body: { data?: unknown; meta?: Record<string, unknown>; message?: string } | null;
  fetchedAt: number;
}

/**
 * The single cacheable fetch. Arguments are all primitives so `React.cache` can key on them.
 * Non-OK responses are returned rather than thrown so that a 404 is cached too — otherwise every
 * hit on a deleted product's URL would reach Main-server.
 */
const memoFetch = cache(async (url: string, tagsKey: string, revalidate: number): Promise<RawResult> => {
  const tags = tagsKey ? tagsKey.split(',') : [];
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: revalidate === 0 ? { revalidate: 0 } : { revalidate, tags },
    });
  } catch (error) {
    // Network failure or timeout. Nothing is cached, and the caller decides whether to fail the
    // render (ISR keeps the previous page) or fall back.
    throw new ApiError(0, url, `Request to ${url} failed: ${(error as Error).message}`);
  }

  const fetchedAt = Date.parse(response.headers.get('date') ?? '') || Date.now();
  let body: RawResult['body'] = null;
  try {
    body = (await response.json()) as RawResult['body'];
  } catch {
    body = null;
  }
  return { status: response.status, body, fetchedAt };
});

/** Absolute URL for `path` with `params`, serialised the way the client's axios does it. */
export const apiUrl = (path: string, params?: Record<string, unknown>): string =>
  urlBuilder.getUri({ url: path, params });

/**
 * Cached GET. Throws `ApiError` on any non-2xx or on a network failure — see the note at the top
 * of this file about why that matters under ISR.
 */
export async function cachedGet<T>(path: string, options: CachedGetOptions = {}): Promise<CachedResult<T>> {
  const { params, tags = [], revalidate = DEFAULT_REVALIDATE } = options;
  const url = apiUrl(path, params);
  const { status, body, fetchedAt } = await memoFetch(url, tags.join(','), revalidate);

  if (status < 200 || status >= 300) {
    throw new ApiError(status, url, typeof body?.message === 'string' ? body.message : undefined);
  }
  return { data: body?.data as T, meta: body?.meta ?? null, fetchedAt };
}

/** Same, but a 404 (the record genuinely isn't there) returns null instead of throwing. */
export async function cachedGetOrNull<T>(
  path: string,
  options: CachedGetOptions = {}
): Promise<CachedResult<T> | null> {
  try {
    return await cachedGet<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * Cached GET that falls back instead of failing the render. Only for data a page can honestly do
 * without (a secondary rail, an optional block) — never for the page's subject.
 */
export async function cachedGetSafe<T>(
  path: string,
  fallback: T,
  options: CachedGetOptions = {}
): Promise<CachedResult<T>> {
  try {
    const result = await cachedGet<T>(path, options);
    return result.data === undefined || result.data === null ? { ...result, data: fallback } : result;
  } catch (error) {
    console.error(`[cachedApi] ${path} failed, using fallback:`, (error as Error).message);
    return { data: fallback, meta: null, fetchedAt: Date.now() };
  }
}

/**
 * Writes a server result into the react-query cache under the key the client hook uses, stamped
 * with the data's real age. Without `updatedAt` the client would treat 12-hour-old cached HTML as
 * freshly fetched and skip its background refresh.
 */
export function seedData<T>(queryClient: QueryClient, key: QueryKey, result: CachedResult<T>): void {
  queryClient.setQueryData(key, result.data, { updatedAt: result.fetchedAt });
}

/** Same, for hooks whose cached value is the `{ data, meta }` envelope (the listing hooks). */
export function seedWithMeta<T>(
  queryClient: QueryClient,
  key: QueryKey,
  result: CachedResult<T>,
  fallbackMeta: Record<string, unknown>
): void {
  queryClient.setQueryData(key, { data: result.data, meta: result.meta ?? fallbackMeta }, { updatedAt: result.fetchedAt });
}
