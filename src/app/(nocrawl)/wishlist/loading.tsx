import React from 'react';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { ProductSkeleton } from '@/components/Product/ProductLoading';

export default function WishlistLoading() {
    return (
        <>
            <Breadcrumb heading='Wish list' />
            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="list-product-block relative">
                        <div className="filter-heading flex items-center justify-between gap-5 flex-wrap">
                            <div className="left flex has-line items-center flex-wrap gap-5">
                                <div className="choose-layout items-center gap-2 hidden sm:flex">
                                    <div className="item four-col p-2 border border-line rounded flex items-center justify-center">
                                        <div className='flex items-center gap-0.5'>
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
                                    <div className='caption1 py-2 pl-3 md:pr-20 pr-10 rounded-lg border border-line bg-surface animate-pulse w-40 h-10'></div>
                                </div>
                            </div>
                        </div>


                        {/* Loading skeleton */}
                        <div className="grid lg:grid-cols-4 sm:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-7">
                            {Array(15).fill(0).map((_, index) => (
                                <ProductSkeleton key={`productSkeleton__${index}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
