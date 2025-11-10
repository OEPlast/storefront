'use client';

import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

// Review Interface
export interface Review {
  _id: string;
  rating: number;
  title?: string;
  message: string;
  images?: string[];
  likes: string[]; // Array of user IDs who liked
  likesCount: number;
  repliesCount: number;
  isLikedByUser: boolean;
  createdAt: string;
  reviewBy: {
    _id: string;
    firstName: string;
    lastName: string;
    image?: string;
  };
  transactionId?: string;
  orderId?: string;
}

interface ReviewsResponse {
  message: string;
  data: Review[];
  meta: {
    nextCursor: string | null;
    count: number;
  };
}

interface UseProductReviewsOptions
  extends Omit<
    UseInfiniteQueryOptions<ReviewsResponse, Error>,
    'queryKey' | 'queryFn' | 'getNextPageParam' | 'initialPageParam'
  > {
  productId: string;
  limit?: number;
  filters?: {
    rating?: 1 | 2 | 3 | 4 | 5;
    hasImages?: boolean;
    sortBy?:
      | 'newest'
      | 'helpful'
      | 'rating-high'
      | 'rating-low'
      | '5star'
      | '4star'
      | '3star'
      | '2star'
      | '1star';
  };
}

/**
 * Fetches product reviews with infinite scroll pagination
 *
 * @param productId - Product ID to fetch reviews for
 * @param limit - Number of reviews per page (default: 10)
 * @param filters - Optional filters for rating, images, and sorting
 *
 * @example
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 *   isLoading
 * } = useProductReviews({
 *   productId: '507f1f77bcf86cd799439011',
 *   limit: 10,
 *   filters: { sortBy: 'helpful', hasImages: true }
 * });
 *
 * // Access all reviews
 * const allReviews = data?.pages.flatMap(page => page.data) || [];
 *
 * // Load more reviews
 * <button onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
 *   {isFetchingNextPage ? 'Loading...' : hasNextPage ? 'Load More' : 'No more reviews'}
 * </button>
 */
export const useProductReviews = ({
  productId,
  limit = 10,
  filters,
  enabled,
  staleTime,
  refetchOnMount,
  refetchOnWindowFocus,
  retry,
  ...restOptions
}: UseProductReviewsOptions) => {
  return useInfiniteQuery<ReviewsResponse, Error>({
    queryKey: ['product-reviews', productId, limit, filters],
    queryFn: async ({ pageParam }) => {
      // Build query params
      const params = new URLSearchParams({
        limit: String(limit),
      });

      // Add cursor if not first page
      if (pageParam) {
        params.append('cursor', String(pageParam));
      }

      if (filters?.rating) {
        params.append('rating', String(filters.rating));
      }
      if (filters?.hasImages !== undefined) {
        params.append('hasImages', String(filters.hasImages));
      }
      if (filters?.sortBy) {
        params.append('sortBy', filters.sortBy);
      }

      const response = await apiClient.getWithMeta<
        Review[],
        { nextCursor: string | null; count: number }
      >(`${api.reviews.byProduct(productId)}?${params.toString()}`);

      if (!response.data) {
        throw new Error('Failed to fetch reviews');
      }

      return {
        message: response.message,
        data: response.data,
        meta: response.meta || { nextCursor: null, count: 0 },
      };
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      // Return nextCursor if it exists, otherwise undefined (no more pages)
      return lastPage.meta?.nextCursor || undefined;
    },
    enabled: enabled ?? !!productId,
    staleTime: staleTime ?? 20 * 60 * 1000, // 20 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
