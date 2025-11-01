import { ProductSale, SaleVariant } from '@/types/product';

export interface SaleCalculation {
  hasActiveSale: boolean;
  originalPrice: number;
  discountedPrice: number;
  percentOff: number;
  amountOff: number;
  bestVariant: SaleVariant | null;
}

/**
 * Calculate the best sale discount for a product
 * Iterates through all sale variants to find the highest discount
 * 
 * Sale variant logic:
 * - attributeName: null & attributeValue: null → applies to entire product
 * - attributeName: set & attributeValue: null → applies to all variants of that attribute
 * - attributeName: set & attributeValue: set → applies to specific variant
 * 
 * @param sale - The sale object from the product
 * @param originalPrice - The original price of the product
 * @param activeAttribute - Optional active attribute (for variant-specific sales)
 * @returns Sale calculation with best discount
 */
export function calculateBestSale(
  sale: ProductSale | null | undefined,
  originalPrice: number,
  activeAttribute?: { name: string; value: string }
): SaleCalculation {
  const defaultResult: SaleCalculation = {
    hasActiveSale: false,
    originalPrice,
    discountedPrice: originalPrice,
    percentOff: 0,
    amountOff: 0,
    bestVariant: null,
  };

  // No sale or sale is not active
  if (!sale || !sale.isActive || !sale.variants || sale.variants.length === 0) {
    return defaultResult;
  }

  // Check if sale period is valid (if dates are provided)
  const now = new Date();
  if (sale.startDate && new Date(sale.startDate) > now) {
    return defaultResult;
  }
  if (sale.endDate && new Date(sale.endDate) < now) {
    return defaultResult;
  }

  let bestDiscount = 0;
  let bestVariant: SaleVariant | null = null;
  let bestDiscountedPrice = originalPrice;
  let bestPercentOff = 0;
  let bestAmountOff = 0;

  // Iterate through all variants to find the best discount
  for (const variant of sale.variants) {
    // Check if variant has reached max buys
    if (variant.maxBuys > 0 && variant.boughtCount >= variant.maxBuys) {
      continue;
    }

    // Calculate discount value for comparison
    let discountValue = 0;
    let discountedPrice = originalPrice;
    let percentOff = 0;
    let amountOff = 0;

    if (variant.discount > 0) {
      // Percentage discount
      percentOff = variant.discount;
      amountOff = Math.round((originalPrice * variant.discount) / 100);
      discountedPrice = originalPrice - amountOff;
      discountValue = amountOff;
    } else if (variant.amountOff > 0) {
      // Fixed amount discount
      amountOff = variant.amountOff;
      discountedPrice = Math.max(0, originalPrice - variant.amountOff);
      percentOff = Math.round((variant.amountOff / originalPrice) * 100);
      discountValue = variant.amountOff;
    }

    // Skip if no discount
    if (discountValue === 0) continue;

    // Check if this variant applies to the current selection
    const isApplicable = checkVariantApplicability(variant, activeAttribute);
    if (!isApplicable) continue;

    // Update best discount if this one is better
    if (discountValue > bestDiscount) {
      bestDiscount = discountValue;
      bestVariant = variant;
      bestDiscountedPrice = discountedPrice;
      bestPercentOff = percentOff;
      bestAmountOff = amountOff;
    }
  }

  // Return result
  if (bestVariant) {
    return {
      hasActiveSale: true,
      originalPrice,
      discountedPrice: bestDiscountedPrice,
      percentOff: bestPercentOff,
      amountOff: bestAmountOff,
      bestVariant,
    };
  }

  return defaultResult;
}

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
    console.log('Checking if sale marquee should be shown', sale);
  if (!sale || !sale.isActive || !sale.isHot) {
    return false;
  }

// Check if sale has ended
if (sale.endDate && new Date(sale.endDate) < new Date()) {
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
  // Same logic as marquee - isHot controls both
  return shouldShowSaleMarquee(sale);
}

/**
 * Format a price for display
 * @param price - The price to format
 * @returns Formatted price string
 */
export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
