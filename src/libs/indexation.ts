import type { Metadata } from 'next';

/**
 * Faceted-navigation + pagination indexation policy — the e-commerce crawl-budget
 * guardrail. Given a clean base path and the current searchParams, decide:
 *   - whether the URL should be indexed, and
 *   - its canonical URL.
 *
 * Rules:
 *   - No params            → index, self-canonical (clean path).
 *   - Only `page` (>1)     → index, self-referential canonical INCLUDING the page
 *                            (so deep products stay discoverable — we do NOT
 *                            canonical everything to page 1).
 *   - Any filter/sort facet → noindex,follow + canonical to the CLEAN base path
 *                            (consolidates infinite facet combinations).
 *
 * `follow` stays true everywhere so link equity keeps flowing to products.
 */

export type ListingSearchParams = Record<string, string | string[] | undefined> | undefined;

// Params that create indexable pagination (kept in canonical).
const PAGINATION_PARAMS = new Set(['page']);

// Everything else that appears is treated as a faceting/sort param → noindex.
// (Explicit list documents intent; anything unknown also triggers noindex.)
const FACET_PARAMS = new Set([
  'minPrice',
  'maxPrice',
  'inStock',
  'availability',
  'sort',
  'sortBy',
  'sortOrder',
  'attributes',
  'specs',
  'tags',
  'packSize',
  'brand',
  'subcategory',
  'view',
  'query',
  'q',
]);

function hasFacetParams(sp: ListingSearchParams): boolean {
  if (!sp) return false;
  return Object.keys(sp).some((key) => {
    const val = sp[key];
    const present = Array.isArray(val) ? val.length > 0 : val !== undefined && val !== '';
    if (!present) return false;
    // `page=1` is not a facet and not worth a param at all.
    if (key === 'page') return false;
    return FACET_PARAMS.has(key) || !PAGINATION_PARAMS.has(key);
  });
}

function getPage(sp: ListingSearchParams): number {
  if (!sp) return 1;
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const n = raw ? parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n > 1 ? n : 1;
}

export interface ListingIndexation {
  index: boolean;
  canonicalPath: string;
  robots: NonNullable<Metadata['robots']>;
  alternates: NonNullable<Metadata['alternates']>;
}

/**
 * @param basePath  Clean listing path WITHOUT query, e.g. `/category/office-chairs`.
 * @param sp        The route's resolved searchParams.
 */
export function getListingIndexation(
  basePath: string,
  sp: ListingSearchParams
): ListingIndexation {
  const facets = hasFacetParams(sp);
  const page = getPage(sp);

  // Canonical: clean base, plus ?page=N when on a real paginated page with no facets.
  let canonicalPath = basePath;
  if (!facets && page > 1) {
    canonicalPath = `${basePath}?page=${page}`;
  }

  const index = !facets;

  return {
    index,
    canonicalPath,
    robots: {
      index,
      follow: true,
      googleBot: {
        index,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    alternates: { canonical: canonicalPath },
  };
}

/** Convenience: merge indexation decision straight into a Metadata object. */
export function withIndexation(
  basePath: string,
  sp: ListingSearchParams,
  base: Metadata
): Metadata {
  const { robots, alternates } = getListingIndexation(basePath, sp);
  return {
    ...base,
    robots,
    alternates: { ...(base.alternates || {}), ...alternates },
  };
}
