'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, handleApiError } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import {
  getGuestCart,
  addToGuestCart as addToGuestCartUtil,
  updateGuestCartItem as updateGuestCartItemUtil,
  removeFromGuestCart as removeFromGuestCartUtil,
  clearGuestCart as clearGuestCartUtil,
  areCartItemsIdentical,
  GuestCart,
  GuestCartItem,
  setGuestCart as persistGuestCart,
  getGuestCartItemCount,
} from '@/libs/guestCart';
import type { CartItem, ServerCart, CartSnapshotPayload, CartProductSummary } from '@/types/cart';

type UnifiedCartItem = GuestCartItem;

interface UnifiedCart {
  items: UnifiedCartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  itemCount: number;
  hasItems: boolean;
  isGuest: boolean;
}

export interface AddToCartInput {
  product: any; // Full product object - hook handles serialization
  qty: number;
  attributes: Array<{ name: string; value: string }>;
}

export interface UpdateCartItemInput {
  qty?: number;
  selectedAttributes?: Array<{ name: string; value: string }>;
}

const buildIdentityKey = (item: {
  product: string;
  selectedAttributes: Array<{ name: string; value: string }>;
}) =>
  `${item.product}|${[...item.selectedAttributes]
    .map((attr) => `${attr.name}:${attr.value}`)
    .sort()
    .join(',')}`;

const sortAttributes = (attributes: Array<{ name: string; value: string }>) =>
  [...attributes].sort((a, b) => {
    if (a.name === b.name) {
      return a.value.localeCompare(b.value);
    }
    return a.name.localeCompare(b.name);
  });

const arePricingTiersEqual = (a: GuestCartItem['pricingTier'], b: GuestCartItem['pricingTier']) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.minQty === b.minQty &&
    a.maxQty === b.maxQty &&
    a.strategy === b.strategy &&
    a.value === b.value &&
    a.appliedPrice === b.appliedPrice
  );
};

const areGuestItemsEqual = (a: GuestCartItem, b: GuestCartItem) => {
  if (a.product !== b.product || a.qty !== b.qty) {
    return false;
  }

  const attrsEqual =
    JSON.stringify(sortAttributes(a.selectedAttributes)) ===
    JSON.stringify(sortAttributes(b.selectedAttributes));

  return (
    attrsEqual &&
    a.unitPrice === b.unitPrice &&
    a.totalPrice === b.totalPrice &&
    a.sale === b.sale &&
    a.saleVariantIndex === b.saleVariantIndex &&
    a.appliedDiscount === b.appliedDiscount &&
    a.discountAmount === b.discountAmount &&
    arePricingTiersEqual(a.pricingTier, b.pricingTier) &&
    a.serverItemId === b.serverItemId &&
    a.addedAt === b.addedAt
  );
};

function mapServerItemToGuest(item: CartItem): GuestCartItem {
  const productDetails = item.productDetails;
  let isAvailable = true;
  let unavailableReason: GuestCartItem['unavailableReason'] = undefined;

  if (!productDetails) {
    // Product deleted from database - show as out of stock to user
    isAvailable = false;
    unavailableReason = 'out_of_stock';
  } else if (item.selectedAttributes && item.selectedAttributes.length > 0) {
    // Check variant availability
    const variantStock = checkVariantStock(productDetails, item.selectedAttributes);
    if (variantStock === null) {
      isAvailable = false;
      unavailableReason = 'variant_unavailable';
    } else if (variantStock < item.qty) {
      isAvailable = false;
      unavailableReason = 'out_of_stock';
    }
  } else if ((productDetails.stock ?? 0) < item.qty) {
    // Check base product stock
    isAvailable = false;
    unavailableReason = 'out_of_stock';
  }

  return {
    _id: item._id,
    product: item.product,
    qty: item.qty,
    selectedAttributes: item.selectedAttributes ?? [],
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    sale: item.sale,
    saleVariantIndex: item.saleVariantIndex,
    appliedDiscount: item.appliedDiscount,
    discountAmount: item.discountAmount,
    pricingTier: item.pricingTier,
    serverItemId: item._id,
    addedAt: item.addedAt ?? '',
    productDetails: item.productDetails ?? null,
    isAvailable,
    unavailableReason,
  };
}

/**
 * Check stock for a specific variant based on selected attributes
 * Returns null if variant doesn't exist, or stock amount if found
 */
