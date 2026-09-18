import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CampaignClient from './CampaignClient';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { cachedGetOrNull, seedData } from '@/libs/api/cachedApi';
import { CacheTag, campaignTag } from '@/libs/api/cacheTags';
import { hasFacetParams, isListingEmpty, listingPage, listingSort, seedListing } from '@/libs/query/seedListing';
import api from '@/libs/api/endpoints';
import type { Campaign } from '@/types/campaign';
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

/**
 * The campaign record. Cached, tagged and memoized per request, so `generateMetadata` and the page
 * body share one call. A 404 (unknown slug) returns null; anything else throws.
 */
async function getCampaign(slug: string) {
    return cachedGetOrNull<Campaign>(api.campaigns.info(slug), {
        tags: [campaignTag(slug), CacheTag.CAMPAIGNS],
    });
}

function coverImageOf(p: ProductListItem): string | undefined {
    const imgs = p.description_images?.length ? p.description_images : p.images;
    const cover = imgs?.find((i) => i.cover_image) || imgs?.[0];
    return cover ? getCdnUrl(cover.url) : undefined;
}

// Generate dynamic metadata for campaign page
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
    const basePath = `/campaign/${slug}`;

    try {
        const campaign = (await getCampaign(slug))?.data;

        if (!campaign) {
            return getDefaultMetadata({
                title: 'Campaign Not Found',
                description: 'The campaign you are looking for does not exist.',
                robots: { index: false, follow: true },
            });
        }

        const description = campaign.description
            ? campaign.description.substring(0, 155) + '..'
            : `Shop the ${campaign.title} campaign at ${storeName}. Exclusive deals and offers with delivery across Nigeria.`;

        const base = await getDefaultMetadata({
            title: campaign.title,
            description,
            keywords: [campaign.title, 'campaign', 'deals', 'offers', 'sale', 'Nigeria'],
            openGraph: {
                title: campaign.title,
                description,
                url: basePath,
                images: campaign.image ? [{ url: getCdnUrl(campaign.image), alt: campaign.title }] : undefined,
            },
            twitter: {
                card: 'summary_large_image',
                title: campaign.title,
                description,
                images: campaign.image ? [getCdnUrl(campaign.image)] : undefined,
            },
        });

        // A campaign with nothing in it is not indexed.
        const empty = await isListingEmpty(api.products.byCampaignSlug(slug), {}, [
            campaignTag(slug),
            CacheTag.PRODUCTS,
        ]);
        return withIndexation(basePath, sp, base, { empty });
    } catch (error) {
        console.error('Error generating campaign metadata:', error);
        return getDefaultMetadata({
            title: 'Campaign',
            description: 'Browse products in this campaign',
        });
    }
}

export default async function CampaignPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string; }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { slug } = await params;
    const serverSearchParams = searchParams ? await searchParams : undefined;

    // Fetch campaign on server; a missing campaign is a real 404 (proper status code) — as long as no
    // `loading.tsx` sits above this page. To give this route one, move this check into a layout
    // first; see app/product/[slug]/layout.tsx.
    const fetched = await getCampaign(slug);
    if (!fetched) {
        notFound();
    }
    const campaign = fetched.data;

    const queryClient = new QueryClient();
    seedData(queryClient, ['campaigns', 'info', slug], fetched);

    // First page of the campaign's products, fetched on the server with the client's exact query
    // params, so the grid is in the HTML crawlers receive and feeds the ItemList. (The ItemList used
    // to read this response as an array, but the endpoint returns `{ products }`, so it was always
    // empty.)
    let listProducts: ListItemProduct[] = [];
    if (!hasFacetParams(serverSearchParams)) {
        const listingParams = {
            slug,
            sort: listingSort(serverSearchParams, 'newest'),
            page: listingPage(serverSearchParams),
            limit: 15,
        };
        const seeded = await seedListing<{ products?: ProductListItem[] }>(
            queryClient,
            ['campaigns', 'products', listingParams],
            api.products.byCampaignSlug(slug),
            { sort: listingParams.sort, page: listingParams.page, limit: listingParams.limit },
            { page: 1, limit: 15, total: 0, pages: 0 },
            [campaignTag(slug), CacheTag.PRODUCTS]
        );
        const products = Array.isArray(seeded?.data?.products) ? seeded.data.products : [];
        listProducts = products.map((p) => ({
            name: p.name,
            slug: p.slug,
            image: coverImageOf(p),
            price: p.price,
            inStock: (p.stock ?? 0) > 0,
        }));
    }

    const basePath = `/campaign/${slug}`;

    return (
        <>
            {/* Structured data rendered OUTSIDE HydrationBoundary → clean SSR JSON-LD. */}
            {injectStructuredData(
                generateCollectionSchema({
                    name: campaign.title,
                    description: campaign.description,
                    url: basePath,
                    image: campaign.image ? getCdnUrl(campaign.image) : undefined,
                }),
                'ld-collection'
            )}
            {injectStructuredData(
                generateBreadcrumbSchema([
                    { name: 'Homepage', url: '/' },
                    { name: 'Deals', url: '/deals' },
                    { name: campaign.title, url: basePath },
                ]),
                'ld-breadcrumb'
            )}
            {listProducts.length > 0 &&
                injectStructuredData(
                    generateItemListSchema(listProducts, campaign.title),
                    'ld-itemlist'
                )}

            <HydrationBoundary state={dehydrate(queryClient)}>
                <CampaignClient slug={slug} searchParams={serverSearchParams} />
            </HydrationBoundary>
        </>
    );
}
