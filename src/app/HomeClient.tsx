'use client';

import React from 'react';
import ProductSection from '@/components/Home7/ProductSection';
import { useNewProducts, useWeekProducts, useTopSoldProducts, useDealsOfTheDay } from '@/hooks/queries/useProductLists';
import { ProductType } from '@/type/ProductType';

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
                    start={0}
                    limit={20}
                    header="Deals of the Day"
                    viewAllLink="/deals-of-the-day"
                />
            )}

            {/* New Products Section */}
            {!isLoadingNew && newProducts && (
                <ProductSection
                    data={convertProducts(newProducts)}
                    header="New Arrivals"
                    viewAllLink="/shop"
                />
            )}

            {/* Week Products Section */}
            {!isLoadingWeek && weekProducts && (
                <ProductSection
                    data={convertProducts(weekProducts)}
                    header="Top of the Week"
                    viewAllLink="/shop"
                />
            )}

            {/* Top Sold Products Section */}
            {!isLoadingTopSold && topSoldProducts && (
                <ProductSection
                    data={convertProducts(topSoldProducts)}
                    header="Best Sellers"
                    viewAllLink="/shop"
                />
            )}
        </>
    );
}
