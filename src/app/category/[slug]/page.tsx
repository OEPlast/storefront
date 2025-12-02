import type { Metadata } from 'next';
import RouteClient from './RouteClient';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { serverGet } from '@/libs/query/server-api-client';
import api from '@/libs/api/endpoints';
import type { CategoryDetail } from '@/hooks/queries/useCategoryBySlug';
import { getDefaultMetadata } from '@/libs/seo';
import { getCdnUrl } from '@/libs/cdn-url';
import { prefetchImages } from '@/config/siteConfig';

// Generate metadata for SEO
export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string; }>;
}): Promise<Metadata> {
    const { slug } = await params;

    try {
        const category = await serverGet<CategoryDetail>(api.categories.bySlug(slug));

        if (!category) {
            return getDefaultMetadata({
                title: 'Category Not Found',
                description: 'The category you are looking for does not exist.',
            });
        }

        const description = category.description
            ? category.description.substring(0, 155) + '...'
            : `Browse ${category.name} products at Rawura. Shop quality ${category.name.toLowerCase()} items.`;

        // Prefetch category image
        if (category.image) {
            await prefetchImages([getCdnUrl(category.image)]);
        }

        return getDefaultMetadata({
            title: category.name,
            description,
            keywords: [category.name, 'products', 'shop', 'Rawura'],
            openGraph: {
                title: category.name,
                description,
                images: category.image ? [{ url: getCdnUrl(category.image), alt: category.name }] : undefined,
            },
            twitter: {
                card: 'summary_large_image',
                title: category.name,
                description,
                images: category.image ? [getCdnUrl(category.image)] : undefined,
            },
        });
    } catch (error) {
        console.error('Error generating category metadata:', error);
        return getDefaultMetadata({
            title: 'Category',
            description: 'Browse products in this category',
        });
    }
}

export default async function CategoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string; }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { slug } = await params;
    const serverSearchParams = searchParams ? await searchParams : undefined;

    // Prefetch category data on server
    const queryClient = new QueryClient();
    await queryClient.prefetchQuery({
        queryKey: ['category', 'bySlug', slug],
        queryFn: async () => {
            const data = await serverGet<CategoryDetail>(api.categories.bySlug(slug));
            if (!data) throw new Error('Category not found');
            return data;
        },
    });

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <RouteClient slug={slug} searchParams={serverSearchParams} />
        </HydrationBoundary>
    );
}
