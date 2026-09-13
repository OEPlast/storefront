/**
 * Cart Pricing Utilities
 *
 * Calculate pricing at render time from stored ProductDetail.
 * These functions determine sale prices, discounts, and final prices.
 *
 * SALE MATCHING RULES:
 * 1. attributeName is null or 'all'/'All' → Sale applies to ALL products/variants
 * 2. attributeName exists BUT attributeValue is null or 'all'/'All' → Sale applies to ALL values of that specific attribute
 *    Example: attributeName='Color', attributeValue='All' → applies to all colors
 * 3. Both attributeName AND attributeValue specified → Exact match required
 *    Example: attributeName='Color', attributeValue='Red' → only applies to red color
 *
 * MAXBUYS LIMIT:
 * - If sale type is 'Limited', check maxBuys - boughtCount
 * - If cart quantity exceeds remaining stock (maxBuys - boughtCount), sale is NOT applied
 * - This prevents overselling limited sale items
 */

import { ProductDetail, ProductSale } from '@/types/product';
import { CartItem } from '@/context/CartContext';

export interface CartItemPricing {
  basePrice: number; // Original price
  unitPrice: number; // Final price per unit (after discounts)
  totalPrice: number; // unitPrice * qty
  appliedDiscount: number; // Discount percentage (0-100) - cumulative sale + tier
  saleDiscount: number; // Sale discount percentage (0-100) - sale only
  tierDiscount: number; // Tier discount percentage (0-100) - tier only
  discountAmount: number; // Dollar amount saved
  sale: ProductSale | null;
  pricingTier: {
    minQty: number;
    maxQty: number | null;
    strategy: 'fixedPrice' | 'percentOff' | 'amountOff';
    value: number;
    appliedPrice: number;
  } | null;
}

/**
 * Calculate pricing for a cart item at render time
 */
export function calculateCartItemPricing(item: CartItem): CartItemPricing {
  const basePrice = item.price || 0;
  let unitPrice = basePrice;
  let appliedDiscount = 0;
  let saleDiscount = 0;
  let tierDiscount = 0;
  let sale: ProductSale | null = null;
  let pricingTier = null;

  // Check for active sale
  if (item.sale && item.sale.isActive) {
    const canShowIfFlash = () => {
      if (item.sale && item.sale.type === 'Flash') {
        const now = new Date();
        const saleStart = item.sale.startDate ? new Date(item.sale.startDate) : null;
        const saleEnd = item.sale.endDate ? new Date(item.sale.endDate) : null;

        const isWithinDateRange = !saleStart || !saleEnd || (now >= saleStart && now <= saleEnd);
        if (isWithinDateRange) return true;
        return false;
      } else {
        return true;
      }
    };

    if (canShowIfFlash() && item.sale.variants && item.sale.variants.length > 0) {
      sale = item.sale;
      let matchingVariant = null;

      // Helper to check if value is null or 'all'/'All'
      const isAllOrNull = (value: any) => {
        return value === null || value === 'all' || value === 'All';
      };

      // Find matching variant based on attribute rules
      for (const variant of sale.variants) {
        const attrName = variant.attributeName;
        const attrValue = variant.attributeValue;

        // Rule 1: attributeName is null or 'all'/'All' = applies to all products
        if (isAllOrNull(attrName)) {
          matchingVariant = variant;
          break;
        }

        // Rule 2: attributeName exists but attributeValue is null or 'all'/'All' = applies to all values of that attribute
        if (attrName && isAllOrNull(attrValue)) {
          const hasAttribute = item.selectedAttributes.some((attr) => attr.name === attrName);
          if (hasAttribute || item.selectedAttributes.length === 0) {
            matchingVariant = variant;
            break;
          }
        }

        // Rule 3: Both attributeName and attributeValue are specified = exact match required
        if (attrName && attrValue && !isAllOrNull(attrValue)) {
          const exactMatch = item.selectedAttributes.some(
            (attr) => attr.name === attrName && attr.value === attrValue
          );
          if (exactMatch) {
            matchingVariant = variant;
            break;
          }
        }
      }

      // Apply sale if matching variant found and within maxBuys limit
      if (matchingVariant) {
        const maxBuys = matchingVariant.maxBuys || 0;
        const boughtCount = matchingVariant.boughtCount || 0;
        const remainingStock = maxBuys - boughtCount;

        // Only limited sales are capped by maxBuys. Bulk tiers should not
        // disable normal or flash sale pricing when the cart quantity grows.
        const exceedsSaleLimit =
          sale.type === 'Limited' && maxBuys > 0 && item.qty > remainingStock;

        if (!exceedsSaleLimit) {
          appliedDiscount = matchingVariant.discount || 0;
          saleDiscount = appliedDiscount; // Track sale discount separately
          const amountOff = matchingVariant.amountOff || 0;

          if (amountOff > 0) {
            // Amount off discount
            unitPrice = Math.max(0, basePrice - amountOff);
            appliedDiscount = ((basePrice - unitPrice) / basePrice) * 100;
            saleDiscount = appliedDiscount; // Update for amountOff case
          } else if (appliedDiscount > 0) {
            // Percentage discount
            unitPrice = basePrice * (1 - appliedDiscount / 100);
          }
        } else {
          // Quantity exceeds sale limit, no sale applied
          sale = null;
        }
      }
    }
  }

  // Check for pricing tiers (bulk discounts)
  if (item.pricingTiers && item.pricingTiers.length > 0) {
    const matchingTier = item.pricingTiers.find((tier) => {
      const minMatch = item.qty >= tier.minQty;
      const maxMatch = !tier.maxQty || item.qty <= tier.maxQty;
      return minMatch && maxMatch;
    });

    if (matchingTier) {
      let tierPrice = unitPrice;

      if (matchingTier.strategy === 'percentOff') {
        tierPrice = unitPrice * (1 - matchingTier.value / 100);
      } else if (matchingTier.strategy === 'fixedPrice') {
        tierPrice = matchingTier.value;
      } else if (matchingTier.strategy === 'amountOff') {
        tierPrice = unitPrice - matchingTier.value;
      }

      // Only apply if it's better than current price
      if (tierPrice < unitPrice) {
        const tierDiscountPercent = ((unitPrice - tierPrice) / unitPrice) * 100;
        tierDiscount = tierDiscountPercent; // Track tier discount separately
        appliedDiscount = appliedDiscount + tierDiscountPercent; // Cumulative discount
        unitPrice = tierPrice;

        pricingTier = {
          minQty: matchingTier.minQty,
          maxQty: matchingTier.maxQty ?? null,
          strategy: matchingTier.strategy,
          value: matchingTier.value,
          appliedPrice: tierPrice,
        };
      }
    }
  }

  const totalPrice = unitPrice * item.qty;
  const discountAmount = (basePrice - unitPrice) * item.qty;

  return {
    basePrice,
    unitPrice,
    totalPrice,
    appliedDiscount,
    saleDiscount,
    tierDiscount,
    discountAmount,
    sale,
    pricingTier,
  };
}

