import React from 'react';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import { queryKeys } from '@/provider/react-query';
import { WishlistItem, WishlistMeta } from '@/types/wishlist';
import { useWishlistStore } from '@/store/useWishlistStore';

/**
 * Fetch wishlist items with pagination
 */
const fetchWishlistItems = async (
  page: number = 1,
  limit: number = 30
): Promise<{ data: WishlistItem[]; meta: WishlistMeta }> => {
  const response = await apiClient.getWithMeta<WishlistItem[], WishlistMeta>(
    `${api.wishlist.list}?page=${page}&limit=${limit}`
  );

  if (!response.data) {
    return {
      data: [],
      meta: { total: 0, page, limit, pages: 0, hasNext: false, hasPrev: false },
    };
  }

  return { data: response.data, meta: response.meta! };
};

/**
 * Fetch wishlist count
 */
const fetchWishlistCount = async (): Promise<number> => {
  const response = await apiClient.get<number>(api.wishlist.count);
  return response.data || 0;
};

/**
 * Hook to get wishlist items with pagination
 * Syncs data to Zustand store for client-side state management
 */
export const useWishlistItems = (
  page: number = 1,
  limit: number = 30
): UseQueryResult<{ data: WishlistItem[]; meta: WishlistMeta }, Error> => {
  const { data: session } = useSession();
  const syncFromServer = useWishlistStore(state => state.syncFromServer);

  const query = useQuery({
    queryKey: queryKeys.wishlist.list(page),
    queryFn: () => fetchWishlistItems(page, limit),
    enabled: !!session?.user, // Only fetch if authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });

  // Sync to Zustand when data is successfully fetched
  React.useEffect(() => {
    if (query.data?.data) {
      syncFromServer(query.data.data);
    }
  }, [query.data, syncFromServer]);

  return query;
};

/**
 * Hook to get total wishlist count
 */
export const useWishlistCount = (): UseQueryResult<number, Error> => {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.wishlist.count(),
    queryFn: fetchWishlistCount,
    enabled: !!session?.user, // Only fetch if authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
};

/**
 * Hook to check if a product is in the wishlist
 * Uses Zustand store for client-side state
 * Returns wishlist item ID for removal operations
 */
export const useIsInWishlist = (
  productId: string
): { isInWishlist: boolean; wishlistItemId: string | null } => {
  const { data: session } = useSession();
  const items = useWishlistStore(state => state.items);

  // If not authenticated, product cannot be in wishlist
  if (!session?.user) {
    return { isInWishlist: false, wishlistItemId: null };
  }

  // Search for product in Zustand store
  const wishlistItem = items.find((item) => item.productId === productId);

  return {
    isInWishlist: !!wishlistItem,
    wishlistItemId: wishlistItem?._id || null,
  };
};
