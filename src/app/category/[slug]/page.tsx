import type { Metadata } from 'next';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import MenuOne from '@/components/Header/Menu/MenuOne';
import Footer from '@/components/Footer/Footer';
import RouteClient from './RouteClient';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { serverGet } from '@/libs/query/server-api-client';
import api from '@/libs/api/endpoints';
import type { CategoryDetail } from '@/hooks/queries/useCategoryBySlug';

export const metadata: Metadata = {
    title: 'Category - OEPlast',
    description: 'Browse products in this category',
};

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
            <Footer />
        </HydrationBoundary>
    );
}
