import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ProductListItem } from '@/types/product';

const WISHLIST_STORAGE_KEY = 'Rawura-wishlist';
const MAX_WISHLIST_ITEMS = 100;

/**
 * Client-side wishlist item (optimistic state)
 */
interface WishlistStoreItem {
  _id?: string; // Server-assigned wishlist item ID (undefined for optimistic adds)
  productId: string;
  product: ProductListItem;
  addedAt: string;
}

interface WishlistStore {
  // Client-side optimistic wishlist (before server sync)
  items: WishlistStoreItem[];
  
  // Add product to client-side wishlist
  addItem: (productId: string, product: ProductListItem) => void;
  
  // Remove product from client-side wishlist
  removeItem: (productId: string) => void;
  
  // Check if product is in client-side wishlist
  isInWishlist: (productId: string) => boolean;
  
  // Sync with server data (merge guest + server items, keep server version on duplicates)
  syncFromServer: (serverItems: Array<{ _id: string; product: ProductListItem }>, mergeMode?: 'replace' | 'merge') => void;
  
  // Clear all items
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()(  
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId, product) => {
        set((state) => {
          // Don't add if already exists
          if (state.items.some(item => item.productId === productId)) {
            return state;
          }
          
          // Enforce max wishlist size (100 items)
          if (state.items.length >= MAX_WISHLIST_ITEMS) {
            console.warn(`Wishlist is full (max ${MAX_WISHLIST_ITEMS} items)`);
            return state;
          }
          
          return {
            items: [
              { productId, product, addedAt: new Date().toISOString() },
              ...state.items,
            ],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(item => item.productId !== productId),
        }));
      },

      isInWishlist: (productId) => {
        return get().items.some(item => item.productId === productId);
      },

      syncFromServer: (serverItems, mergeMode = 'replace') => {
        set((state) => {
          if (mergeMode === 'replace') {
            // Replace mode: Server is source of truth (authenticated user logged in)
            return {
              items: serverItems.map(item => ({
                _id: item._id, // Include server wishlist item ID
                productId: item.product._id,
                product: item.product,
                addedAt: new Date().toISOString(),
              })),
            };
          } else {
            // Merge mode: Combine guest + server items (login scenario)
            // CRITICAL: Keep server version on duplicate, discard guest version
            const serverProductIds = new Set(serverItems.map(item => item.product._id));
            
            // Keep guest items that aren't on server
            const guestOnlyItems = state.items.filter(
              item => !serverProductIds.has(item.productId)
            );
            
            // Server items take priority + guest-only items
            const mergedItems = [
              ...serverItems.map(item => ({
                _id: item._id,
                productId: item.product._id,
                product: item.product,
                addedAt: new Date().toISOString(),
              })),
              ...guestOnlyItems,
            ];
            
            // Enforce max limit after merge
            const limitedItems = mergedItems.slice(0, MAX_WISHLIST_ITEMS);
            
            return { items: limitedItems };
          }
        });
      },

      clear: () => {
        set({ items: [] });
      },
    }),
    {
      name: WISHLIST_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist items array
      partialize: (state) => ({ items: state.items }),
    }
  )
);
