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
const ProductSection: React.FC<Props> = ({
  data,
  start,
  limit,
  header,
  viewAllLink,
  showCountdown = false,
  isLoading,
}) => {
  return (
    <>
      <div className="tab-features-block pt-10 md:pt-20">
        <div className="container">
          <div className="heading flex flex-wrap items-center justify-between gap-5">
            <div className="left flex flex-wrap items-center gap-6 gap-y-3">
              <div className="heading3">{header}</div>
              <CountdownTimer showCountdown={showCountdown} />
            </div>
            <Link href={viewAllLink} className="text-button border-b-2 border-black pb-1">
              View All
            </Link>
          </div>

          <div className="list-product show-product-sold mt-6 grid grid-cols-2 gap-[20px] sm:gap-[22px] md:mt-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {/* 3xl:grid-cols-6 */}
            {isLoading
              ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <ProductSkeleton key={`mainpageProcuctSkeleton__${i}`} />
                ))
              : data
                  .slice(start, limit)
                  .map((prd, index) => <Product key={index} data={prd} type="grid" />)}
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductSection;
