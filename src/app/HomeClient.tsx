'use client';

import React from 'react';
import ProductSection from '@/components/Home7/ProductSection';
import { useNewProducts, useWeekProducts, useTopSoldProducts, useDealsOfTheDay } from '@/hooks/queries/useProductLists';
import { ProductDetail } from '@/types/product';
import CatB_Banner from '@/components/Banners/CatB_Banner';
import ProductLoading from '@/components/Product/ProductLoading';

/**
 * HomeClient - Client-side component for homepage product sections
 * Uses React Query hooks to fetch and display product lists
 */
export default function HomeClient() {
    // Fetch product lists - these will use prefetched data from server
    const { data: dealsOfTheDay, isLoading: isLoadingDeals } = useDealsOfTheDay(1);
    const { data: newProducts, isLoading: isLoadingNew } = useNewProducts(1);
    const { data: weekProducts, isLoading: isLoadingWeek } = useWeekProducts(1);
    const { data: topSoldProducts, isLoading: isLoadingTopSold } = useTopSoldProducts(1);



    return (
        <>
            {/* Deals of the Day Section - Featured at top with countdown */}
            {dealsOfTheDay && dealsOfTheDay.data.length > 0 && (
                <ProductSection
                    data={dealsOfTheDay.data}
                    showCountdown={true}
                    start={0}
                    limit={15}
                    isLoading={isLoadingDeals}
                    header="Deals of the Day"
                    viewAllLink="/campaign/deals-of-the-day"
                />
            )}

            {/* New Products Section */}
            {newProducts && newProducts.data.length > 0 && (
                <ProductSection
                    start={0}
                    limit={10}
                    isLoading={isLoadingNew}
                    data={newProducts.data}
                    header="New Arrivals"
                    viewAllLink="/new-products"
                />
            )}

            <CatB_Banner />

            {/* Top Sold Products Section */}
            {topSoldProducts && topSoldProducts.data.length > 0 && (
                <ProductSection
                    start={0}
                    limit={10}
                    isLoading={isLoadingTopSold}
                    data={topSoldProducts.data}
                    header="Best Sellers"
                    viewAllLink="/top-sold-products"
                />
            )}

            {/* Week Products Section */}
            {weekProducts && weekProducts.data.length > 0 && (
                <ProductSection
                    start={0}
                    limit={10}
                    isLoading={isLoadingWeek}
                    data={weekProducts.data}
                    header="Top of the Week"
                    viewAllLink="/week-products"
                />
            )}


        </>
    );
}
