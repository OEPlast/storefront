'use client';

import React from 'react';
import ProductSection from '@/components/Home7/ProductSection';
import { useNewProducts, useWeekProducts, useTopSoldProducts, useDealsOfTheDay } from '@/hooks/queries/useProductLists';
import { ProductType } from '@/type/ProductType';
import CatB_Banner from '@/components/Banners/CatB_Banner';

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

    console.log('deals', dealsOfTheDay);

    // Convert ProductListItem to ProductType (legacy type compatibility)
    const convertProducts = (data: any): ProductType[] => {
        if (!data?.data) return [];
        return data.data.map((item: any) => ({
            ...item,
            quantity: item.stock || 0,
            categoryName: item.category?.name,
            categorySlug: item.category?.slug,
        }));
    };

    return (
        <>
            {/* Deals of the Day Section - Featured at top with countdown */}
            {!isLoadingDeals && dealsOfTheDay && dealsOfTheDay.data.length > 0 && (
                <ProductSection
                    data={convertProducts(dealsOfTheDay)}
                    showCountdown={true}
                    start={0}
                    limit={13}
                    header="Deals of the Day"
                    viewAllLink="/campaigns/deals-of-the-day"
                />
            )}

            {/* New Products Section */}
            {!isLoadingNew && newProducts && (
                <ProductSection
                    start={0}
                    limit={7}
                    data={convertProducts(newProducts)}
                    header="New Arrivals"
                    viewAllLink="/new-products"
                />
            )}

            <CatB_Banner />

            {/* Top Sold Products Section */}
            {!isLoadingTopSold && topSoldProducts && (
                <ProductSection
                    start={0}
                    limit={11}
                    data={convertProducts(topSoldProducts)}
                    header="Best Sellers"
                    viewAllLink="/top-sold-products"
                />
            )}

            {/* Week Products Section */}
            {!isLoadingWeek && weekProducts && (
                <ProductSection
                    start={0}
                    limit={9}
                    data={convertProducts(weekProducts)}
                    header="Top of the Week"
                    viewAllLink="/week-products"
                />
            )}

        </>
    );
}
