import { ProductSale, SaleVariant } from '@/types/product';
import { formatToNaira } from './currencyFormatter';

export interface SaleCalculation {
  hasActiveSale: boolean;
  originalPrice: number;
  discountedPrice: number;
  percentOff: number;
  amountOff: number;
  bestVariant: SaleVariant | null;
}

// ...existing code...

/**
 * Simple: pick the best applicable variant and compute price.
 * - "All"/null means global (applies to whole product)
 * - attributeName + null/"All" applies to all values of that attribute
 * - attributeName + attributeValue applies to that exact pair
 * - If start/end provided, enforce window; otherwise ignore.
 */
export function calculateBestSale(
  sale: ProductSale | null | undefined,
  originalPrice: number,
  activeAttribute?: { name: string; value: string }
): SaleCalculation {
  const result: SaleCalculation = {
    hasActiveSale: false,
    originalPrice,
    discountedPrice: originalPrice,
    percentOff: 0,
    amountOff: 0,
    bestVariant: null,
  };

  if (!sale || !sale.isActive || !sale.variants?.length) return result;
  const now = new Date();
  const saleStart = sale.startDate ? new Date(sale.startDate) : null;
  const saleEnd = sale.endDate ? new Date(sale.endDate) : null;

  if (sale.type === 'Flash') {
    const isWithinDateRange = !saleStart || !saleEnd || (now >= saleStart && now <= saleEnd);
    if (!isWithinDateRange) return result;
  }

  const isAll = (v: unknown) =>
    v === null || (typeof v === 'string' && v.trim().toLowerCase() === 'all');

  const appliesToSelection = (v: SaleVariant): boolean => {
    const nameAll = isAll(v.attributeName);
    const valueAll = isAll(v.attributeValue);

    // Global
    if (nameAll && valueAll) return true;

    // Attribute-wide (e.g., Color: All)
    if (!nameAll && valueAll) {
      if (!activeAttribute) return true; // no selection => still applicable overall
      return (
        activeAttribute.name.trim().toLowerCase() === String(v.attributeName).trim().toLowerCase()
      );
    }

    // Exact attribute/value match
    if (!nameAll && !valueAll) {
      if (!activeAttribute) return true; // treat as general if no selection chosen yet
      return (
        activeAttribute.name.trim().toLowerCase() ===
          String(v.attributeName).trim().toLowerCase() &&
        activeAttribute.value.trim().toLowerCase() === String(v.attributeValue).trim().toLowerCase()
      );
    }

    // (nameAll && !valueAll) is an odd case; treat as global fallback
    return true;
  };

  let best = result;

  for (const v of sale.variants) {
    if (!appliesToSelection(v)) continue;

    // Compute discount
    const pct = Math.max(0, v.discount || 0);
    const off = Math.max(0, v.amountOff || 0);

    // Pick the stronger discount outcome (in price terms)
    const priceFromPct = pct > 0 ? originalPrice - (originalPrice * pct) / 100 : originalPrice;
    const priceFromOff = off > 0 ? Math.max(0, originalPrice - off) : originalPrice;

    // Decide which discount this variant actually gives
    let variantDiscounted = originalPrice;
    let variantPercentOff = 0;
    let variantAmountOff = 0;

    if (pct > 0 && priceFromPct <= priceFromOff) {
      variantDiscounted = priceFromPct;
      variantPercentOff = pct;
      variantAmountOff = originalPrice - priceFromPct;
    } else if (off > 0) {
      variantDiscounted = priceFromOff;
      variantAmountOff = off;
      variantPercentOff = Math.round((off / originalPrice) * 100);
    } else {
      continue; // no discount in this variant
    }

    // Keep the lowest price (best deal)
    if (!best.bestVariant || variantDiscounted < best.discountedPrice) {
      best = {
        hasActiveSale: true,
        originalPrice,
        discountedPrice: variantDiscounted,
        percentOff: variantPercentOff,
        amountOff: variantAmountOff,
        bestVariant: v,
      };
    }
  }

  return best;
}

// ...existing code...

/**
 * Check if a sale variant is applicable based on attribute selection
 *
 * @param variant - The sale variant to check
 * @param activeAttribute - The currently selected attribute (if any)
 * @returns true if the variant applies, false otherwise
 */
function checkVariantApplicability(
  variant: SaleVariant,
  activeAttribute?: { name: string; value: string }
): boolean {
  // Case 1: Both null → applies to entire product (always applicable)
  if (variant.attributeName === null && variant.attributeValue === null) {
    return true;
  }

  // Case 2: attributeName set, attributeValue null → applies to all values of that attribute
  if (variant.attributeName !== null && variant.attributeValue === null) {
    // If no active attribute selected, consider it applicable (will show best overall discount)
    if (!activeAttribute) {
      return true;
    }
    // If active attribute matches, it's applicable
    return activeAttribute.name === variant.attributeName;
  }

  // Case 3: Both set → applies to specific attribute value
  if (variant.attributeName !== null && variant.attributeValue !== null) {
    // If no active attribute selected, consider it applicable (will show best overall discount)
    if (!activeAttribute) {
      return true;
    }
    // Must match both attribute name and value
    return (
      activeAttribute.name === variant.attributeName &&
      activeAttribute.value === variant.attributeValue
    );
  }

  return false;
}

