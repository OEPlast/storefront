import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import { queryKeys } from '@/provider/react-query';
import {
  AddToWishlistInput,
  OptimisticWishlistProduct,
} from '@/types/wishlist';

/**
 * Add product to wishlist mutation
 * Client-side state managed by Zustand, React Query only for server sync
 */
export const useAddToWishlist = (): UseMutationResult<
  null,
  Error,
  { productId: string; product: OptimisticWishlistProduct }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
    }: {
      productId: string;
      product: OptimisticWishlistProduct;
    }) => {
      const input: AddToWishlistInput = { product: productId };
      const response = await apiClient.post<null>(api.wishlist.add, input);
      return response.data;
    },

    // On success - just invalidate to refetch from server
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all });
    },

    // On error - Zustand will handle rollback via component
    onError: (err) => {
      console.error('Failed to add to wishlist:', err);
    },
  });
};

/**
 * Remove product from wishlist mutation
 * Client-side state managed by Zustand, React Query only for server sync
 */
export const useRemoveFromWishlist = (): UseMutationResult<
  null,
  Error,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (wishlistItemId: string) => {
      const response = await apiClient.delete<null>(api.wishlist.remove(wishlistItemId));
      return response.data;
    },

    // On success - invalidate to refetch from server
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all });
    },

    // On error - Zustand will handle rollback via component
    onError: (err) => {
      console.error('Failed to remove from wishlist:', err);
    },
  });
};
