import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { cachedGet, seedWithMeta, type CachedResult } from '@/libs/api/cachedApi';

/**
 * Listing pages (categories, campaigns, New Arrivals, Top Sold, Top This Week) render their product
 * grid in a client component that fetches with react-query. Without a server-side copy of that
 * query, the HTML a crawler receives holds a "Loading…" state and no product links: Google indexed
 * those pages with snippets built from the footer, and cached an empty "No products found" state for
 * some of them.
 *
 * This fetches the first view on the server and writes it into the query cache under the exact key
 * the client hook uses, so the client component renders real products during SSR and hydrates
 * without refetching.
 *
 * The key only matches when the URL carries no filters (see `hasFacetParams`), which is also the
 * only case worth indexing: filtered URLs are `noindex` via libs/indexation.ts and fetch on the
 * client as before.
 *
 * Listing *pages* stay dynamically rendered — they read `?page`/`?sort` to decide their canonical
 * and robots tags — but these fetches go through `cachedGet`, so the API response behind them is
 * shared by every visitor and purged by tag when a product changes.
 */

export type ListingSearchParams = Record<string, string | string[] | undefined> | undefined;

/** Params the listing clients treat as view state rather than filters. */
const VIEW_PARAMS = new Set(['page', 'sort']);

export const hasFacetParams = (searchParams: ListingSearchParams): boolean =>
  Object.entries(searchParams ?? {}).some(([key, value]) => !VIEW_PARAMS.has(key) && value !== undefined && value !== '');

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Upper bound on `?page`. Every distinct page number is its own Data Cache entry, so an unbounded
 * value lets a crawler (or anyone) mint entries by walking `?page=99999`. No real listing here is
 * anywhere near this deep.
 */
const MAX_LISTING_PAGE = 500;

/** Same page parsing the clients use: `page` from the URL, defaulting to 1, capped. */
export const listingPage = (searchParams: ListingSearchParams): number => {
  const parsed = parseInt(first(searchParams?.page) || '1', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_LISTING_PAGE);
};

const SORT_OPTIONS = ['alphabetical', 'newest', 'price_asc', 'price_desc', 'popular', 'stock', 'order_frequency', 'rating'];

/** Same sort validation the clients use, with each page's own default. */
export const listingSort = (searchParams: ListingSearchParams, fallback: string): string => {
  const value = first(searchParams?.sort);
  return value && SORT_OPTIONS.includes(value) ? value : fallback;
};

export interface SeededListing<T> {
  data: T;
  meta: Record<string, unknown> | null;
}

/**
 * Fetches `url` with `params` (serialised exactly as the client's `apiClient` does) and seeds the
 * cache. Returns the response, or null when the API call failed — the page then renders and the
 * client fetches, as it did before.
 *
 * Failure is swallowed here, unlike everywhere else that uses `cachedGet`. That is deliberate:
 * these pages are rendered per request, so a degraded render isn't frozen into a cache entry, and
 * a listing that briefly falls back to client-side fetching beats a 500.
 */
export async function seedListing<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  url: string,
  params: Record<string, unknown>,
  fallbackMeta: Record<string, unknown>,
  tags: readonly string[] = []
): Promise<SeededListing<T> | null> {
  try {
    const result: CachedResult<T> = await cachedGet<T>(url, { params, tags });
    if (!result.data) return null;
    seedWithMeta(queryClient, queryKey, result, fallbackMeta);
    return { data: result.data, meta: result.meta ?? fallbackMeta };
  } catch (error) {
    console.error(`[seedListing] ${url} failed:`, error);
    return null;
  }
}

/**
 * True when the listing's first page has no products, so a page can `noindex` itself while empty
 * (e.g. Top of the Week with no sales in the last 7 days). A failed call counts as not empty: an
 * outage should never deindex a page.
 */
export async function isListingEmpty(
  url: string,
  params: Record<string, unknown> = {},
  tags: readonly string[] = []
): Promise<boolean> {
  try {
    const { meta } = await cachedGet<unknown>(url, { params: { ...params, page: 1, limit: 1 }, tags });
    return (meta as { total?: number } | null)?.total === 0;
  } catch {
    return false;
  }
}
