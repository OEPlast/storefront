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
import removeMarkdown from "markdown-to-text";

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

        console.log('[Server Prefetch] Final product:', product ? 'Found' : 'Not found');

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
            title: 'Product Not Found | OEPlast',
            description: 'The product you are looking for does not exist.',
        };
    }

    // Calculate discount percentage if available
    const hasDiscount = product.sale?.isActive && product.sale.variants.length > 0;
    const discount = hasDiscount
        ? product.sale!.variants.find(v => v.variantId === null)?.discount
        : null;

    const priceText = discount
        ? `$${(product.price * (1 - discount / 100)).toFixed(2)} (${discount}% off)`
        : `$${product.price.toFixed(2)}`;

    const description = product.description
        ? `${removeMarkdown(product.description).substring(0, 155)}...`
        : `Buy ${product.name} at OEPlast. ${priceText}. ${product.category?.name || 'Quality products'}.`;

    return {
        title: `${product.name} | OEPlast`,
        description,
        keywords: [
            product.name,
            product.category?.name,
            ...(product.tags || []),
        ].filter(Boolean).join(', '),
        openGraph: {
            title: product.name,
            description: product.description || description,
            type: 'website',
            images: product.description_images?.length
                ? product.description_images.map(img => ({
                    url: img.url,
                    alt: product.name,
                }))
                : [],
            siteName: 'OEPlast',
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name,
            description: product.description || description,
            images: product.description_images?.[0]?.url
                ? [product.description_images[0].url]
                : [],
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

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <BreadcrumbProduct product={product} />
            <MainProduct slug={slug} />
            {/* <Footer /> */}
        </HydrationBoundary>
    );
}