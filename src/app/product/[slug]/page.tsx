import { notFound, permanentRedirect } from 'next/navigation';
import {
    dehydrate,
    HydrationBoundary,
} from '@tanstack/react-query';
import api from '@/libs/api/endpoints';
import { getQueryClient } from '@/libs/query/get-query-client';
import { cachedGet, cachedGetOrNull, seedData, type CachedResult } from '@/libs/api/cachedApi';
import { CacheTag, productTag } from '@/libs/api/cacheTags';
import MainProduct from '@/components/Product/Detail/MainProduct';
import BreadcrumbProduct from '@/components/Breadcrumb/BreadcrumbProduct';
import type { ProductDetail } from '@/hooks/queries/useProduct';
import type { ProductListItem } from '@/types/product';
import removeMarkdown from "markdown-to-text";
import { getProductDisplayPrice } from '@/utils/cart-pricing';
import { formatToNaira } from '@/utils/currencyFormatter';
import { getCdnUrl } from '@/libs/cdn-url';
import { siteConfig } from '@/config/siteConfig';
import { getStoreName } from '@/libs/storeBranding';
import {
    generateProductSchema,
    generateBreadcrumbSchema,
    injectStructuredData,
} from '@/libs/structured-data';

interface ProductPageProps {
    params: Promise<{ slug: string; }>;
}

/**
 * 12 hours. A product page is regenerated on its first visit after that, and immediately when
 * Main-server purges `product:<slug>` (a price, stock or copy change) — see libs/api/cacheTags.ts.
 */
export const revalidate = 43200;

/**
 * Pre-renders the best sellers at build time. Everything else is rendered on first request and
 * cached from then on (`dynamicParams` defaults to true), so this is a warm-up list, not the
 * catalogue — pre-rendering thousands of products would make every deploy crawl.
 *
 * It also earns its keep as a guard: exporting this turns the route into a static one, so a future
 * `headers()`/`cookies()` call here fails `next build` instead of quietly making every product
 * page dynamic again, which is exactly how the site lost its caching the first time.
 */
export async function generateStaticParams(): Promise<{ slug: string; }[]> {
    try {
        const { data } = await cachedGet<ProductListItem[]>(api.products.topSold, {
            params: { page: 1, limit: 20 },
            tags: [CacheTag.PRODUCTS],
        });
        return (data ?? []).filter((p) => p?.slug).map((p) => ({ slug: p.slug }));
    } catch (error) {
        // A build shouldn't fail because the warm-up list was unavailable; pages still render on
        // demand. A *product page* failing to fetch is a different matter — that one throws.
        console.error('[product/generateStaticParams] falling back to on-demand rendering:', error);
        return [];
    }
}

/**
 * When a product was renamed, its old slug is kept on the server; send the visitor (and search
 * engines) to the current URL with a permanent redirect instead of a 404.
 */
