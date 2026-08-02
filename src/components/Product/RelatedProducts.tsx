'use client';

import { useRelatedProducts, usePopularProducts } from '@/hooks/queries/useRelatedProducts';
import Product from '@/components/Product/Product';

interface RelatedProductsProps {
  productId: string;
  className?: string;
  limit?: number;
}

export default function RelatedProducts({
  productId,
  className = '',
  limit = 4,
}: RelatedProductsProps) {
  // Try to fetch related products first
  const { data: relatedProducts, isLoading: isLoadingRelated } = useRelatedProducts({
    productId,
    limit,
  });

  // Fetch popular products as fallback
  const { data: popularProducts, isLoading: isLoadingPopular } = usePopularProducts({
    limit,
    enabled: !isLoadingRelated && (!relatedProducts || relatedProducts.length === 0),
  });

  // Determine which products to show
  const products =
    relatedProducts && relatedProducts.length > 0 ? relatedProducts : popularProducts || [];
  const isLoading = isLoadingRelated || (!relatedProducts?.length && isLoadingPopular);

  if (isLoading) {
    return (
      <div className={`related-product py-10 md:py-20 ${className}`}>
        <div className="container">
          <div className="heading3 text-center">Related Products</div>
          <div className="list-product hide-product-sold mt-6 grid grid-cols-2 gap-5 md:mt-10 md:grid-cols-3 md:gap-[30px] lg:grid-cols-5">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className={`animate-pulse ${index === 4 ? `max-[768px]:hidden` : ``}`}
              >
                <div className="mb-3 aspect-square rounded-lg bg-gray-200"></div>
                <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                <div className="h-4 w-1/2 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className={`related-product py-10 md:py-20 ${className}`}>
      <div className="container">
        <div className="heading3 text-center">Related Products</div>
        <div className="list-product hide-product-sold mt-6 grid grid-cols-2 gap-5 md:mt-10 md:grid-cols-3 md:gap-[30px] lg:grid-cols-5">
          {products.map((item, index) => (
            <Product key={index} data={item} type="grid" />
          ))}
        </div>
      </div>
    </div>
  );
}