/**
 * Calculate cart totals from all items
 */
export function calculateCartTotals(items: CartItem[]): {
  subtotal: number;
  totalDiscount: number;
  total: number;
} {
  let subtotal = 0;
  let totalDiscount = 0;

  items.forEach((item) => {
    const pricing = calculateCartItemPricing(item);
    subtotal += pricing.totalPrice;
    totalDiscount += pricing.discountAmount;
  });

  return {
    subtotal,
    totalDiscount,
    total: subtotal, // Can add shipping, taxes, etc. later
  };
}

/**
 * Get the display price for a product (considering sales)
 */
export function getProductDisplayPrice(
  product: ProductDetail,
  selectedAttributes?: Array<{ name: string; value: string }>
): {
  price: number;
  originalPrice: number | null;
  discountPercentage: number;
} {
  const basePrice = product.price || 0;
  let finalPrice = basePrice;
  let discountPercentage = 0;

  if (product.sale && product.sale.isActive) {
    const now = new Date();
    const saleStart = product.sale.startDate ? new Date(product.sale.startDate) : null;
    const saleEnd = product.sale.endDate ? new Date(product.sale.endDate) : null;

    const isWithinDateRange = !saleStart || !saleEnd || (now >= saleStart && now <= saleEnd);

    if (isWithinDateRange && product.sale.variants && product.sale.variants.length > 0) {
      let matchingVariant = null;

      // Helper to check if value is null or 'all'/'All'
      const isAllOrNull = (value: any) => {
        return value === null || value === 'all' || value === 'All';
      };

      // Find matching variant based on attribute rules
      for (const variant of product.sale.variants) {
        const attrName = variant.attributeName;
        const attrValue = variant.attributeValue;

        // Rule 1: attributeName is null or 'all'/'All' = applies to all products
        if (isAllOrNull(attrName)) {
          matchingVariant = variant;
          break;
        }

        // Rule 2: attributeName exists but attributeValue is null or 'all'/'All' = applies to all values of that attribute
        if (attrName && isAllOrNull(attrValue) && selectedAttributes) {
          const hasAttribute = selectedAttributes.some((attr) => attr.name === attrName);
          if (hasAttribute || selectedAttributes.length === 0) {
            matchingVariant = variant;
            break;
          }
        }

        // Rule 3: Both attributeName and attributeValue are specified = exact match required
        if (attrName && attrValue && !isAllOrNull(attrValue) && selectedAttributes) {
          const exactMatch = selectedAttributes.some(
            (attr) => attr.name === attrName && attr.value === attrValue
          );
          if (exactMatch) {
            matchingVariant = variant;
            break;
          }
        }
      }

      // Apply sale if matching variant found
      if (matchingVariant) {
        discountPercentage = matchingVariant.discount || 0;
        const amountOff = matchingVariant.amountOff || 0;

        if (amountOff > 0) {
          // Amount off discount
          finalPrice = Math.max(0, basePrice - amountOff);
          discountPercentage = ((basePrice - finalPrice) / basePrice) * 100;
        } else if (discountPercentage > 0) {
          // Percentage discount
          finalPrice = basePrice * (1 - discountPercentage / 100);
        }
      }
    }
  }

  return {
    price: finalPrice,
    originalPrice: discountPercentage > 0 ? basePrice : null,
    discountPercentage,
  };
}
