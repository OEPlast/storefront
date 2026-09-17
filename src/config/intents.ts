/**
 * Programmatic intent landing pages (Phase 5 — CONSERVATIVE).
 *
 * Each intent becomes an indexable `/shop/<slug>` page targeting a specific
 * "I need X" search intent (category x attribute x price x use-case).
 *
 * Intents are managed in the admin panel (Marketing → Intent Shops) and stored
 * in MongoDB; this module is the storefront's read side. Only `active` intents
 * are ever returned — the backend filters drafts out.
 *
 * These are curated, NOT mass-generated: a page also has to clear MIN_PRODUCTS
 * in the route before it renders, or thin variants become doorway pages that
 * hurt the whole domain.
 */

import { cachedGet, cachedGetOrNull } from '@/libs/api/cachedApi';
import { CacheTag, intentTag } from '@/libs/api/cacheTags';
import api from '@/libs/api/endpoints';

/**
 * A product as curated onto an intent page. The backend populates these from
 * the stored id list and drops any that are no longer active, so what arrives
 * here is always renderable.
 */
export interface IntentProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  stock?: number;
  description_images?: Array<{ url: string; cover_image?: boolean }>;
  images?: Array<{ url: string; cover_image?: boolean }>;
}

export interface IntentConfig {
  slug: string;
  /** Page <h1>. */
  heading: string;
  /** <title> (brand appended by template). */
  title: string;
  /** Meta description + intro copy. */
  description: string;
  keywords: string[];
  /** Optional longer intro paragraph rendered above the grid. */
  intro?: string;
  /** Hand-picked products in admin-defined display order. */
  products: IntentProduct[];
  faqs?: Array<{ question: string; answer: string }>;
  updatedAt?: string;
}

export interface IntentSlugItem {
  slug: string;
  updatedAt?: string;
}

/**
 * All published intents. Used by `generateStaticParams`.
 * Returns [] on failure so a backend blip degrades to "no intent pages" rather
 * than failing the whole build.
 */
export async function getAllIntents(): Promise<IntentConfig[]> {
  try {
    const { data } = await cachedGet<IntentConfig[]>(api.intents.list, {
      tags: [CacheTag.INTENTS, CacheTag.PRODUCTS],
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[intents] list fetch failed:', error);
    return [];
  }
}

/**
 * Published intent slugs + lastmod, for the sitemap.
 */
export async function getAllIntentSlugs(): Promise<IntentSlugItem[]> {
  try {
    const { data } = await cachedGet<IntentSlugItem[]>(api.intents.slugs, {
      tags: [CacheTag.INTENTS],
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[intents] slugs fetch failed:', error);
    return [];
  }
}

/**
 * A single published intent, or undefined for unknown/draft/inactive slugs (the backend 404s
 * those). Any other failure throws on purpose: the page is cached for 12 hours, so swallowing a
 * 500 here would serve a `notFound()` for a real intent page until the next purge.
 *
 * Tagged with `products` as well as its own slug, because the curated products (names, prices,
 * stock) are embedded in this payload.
 */
export async function getIntent(slug: string): Promise<IntentConfig | undefined> {
  const result = await cachedGetOrNull<IntentConfig>(api.intents.bySlug(slug), {
    tags: [intentTag(slug), CacheTag.INTENTS, CacheTag.PRODUCTS],
  });
  return result?.data || undefined;
}
