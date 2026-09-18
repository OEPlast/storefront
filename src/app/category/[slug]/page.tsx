import type { Metadata } from 'next';
import RouteClient from './RouteClient';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { seedData } from '@/libs/api/cachedApi';
import { CacheTag, categoryTag } from '@/libs/api/cacheTags';
import { hasFacetParams, isListingEmpty, listingPage, listingSort, seedListing } from '@/libs/query/seedListing';
import api from '@/libs/api/endpoints';
import { getCategory, requireCategory } from './data';
import type { ProductListItem } from '@/types/product';
import { getDefaultMetadata } from '@/libs/seo';
import { getStoreName } from '@/libs/storeBranding';
import { getCdnUrl } from '@/libs/cdn-url';
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
        const category = (await getCategory(slug))?.data;

        if (!category) {
            return getDefaultMetadata({
                title: 'Category Not Found',
                description: 'The category you are looking for does not exist.',
                robots: { index: false, follow: true },
            });
        }

        const description = category.description
            ? category.description.substring(0, 155) + '...'
            : `Browse ${category.name} products at ${storeName}. Shop quality ${category.name.toLowerCase()} items with delivery across Nigeria.`;

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

        // Facet/pagination-aware robots + canonical; an empty category is not indexed.
        const empty = await isListingEmpty(api.products.byCategorySlug(slug), {}, [
            categoryTag(slug),
            CacheTag.PRODUCTS,
        ]);
        return withIndexation(basePath, sp, base, { empty });
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

    // Category record, seeded under the key `useCategoryBySlug` reads. An unknown slug never gets
    // this far: layout.tsx has already answered with a real 404, which this page can't do from
    // inside loading.tsx's Suspense boundary. This call just reads the same memoized result.
    const fetched = await requireCategory(slug);
    const category = fetched.data;
    const queryClient = new QueryClient();
    seedData(queryClient, ['category', 'bySlug', slug], fetched);

    // First page of products, fetched on the server with the client's exact query params, so the
    // grid renders in the HTML crawlers receive (it previously shipped "Loading…") and doubles as
    // the ItemList. Filtered views are noindex and keep fetching on the client.
    let listProducts: ListItemProduct[] = [];
    if (!hasFacetParams(serverSearchParams)) {
        const listingParams = {
            slug,
            sort: [listingSort(serverSearchParams, 'newest')],
            page: listingPage(serverSearchParams),
            limit: 15,
        };
        const seeded = await seedListing<ProductListItem[]>(
            queryClient,
            ['products', 'byCategorySlug', listingParams],
            api.products.byCategorySlug(slug),
            { sort: listingParams.sort, page: listingParams.page, limit: listingParams.limit },
            { limit: 15, page: 1, pages: 0, total: 0, hasSubcategories: false, slug },
            [categoryTag(slug), CacheTag.PRODUCTS]
        );
        const products = Array.isArray(seeded?.data) ? seeded.data : [];
        listProducts = products.map((p) => ({
            name: p.name,
            slug: p.slug,
            image: coverImageOf(p),
            price: p.price,
            inStock: (p.stock ?? 0) > 0,
        }));
    }

    const basePath = `/category/${slug}`;
    const categoryName = category.name;

    return (
        <>
            {/* Structured data (CollectionPage + Breadcrumb + ItemList) rendered
                OUTSIDE HydrationBoundary so it emits as clean SSR JSON-LD. */}
            {injectStructuredData(
                generateCollectionSchema({
                    name: categoryName,
                    description: category.description,
                    url: basePath,
                    image: category.image ? getCdnUrl(category.image) : undefined,
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
