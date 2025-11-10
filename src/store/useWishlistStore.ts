import { create } from 'zustand';
import { ProductListItem } from '@/types/product';

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
  
  // Sync with server data (replace all items)
  syncFromServer: (serverItems: Array<{ _id: string; product: ProductListItem }>) => void;
  
  // Clear all items
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  items: [],

  addItem: (productId, product) => {
    set((state) => {
      // Don't add if already exists
      if (state.items.some(item => item.productId === productId)) {
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

  syncFromServer: (serverItems) => {
    set({
      items: serverItems.map(item => ({
        _id: item._id, // Include server wishlist item ID
        productId: item.product._id,
        product: item.product,
        addedAt: new Date().toISOString(),
      })),
    });
  },

  clear: () => {
    set({ items: [] });
  },
}));
