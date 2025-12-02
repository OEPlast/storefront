'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '@/libs/api/endpoints';
import { Product } from '@/types/product';
import { ProductType } from '@/types/ProductType';

interface UseRelatedProductsOptions
  extends Omit<UseQueryOptions<ProductType[], Error>, 'queryKey' | 'queryFn'> {
  productId: string;
  limit?: number;
}

/**
 * Fetches related products based on category, tags, and name keywords
 * Relevance scoring:
 * - Category match: +50 points
 * - Tag matches: +10 points each
 * - Name keyword matches: +5 points each
 *
 * @param productId - Product ID to find related products for
 * @param limit - Number of related products to fetch (default: 8, max: 20)
 *
 * @example
 * const { data: relatedProducts, isLoading } = useRelatedProducts({
 *   productId: '507f1f77bcf86cd799439011',
 *   limit: 8
 * });
 */
export const useRelatedProducts = ({
  productId,
  limit = 8,
  ...options
}: UseRelatedProductsOptions) => {
  return useQuery<ProductType[], Error>({
    queryKey: ['related-products', productId, limit],
    queryFn: async () => {
      const url = `${process.env.NEXT_PUBLIC_API_URL}${api.products.relatedProducts(productId)}?limit=${limit}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch related products');
      }

      const { data } = await response.json();
      return (data || []) as ProductType[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (related products rarely change)
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!productId,
    ...options,
  });
};

interface UsePopularProductsOptions
  extends Omit<UseQueryOptions<ProductType[], Error>, 'queryKey' | 'queryFn'> {
  limit?: number;
}

/**
 * Fetches popular products based on 30-day order volume
 * Used as fallback when no related products found
 *
 * @param limit - Number of popular products to fetch (default: 8, max: 20)
 *
 * @example
 * const { data: popularProducts, isLoading } = usePopularProducts({ limit: 8 });
 */
export const usePopularProducts = ({ limit = 8, ...options }: UsePopularProductsOptions = {}) => {
  return useQuery<ProductType[], Error>({
    queryKey: ['popular-products', limit],
    queryFn: async () => {
      const url = `${process.env.NEXT_PUBLIC_API_URL}${api.products.popularProducts}?limit=${limit}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch popular products');
      }

      const { data } = await response.json();
      return (data || []) as ProductType[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    ...options,
  });
};
