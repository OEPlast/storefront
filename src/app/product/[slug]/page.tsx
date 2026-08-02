import { notFound } from 'next/navigation';
import {
    dehydrate,
    HydrationBoundary,
    QueryClient,
} from '@tanstack/react-query';
import api from '@/libs/api/endpoints';
import { serverAPI } from '@/libs/api/serverAPI';
import MainProduct from '@/components/Product/Detail/MainProduct';
import Footer from '@/components/Footer/Footer';
import BreadcrumbProduct from '@/components/Breadcrumb/BreadcrumbProduct';
import type { ProductDetail } from '@/hooks/queries/useProduct';
import { headers } from 'next/headers';
import removeMarkdown from "markdown-to-text";
import { getProductDisplayPrice } from '@/utils/cart-pricing';
import { formatToNaira } from '@/utils/currencyFormatter';
import { getCdnUrl } from '@/libs/cdn-url';
import { prefetchImages } from '@/config/siteConfig';
import {
    generateProductSchema,
    generateBreadcrumbSchema,
    injectStructuredData,
} from '@/libs/structured-data';

interface ProductPageProps {
    params: Promise<{ slug: string; }>;
}

// Server-side prefetch function
async function prefetchProduct(slug: string) {
    const queryClient = new QueryClient();

    try {
        await queryClient.prefetchQuery({
            queryKey: ['product', slug],
            queryFn: async () => {
                const response = await serverAPI.get<ProductDetail>(api.products.bySlug(slug));
                if (!response.data) {
                    console.error('[Server Prefetch] No data in response');
                    throw new Error('Product not found');
                }

                return response.data;
            },
            staleTime: 5 * 60 * 1000, // 5 minutes
        });

        // Get the prefetched data to check if product exists
        const product = queryClient.getQueryData<ProductDetail>(['product', slug]);
        return { queryClient, product };
    } catch (error) {
        console.error('[Server Prefetch] Error:', error);
        return { queryClient, product: null };
    }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ProductPageProps) {
    const { slug } = await params;
    const { product } = await prefetchProduct(slug);

    if (!product) {
        return {
            title: 'Product Not Found | Rawura',
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
        : `Buy ${product.name} at Rawura. ${priceText}. ${product.category?.name || 'Quality products'}.`;

    const imageUrls = product.description_images?.map(img => getCdnUrl(img.url)) || [];
    await prefetchImages(imageUrls);

    // Build dynamic OG image URL
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3009';
    const protocol = headersList.get('x-forwarded-proto') || 'http';
    const origin = `${protocol}://${host}`;

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
            siteName: 'Rawura',
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
    const { queryClient, product } = await prefetchProduct(slug);
    // If product not found, trigger Next.js not-found page
    if (!product) {
        notFound();
    }

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
                    category: product.category?.name,
                    slug: product.slug,
                    sku: product.sku ? String(product.sku) : undefined,
                    condition: 'new',
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