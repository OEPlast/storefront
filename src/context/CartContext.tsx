'use client';

/**
 * CartContext - PRIMARY cart state management (client-side)
 * 
 * Philosophy:
 * - Client cart is the source of truth
 * - Server cart is secondary (cross-device/session backup only)
 * - Store FULL product details in cart items
 * - Calculate pricing at render time using stored product data
 * - Optimistic mutations (add immediately, sync to server in background)
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { ProductDetail } from '@/types/product';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

const CART_STORAGE_KEY = 'Rawura-cart';

// Cart item = Full product + cart metadata
export interface CartItem extends ProductDetail {
    qty: number;
    selectedAttributes: Array<{ name: string; value: string; }>;
    selectedVariant?: string;
    addedAt: string;
    cartItemId: string; // Unique ID for this cart item
}

interface CartState {
    items: CartItem[];
    lastUpdated: string;
}

type CartAction =
    | { type: 'ADD_ITEM'; payload: { product: ProductDetail; qty: number; selectedAttributes: Array<{ name: string; value: string; }>; selectedVariant?: string; }; }
    | { type: 'REMOVE_ITEM'; payload: string; } // cartItemId
    | { type: 'UPDATE_ITEM'; payload: { cartItemId: string; qty?: number; selectedAttributes?: Array<{ name: string; value: string; }>; selectedVariant?: string; }; }
    | { type: 'CLEAR_CART'; }
    | { type: 'LOAD_CART'; payload: CartItem[]; }
    | { type: 'SYNC_FROM_SERVER'; payload: CartItem[]; };

interface CartContextValue {
    items: CartItem[];
    itemCount: number;
    hasItems: boolean;
    isGuest: boolean;
    addToCart: (product: ProductDetail, qty: number, selectedAttributes?: Array<{ name: string; value: string; }>, selectedVariant?: string) => void;
    removeFromCart: (cartItemId: string) => void;
    updateCart: (cartItemId: string, updates: { qty?: number; selectedAttributes?: Array<{ name: string; value: string; }>; selectedVariant?: string; }) => void;
    clearCart: () => void;
    refreshCart: () => void;
    isLoading: boolean;
    // Aliases for compatibility with old useCart
    addItem: (product: ProductDetail, qty: number, selectedAttributes?: Array<{ name: string; value: string; }>, selectedVariant?: string) => void;
    updateItem: (cartItemId: string, updates: { qty?: number; selectedAttributes?: Array<{ name: string; value: string; }>; selectedVariant?: string; }) => void;
    removeItem: (cartItemId: string) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// Generate unique cart item ID
function generateCartItemId(): string {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Check if two cart items are the same product with same attributes
function isSameCartItem(
    item: CartItem,
    product: ProductDetail,
    selectedAttributes: Array<{ name: string; value: string; }>,
    selectedVariant?: string
): boolean {
    const productId = product._id || product.id;
    const itemProductId = item._id || item.id;

    if (productId !== itemProductId) return false;
    if (selectedVariant && item.selectedVariant !== selectedVariant) return false;

    // Compare attributes
    if (item.selectedAttributes.length !== selectedAttributes.length) return false;

    const sortedItemAttrs = [...item.selectedAttributes].sort((a, b) => a.name.localeCompare(b.name));
    const sortedNewAttrs = [...selectedAttributes].sort((a, b) => a.name.localeCompare(b.name));

    return sortedItemAttrs.every((attr, idx) =>
        attr.name === sortedNewAttrs[idx].name && attr.value === sortedNewAttrs[idx].value
    );
}

function cartReducer(state: CartState, action: CartAction): CartState {
    const now = new Date().toISOString();

    switch (action.type) {
        case 'ADD_ITEM': {
            const { product, qty, selectedAttributes, selectedVariant } = action.payload;

            // Check if item already exists
            const existingItemIndex = state.items.findIndex(item =>
                isSameCartItem(item, product, selectedAttributes, selectedVariant)
            );

            if (existingItemIndex !== -1) {
                // Update quantity of existing item
                const updatedItems = [...state.items];
                updatedItems[existingItemIndex] = {
                    ...updatedItems[existingItemIndex],
                    qty: updatedItems[existingItemIndex].qty + qty,
                    addedAt: now, // Refresh timestamp
                };
                return { items: updatedItems, lastUpdated: now };
            } else {
                // Add new item with full product data
                const newItem: CartItem = {
                    ...product, // Full product details
                    qty,
                    selectedAttributes,
                    selectedVariant,
                    addedAt: now,
                    cartItemId: generateCartItemId(),
                };
                return { items: [...state.items, newItem], lastUpdated: now };
            }
        }

        case 'REMOVE_ITEM': {
            return {
                items: state.items.filter(item => item.cartItemId !== action.payload),
                lastUpdated: now,
            };
        }

        case 'UPDATE_ITEM': {
            const { cartItemId, qty, selectedAttributes, selectedVariant } = action.payload;
            return {
                items: state.items.map(item => {
                    if (item.cartItemId === cartItemId) {
                        return {
                            ...item,
                            ...(qty !== undefined && { qty }),
                            ...(selectedAttributes !== undefined && { selectedAttributes }),
                            ...(selectedVariant !== undefined && { selectedVariant }),
                            addedAt: now,
                        };
                    }
                    return item;
                }),
                lastUpdated: now,
            };
        }

        case 'CLEAR_CART': {
            return { items: [], lastUpdated: now };
        }

        case 'LOAD_CART': {
            // Only update if items actually changed (compare stringified items)
            const currentItemsStr = JSON.stringify(state.items);
            const newItemsStr = JSON.stringify(action.payload);

            if (currentItemsStr === newItemsStr) {
                return state; // No change, return same state reference
            }

            return { items: action.payload, lastUpdated: now };
        }

        case 'SYNC_FROM_SERVER': {
            // Only sync from server if local cart is empty (cross-device login scenario)
            if (state.items.length === 0) {
                return { items: action.payload, lastUpdated: now };
            }
            return state;
        }

        default:
            return state;
    }
}

export const CartProvider: React.FC<{ children: React.ReactNode; }> = ({ children }) => {
    const { data: session, status } = useSession();
    const queryClient = useQueryClient();
    const isAuthenticated = status === 'authenticated' && !!session;

    // Initialize cart from localStorage
    const [state, dispatch] = useReducer(cartReducer, { items: [], lastUpdated: new Date().toISOString() }, (initial) => {
        if (typeof window === 'undefined') return initial;

        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed;
            }
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
        }
        return initial;
    });

    // Persist to localStorage on every change
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const currentStored = localStorage.getItem(CART_STORAGE_KEY);
            const newState = JSON.stringify(state);

            // Only update localStorage if data actually changed
            if (currentStored !== newState) {
                localStorage.setItem(CART_STORAGE_KEY, newState);
            }
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }, [state]);

    // Listen for cross-tab updates (storage event only fires in OTHER tabs)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === CART_STORAGE_KEY && e.newValue) {
                try {
                    const newState = JSON.parse(e.newValue);
                    dispatch({ type: 'LOAD_CART', payload: newState.items });
                } catch (error) {
                    console.error('Error syncing cart from storage event:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Background sync to server (optimistic, fire-and-forget)
    const syncToServerMutation = useMutation({
        mutationFn: async (item: CartItem) => {
            if (!isAuthenticated) return;

            try {
                await apiClient.post(api.cart.add, {
                    productId: item._id || item.id,
                    qty: item.qty,
                    attributes: item.selectedAttributes,
                }, {
                    timeout: 5000, // Quick timeout - don't wait too long
                });
            } catch (error) {
                // Silent fail - cart is already updated on client
                console.warn('Background cart sync failed (non-critical):', error);
            }
        },
        retry: 1, // Retry once at most
    });

    const addToCart = useCallback((
        product: ProductDetail,
        qty: number,
        selectedAttributes: Array<{ name: string; value: string; }> = [],
        selectedVariant?: string
    ) => {
        // Immediately update client cart
        dispatch({
            type: 'ADD_ITEM',
            payload: { product, qty, selectedAttributes, selectedVariant },
        });

        // Background sync to server (optimistic)
        const cartItem: CartItem = {
            ...product,
            qty,
            selectedAttributes,
            selectedVariant,
            addedAt: new Date().toISOString(),
            cartItemId: generateCartItemId(),
        };

        syncToServerMutation.mutate(cartItem);
    }, [syncToServerMutation]);

    const removeFromCart = useCallback((cartItemId: string) => {
        dispatch({ type: 'REMOVE_ITEM', payload: cartItemId });

        // TODO: Optionally sync removal to server
        if (isAuthenticated) {
            // Fire-and-forget server sync
        }
    }, [isAuthenticated]);

    const updateCart = useCallback((
        cartItemId: string,
        updates: { qty?: number; selectedAttributes?: Array<{ name: string; value: string; }>; selectedVariant?: string; }
    ) => {
        dispatch({ type: 'UPDATE_ITEM', payload: { cartItemId, ...updates } });

        // TODO: Optionally sync update to server
        if (isAuthenticated) {
            // Fire-and-forget server sync
        }
    }, [isAuthenticated]);

    const clearCart = useCallback(() => {
        dispatch({ type: 'CLEAR_CART' });

        if (isAuthenticated) {
            // Fire-and-forget clear on server
            apiClient.delete(api.cart.clear).catch(() => { });
        }
    }, [isAuthenticated]);

    const refreshCart = useCallback(() => {
        // Reload cart from localStorage
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                dispatch({ type: 'LOAD_CART', payload: parsed.items || [] });
            }
        } catch (error) {
            console.error('Error refreshing cart:', error);
        }

        // Optionally refetch from server if authenticated
        if (isAuthenticated) {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
        }
    }, [isAuthenticated, queryClient]);

    const itemCount = state.items.reduce((count, item) => count + item.qty, 0);
    const hasItems = state.items.length > 0;
    const isGuest = !isAuthenticated;

    const value: CartContextValue = {
        items: state.items,
        itemCount,
        hasItems,
        isGuest,
        addToCart,
        removeFromCart,
        updateCart,
        clearCart,
        refreshCart,
        isLoading: syncToServerMutation.isPending,
        // Aliases for compatibility
        addItem: addToCart,
        updateItem: updateCart,
        removeItem: removeFromCart,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

/**
 * Convenience hook to get just the item count
 */
export const useCartCount = () => {
    const { itemCount } = useCart();
    return itemCount;
};
