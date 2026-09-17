'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useWishlistItems } from '@/hooks/queries/useWishlist';
import { useRemoveFromWishlist } from '@/hooks/mutations/useWishlistMutations';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import Product from '@/components/Product/Product';
import HandlePagination from '@/components/Other/HandlePagination';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { ProductListItem } from '@/types/product';
import { WishlistItem } from '@/types/wishlist';

const WishlistClient = () => {
  const { data: session, status } = useSession();
  const { openLoginModal } = useLoginModalStore();
  const [sortOption, setSortOption] = useState('');
  const [layoutCol, setLayoutCol] = useState<number | null>(4);
  const [currentPage, setCurrentPage] = useState(1); // 1-indexed for API
  const productsPerPage = 15;

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
    .filter((item) => item.product != null) // Filter out deleted products
    .map((item) => item.product);

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
    <>
      {!session?.user ? null : (
        <div className="bg-surface px-4 py-10 md:px-8 lg:px-12">
          <div className="heading2 text-center">Wishlist</div>
        </div>
      )}

      <div className="shop-product breadcrumb1 py-10 md:py-14 lg:py-20">
        <div className="container">
          <div className="list-product-block relative">
            <div className="filter-heading flex flex-wrap items-center justify-between gap-5">
              <div className="left has-line flex flex-wrap items-center gap-5">
                <div className="choose-layout hidden items-center gap-2 sm:flex">
                  <div
                    className={`item three-col flex cursor-pointer items-center justify-center rounded border border-line p-2 ${layoutCol === 3 ? 'active' : ''}`}
                    onClick={() => handleLayoutCol(3)}
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                    </div>
                  </div>
                  <div
                    className={`item four-col flex cursor-pointer items-center justify-center rounded border border-line p-2 ${layoutCol === 4 ? 'active' : ''}`}
                    onClick={() => handleLayoutCol(4)}
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                    </div>
                  </div>
                  <div
                    className={`item five-col flex cursor-pointer items-center justify-center rounded border border-line p-2 ${layoutCol === 5 ? 'active' : ''}`}
                    onClick={() => handleLayoutCol(5)}
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                      <span className="h-4 w-[3px] rounded-sm bg-secondary2"></span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="right flex items-center gap-3">
                <div className="select-block relative">
                  <select
                    id="select-filter"
                    name="select-filter"
                    className="caption1 rounded-lg border border-line py-2 pl-3 pr-10 md:pr-20"
                    onChange={(e) => {
                      handleSortChange(e.target.value);
                    }}
                    defaultValue={'Sorting'}
                  >
                    <option value="Sorting" disabled>
                      Sorting
                    </option>
                    <option value="soldQuantityHighToLow">Best Selling</option>
                    <option value="priceHighToLow">Price High To Low</option>
                    <option value="priceLowToHigh">Price Low To High</option>
                  </select>
                  <Icon.CaretDown
                    size={12}
                    className="absolute right-2 top-1/2 -translate-y-1/2 md:right-4"
                  />
                </div>
              </div>
            </div>

            <div className="list-filtered mt-4 flex items-center gap-3">
              <div className="total-product">
                {isLoading ? '...' : totalProducts}
                <span className="pl-1 text-secondary">Products Found</span>
              </div>
            </div>

            {!session?.user ? (
              <div className="flex items-center justify-center py-20">
                <div className="mx-auto max-w-md text-center">
                  {/* TODO: Add empty state image here */}
                  <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-surface">
                    <Icon.Heart size={64} className="text-secondary2" weight="light" />
                  </div>
                  <h3 className="heading5 mb-2">Please login to view your wishlist</h3>
                  <p className="mb-6 text-secondary">
                    Save your favorite items and access them from any device
                  </p>
                  <button
                    type="button"
                    onClick={() => openLoginModal()}
                    className="button-main inline-block rounded-full px-8 py-3"
                  >
                    Login to Continue
                  </button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-black"></div>
                  <p className="mt-4 text-secondary">Loading wishlist...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-red-600">Failed to load wishlist</p>
                  <p className="mt-2 text-secondary">Please try again later</p>
                </div>
              </div>
            ) : !hasProducts ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <p className="text-secondary">No products in your wishlist</p>
                  <p className="mt-2 text-sm text-secondary">
                    Start adding products to see them here
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`list-product hide-product-sold grid lg:grid-cols-${layoutCol} mt-7 grid-cols-2 gap-[20px] sm:grid-cols-3 sm:gap-[30px]`}
                >
                  {sortedData.map((item) => (
                    <Product key={item._id} data={item} type="grid" />
                  ))}
                </div>

                {pageCount > 1 && (
                  <div className="list-pagination mt-7 flex items-center justify-center md:mt-10">
                    <HandlePagination pageCount={pageCount} onPageChange={handlePageChange} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default WishlistClient;