/**
 * Calculate total sold quantity from sale variants
 * Sums up all boughtCount values from sale variants
 *
 * @param sale - The sale object from the product
 * @returns Total number of items sold through sales
 */
export function calculateSoldFromSale(sale: ProductSale | null | undefined): number {
  if (!sale || !sale.variants || sale.variants.length === 0) {
    return 0;
  }

  return sale.variants.reduce((total, variant) => {
    return total + (variant.boughtCount || 0);
  }, 0);
}

/**
 * Calculate total capacity (sum of maxBuys) from sale variants
 *
 * @param sale - The sale object from the product
 * @returns Total capacity across all sale variants
 */
export function calculateTotalCapacity(sale: ProductSale | null | undefined): number {
  if (!sale || !sale.variants || sale.variants.length === 0) {
    return 0;
  }

  return sale.variants.reduce((total, variant) => {
    return total + (variant.maxBuys || 0);
  }, 0);
}

/**
 * Calculate available quantity (maxBuys - boughtCount) from sale variants
 *
 * @param sale - The sale object from the product
 * @returns Total available quantity across all sale variants
 */
export function calculateAvailableFromSale(sale: ProductSale | null | undefined): number {
  if (!sale || !sale.variants || sale.variants.length === 0) {
    return 0;
  }

  return sale.variants.reduce((total, variant) => {
    const maxBuys = variant.maxBuys || 0;
    const boughtCount = variant.boughtCount || 0;
    const available = Math.max(0, maxBuys - boughtCount);
    return total + available;
  }, 0);
}

/**
 * Calculate sale progress percentage based on maxBuys and boughtCount
 *
 * @param sale - The sale object from the product
 * @returns Percentage (0-100) of items sold vs capacity
 */
export function calculateSaleProgress(sale: ProductSale | null | undefined): number {
  if (!sale || !sale.variants || sale.variants.length === 0) {
    return 0;
  }

  const totalCapacity = calculateTotalCapacity(sale);
  if (totalCapacity === 0) return 0;

  const totalSold = calculateSoldFromSale(sale);
  return Math.floor((totalSold / totalCapacity) * 100);
}

/**
 * Check if sale is sold out (total boughtCount >= total maxBuys)
 *
 * @param sale - The sale object from the product
 * @returns true if sold out, false otherwise
 */
export function isSaleSoldOut(sale: ProductSale | null | undefined): boolean {
  if (!sale || !sale.variants || sale.variants.length === 0) {
    return false;
  }

  const totalCapacity = calculateTotalCapacity(sale);
  const totalSold = calculateSoldFromSale(sale);

  // If no capacity set (maxBuys = 0), not sold out
  if (totalCapacity === 0) {
    return false;
  }

  return totalSold >= totalCapacity;
}

/**
 * Check if sale should show the "Hot Sale" marquee banner
 * Conditions: sale must be active, isHot must be true, and not sold out
 *
 * @param sale - The sale object from the product
 * @returns true if should show marquee, false otherwise
 */
export function shouldShowSaleMarquee(sale: ProductSale | null | undefined): boolean {
  if (!sale || !sale.isActive || !sale.isHot) {
    return false;
  }
  const now = new Date();
  const saleStart = sale.startDate ? new Date(sale.startDate) : null;
  const saleEnd = sale.endDate ? new Date(sale.endDate) : null;

  const isWithinDateRange = !saleStart || !saleEnd || (now >= saleStart && now <= saleEnd);
  if (!isWithinDateRange) return false;

  // Check if sale has ended
  if (sale.type === 'Flash' && sale.endDate && new Date(sale.endDate) < new Date()) {
    return false;
  }

  // Don't show if sold out
  if (isSaleSoldOut(sale)) {
    return false;
  }

  return true;
}

/**
 * Check if sale should show the sold/available progress section
 * Conditions: sale must be active, isHot must be true, and not sold out
 *
 * @param sale - The sale object from the product
 * @returns true if should show progress, false otherwise
 */
export function shouldShowSaleProgress(sale: ProductSale | null | undefined): boolean {
  if (!sale || !sale.isActive) {
    return false;
  }
  // Check if sale has ended
  if (sale.type !== 'Limited') {
    return false;
  }

  // Don't show if sold out
  if (isSaleSoldOut(sale)) {
    return false;
  }

  return true;
}

/**
 * Format a price for display
 * @param price - The price to format
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
  return formatToNaira(price);
}
