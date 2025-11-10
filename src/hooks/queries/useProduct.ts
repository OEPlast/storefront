'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import api from '@/libs/api/endpoints';
import { ProductDetail } from '@/types/product';

// Re-export ProductDetail from types for convenience
export type { ProductDetail } from '@/types/product';

interface UseProductOptions
  extends Omit<UseQueryOptions<ProductDetail, Error>, 'queryKey' | 'queryFn'> {
  slug: string;
}

/**
 * Fetches product by slug with full details including:
 * - Active sales information
 * - Category details
 * - Review statistics
 * - Merged specifications (dimensions + specifications)
 * - Out-of-stock flags for attribute children
 *
 * @param slug - Product slug
 * @param options - Additional react-query options
 *
 * @example
 * const { data: product, isLoading, error } = useProduct({ slug: 'plastic-chair' });
 */
export const useProduct = ({ slug, ...options }: UseProductOptions) => {
  return useQuery<ProductDetail, Error>({
    queryKey: ['product', slug],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${api.products.bySlug(slug)}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch product');
      }

      const { data } = await response.json();

      if (!data) {
        throw new Error('Product not found');
      }

      return data as ProductDetail;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!slug, // Only run if slug is provided
    ...options,
  });
};
