import { Metadata } from 'next';
import React from 'react';
import TopSoldProductsClient from './TopSoldProductsClient';
import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import api from '@/libs/api/endpoints';
import { hasFacetParams, isListingEmpty, listingPage, listingSort, seedListing, type ListingSearchParams } from '@/libs/query/seedListing';
import { getDefaultMetadata } from '@/libs/seo';
import { CacheTag } from '@/libs/api/cacheTags';

export async function generateMetadata(): Promise<Metadata> {
    // Nothing to show (e.g. no sales in the period) → keep the empty page out of the index until
    // it has products again; crawlers recheck it.
    const empty = await isListingEmpty(api.products.topSold, {}, [CacheTag.PRODUCTS]);
    return getDefaultMetadata({
        title: 'Best Sellers - Top Selling Products of All Time',
        description: 'Shop our most popular products. Discover customer favorites and best-selling items.',
        alternates: { canonical: '/top-sold-products' },
        ...(empty ? { robots: { index: false, follow: true } } : {}),
    });
}

/**
 * The product grid is fetched on the server with the client's exact query params and seeded into
 * the query cache, so the HTML crawlers receive contains the products (it used to be a static page
 * frozen on "Loading…" at build time). Filtered views are left to the client.
 */
export default async function TopSoldProductsPage({
    searchParams,
}: {
    searchParams?: Promise<ListingSearchParams>;
}) {
    const sp = searchParams ? await searchParams : undefined;
    const queryClient = new QueryClient();

    if (!hasFacetParams(sp)) {
        const listingParams = {
            sort: [listingSort(sp, 'order_frequency')],
            page: listingPage(sp),
            limit: 15,
        };
        await seedListing(queryClient, ['products', 'topSold', listingParams], api.products.topSold, listingParams, {
            total: 0,
            page: 1,
            limit: 20,
            pages: 0,
        }, [CacheTag.PRODUCTS]);
    }

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <TopSoldProductsClient />
        </HydrationBoundary>
    );
}
