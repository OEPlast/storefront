'use client';

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

// Existing Review Interface (when user already reviewed)
export interface ExistingReview {
  _id: string;
  rating: number;
  review: string;
  title?: string;
  images?: string[];
  size?: string;
  style?: {
    color: string;
    image: string;
  };
  fit?: string;
  likesCount: number;
  repliesCount: number;
  createdAt: string;
  updatedAt: string;
  reviewBy: {
    _id: string;
    firstName: string;
    lastName: string;
    image?: string;
  };
}

// Order Info Interface (when user can review)
export interface OrderInfo {
  transactionId: string;
  orderId: string;
  qty: number;
  attributes: Array<{
    name: string;
    value: string;
  }>;
}

// Can Review Response Interface
export interface CanReviewResponse {
  canReview: boolean;
  canUpdate?: boolean; // User already reviewed but bought again, can update
  reason?: string;
  hasExistingReview?: boolean;
  existingReview?: ExistingReview;
  orderInfo?: OrderInfo;
}

interface UseCanReviewProductOptions
  extends Omit<UseQueryOptions<CanReviewResponse, Error>, 'queryKey' | 'queryFn'> {
  productId: string;
}

/**
 * Checks if the current user can review a product
 *
 * Requirements checked:
 * - User must be logged in
 * - User must have purchased the product (completed, delivered, paid order)
 * - User must not have already reviewed this product
 *
 * @param productId - Product ID to check review eligibility for
 *
 * @returns {Object} Review eligibility status
 * @returns {boolean} canReview - Whether user can submit a review
 * @returns {string} [reason] - Reason why user cannot review (if canReview is false)
 * @returns {boolean} [hasExistingReview] - Whether user already reviewed this product
 * @returns {ExistingReview} [existingReview] - User's existing review data (if already reviewed)
 * @returns {OrderInfo} [orderInfo] - Order information with attributes (if eligible to review)
 *
 * @example
 * // Basic usage
 * const { data, isLoading, error } = useCanReviewProduct({
 *   productId: '507f1f77bcf86cd799439011'
 * });
 *
 * if (data?.canReview) {
 *   // Show review form
 *   console.log('Purchased attributes:', data.orderInfo?.attributes);
 * } else if (data?.hasExistingReview) {
 *   // Show existing review
 *   console.log('Your review:', data.existingReview);
 * } else {
 *   // Show reason
 *   console.log('Cannot review:', data?.reason);
 * }
 *
 * @example
 * // With enabled flag to control execution
 * const { data } = useCanReviewProduct({
 *   productId,
 *   enabled: !!userId && !!productId, // Only run when user is logged in
 * });
 */
export const useCanReviewProduct = ({
  productId,
  enabled,
  ...restOptions
}: UseCanReviewProductOptions) => {
  return useQuery<CanReviewResponse, Error>({
    queryKey: ['can-review', productId],
    queryFn: async () => {
      const response = await apiClient.get<CanReviewResponse>(api.reviews.canReview(productId));

      if (!response.data) {
        throw new Error('Failed to check review eligibility');
      }

      return response.data;
    },
    // NO CACHING - always fetch fresh data
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    // Only run query if productId is provided
    enabled: enabled ?? !!productId,
    retry: 1,
    ...restOptions,
  });
};
