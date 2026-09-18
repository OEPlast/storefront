import { requireProduct } from './data';

/**
 * Decides whether this URL is a product at all — 404, 308 to a renamed product's current slug, or
 * render — before loading.tsx gets involved.
 *
 * A segment's loading.tsx is a Suspense boundary around its page, but not around its layout. During
 * SSR that boundary catches anything the page throws, notFound() and permanentRedirect() included:
 * the shell still renders, so the response goes out as a 200 with the skeleton in it, and ISR
 * caches that for 12 hours. Thrown from here, above the boundary, they fail the shell instead — the
 * one path on which Next sets the status code. The page calls requireProduct() again for its data;
 * `memoFetch` makes that the same request.
 *
 * notFound() from a layout is caught by the *parent* segment's not-found.tsx, which is why
 * "Product Not Found" lives in app/product/not-found.tsx rather than next to this file.
 *
 * This only works while no loading.tsx sits in a folder above this one: app/loading.tsx would wrap
 * this layout too.
 */
export default async function ProductSlugLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string; }>;
}) {
    const { slug } = await params;
    await requireProduct(slug);
    return children;
}
