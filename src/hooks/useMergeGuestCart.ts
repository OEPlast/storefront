'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, handleApiError } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import {
  getGuestCart,
  setGuestCart,
  areCartItemsIdentical,
  GuestCart,
  GuestCartItem,
} from '@/libs/guestCart';
import type { CartItem, ServerCart } from '@/types/cart';

/**
 * Hook to merge guest cart with server cart on login
 *
 * Usage: Place in root layout or CartContext provider
 * Automatically triggers when session becomes available
 */
export function useMergeGuestCart() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const hasMergedRef = useRef(false);

  const mergeCart = useCallback(async () => {
    // Only merge if authenticated and not already merging
    if (!session?.user || isMerging || hasMergedRef.current) return;

    const guestCart = getGuestCart();

    if (!guestCart.items.length) {
      hasMergedRef.current = true;
      return;
    }

    console.log(`Reconciling ${guestCart.items.length} guest cart items with server cart...`);
    setIsMerging(true);
    setMergeError(null);

    try {
      const serverResponse = await apiClient.get<ServerCart>(api.cart.get);
      const serverCart = serverResponse.data;

      const identityKey = (item: {
        product: string;
        selectedAttributes: Array<{ name: string; value: string }>;
      }) =>
        `${item.product}|${[...item.selectedAttributes]
          .map((attr) => `${attr.name}:${attr.value}`)
          .sort()
          .join(',')}`;

      const mapServerItemToGuest = (item: CartItem): GuestCartItem => {
        const productDetails = item.productDetails;
        let isAvailable = true;
        let unavailableReason:
          | 'out_of_stock'
          | 'variant_unavailable'
          | 'product_deleted'
          | undefined = undefined;

        if (!productDetails) {
          // Product deleted - show as out of stock to user
          isAvailable = false;
          unavailableReason = 'out_of_stock';
        } else if (item.selectedAttributes && item.selectedAttributes.length > 0) {
          const variantStock = checkVariantStock(productDetails, item.selectedAttributes);
          if (variantStock === null) {
            isAvailable = false;
            unavailableReason = 'variant_unavailable';
          } else if (variantStock < item.qty) {
            isAvailable = false;
            unavailableReason = 'out_of_stock';
          }
        } else if ((productDetails.stock ?? 0) < item.qty) {
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
      };

      const checkVariantStock = (
        product: NonNullable<CartItem['productDetails']>,
        selectedAttributes: Array<{ name: string; value: string }>
      ): number | null => {
        if (!product.attributes || product.attributes.length === 0) {
          return product.stock ?? 0;
        }

        for (const attr of product.attributes) {
          const selectedAttr = selectedAttributes.find((sa) => sa.name === attr.name);
          if (!selectedAttr) continue;

          const variant = attr.children?.find((child) => child.name === selectedAttr.value);
          if (variant) {
            return variant.stock ?? 0;
          }
        }

        return null;
      };

      const unionItems: GuestCartItem[] = [];
      const seen = new Set<string>();

      if (serverCart) {
        for (const serverItem of serverCart.items) {
          const mapped = mapServerItemToGuest(serverItem);
          unionItems.push(mapped);
          seen.add(identityKey(mapped));
        }
      }

      for (const guestItem of guestCart.items) {
        const key = identityKey(guestItem);
        if (seen.has(key)) {
          continue;
        }
        unionItems.push({ ...guestItem });
        seen.add(key);
      }

      const nextCart: GuestCart = {
        items: unionItems,
        lastUpdated: new Date().toISOString(),
      };

      setGuestCart(nextCart);

      await synchronizeWithServer(nextCart);

      queryClient.invalidateQueries({ queryKey: ['cart', 'server'] });
      console.log(`Cart merge complete: ${unionItems.length} items synchronized`);
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('Cart merge error:', errorMessage, error);
      setMergeError('Failed to synchronize your cart. Please try again.');
    } finally {
      setIsMerging(false);
      hasMergedRef.current = true;
    }
  }, [session, isMerging, queryClient]);

  // Watch for session changes - merge when user logs in
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !hasMergedRef.current) {
      // Small delay to ensure session is fully initialized
      const timer = setTimeout(() => {
        mergeCart();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [status, session, mergeCart]);

  return {
    isMerging,
    mergeError,
    clearError: () => setMergeError(null),
  };
}

async function synchronizeWithServer(cart: GuestCart) {
  try {
    await apiClient.delete<void>(api.cart.clear);
  } catch (error) {
    const message = handleApiError(error);
    console.warn('Unable to clear server cart before merge:', message);
  }

  for (const item of cart.items) {
    try {
      await apiClient.post<ServerCart>(api.cart.add, {
        productId: item.product,
        qty: item.qty,
        attributes: item.selectedAttributes,
      });
    } catch (error) {
      console.error('Failed to push merged cart item to server:', handleApiError(error), error);
    }
  }

  try {
    const refreshed = await apiClient.get<ServerCart>(api.cart.get);
    const serverData = refreshed.data;

    if (!serverData) {
      return;
    }

    const resolveMatching = (items: CartItem[], target: GuestCartItem) =>
      items.find((item) =>
        areCartItemsIdentical(
          { product: item.product, selectedAttributes: item.selectedAttributes ?? [] },
          { product: target.product, selectedAttributes: target.selectedAttributes }
        )
      );

    const mappedItems: GuestCartItem[] = cart.items.map((guestItem) => {
      const match = resolveMatching(serverData.items, guestItem);
      if (!match) {
        return guestItem;
      }

      const mapped = mapServerItemToGuest(match);
      return {
        ...guestItem,
        unitPrice: match.unitPrice,
        totalPrice: match.totalPrice,
        sale: match.sale,
        saleVariantIndex: match.saleVariantIndex,
        appliedDiscount: match.appliedDiscount,
        discountAmount: match.discountAmount,
        pricingTier: match.pricingTier,
        serverItemId: match._id,
        addedAt: match.addedAt ?? guestItem.addedAt,
        productDetails: match.productDetails ?? guestItem.productDetails ?? null,
        isAvailable: mapped.isAvailable ?? true,
        unavailableReason: mapped.unavailableReason,
      };
    });

    setGuestCart({ items: mappedItems, lastUpdated: new Date().toISOString() });
  } catch (error) {
    console.error('Failed to refresh server cart after merge:', handleApiError(error), error);
  }
}
