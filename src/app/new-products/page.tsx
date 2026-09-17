import { Metadata } from 'next';
import React from 'react';
import NewProductsClient from './NewProductsClient';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import api from '@/libs/api/endpoints';
import { hasFacetParams, isListingEmpty, listingPage, listingSort, seedListing, type ListingSearchParams } from '@/libs/query/seedListing';
import { getDefaultMetadata } from '@/libs/seo';
import { CacheTag } from '@/libs/api/cacheTags';

export async function generateMetadata(): Promise<Metadata> {
    const empty = await isListingEmpty(api.products.newProducts, {}, [CacheTag.PRODUCTS]);
    return getDefaultMetadata({
        ...(empty ? { robots: { index: false, follow: true } } : {}),
        title: 'New Arrivals - Latest Products',
        description: 'Discover our newest products and latest arrivals. Shop the freshest additions to our collection.',
        keywords: ['new arrivals', 'latest products', 'new items', 'shop new', 'fresh arrivals'],
        openGraph: {
            title: 'New Arrivals - Latest Products',
            description: 'Discover our newest products and latest arrivals. Shop the freshest additions to our collection.',
        },
    });
}

/**
 * The product grid is fetched on the server with the client's exact query params and seeded into
 * the query cache, so the HTML crawlers receive contains the products (it used to be a static page
 * frozen on "Loading…" at build time). Filtered views are left to the client.
 */
export default async function NewProductsPage({
    searchParams,
}: {
    searchParams?: Promise<ListingSearchParams>;
}) {
    const sp = searchParams ? await searchParams : undefined;
    const queryClient = new QueryClient();

    if (!hasFacetParams(sp)) {
        const listingParams = {
            sort: [listingSort(sp, 'newest')],
            page: listingPage(sp),
            limit: 15,
        };
        await seedListing(queryClient, ['products', 'new', listingParams], api.products.newProducts, listingParams, {
            total: 0,
            page: 1,
            limit: 20,
            pages: 0,
        }, [CacheTag.PRODUCTS]);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <NewProductsClient />
        </HydrationBoundary>
    );
}
