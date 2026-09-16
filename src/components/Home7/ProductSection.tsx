'use client';

import React from 'react';
import Link from 'next/link';
import Product from '../Product/Product';
import { ProductDetail, ProductListItem } from '@/types/product';
import CountdownTimer from './CountdownTimer';
import { ProductSkeleton } from '../Product/ProductLoading';
import { cn } from '@/libs/utils';

interface Props {
  data: Array<ProductListItem>;
  start?: number;
  limit?: number;
  header: string;
  /** Omit on a page that already IS the full listing (e.g. /deals), so "View All" isn't a self-link. */
  viewAllLink?: string;
  /** Rendered under the heading. */
  description?: string;
  /** Use 'h1' when the section is the page's main heading. Homepage sections stay a div. */
  headingAs?: 'div' | 'h1' | 'h2';
  showCountdown?: boolean;
  isLoading: boolean;
  /** Top spacing of the block. Defaults to the homepage rhythm between stacked sections. */
  spacingClassName?: string;
}
const SKELETON_COUNT = 15;
const ProductSection: React.FC<Props> = ({
  data,
  start,
  limit,
  header,
  viewAllLink,
  description,
  headingAs: Heading = 'div',
  showCountdown = false,
  isLoading,
  spacingClassName = 'pt-10 md:pt-20',
}) => {
  return (
    <>
      <div className={cn('tab-features-block', spacingClassName)}>
        <div className="container">
          <div className="heading flex flex-wrap items-center justify-between gap-5">
            <div className="left flex flex-wrap items-center gap-6 gap-y-3">
              <Heading className="heading3">{header}</Heading>
              <CountdownTimer showCountdown={showCountdown} />
            </div>
            {viewAllLink ? (
              <Link href={viewAllLink} className="text-button border-b-2 border-black pb-1">
                View All
              </Link>
            ) : null}
          </div>
          {description ? <p className="body1 mt-2 text-secondary">{description}</p> : null}

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
