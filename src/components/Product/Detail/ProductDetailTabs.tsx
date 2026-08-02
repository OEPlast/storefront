'use client';

import React, { useState } from 'react';
import { ProductSpecification } from '@/types/product';
import ProductDescription from './ProductDescription';
import ReviewsList from '../Reviews/ReviewsList';

interface Props {
  productId: string;
  description?: string;
  specifications?: ProductSpecification[];
}

const ProductDetailTabs: React.FC<Props> = ({ productId, description, specifications }) => {
  const [activeTab, setActiveTab] = useState<string | undefined>('description');

  const handleActiveTab = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="desc-tab">
      <div className="container">
        <div className="flex w-full items-center justify-center">
          <div className="menu-tab flex items-center gap-8 md:gap-[60px]">
            <div
              className={`tab-item heading5 has-line-before text-secondary2 duration-300 hover:text-black ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => handleActiveTab('description')}
            >
              Description
            </div>
            <div
              className={`tab-item heading5 has-line-before text-secondary2 duration-300 hover:text-black ${activeTab === 'specifications' ? 'active' : ''}`}
              onClick={() => handleActiveTab('specifications')}
            >
              Specifications
            </div>
            <div
              className={`tab-item heading5 has-line-before text-secondary2 duration-300 hover:text-black ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => handleActiveTab('review')}
            >
              Review
            </div>
          </div>
        </div>
        <div className="desc-block mt-8">
          <div
            className={`desc-item description rounded-md border shadow-sm ${activeTab === 'description' ? 'open' : ''}`}
          >
            <ProductDescription description={description} />
          </div>
          <div
            className={`desc-item specifications flex items-center justify-center rounded-md border shadow-sm ${activeTab === 'specifications' ? 'open' : ''}`}
          >
            <div className="w-full sm:w-3/4 lg:w-1/2">
              {specifications && specifications.length > 0 ? (
                specifications.map((spec, index) => (
                  <div
                    key={index}
                    className={`item flex items-center gap-8 px-10 py-3 ${index % 2 === 0 ? 'bg-surface' : ''}`}
                  >
                    <div className="text-title w-1/3 capitalize sm:w-1/4">{spec.key}</div>
                    <p>{spec.value}</p>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-secondary">
                  No specifications available for this product.
                </div>
              )}
            </div>
          </div>
          <div
            className={`desc-item review-block mx-auto mt-4 max-w-[1200px] ${activeTab === 'review' ? 'open' : ''}`}
          >
            <ReviewsList productId={productId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailTabs;
