import React from "react";
import type { Metadata } from 'next';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/libs/query/get-query-client';
import Benefit from "@/components/HomeAndProducts/Benefit";
import TrendingNow from '@/components/HomeAndProducts/TrendingNow';
import HomeClient from './HomeClient';
import api from '@/libs/api/endpoints';
import { cachedGet, seedData, seedWithMeta, type CachedResult } from '@/libs/api/cachedApi';
import { CacheTag } from '@/libs/api/cacheTags';
import type { ProductListItem, TopCategory } from '@/types/product';

// Title/description/OG are inherited from the root layout's getDefaultMetadata().
// Only the self-canonical is added here — `/` is the most-linked page on the site,
// so it should never rely on Google inferring its own canonical.
export const metadata: Metadata = {
    alternates: { canonical: '/' },
};

/** 12 hours. Must be a literal — Next reads this statically, it cannot import a constant. */
export const revalidate = 43200;

const EMPTY_META = { total: 0, page: 1, limit: 20, pages: 0 };

const emptyList = (): CachedResult<ProductListItem[]> => ({ data: [], meta: null, fetchedAt: Date.now() });

/**
 * The home page's product rails. They used to be prefetched in the root layout, which put a copy
 * of them into every page's cache entry; here they only affect this page.
 *
 * Failure policy: one rail failing degrades to an empty section, but *every* rail failing throws,
 * so ISR keeps serving the last good home page instead of caching a blank one for 12 hours.
 */
async function fetchHomeRails() {
    const listOpts = { tags: [CacheTag.PRODUCTS] } as const;

    const settled = await Promise.allSettled([
        cachedGet<TopCategory[]>(api.products.topCategories, { params: { limit: 10 }, tags: [CacheTag.CATEGORIES, CacheTag.PRODUCTS] }),
        cachedGet<ProductListItem[]>(api.products.dealsOfTheDay, { params: { page: 1 }, ...listOpts }),
        cachedGet<ProductListItem[]>(api.products.newProducts, { params: { page: 1 }, ...listOpts }),
        cachedGet<ProductListItem[]>(api.products.week, { params: { page: 1 }, ...listOpts }),
        cachedGet<ProductListItem[]>(api.products.topSold, { params: { page: 1 }, ...listOpts }),
    ]);

    const firstFailure = settled.find((r) => r.status === 'rejected');
    if (firstFailure && settled.every((r) => r.status === 'rejected')) {
        throw (firstFailure as PromiseRejectedResult).reason;
    }
    for (const result of settled) {
        if (result.status === 'rejected') console.error('[home] rail failed:', result.reason?.message ?? result.reason);
    }

    const [topCategories, deals, newProducts, week, topSold] = settled;
    return {
        topCategories: topCategories.status === 'fulfilled' ? topCategories.value : ({ data: [], meta: null, fetchedAt: Date.now() } as CachedResult<TopCategory[]>),
        deals: deals.status === 'fulfilled' ? deals.value : emptyList(),
        newProducts: newProducts.status === 'fulfilled' ? newProducts.value : emptyList(),
        week: week.status === 'fulfilled' ? week.value : emptyList(),
        topSold: topSold.status === 'fulfilled' ? topSold.value : emptyList(),
    };
}

export default async function Home() {
    const queryClient = getQueryClient();
    const rails = await fetchHomeRails();

    // Keys must match the client hooks exactly (useTopCategories / useProductLists), or the client
    // would refetch on mount and the server-rendered rails would flash away.
    seedData(queryClient, ['products', 'topCategories', 10], rails.topCategories);
    seedWithMeta(queryClient, ['products', 'dealsOfTheDay', 1], rails.deals, EMPTY_META);
    seedWithMeta(queryClient, ['products', 'new', { page: 1 }], rails.newProducts, EMPTY_META);
    seedWithMeta(queryClient, ['products', 'week', { page: 1 }], rails.week, EMPTY_META);
    seedWithMeta(queryClient, ['products', 'topSold', { page: 1 }], rails.topSold, EMPTY_META);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <TrendingNow />

            {/* Product sections fetched from API */}
            <HomeClient />
            <Benefit props="md:py-20 py-10" />
        </HydrationBoundary>
    );
}