function checkVariantStock(
  product: CartProductSummary,
  selectedAttributes: Array<{ name: string; value: string }>
): number | null {
  if (!product.attributes || product.attributes.length === 0) {
    return product.stock ?? 0;
  }

  // Find matching variant
  for (const attr of product.attributes) {
    const selectedAttr = selectedAttributes.find((sa) => sa.name === attr.name);
    if (!selectedAttr) continue;

    const variant = attr.children?.find((child: any) => child.name === selectedAttr.value);
    if (variant) {
      return variant.stock ?? 0;
    }
  }

  return null;
}

export function useCart() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated' && !!session;

  const [guestCart, setGuestCartState] = useState<GuestCart>(() =>
    typeof window !== 'undefined'
      ? getGuestCart()
      : { items: [], lastUpdated: new Date().toISOString() }
  );

  const writeGuestCart = useCallback((nextCart: GuestCart) => {
    persistGuestCart(nextCart);
    setGuestCartState(nextCart);
  }, []);

  const refreshGuestCart = useCallback(() => {
    const updatedCart = getGuestCart();
    setGuestCartState(updatedCart);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'oep-cart-1') {
        refreshGuestCart();
      }
    };

    const handleCartUpdate = () => {
      refreshGuestCart();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('guestCartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('guestCartUpdated', handleCartUpdate);
    };
  }, [refreshGuestCart]);

  const serverCartQuery = useQuery<ServerCart>({
    queryKey: ['cart', 'server'],
    queryFn: async () => {
      const response = await apiClient.get<ServerCart>(api.cart.get);
      if (!response.data) {
        throw new Error('No cart data returned');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const findMatchingServerItem = useCallback(
    (
      items: CartItem[],
      target: { product: string; selectedAttributes: Array<{ name: string; value: string }> }
    ) =>
      items.find((item) =>
        areCartItemsIdentical(
          { product: item.product, selectedAttributes: item.selectedAttributes ?? [] },
          target
        )
      ) ?? null,
    []
  );

  const syncGuestCartToServer = useCallback(
    async (cartSnapshot?: GuestCart) => {
      if (!isAuthenticated) return;

      const snapshot = cartSnapshot ?? getGuestCart();

      try {
        await apiClient.delete<void>(api.cart.clear);
      } catch (error: any) {
        // 404 is expected if cart doesn't exist on server - not an error
        if (error?.response?.status !== 404) {
          console.warn(
            'Failed to clear server cart before synchronization:',
            handleApiError(error),
            error
          );
        }
      }

      for (const item of snapshot.items) {
        try {
          await apiClient.post<ServerCart>(api.cart.add, {
            productId: item.product,
            qty: item.qty,
            attributes: item.selectedAttributes,
          });
        } catch (error) {
          console.error('Failed to sync guest cart item to server:', handleApiError(error), error);
        }
      }

      try {
        const refreshed = await apiClient.get<ServerCart>(api.cart.get);
        const serverData = refreshed.data;
        if (serverData) {
          const now = new Date().toISOString();
          const mergedItems = snapshot.items.map((guestItem) => {
            const serverMatch = findMatchingServerItem(serverData.items, {
              product: guestItem.product,
              selectedAttributes: guestItem.selectedAttributes,
            });

            if (!serverMatch) {
              return guestItem;
            }

            const mapped = mapServerItemToGuest(serverMatch);

            return {
              ...guestItem,
              unitPrice: mapped.unitPrice,
              totalPrice: mapped.totalPrice,
              sale: mapped.sale,
              saleVariantIndex: mapped.saleVariantIndex,
              appliedDiscount: mapped.appliedDiscount,
              discountAmount: mapped.discountAmount,
              pricingTier: mapped.pricingTier,
              serverItemId: mapped.serverItemId,
              addedAt: mapped.addedAt ?? guestItem.addedAt,
              productDetails: mapped.productDetails ?? guestItem.productDetails ?? null,
              isAvailable: mapped.isAvailable ?? true,
              unavailableReason: mapped.unavailableReason,
            } satisfies GuestCartItem;
          });

          writeGuestCart({ items: mergedItems, lastUpdated: now });
        }
      } catch (error) {
        console.error(
          'Failed to refresh server cart after synchronization:',
          handleApiError(error),
          error
        );
      }

      queryClient.invalidateQueries({ queryKey: ['cart', 'server'] });
    },
    [isAuthenticated, queryClient, findMatchingServerItem, writeGuestCart]
  );

  // Track last synced server data to prevent infinite loops
  const lastSyncedServerDataHash = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !serverCartQuery.data) {
      return;
    }

    // Create a stable hash of server data to detect real changes
    const serverDataHash = JSON.stringify(
      serverCartQuery.data.items.map((item) => ({
        id: item._id,
        product: item.product,
        qty: item.qty,
        attrs: item.selectedAttributes,
        price: item.unitPrice,
        discount: item.appliedDiscount,
      }))
    );

    // Prevent re-running if server data hasn't actually changed
    if (lastSyncedServerDataHash.current === serverDataHash) {
      return;
    }

    lastSyncedServerDataHash.current = serverDataHash;

    const currentGuestCart = getGuestCart(); // Read directly from storage to avoid dependency loop

    // If local cart is empty but server has items, bring server cart into local
    if (currentGuestCart.items.length === 0 && serverCartQuery.data.items.length > 0) {
      const mappedItems = serverCartQuery.data.items.map((serverItem) =>
        mapServerItemToGuest(serverItem)
      );
      writeGuestCart({ items: mappedItems, lastUpdated: new Date().toISOString() });
      return;
    }
    const mergedItems: GuestCartItem[] = currentGuestCart.items.map((item) => ({ ...item }));
    const identityMap = new Map<string, number>();
    mergedItems.forEach((item, index) => {
      identityMap.set(buildIdentityKey(item), index);
    });

    let hasChanges = false;

    for (const serverItem of serverCartQuery.data.items) {
      const identity = buildIdentityKey({
        product: serverItem.product,
        selectedAttributes: serverItem.selectedAttributes ?? [],
      });
      const mapped = mapServerItemToGuest(serverItem);
      const existingIndex = identityMap.get(identity);

      // FIXED: Don't add items from server if they're not in guest cart
      // This prevents deleted items from being re-added during sync
      if (existingIndex == null) {
        // Skip items that only exist on server - they were likely deleted locally
        continue;
      }

      const current = mergedItems[existingIndex];
      const updated: GuestCartItem = {
        ...current,
        unitPrice: mapped.unitPrice ?? current.unitPrice,
        totalPrice: mapped.totalPrice ?? current.totalPrice,
        sale: mapped.sale ?? current.sale,
        saleVariantIndex: mapped.saleVariantIndex ?? current.saleVariantIndex,
        appliedDiscount: mapped.appliedDiscount ?? current.appliedDiscount,
        discountAmount: mapped.discountAmount ?? current.discountAmount,
        pricingTier: mapped.pricingTier ?? current.pricingTier,
        serverItemId: mapped.serverItemId ?? current.serverItemId,
        addedAt: mapped.addedAt ?? current.addedAt,
        productDetails: mapped.productDetails ?? current.productDetails ?? null,
        isAvailable: mapped.isAvailable ?? true,
        unavailableReason: mapped.unavailableReason,
      };

      if (!areGuestItemsEqual(updated, current)) {
        mergedItems[existingIndex] = updated;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      writeGuestCart({ items: mergedItems, lastUpdated: new Date().toISOString() });
    }
  }, [isAuthenticated, serverCartQuery.data, writeGuestCart]);

  const addToCartMutation = useMutation({
    mutationFn: async (input: AddToCartInput) => {
      const { product, qty, attributes } = input;
      const productId = product._id || product.id;

      // Extract product snapshot for display
      const productSnapshot = {
        name: product.name,
        price: product.price,
        sku: product.sku || productId,
        image: product.images?.[0]?.url || product.description_images?.[0]?.url || '',
      };

      // Extract sale information
      const sale = product.sale?._id || product.sale;
      const saleVariantIndex = product.saleVariantIndex;

      // Extract pricing tier if applicable for this quantity
      let pricingTier: GuestCartItem['pricingTier'] | undefined;
      if (product.pricingTiers && Array.isArray(product.pricingTiers)) {
        const applicableTier = product.pricingTiers.find(
          (tier: any) => qty >= tier.minQty && (!tier.maxQty || qty <= tier.maxQty)
        );
        if (applicableTier) {
          pricingTier = {
            minQty: applicableTier.minQty,
            maxQty: applicableTier.maxQty,
            strategy: applicableTier.strategy,
            value: applicableTier.value,
            appliedPrice: applicableTier.appliedPrice || product.price,
          };
        }
      }

      // Calculate pricing
      const unitPrice = pricingTier?.appliedPrice || product.price;
      const totalPrice = unitPrice * qty;

      const addedItem = addToGuestCartUtil(
        productId,
        qty,
        attributes,
        productSnapshot,
        unitPrice,
        sale,
        saleVariantIndex,
        {
          pricingTier,
        }
      );

      if (!isAuthenticated) {
        refreshGuestCart();
        return addedItem;
      }

      try {
        const response = await apiClient.post<ServerCart>(api.cart.add, {
          productId,
          qty,
          attributes,
        });

        const serverCart = response.data;
        if (serverCart) {
          const serverMatch = findMatchingServerItem(serverCart.items, {
            product: productId,
            selectedAttributes: attributes,
          });

          if (serverMatch) {
            const mapped = mapServerItemToGuest(serverMatch);
            updateGuestCartItemUtil(addedItem._id, {
              serverItemId: serverMatch._id,
              unitPrice: serverMatch.unitPrice,
              totalPrice: serverMatch.totalPrice,
              sale: serverMatch.sale,
              saleVariantIndex: serverMatch.saleVariantIndex,
              appliedDiscount: serverMatch.appliedDiscount,
              discountAmount: serverMatch.discountAmount,
              pricingTier: serverMatch.pricingTier,
              productDetails: serverMatch.productDetails ?? null,
              addedAt: serverMatch.addedAt,
            });
          }
        }
      } catch (error) {
        console.error('Add to cart synchronization error:', handleApiError(error), error);
      } finally {
        queryClient.invalidateQueries({ queryKey: ['cart', 'server'] });
      }

      return addedItem;
    },
    onError: (error) => {
      console.error('Add to cart error:', handleApiError(error), error);
    },
  });

  const updateCartItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateCartItemInput }) => {
      const updatedItem = updateGuestCartItemUtil(itemId, {
        qty: data.qty,
        selectedAttributes: data.selectedAttributes,
      });

      if (!isAuthenticated) {
        refreshGuestCart();
        return updatedItem;
      }

      const latestCart = getGuestCart();
      const localItem = latestCart.items.find((item) => item._id === itemId);

      if (!localItem) {
        return updatedItem;
      }

      if (!localItem.serverItemId) {
        await syncGuestCartToServer(latestCart);
        return updatedItem;
      }

      try {
        const response = await apiClient.put<ServerCart>(api.cart.item(localItem.serverItemId), {
          qty: data.qty,
          selectedAttributes: data.selectedAttributes,
        });

        const serverCart = response.data;
        if (serverCart) {
          const serverMatch =
            serverCart.items.find((item) => item._id === localItem.serverItemId) ||
            findMatchingServerItem(serverCart.items, {
              product: localItem.product,
              selectedAttributes: localItem.selectedAttributes,
            });

          if (serverMatch) {
            const mapped = mapServerItemToGuest(serverMatch);
            updateGuestCartItemUtil(itemId, {
              unitPrice: serverMatch.unitPrice,
              totalPrice: serverMatch.totalPrice,
              sale: serverMatch.sale,
              saleVariantIndex: serverMatch.saleVariantIndex,
              appliedDiscount: serverMatch.appliedDiscount,
              discountAmount: serverMatch.discountAmount,
              pricingTier: serverMatch.pricingTier,
              productDetails: serverMatch.productDetails ?? null,
              addedAt: serverMatch.addedAt,
              serverItemId: serverMatch._id,
            });
          }
        }
      } catch (error: any) {
        console.error('Update cart synchronization error:', handleApiError(error), error);
        // Only sync if error is not 404 (cart doesn't exist on server)
        if (error?.response?.status !== 404) {
          await syncGuestCartToServer(getGuestCart());
        }
      } finally {
        queryClient.invalidateQueries({ queryKey: ['cart', 'server'] });
      }

      return updatedItem;
    },
    onError: (error) => {
      console.error('Update cart item error:', handleApiError(error), error);
    },
  });

  const removeCartItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const snapshotBeforeRemoval = getGuestCart();
      const targetItem = snapshotBeforeRemoval.items.find((item) => item._id === itemId);

      const success = removeFromGuestCartUtil(itemId);

      if (!isAuthenticated) {
        refreshGuestCart();
        return success;
      }

      if (targetItem?.serverItemId) {
        try {
          await apiClient.delete<void>(api.cart.item(targetItem.serverItemId));
        } catch (error: any) {
          console.error('Remove cart synchronization error:', handleApiError(error), error);
          // Only sync if error is not 404 (cart doesn't exist on server)
          if (error?.response?.status !== 404) {
            await syncGuestCartToServer(getGuestCart());
          }
        }
      } else {
        await syncGuestCartToServer(getGuestCart());
      }

      queryClient.invalidateQueries({ queryKey: ['cart', 'server'] });

      return success;
    },
    onError: (error) => {
      console.error('Remove cart item error:', handleApiError(error), error);
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      clearGuestCartUtil();

      if (!isAuthenticated) {
        refreshGuestCart();
        return;
      }

      try {
        await apiClient.delete<void>(api.cart.clear);
      } catch (error) {
        console.error('Clear server cart error:', handleApiError(error), error);
      } finally {
        queryClient.invalidateQueries({ queryKey: ['cart', 'server'] });
      }
    },
    onError: (error) => {
      console.error('Clear cart error:', handleApiError(error), error);
    },
  });

  const applyCartSnapshot = useCallback(
    async (snapshot: CartSnapshotPayload) => {
      const timestamp = new Date().toISOString();
      const normalized: GuestCartItem[] = snapshot.items.map((item, index) => {
        return {
          _id: item._id ?? item.serverItemId ?? `snapshot_${Date.now()}_${index.toString(36)}`,
          product: item.product,
          qty: item.qty,
          selectedAttributes: item.selectedAttributes ?? [],
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice ?? item.unitPrice * item.qty,
          sale: item.sale,
          saleVariantIndex: item.saleVariantIndex,
          appliedDiscount: item.appliedDiscount,
          discountAmount: item.discountAmount,
          pricingTier: item.pricingTier,
          serverItemId: item.serverItemId,
          addedAt: item.addedAt ?? timestamp,
          productDetails: (item as any).productDetails ?? null,
          isAvailable: true,
        };
      });

      const nextCart: GuestCart = { items: normalized, lastUpdated: timestamp };
      writeGuestCart(nextCart);

      if (isAuthenticated) {
        await syncGuestCartToServer(nextCart);
      }
    },
    [isAuthenticated, syncGuestCartToServer, writeGuestCart]
  );

  const unifiedCart: UnifiedCart = useMemo(() => {
    const subtotal = guestCart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalDiscount = guestCart.items.reduce(
      (sum, item) => sum + (item.discountAmount ?? 0),
      0
    );
    const itemCount = guestCart.items.reduce((sum, item) => sum + item.qty, 0);

    return {
      items: guestCart.items,
      subtotal,
      totalDiscount,
      total: subtotal,
      itemCount,
      hasItems: guestCart.items.length > 0,
      isGuest: !isAuthenticated,
    } satisfies UnifiedCart;
  }, [guestCart.items, isAuthenticated]);

  const isLoading = isAuthenticated ? serverCartQuery.isLoading : false;
  const error = isAuthenticated ? serverCartQuery.error : null;

  return {
    cart: unifiedCart,
    items: unifiedCart.items,
    subtotal: unifiedCart.subtotal,
    total: unifiedCart.total,
    totalDiscount: unifiedCart.totalDiscount,
    itemCount: unifiedCart.itemCount,
    hasItems: unifiedCart.hasItems,
    isGuest: unifiedCart.isGuest,
    isLoading,
    error,
    addItem: (input: AddToCartInput) => addToCartMutation.mutate(input),
    updateItem: (itemId: string, data: UpdateCartItemInput) =>
      updateCartItemMutation.mutate({ itemId, data }),
    removeItem: (itemId: string) => removeCartItemMutation.mutate(itemId),
    clearCart: () => clearCartMutation.mutate(),
    applyCartSnapshot,
    isAddingItem: addToCartMutation.isPending,
    isUpdatingItem: updateCartItemMutation.isPending,
    isRemovingItem: removeCartItemMutation.isPending,
    isClearingCart: clearCartMutation.isPending,
    serverCartQuery: isAuthenticated ? serverCartQuery : null,
    addToCartMutation,
    updateCartItemMutation,
    removeCartItemMutation,
    clearCartMutation,
    refreshCart: () => {
      refreshGuestCart();
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['cart', 'server'] });
      }
    },
  };
}

export function useCartCount() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && !!session;

  const serverCartCountQuery = useQuery<number, Error>({
    queryKey: ['cart', 'server', 'count'],
    queryFn: async () => {
      const response = await apiClient.get<ServerCart>(api.cart.get);
      if (!response.data) {
        return 0;
      }
      return response.data.items.reduce((count, item) => count + item.qty, 0);
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const [guestCount, setGuestCount] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 0;
    }
    return getGuestCartItemCount();
  });

  useEffect(() => {
    const refreshCount = () => {
      setGuestCount(getGuestCartItemCount());
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'oep-cart-1') {
        refreshCount();
      }
    };

    const handleCartUpdate = () => {
      refreshCount();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('guestCartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('guestCartUpdated', handleCartUpdate);
    };
  }, []);

  return {
    count: isAuthenticated ? (serverCartCountQuery.data ?? guestCount) : guestCount,
    isLoading: isAuthenticated ? serverCartCountQuery.isLoading : false,
  };
}
