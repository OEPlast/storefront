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
 * On first authenticated fetch, merges guest wishlist with server data
 */
export const useWishlistItems = (
  page: number = 1,
  limit: number = 30
): UseQueryResult<{ data: WishlistItem[]; meta: WishlistMeta }, Error> => {
  const { data: session } = useSession();
  const syncFromServer = useWishlistStore(state => state.syncFromServer);
  const localItems = useWishlistStore(state => state.items);
  const hasMergedRef = React.useRef(false);

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
    if (query.data?.data && session?.user) {
      // First authenticated fetch: merge guest + server items (server version wins on duplicates)
      if (!hasMergedRef.current && localItems.length > 0 && page === 1) {
        syncFromServer(query.data.data, 'merge');
        hasMergedRef.current = true;
      } else {
        // Subsequent fetches: replace with server data
        syncFromServer(query.data.data, 'replace');
      }
    }
  }, [query.data, syncFromServer, session?.user, localItems.length, page]);

  return query;
};

/**
 * Hook to get total wishlist count
 */
export const useWishlistCount = (): UseQueryResult<number, Error> => {
  const { data: session } = useSession();
  const localItems = useWishlistStore(state => state.items);

  return useQuery({
    queryKey: queryKeys.wishlist.count(),
    queryFn: fetchWishlistCount,
    enabled: !!session?.user, // Only fetch if authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
    // If not authenticated, use local count as placeholder
    placeholderData: !session?.user ? localItems.length : undefined,
  });
};

/**
 * Hook to check if a product is in the wishlist
 * Uses Zustand store for client-side state (works for both guest and authenticated)
 * Returns wishlist item ID for removal operations
 */
export const useIsInWishlist = (
  productId: string
): { isInWishlist: boolean; wishlistItemId: string | null } => {
  const items = useWishlistStore(state => state.items);

  // Search for product in Zustand store (guest or authenticated)
  const wishlistItem = items.find((item) => item.productId === productId);

  return {
    isInWishlist: !!wishlistItem,
    wishlistItemId: wishlistItem?._id || null,
  };
};
