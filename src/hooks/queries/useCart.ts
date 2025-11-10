'use client';

/**
 * @deprecated These query hooks are deprecated. Use `useCart` from '@/hooks/useCart' instead.
 * The new useCart hook automatically handles both guest and authenticated users with a unified API.
 *
 * This file is kept for backward compatibility only.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import type { ServerCart } from '@/types/cart';

export interface CartValidationResult {
  valid: boolean;
  message: string;
  updatedItems?: Array<{
    itemId: string;
    productId: string;
    productName: string;
    reason: 'price_changed' | 'sale_expired' | 'sale_reduced';
    oldPrice: number;
    newPrice: number;
    oldDiscount?: number;
    newDiscount?: number;
  }>;
  outOfStockItems?: Array<{
    itemId: string;
    productId: string;
    productName: string;
    requestedQty: number;
    availableStock: number;
  }>;
  totals?: {
    oldSubtotal: number;
    newSubtotal: number;
    totalDiscount: number;
    total: number;
  };
}

/**
 * Hook to fetch the current user's cart
 * Returns cart with items, totals, and applied coupons
 * @returns Query result with cart data
 */
export const useCart = () => {
  return useQuery<ServerCart>({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await apiClient.get<ServerCart>(api.cart.get);
      if (!response.data) {
        throw new Error('No cart data returned');
      }
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds - cart changes frequently
    retry: 1,
  });
};

/**
 * Hook to validate cart sales and pricing before checkout
 * Returns validation result with updated items and OOS items
 * @returns Query result with validation data
 */
export const useValidateCartSales = () => {
  return useQuery<CartValidationResult>({
    queryKey: ['cart', 'validate-sales'],
    queryFn: async () => {
      const response = await apiClient.get<CartValidationResult>(api.cart.validateSales);
      if (!response.data) {
        throw new Error('No validation data returned');
      }
      return response.data;
    },
    enabled: false, // Only run when explicitly triggered
    staleTime: 0, // Always fresh validation
    retry: 0,
  });
};
