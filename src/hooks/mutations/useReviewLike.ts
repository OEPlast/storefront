'use client';

import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient, handleApiError } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import type { Review } from '../queries/useProductReviews';
import { useRef, useCallback } from 'react';

interface ToggleLikeResponse {
  message: string;
  data: {
    liked: boolean;
    likesCount: number;
  } | null;
}

interface ToggleLikeVariables {
  reviewId: string;
  productId: string;
  isCurrentlyLiked: boolean;
}

type MutationContext = {
  previousReviews?: any;
};

/**
 * Toggle like on a review with optimistic updates
 * Automatically handles authentication check and updates query cache
 *
 * @example
 * const { data: session } = useSession();
 * const toggleLike = useReviewLike({
 *   onSuccess: () => {
 *     console.log('Like toggled successfully');
 *   },
 *   onError: (error) => {
 *     if (error.message === 'AUTHENTICATION_REQUIRED') {
 *       // Redirect to login
 *       router.push('/login');
 *     }
 *   }
 * });
 *
 * // In component
 * <button onClick={() => toggleLike.mutate({ reviewId: review._id, productId })}>
 *   {review.likes.includes(session?.user?.id) ? 'Unlike' : 'Like'} ({review.likesCount})
 * </button>
 */
export const useReviewLike = (
  options?: Omit<
    UseMutationOptions<ToggleLikeResponse, Error, ToggleLikeVariables, MutationContext>,
    'mutationFn'
  >
) => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const mutation = useMutation<ToggleLikeResponse, Error, ToggleLikeVariables, MutationContext>({
    mutationFn: async ({
      reviewId,
      isCurrentlyLiked,
    }: ToggleLikeVariables): Promise<ToggleLikeResponse> => {
      // Check authentication
      if (!session?.user) {
        throw new Error('AUTHENTICATION_REQUIRED');
      }

      // Use unlike endpoint if currently liked, otherwise use like endpoint
      const endpoint = isCurrentlyLiked ? api.reviews.unlike(reviewId) : api.reviews.like(reviewId);

      const response = await apiClient.post<{ liked: boolean; likesCount: number } | null>(
        endpoint
      );

      // Backend returns data: null on success, which is OK
      // The optimistic update handles the UI state
      return {
        message:
          response.message ||
          (isCurrentlyLiked ? 'Review unliked successfully' : 'Review liked successfully'),
        data: response.data,
      };
    },

    // Optimistic update - immediately update UI before server responds
    onMutate: async ({ reviewId, productId }) => {
      if (!session?.user?.id) {
        return { previousReviews: undefined };
      }

      // Cancel outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ['product-reviews', productId] });

      // Snapshot previous value for rollback
      const previousReviews = queryClient.getQueryData(['product-reviews', productId]);

      // Optimistically update the cache
      queryClient.setQueryData(['product-reviews', productId], (old: any) => {
        if (!old?.pages) return old;

        const userId = session.user.id!;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((review: Review) => {
              if (review._id !== reviewId) return review;

              const isLiked = review.likes.includes(userId);

              return {
                ...review,
                likes: isLiked
                  ? review.likes.filter((id) => id !== userId)
                  : [...review.likes, userId],
                likesCount: isLiked ? review.likesCount - 1 : review.likesCount + 1,
              };
            }),
          })),
        };
      });

      return { previousReviews };
    },

    // On error, rollback to previous state
    onError: (error, variables, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(['product-reviews', variables.productId], context.previousReviews);
      }
    },

    // On success, invalidate to refetch and sync with server
    onSuccess: (data, variables, context) => {
      // Invalidate queries to ensure sync with server
      queryClient.invalidateQueries({
        queryKey: ['product-reviews', variables.productId],
        exact: false,
      });
    },

    ...options,
  });

  // Debounced mutate function to prevent rapid clicking
  const debouncedMutate = useCallback(
    (variables: ToggleLikeVariables) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        mutation.mutate(variables);
      }, 500); // 500ms debounce
    },
    [mutation]
  );

  return {
    ...mutation,
    mutate: debouncedMutate,
  };
};
