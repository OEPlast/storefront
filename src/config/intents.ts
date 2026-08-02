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

import { serverAPI } from '@/libs/api/serverAPI';
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
    const res = await serverAPI.get<IntentConfig[]>(api.intents.list);
    return Array.isArray(res.data) ? res.data : [];
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
    const res = await serverAPI.get<IntentSlugItem[]>(api.intents.slugs);
    return Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error('[intents] slugs fetch failed:', error);
    return [];
  }
}

/**
 * A single published intent, or undefined for unknown/draft/inactive slugs
 * (the backend 404s those, which surfaces here as a thrown request error).
 */
export async function getIntent(slug: string): Promise<IntentConfig | undefined> {
  try {
    const res = await serverAPI.get<IntentConfig>(api.intents.bySlug(slug));
    return res.data || undefined;
  } catch {
    return undefined;
  }
}
