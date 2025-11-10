'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

// Review Statistics Interface
export interface ReviewsInfo {
  totalRatings: number;
  averageRating: number;
  starDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface UseReviewsInfoOptions
  extends Omit<UseQueryOptions<ReviewsInfo, Error>, 'queryKey' | 'queryFn'> {
  productId: string;
}

/**
 * Hook to fetch review statistics for a product
 * Returns total ratings count, average rating, and star distribution (5-1 stars)
 *
 * @example
 * const { data, isLoading, error } = useReviewsInfo({ productId: '12345' });
 * if (data) {
 *   console.log(`${data.totalRatings} reviews, avg ${data.averageRating} stars`);
 *   console.log(`5-star: ${data.starDistribution[5]}`);
 * }
 */
export const useReviewsInfo = ({ productId, ...options }: UseReviewsInfoOptions) => {
  return useQuery<ReviewsInfo, Error>({
    queryKey: ['reviews', 'stats', productId],
    queryFn: async () => {
      const response = await apiClient.get<ReviewsInfo>(api.reviews.stats(productId));

      if (!response.data) {
        throw new Error('No review statistics data returned');
      }

      return response.data;
    },
    placeholderData: {
      totalRatings: 0,
      averageRating: 0,
      starDistribution: {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      },
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't change frequently
    enabled: !!productId, // Only run if productId exists
    ...options,
  });
};
