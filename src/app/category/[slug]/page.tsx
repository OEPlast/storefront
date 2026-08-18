import type { Metadata } from 'next';
import RouteClient from './RouteClient';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { serverGet, serverGetWithMeta } from '@/libs/query/server-api-client';
import api from '@/libs/api/endpoints';
import type { CategoryDetail } from '@/hooks/queries/useCategoryBySlug';
import type { ProductListItem } from '@/types/product';
import { getDefaultMetadata } from '@/libs/seo';
import { getStoreName } from '@/libs/storeBranding';
import { getCdnUrl } from '@/libs/cdn-url';
import { prefetchImages } from '@/config/siteConfig';
import { withIndexation } from '@/libs/indexation';
import {
    generateCollectionSchema,
    generateItemListSchema,
    generateBreadcrumbSchema,
    injectStructuredData,
    type ListItemProduct,
} from '@/libs/structured-data';

/** Pick a product's cover image URL (absolute, CDN). */
function coverImageOf(p: ProductListItem): string | undefined {
    const imgs = p.description_images?.length ? p.description_images : p.images;
    const cover = imgs?.find((i) => i.cover_image) || imgs?.[0];
    return cover ? getCdnUrl(cover.url) : undefined;
}

// Generate metadata for SEO
export async function generateMetadata({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string; }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
    const { slug } = await params;
    const [sp, storeName] = await Promise.all([
        searchParams ? searchParams : Promise.resolve(undefined),
        getStoreName(),
    ]);
    const basePath = `/category/${slug}`;

    try {
        const category = await serverGet<CategoryDetail>(api.categories.bySlug(slug));

        if (!category) {
            return getDefaultMetadata({
                title: 'Category Not Found',
                description: 'The category you are looking for does not exist.',
                robots: { index: false, follow: true },
            });
        }

        const description = category.description
            ? category.description.substring(0, 155) + '...'
            : `Browse ${category.name} products at ${storeName}. Shop quality ${category.name.toLowerCase()} items with free delivery across Nigeria.`;

        // Prefetch category image
        if (category.image) {
            await prefetchImages([getCdnUrl(category.image)]);
        }

        const base = await getDefaultMetadata({
            title: category.name,
            description,
            keywords: [category.name, 'products', 'shop', storeName, 'Nigeria'],
            openGraph: {
                title: category.name,
                description,
                url: basePath,
                images: category.image ? [{ url: getCdnUrl(category.image), alt: category.name }] : undefined,
            },
            twitter: {
                card: 'summary_large_image',
                title: category.name,
                description,
                images: category.image ? [getCdnUrl(category.image)] : undefined,
            },
        });

        // Facet/pagination-aware robots + canonical.
        return withIndexation(basePath, sp, base);
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
    const [category] = await Promise.all([
        serverGet<CategoryDetail>(api.categories.bySlug(slug)),
        queryClient.prefetchQuery({
            queryKey: ['category', 'bySlug', slug],
            queryFn: async () => {
                const data = await serverGet<CategoryDetail>(api.categories.bySlug(slug));
                if (!data) throw new Error('Category not found');
                return data;
            },
        }),
    ]);

    // Server-fetch first page of products to emit an ItemList (crawlable product set).
    let listProducts: ListItemProduct[] = [];
    try {
        const { data } = await serverGetWithMeta<ProductListItem[]>(
            `${api.products.byCategorySlug(slug)}?page=1&limit=24`
        );
        const products = Array.isArray(data) ? data : [];
        listProducts = products.map((p) => ({
            name: p.name,
            slug: p.slug,
            image: coverImageOf(p),
            price: p.price,
            inStock: (p.stock ?? 0) > 0,
        }));
    } catch {
        /* ItemList is best-effort; page still renders without it */
    }

    const basePath = `/category/${slug}`;
    const categoryName = category?.name || slug;

    return (
        <>
            {/* Structured data (CollectionPage + Breadcrumb + ItemList) rendered
                OUTSIDE HydrationBoundary so it emits as clean SSR JSON-LD. */}
            {injectStructuredData(
                generateCollectionSchema({
                    name: categoryName,
                    description: category?.description,
                    url: basePath,
                    image: category?.image ? getCdnUrl(category.image) : undefined,
                }),
                'ld-collection'
            )}
            {injectStructuredData(
                generateBreadcrumbSchema([
                    { name: 'Homepage', url: '/' },
                    { name: categoryName, url: basePath },
                ]),
                'ld-breadcrumb'
            )}
            {listProducts.length > 0 &&
                injectStructuredData(
                    generateItemListSchema(listProducts, categoryName),
                    'ld-itemlist'
                )}

            <HydrationBoundary state={dehydrate(queryClient)}>
                <RouteClient slug={slug} searchParams={serverSearchParams} />
            </HydrationBoundary>
        </>
    );
}
