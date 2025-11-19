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
    limit = 4
}: RelatedProductsProps) {
    // Try to fetch related products first
    const {
        data: relatedProducts,
        isLoading: isLoadingRelated,
    } = useRelatedProducts({ productId, limit });

    // Fetch popular products as fallback
    const {
        data: popularProducts,
        isLoading: isLoadingPopular,
    } = usePopularProducts({
        limit,
        enabled: !isLoadingRelated && (!relatedProducts || relatedProducts.length === 0),
    });

    // Determine which products to show
    const products = relatedProducts && relatedProducts.length > 0 ? relatedProducts : popularProducts || [];
    const isLoading = isLoadingRelated || (!relatedProducts?.length && isLoadingPopular);

    if (isLoading) {
        return (
            <div className={`related-product md:py-20 py-10 ${className}`}>
                <div className="container">
                    <div className="heading3 text-center">Related Products</div>
                    <div className="list-product hide-product-sold grid md:grid-cols-3 lg:grid-cols-5 grid-cols-2 md:gap-[30px] gap-5 md:mt-10 mt-6">
                        {[...Array(4)].map((_, index) => (
                            <div key={index} className="animate-pulse">
                                <div className="aspect-square bg-gray-200 rounded-lg mb-3"></div>
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
        <div className={`related-product md:py-20 py-10 ${className}`}>
            <div className="container">
                <div className="heading3 text-center">Related Products</div>
                <div className="list-product hide-product-sold grid md:grid-cols-3 lg:grid-cols-5 grid-cols-2 md:gap-[30px] gap-5 md:mt-10 mt-6">
                    {products.map((item, index) => (
                        <Product key={index} data={item} type='grid' />
                    ))}
                </div>
            </div>
        </div>
    );
}
