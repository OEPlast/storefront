import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CampaignClient from './CampaignClient';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { serverGet, serverGetWithMeta } from '@/libs/query/server-api-client';
import api from '@/libs/api/endpoints';
import type { Campaign } from '@/types/campaign';
import type { ProductListItem } from '@/types/product';
import { getDefaultMetadata } from '@/libs/seo';
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
    const sp = searchParams ? await searchParams : undefined;
    const basePath = `/campaign/${slug}`;

    try {
        const campaign = await serverGet<Campaign>(`${api.campaigns.info(slug)}`);

        if (!campaign) {
            return getDefaultMetadata({
                title: 'Campaign Not Found',
                description: 'The campaign you are looking for does not exist.',
                robots: { index: false, follow: true },
            });
        }

        const description = campaign.description
            ? campaign.description.substring(0, 155) + '..'
            : `Shop the ${campaign.title} campaign at Rawura. Exclusive deals and offers with free delivery across Nigeria.`;

        // Prefetch campaign image
        if (campaign.image) {
            await prefetchImages([getCdnUrl(campaign.image)]);
        }

        const base = getDefaultMetadata({
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

        return withIndexation(basePath, sp, base);
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

    // Fetch campaign on server; a missing campaign is a real 404 (proper status code).
    const campaign = await serverGet<Campaign>(`${api.campaigns.info(slug)}`);
    if (!campaign) {
        notFound();
    }

    const queryClient = new QueryClient();
    queryClient.setQueryData(['campaigns', 'info', slug], campaign);

    // Best-effort product set for ItemList (deal offers with campaign end date).
    let listProducts: ListItemProduct[] = [];
    try {
        const { data } = await serverGetWithMeta<ProductListItem[]>(
            `${api.products.byCampaignSlug(slug)}?page=1&limit=24`
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
        /* best-effort */
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
