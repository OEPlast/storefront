/**
 * Pricing Tier Utilities
 * Helps calculate and display pricing tier information for cart items
 */

import type { ProductPricingTier } from '@/types/product';

export interface AppliedPricingTier {
  minQty: number;
  maxQty?: number;
  strategy: 'fixedPrice' | 'percentOff' | 'amountOff';
  value: number;
  appliedPrice: number;
}

/**
 * Find the applicable pricing tier for a given quantity
 */
export function findApplicableTier(
  qty: number,
  tiers?: ProductPricingTier[]
): ProductPricingTier | null {
  if (!tiers || tiers.length === 0) return null;

  const applicable = tiers.filter((tier) => {
    return qty >= tier.minQty && (tier.maxQty == null || qty <= tier.maxQty);
  });

  if (applicable.length === 0) return null;

  // Return tier with highest minQty (best tier)
  return applicable.sort((a, b) => b.minQty - a.minQty)[0];
}

/**
 * Find the next pricing tier that could be unlocked
 */
export function findNextTier(qty: number, tiers?: ProductPricingTier[]): ProductPricingTier | null {
  if (!tiers || tiers.length === 0) return null;

  const nextTiers = tiers.filter((tier) => tier.minQty > qty);

  if (nextTiers.length === 0) return null;

  // Return tier with lowest minQty (closest next tier)
  return nextTiers.sort((a, b) => a.minQty - b.minQty)[0];
}

/**
 * Calculate the unit price after applying a pricing tier
 */
export function calculateTierPrice(
  basePrice: number,
  tier: ProductPricingTier | AppliedPricingTier
): number {
  switch (tier.strategy) {
    case 'fixedPrice':
      return tier.value;
    case 'percentOff':
      return basePrice * (1 - tier.value / 100);
    case 'amountOff':
      return Math.max(0, basePrice - tier.value);
    default:
      return basePrice;
  }
}

/**
 * Get a human-readable description of the tier discount
 */
export function getTierDescription(tier: ProductPricingTier | AppliedPricingTier): string {
  switch (tier.strategy) {
    case 'fixedPrice':
      return `Fixed price $${tier.value.toFixed(2)}`;
    case 'percentOff':
      return `${tier.value}% off`;
    case 'amountOff':
      return `$${tier.value.toFixed(2)} off`;
    default:
      return '';
  }
}

/**
 * Calculate how much the user would save with the next tier
 */
export function calculateNextTierSavings(
  currentQty: number,
  currentPrice: number,
  basePrice: number,
  tiers?: ProductPricingTier[]
): {
  nextTier: ProductPricingTier | null;
  qtyNeeded: number;
  potentialSavings: number;
  potentialUnitPrice: number;
} | null {
  const nextTier = findNextTier(currentQty, tiers);

  if (!nextTier) {
    return null;
  }

  const qtyNeeded = nextTier.minQty - currentQty;
  const potentialUnitPrice = calculateTierPrice(basePrice, nextTier);
  const currentTotalCost = currentPrice * currentQty;
  const nextTierTotalCost = potentialUnitPrice * nextTier.minQty;
  const potentialSavings = Math.max(
    0,
    currentTotalCost - nextTierTotalCost + (basePrice * qtyNeeded - potentialUnitPrice * qtyNeeded)
  );

  return {
    nextTier,
    qtyNeeded,
    potentialSavings,
    potentialUnitPrice,
  };
}

/**
 * Format pricing tier range display
 */
export function formatTierRange(tier: ProductPricingTier): string {
  if (tier.maxQty) {
    return `${tier.minQty}-${tier.maxQty} units`;
  }
  return `${tier.minQty}+ units`;
}