async function redirectIfRenamed(slug: string): Promise<void> {
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
 * `cachedGet` memoizes on the request, so `generateMetadata` and the page body below share one
 * fetch even though both call this.
 */
async function getProduct(slug: string): Promise<CachedResult<ProductDetail> | null> {
    const result = await cachedGetOrNull<ProductDetail>(api.products.bySlug(slug), {
        tags: [productTag(slug)],
    });
    return result?.data ? result : null;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ProductPageProps) {
    const { slug } = await params;
    const [fetched, storeName] = await Promise.all([getProduct(slug), getStoreName()]);
    const product = fetched?.data;

    if (!product) {
        await redirectIfRenamed(slug);
        return {
            title: `Product Not Found | ${storeName}`,
            description: 'The product you are looking for does not exist.',
        };
    }

    // Calculate discount — prefer active sale, fall back to static originPrice discount
    const { discountPercentage: saleDiscount } = getProductDisplayPrice(product);
    const hasStaticDiscount = product.originPrice > 0 && product.originPrice > product.price;
    const staticDiscountPct = hasStaticDiscount
        ? Math.round(((product.originPrice - product.price) / product.originPrice) * 100)
        : 0;
    const discountPercentage = saleDiscount > 0 ? saleDiscount : staticDiscountPct;
    const hasDiscount = discountPercentage > 0;
    const discount = hasDiscount ? discountPercentage : null;

    // Determine the "original" price and final display price for copy + OG image
    // - Sale discount: product.price is the base; final = base * (1 - pct/100)
    // - Static discount: product.originPrice is the original; product.price is already final
    const ogOriginalPrice = saleDiscount > 0 ? product.price : (hasStaticDiscount ? product.originPrice : product.price);
    const finalDisplayPrice = saleDiscount > 0
        ? product.price * (1 - saleDiscount / 100)
        : product.price;

    const priceText = discount
        ? `${formatToNaira(finalDisplayPrice)} (${discount}% off)`
        : `${formatToNaira(product.price)}`;

    const description = product.description
        ? `${removeMarkdown(product.description).substring(0, 155)}...`
        : `Buy ${product.name} at ${storeName}. ${priceText}. ${product.category?.name || 'Quality products'}.`;

    // The OG image is served by this app's own /api/og route, so the origin is the canonical site
    // URL. It used to be read from the request's Host header, which made every product page
    // dynamic — and would have put a preview deployment's hostname into a cached page.
    const origin = siteConfig.url;

    const coverImage = product.description_images?.find(img => img.cover_image)
        || product.description_images?.[0];
    const ogImageSrc = coverImage ? getCdnUrl(coverImage.url) : '';

    const ogParams = new URLSearchParams({
        name: product.name,
        price: ogOriginalPrice.toString(), // original price so OG route shows correct strikethrough
        ...(ogImageSrc && { image: ogImageSrc }),
        ...(discountPercentage > 0 && { discount: discountPercentage.toString() }),
        ...(description && { description }),
        ...(product.category?.name && { category: product.category.name }),
    });

    const ogImageUrl = `${origin}/api/og?${ogParams.toString()}`;

    return {
        title: `${product.name}`,
        description,
        keywords: [
            product.name,
            product.category?.name,
            ...(product.tags || []),
        ].filter(Boolean).join(', '),
        openGraph: {
            title: product.name,
            description: description,
            type: 'website',
            images: [
                {
                    url: ogImageUrl,
                    alt: product.name,
                    width: 1200,
                    height: 630,
                },
            ],
            siteName: storeName,
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name,
            description: description,
            images: [ogImageUrl],
        },
        alternates: {
            canonical: `/product/${slug}`,
        },
        // Product-specific metadata for e-commerce
        other: {
            'product:price:amount': product.price.toString(),
            'product:price:currency': 'NGN',
            'product:availability': product.stock > 0 ? 'in stock' : 'out of stock',
            ...(product.brand && { 'product:brand': product.brand }),
            ...(product.category?.name && { 'product:category': product.category.name }),
        },
    };
}


export default async function ProductPage({ params }: ProductPageProps) {
    const { slug } = await params;
    const fetched = await getProduct(slug);
    // Renamed product → 301 to its current URL; otherwise the not-found page.
    if (!fetched) {
        await redirectIfRenamed(slug);
        notFound();
    }
    const product = fetched.data;

    // Seeded under the key `useProduct(slug)` reads, so MainProduct renders from this data during
    // SSR instead of showing its loading state to crawlers. `seedData` stamps it with the age of
    // the cached response, so a page served from a 12-hour-old render still refetches on mount.
    const queryClient = getQueryClient();
    seedData(queryClient, ['product', slug], fetched);

    // Accurate current price (accounts for active sale / static discount).
    const { price: displayPrice, originalPrice } = getProductDisplayPrice(product);

    // Only real images (not videos) belong in Product.image.
    const productImages = (product.description_images || [])
        .filter((i) => i.mediaType !== 'video')
        .map((i) => getCdnUrl(i.url));

    // Variant price points → AggregateOffer when a range exists.
    const variantPrices = (product.attributes || [])
        .flatMap((attr) => (attr.children || []).map((c) => c.price ?? product.price))
        .filter((p): p is number => typeof p === 'number' && p > 0);

    return (
        <>
            {/* Structured Data — rendered OUTSIDE HydrationBoundary so it is emitted as
                clean <script type="application/ld+json"> in the SSR HTML. Inside a client
                boundary React would defer it into the RSC flight payload (client-only). */}
            {injectStructuredData(
                generateProductSchema({
                    name: product.name,
                    description: product.description,
                    price: displayPrice,
                    originalPrice: originalPrice ?? undefined,
                    stock: product.stock,
                    images: productImages,
                    brand: product.brand,
                    gtin: product.gtin,
                    mpn: product.mpn,
                    category: product.category?.name,
                    slug: product.slug,
                    sku: product.sku ? String(product.sku) : undefined,
                    condition: product.condition ?? 'new',
                    ratingValue: product.reviewStats?.averageRating,
                    reviewCount: product.reviewStats?.totalReviews,
                    variantPrices,
                }),
                'ld-product'
            )}
            {injectStructuredData(
                generateBreadcrumbSchema([
                    { name: 'Homepage', url: '/' },
                    ...(product.category
                        ? [
                            { name: product.category.name, url: `/category/${product.category.slug}` },
                        ]
                        : []),
                    { name: product.name, url: `/product/${product.slug}` },
                ]),
                'ld-breadcrumb'
            )}

            <HydrationBoundary state={dehydrate(queryClient)}>
                <BreadcrumbProduct product={product} />
                <MainProduct slug={slug} />
                {/* <Footer /> */}
            </HydrationBoundary>
        </>
    );
}