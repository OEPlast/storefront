'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useWishlistItems } from '@/hooks/queries/useWishlist';
import { useRemoveFromWishlist } from '@/hooks/mutations/useWishlistMutations';
import { useWishlistStore } from '@/store/useWishlistStore';
import Product from '@/components/Product/Product';
import HandlePagination from '@/components/Other/HandlePagination';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { ProductListItem } from '@/types/product';
import { WishlistItem } from '@/types/wishlist';

const WishlistClient = () => {
    const { data: session, status } = useSession();
    const [sortOption, setSortOption] = useState('');
    const [layoutCol, setLayoutCol] = useState<number | null>(4);
    const [currentPage, setCurrentPage] = useState(1); // 1-indexed for API
    const productsPerPage = 12;

    // Fetch wishlist items with React Query
    const { data: wishlistData, isLoading, error } = useWishlistItems(currentPage, productsPerPage);
    const { mutate: removeFromWishlist } = useRemoveFromWishlist();

    const handleLayoutCol = (col: number) => {
        setLayoutCol(col);
    };

    const handleSortChange = (option: string) => {
        setSortOption(option);
    };

    // Get wishlist items or empty array
    const wishlistItems = wishlistData?.data || [];

    const totalProducts = wishlistData?.meta?.total || 0;

    // Extract ProductListItem from WishlistItem, filter out null/undefined products
    let productList: ProductListItem[] = wishlistItems
        .filter(item => item.product != null) // Filter out deleted products
        .map(item => item.product);

    // Handle empty state
    const hasProducts = productList.length > 0;

    // Apply sorting
    let sortedData = [...productList];

    if (sortOption === 'soldQuantityHighToLow') {
        sortedData = sortedData.sort((a, b) => {
            const soldA = a.originStock - a.stock;
            const soldB = b.originStock - b.stock;
            return soldB - soldA;
        });
    }

    if (sortOption === 'priceHighToLow') {
        sortedData = sortedData.sort((a, b) => b.price - a.price);
    }

    if (sortOption === 'priceLowToHigh') {
        sortedData = sortedData.sort((a, b) => a.price - b.price);
    }

    // Calculate page count from meta
    const pageCount = wishlistData?.meta?.pages || 0;

    const handlePageChange = (selected: number) => {
        setCurrentPage(selected + 1); // HandlePagination uses 0-indexed, API uses 1-indexed
    };

    if (status === 'loading') return null;

    return (
        <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
            <div className="container">
                <div className="list-product-block relative">
                    <div className="filter-heading flex items-center justify-between gap-5 flex-wrap">
                        <div className="left flex has-line items-center flex-wrap gap-5">
                            <div className="choose-layout flex items-center gap-2">
                                <div
                                    className={`item three-col p-2 border border-line rounded flex items-center justify-center cursor-pointer ${layoutCol === 3 ? 'active' : ''}`}
                                    onClick={() => handleLayoutCol(3)}
                                >
                                    <div className='flex items-center gap-0.5'>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                    </div>
                                </div>
                                <div
                                    className={`item four-col p-2 border border-line rounded flex items-center justify-center cursor-pointer ${layoutCol === 4 ? 'active' : ''}`}
                                    onClick={() => handleLayoutCol(4)}
                                >
                                    <div className='flex items-center gap-0.5'>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                    </div>
                                </div>
                                <div
                                    className={`item five-col p-2 border border-line rounded flex items-center justify-center cursor-pointer ${layoutCol === 5 ? 'active' : ''}`}
                                    onClick={() => handleLayoutCol(5)}
                                >
                                    <div className='flex items-center gap-0.5'>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="right flex items-center gap-3">
                            <div className="select-block relative">
                                <select
                                    id="select-filter"
                                    name="select-filter"
                                    className='caption1 py-2 pl-3 md:pr-20 pr-10 rounded-lg border border-line'
                                    onChange={(e) => { handleSortChange(e.target.value); }}
                                    defaultValue={'Sorting'}
                                >
                                    <option value="Sorting" disabled>Sorting</option>
                                    <option value="soldQuantityHighToLow">Best Selling</option>
                                    <option value="priceHighToLow">Price High To Low</option>
                                    <option value="priceLowToHigh">Price Low To High</option>
                                </select>
                                <Icon.CaretDown size={12} className='absolute top-1/2 -translate-y-1/2 md:right-4 right-2' />
                            </div>
                        </div>
                    </div>

                    <div className="list-filtered flex items-center gap-3 mt-4">
                        <div className="total-product">
                            {isLoading ? '...' : totalProducts}
                            <span className='text-secondary pl-1'>Products Found</span>
                        </div>
                    </div>

                    {!session?.user ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center max-w-md mx-auto">
                                {/* TODO: Add empty state image here */}
                                <div className="w-32 h-32 mx-auto mb-6 bg-surface rounded-full flex items-center justify-center">
                                    <Icon.Heart size={64} className="text-secondary2" weight="light" />
                                </div>
                                <h3 className="heading5 mb-2">Please login to view your wishlist</h3>
                                <p className="text-secondary mb-6">Save your favorite items and access them from any device</p>
                                <Link
                                    href="/login?redirect=/wishlist"
                                    className="button-main inline-block px-8 py-3 rounded-full"
                                >
                                    Login to Continue
                                </Link>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
                                <p className="mt-4 text-secondary">Loading wishlist...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <p className="text-red-600">Failed to load wishlist</p>
                                <p className="text-secondary mt-2">Please try again later</p>
                            </div>
                        </div>
                    ) : !hasProducts ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <p className="text-secondary">No products in your wishlist</p>
                                <p className="text-sm text-secondary mt-2">Start adding products to see them here</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={`list-product hide-product-sold grid lg:grid-cols-${layoutCol} sm:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-7`}>
                                {sortedData.map((item) => (
                                    <Product key={item._id} data={item} type='grid' />
                                ))}
                            </div>

                            {pageCount > 1 && (
                                <div className="list-pagination flex items-center justify-center md:mt-10 mt-7">
                                    <HandlePagination pageCount={pageCount} onPageChange={handlePageChange} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WishlistClient

