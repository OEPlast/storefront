/**
 * Variant Label & Line Discount Tag Utilities
 *
 * Turns a cart line's `selectedAttributes` into a display label, and a
 * `CartItemPricing` into the per-line discount tags. Presentation-free except
 * for LINE_DISCOUNT_TAG_CLASS, which is exported deliberately so every line
 * renderer paints tags identically.
 */

import { getTierDescription, type AppliedPricingTier } from '@/utils/pricingTiers';
import type { CartItemPricing } from '@/utils/cart-pricing';

export type SelectedAttribute = { name: string; value: string };

/** Same data as name/value pairs, for chip rendering. `key` is `${name}:${index}`. */
export function formatVariantEntries(
  attributes?: SelectedAttribute[] | null
): Array<{ key: string; name: string; value: string }> {
  if (!Array.isArray(attributes)) return [];

  return attributes.reduce<Array<{ key: string; name: string; value: string }>>(
    (entries, attribute, index) => {
      const value = attribute?.value?.trim() ?? '';
      if (!value) return entries;

      const name = attribute?.name?.trim() ?? '';
      // Index comes from the SOURCE array, not the filtered one, so two
      // attributes sharing a name can never collide on `key`.
      entries.push({ key: `${name}:${index}`, name, value });
      return entries;
    },
    []
  );
}

/**
 * "Gold / 2mm". Skips entries with an empty value. Returns '' for none.
 */
export function formatVariantLabel(
  attributes?: SelectedAttribute[] | null,
  separator: string = ' / '
): string {
  return formatVariantEntries(attributes)
    .map((entry) => entry.value)
    .join(separator);
}

export type LineDiscountTone = 'sale' | 'bulk' | 'unavailable';

export interface LineDiscountTag {
  /** Stable React key. 'unavailable' | 'sale' | 'bulk'. */
  key: string;
  label: string;
  tone: LineDiscountTone;
}

/** Locked class map so every line renderer paints tags identically. */
export const LINE_DISCOUNT_TAG_CLASS: Record<LineDiscountTone, string> = {
  unavailable: 'bg-red text-white',
  sale: 'bg-red/10 text-red',
  bulk: 'bg-blue-600/10 text-blue-700',
};

/**
 * "SALE 25% OFF", or null when pricing.saleDiscount <= 0.
 *
 * NEVER keys off pricing.sale: cart-pricing assigns `sale` before the
 * variant-matching loop, so an active sale with no matching variant leaves
 * `sale` non-null while `saleDiscount` stays 0.
 */
export function formatSaleTagLabel(pricing: CartItemPricing): string | null {
  const saleDiscount = pricing?.saleDiscount;
  if (!Number.isFinite(saleDiscount) || saleDiscount <= 0) return null;

  // A real-but-sub-1% discount must not render as "SALE 0% OFF".
  const percentage = Math.max(1, Math.round(saleDiscount));
  return `-${percentage}%`;
}

/**
 * "Bulk 10% off" | "Bulk · ₦500 off" | "Bulk · Fixed price ₦2,500", or null.
 *
 * getTierDescription() will not accept pricing.pricingTier directly:
 * CartItemPricing['pricingTier'].maxQty is `number | null`, AppliedPricingTier's
 * is `number | undefined`, and `null` is not assignable to `undefined`.
 */
export function formatTierTagLabel(tier: CartItemPricing['pricingTier']): string | null {
  if (!tier) return null;

  const appliedTier: AppliedPricingTier = {
    minQty: tier.minQty,
    maxQty: tier.maxQty ?? undefined,
    strategy: tier.strategy,
    value: tier.value,
    appliedPrice: tier.appliedPrice,
  };

  const description = getTierDescription(appliedTier);
  if (!description) return null;

  // getTierDescription returns a bare "10%" for percentOff but a complete
  // phrase ("₦500 off", "Fixed price ₦2,500") for the other two strategies.
  return tier.strategy === 'percentOff' ? `Bulk ${description} off` : `Bulk · ${description}`;
}

/** Ordered: unavailable, then sale, then bulk. Empty array when there is nothing to show. */
export function getLineDiscountTags(
  pricing: CartItemPricing,
  options?: { isUnavailable?: boolean }
): LineDiscountTag[] {
  const tags: LineDiscountTag[] = [];

  if (options?.isUnavailable) {
    tags.push({ key: 'unavailable', label: 'Out of stock', tone: 'unavailable' });
  }

  const saleLabel = formatSaleTagLabel(pricing);
  if (saleLabel) {
    tags.push({ key: 'sale', label: saleLabel, tone: 'sale' });
  }

  const tierLabel = formatTierTagLabel(pricing?.pricingTier ?? null);
  if (tierLabel) {
    tags.push({ key: 'bulk', label: tierLabel, tone: 'bulk' });
  }

  return tags;
}

/** Money saved on this line: pricing.discountAmount, floored at 0, 0 when non-finite. */
export function getLineSavings(pricing: CartItemPricing): number {
  const amount = pricing?.discountAmount;
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, amount);
}

/** Sum of getLineSavings across lines. THE source for the TOTAL SAVINGS row. */
export function sumLineSavings(pricings: CartItemPricing[]): number {
  if (!Array.isArray(pricings)) return 0;
  return pricings.reduce((total, pricing) => total + getLineSavings(pricing), 0);
}
