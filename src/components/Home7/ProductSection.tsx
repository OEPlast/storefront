'use client';

import React from 'react';
import Link from 'next/link';
import Product from '../Product/Product';
import { ProductDetail, ProductListItem } from '@/types/product';
import CountdownTimer from './CountdownTimer';
import { ProductSkeleton } from '../Product/ProductLoading';

interface Props {
    data: Array<ProductListItem>;
    start?: number;
    limit?: number;
    header: string;
    viewAllLink: string;
    showCountdown?: boolean;
    isLoading: boolean;
}
const SKELETON_COUNT = 15;
const ProductSection: React.FC<Props> = ({ data, start, limit, header, viewAllLink, showCountdown = false, isLoading }) => {
    return (
        <>
            <div className="tab-features-block md:pt-20 pt-10">
                <div className="container">
                    <div className="heading flex items-center justify-between gap-5 flex-wrap">
                        <div className="left flex items-center gap-6 gap-y-3 flex-wrap">
                            <div className="heading3">{header}</div>
                            <CountdownTimer showCountdown={showCountdown} />
                        </div>
                        <Link href={viewAllLink} className='text-button pb-1 border-b-2 border-black'>View All</Link>
                    </div>

                    <div className="list-product show-product-sold grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 grid-cols-2 sm:gap-[30px] gap-[20px] md:mt-10 mt-6">
                        {isLoading ?
                            Array.from({ length: SKELETON_COUNT }, (_, i) => (
                                <ProductSkeleton key={`mainpageProcuctSkeleton__${i}`} />
                            )) : data.slice(start, limit).map((prd, index) => (
                                <Product key={index} data={prd} type='grid' />
                            ))
                        }

                    </div>

                </div>
            </div>
        </>
    );
};

export default ProductSection;