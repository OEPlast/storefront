import { notFound } from 'next/navigation';
import api from '@/libs/api/endpoints';
import { cachedGetOrNull, type CachedResult } from '@/libs/api/cachedApi';
import { CacheTag, categoryTag } from '@/libs/api/cacheTags';
import type { CategoryDetail } from '@/hooks/queries/useCategoryBySlug';

/**
 * The category record. Cached and tagged, and memoized per request, so the layout,
 * `generateMetadata` and the page body share one call. A 404 (unknown slug) returns null; anything
 * else throws.
 */
export async function getCategory(slug: string) {
    return cachedGetOrNull<CategoryDetail>(api.categories.bySlug(slug), {
        tags: [categoryTag(slug), CacheTag.CATEGORIES],
    });
}

/**
 * The category, or a 404. Called by the layout, which is what makes it a real 404 (see
 * layout.tsx), and again by the page for the data itself.
 */
export async function requireCategory(slug: string): Promise<CachedResult<CategoryDetail>> {
    const fetched = await getCategory(slug);
    if (!fetched?.data) notFound();
    return fetched;
}
