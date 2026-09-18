import { notFound, permanentRedirect } from 'next/navigation';
import api from '@/libs/api/endpoints';
import { cachedGetOrNull, type CachedResult } from '@/libs/api/cachedApi';
import { productTag } from '@/libs/api/cacheTags';
import type { ProductDetail } from '@/hooks/queries/useProduct';

/**
 * When a product was renamed, its old slug is kept on the server; send the visitor (and search
 * engines) to the current URL with a permanent redirect instead of a 404.
 */
export async function redirectIfRenamed(slug: string): Promise<void> {
    let current: string | undefined;
    try {
        const result = await cachedGetOrNull<{ slug?: string; }>(
            `/products/slug-redirect/${encodeURIComponent(slug)}`,
            { tags: [productTag(slug)] }
        );
        current = result?.data?.slug;
    } catch {
        // Lookup failure falls through to the normal not-found page.
    }
    if (current && current !== slug) permanentRedirect(`/product/${current}`);
}

/**
 * The product itself. Returns null only when the API says 404 — any other failure throws, so a
 * blip can't be baked into a cached "Product Not Found" page for the next 12 hours.
 *
 * `cachedGet` memoizes on the request, so the layout, `generateMetadata` and the page body share
 * one fetch even though all three call this.
 */
export async function getProduct(slug: string): Promise<CachedResult<ProductDetail> | null> {
    const result = await cachedGetOrNull<ProductDetail>(api.products.bySlug(slug), {
        tags: [productTag(slug)],
    });
    return result?.data ? result : null;
}

/**
 * The product, or what replaces it: a 308 to its current URL when it was renamed, otherwise a 404.
 * Called by the layout, which is what makes those real status codes (see layout.tsx), and again by
 * the page for the data itself.
 */
export async function requireProduct(slug: string): Promise<CachedResult<ProductDetail>> {
    const fetched = await getProduct(slug);
    if (!fetched) {
        await redirectIfRenamed(slug);
        notFound();
    }
    return fetched;
}
