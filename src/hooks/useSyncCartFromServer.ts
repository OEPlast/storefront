'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useCart } from '@/hooks/queries/useCart';
import { setGuestCart, getGuestCart, areCartItemsIdentical } from '@/libs/guestCart';
import type { CartItem } from '@/types/cart';

/**
 * Hook to sync server cart TO localStorage when user returns (new session)
 *
 * Flow:
 * 1. User logs in → localStorage cart merges TO server (useMergeGuestCart)
 * 2. User closes browser/tab
 * 3. User returns later → Server cart loads INTO localStorage (this hook)
 * 4. Current session always uses localStorage
 *
 * Usage: Place in root layout or app initialization
 */
export function useSyncCartFromServer() {
  const { data: session, status } = useSession();
  const { data: serverCart, isLoading } = useCart();
  const [hasSynced, setHasSynced] = useState(false);

  const buildIdentityKey = useCallback(
    (item: { product: string; selectedAttributes: Array<{ name: string; value: string }> }) =>
      `${item.product}|${[...item.selectedAttributes]
        .map((attr) => `${attr.name}:${attr.value}`)
        .sort()
        .join(',')}`,
    []
  );

  const checkVariantStock = useCallback(
    (
      product: NonNullable<CartItem['productDetails']>,
      selectedAttributes: Array<{ name: string; value: string }>
    ): number | null => {
      if (!product.attributes || product.attributes.length === 0) {
        return product.stock ?? 0;
      }

      for (const attr of product.attributes) {
        const selectedAttr = selectedAttributes.find((sa) => sa.name === attr.name);
        if (!selectedAttr) continue;

        const variant = attr.children?.find((child: any) => child.name === selectedAttr.value);
        if (variant) {
          return variant.stock ?? 0;
        }
      }

      return null;
    },
    []
  );

  const mapServerItemToGuest = useCallback(
    (item: CartItem) => {
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
        addedAt: item.addedAt ?? new Date().toISOString(),
        productDetails: item.productDetails ?? null,
        isAvailable,
        unavailableReason,
      };
    },
    [checkVariantStock]
  );

  const syncFromServer = useCallback(() => {
    if (!session?.user || hasSynced || isLoading || !serverCart) {
      return;
    }

    const localCart = getGuestCart();
    const mergedItems = [...localCart.items];
    const identityMap = new Map<string, number>();
    mergedItems.forEach((item, index) => {
      identityMap.set(buildIdentityKey(item), index);
    });

    let hasChanges = false;

    for (const serverItem of serverCart.items) {
      const mapped = mapServerItemToGuest(serverItem);
      const identity = buildIdentityKey({
        product: mapped.product,
        selectedAttributes: mapped.selectedAttributes,
      });
      const existingIndex = identityMap.get(identity);

      if (existingIndex == null) {
        mergedItems.push({
          ...mapped,
          _id:
            mapped._id ??
            mapped.serverItemId ??
            `server_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        });
        hasChanges = true;
        continue;
      }

      const current = mergedItems[existingIndex];
      if (
        !areCartItemsIdentical(
          { product: current.product, selectedAttributes: current.selectedAttributes },
          { product: mapped.product, selectedAttributes: mapped.selectedAttributes }
        )
      ) {
        continue;
      }

      const updated = {
        ...current,
        unitPrice: mapped.unitPrice,
        totalPrice: mapped.totalPrice,
        sale: mapped.sale,
        saleVariantIndex: mapped.saleVariantIndex,
        appliedDiscount: mapped.appliedDiscount,
        discountAmount: mapped.discountAmount,
        pricingTier: mapped.pricingTier,
        serverItemId: mapped.serverItemId,
        addedAt: mapped.addedAt,
        productDetails: mapped.productDetails ?? current.productDetails ?? null,
        isAvailable: mapped.isAvailable ?? true,
        unavailableReason: mapped.unavailableReason,
      };

      const changed =
        updated.unitPrice !== current.unitPrice ||
        updated.totalPrice !== current.totalPrice ||
        updated.sale !== current.sale ||
        updated.saleVariantIndex !== current.saleVariantIndex ||
        updated.serverItemId !== current.serverItemId ||
        updated.appliedDiscount !== current.appliedDiscount ||
        updated.discountAmount !== current.discountAmount ||
        JSON.stringify(updated.pricingTier) !== JSON.stringify(current.pricingTier) ||
        updated.isAvailable !== current.isAvailable ||
        updated.unavailableReason !== current.unavailableReason;

      if (changed) {
        mergedItems[existingIndex] = updated;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      setGuestCart({ items: mergedItems, lastUpdated: new Date().toISOString() });
      console.log('Server cart merged into guest cart state');
    }

    setHasSynced(true);
  }, [session, hasSynced, isLoading, serverCart, buildIdentityKey, mapServerItemToGuest]);

  // Sync when session is authenticated and cart data is loaded
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !isLoading) {
      syncFromServer();
    }
  }, [status, session, isLoading, syncFromServer]);

  return {
    hasSynced,
  };
}
