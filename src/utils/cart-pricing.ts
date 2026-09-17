/**
 * Cart Pricing Utilities
 *
 * MIRRORS Main-server `src/services/pricing/linePricing.ts`, the formula checkout validates with
 * and order creation charges with. Change both together: when they disagree, checkout shows the
 * shopper a "prices changed" correction, or refuses the order.
 *
 * Order of operations (owner decision 2026-09-15, "sale on top of tier"):
 *   1. List price: the selected option's own price when it has one, else the product price.
 *   2. Bulk tier: the option's tiers when it has any, else the product's; the matching tier with
 *      the highest minQty wins, and a tier never raises the price.
 *   3. Sale: taken off the tier price (percent of it, or a fixed amount capped at it).
 *
 * SALE MATCHING (first matching variant wins):
 *   - attributeName null / 'all' → every line
 *   - attributeName set, attributeValue null / 'all' → any value of that attribute
 *   - both set → exact match
 *   A variant with a unit cap (maxBuys > 0) only applies when the whole line fits in what is left
 *   (maxBuys - boughtCount), so a capped sale is never oversold. Flash sales apply only inside their
 *   dates.
 */

import { ProductDetail, ProductSale, ProductPricingTier } from '@/types/product';
import { CartItem } from '@/context/CartContext';

export interface CartItemPricing {
  basePrice: number; // List price (option price or product price)
  unitPrice: number; // Final price per unit (after tier and sale)
  totalPrice: number; // unitPrice * qty
  appliedDiscount: number; // Total discount percentage vs list price (0-100)
  saleDiscount: number; // Sale discount percentage of the tier price (0-100)
  tierDiscount: number; // Tier discount percentage of the list price (0-100)
  discountAmount: number; // Naira saved on the line
  sale: ProductSale | null; // Set only when the sale actually applies to this line
  pricingTier: {
    minQty: number;
    maxQty: number | null;
    strategy: 'fixedPrice' | 'percentOff' | 'amountOff';
    value: number;
    appliedPrice: number;
  } | null;
}

const roundKobo = (value: number) => Math.round(value * 100) / 100;
const isAll = (value: string | null | undefined) =>
  value === null || value === undefined || value === '' || value.toLowerCase() === 'all';

type SelectedAttribute = { name: string; value: string };

function resolvePricedOption(product: ProductDetail, selected: SelectedAttribute[]) {
  const groups = (product as { attributes?: Array<{ name: string; children: Array<{ name: string; price?: number; pricingTiers?: ProductPricingTier[] }> }> }).attributes;
  if (!groups?.length || !selected.length) return undefined;
  const picked = new Map(selected.map((a) => [a.name, a.value]));
  for (const group of groups) {
    const value = picked.get(group.name);
    if (!value) continue;
    const option = group.children?.find((c) => c.name === value);
    if (option && (typeof option.price === 'number' || (option.pricingTiers?.length ?? 0) > 0)) return option;
  }
  return undefined;
}

function findTier(qty: number, tiers?: ProductPricingTier[]) {
  if (!tiers?.length) return null;
  const matching = tiers.filter((t) => qty >= t.minQty && (t.maxQty == null || t.maxQty === 0 || qty <= t.maxQty));
  if (!matching.length) return null;
  return [...matching].sort((a, b) => b.minQty - a.minQty)[0] ?? null;
}

function applyTier(price: number, tier: ProductPricingTier | null) {
  if (!tier) return price;
  switch (tier.strategy) {
    case 'fixedPrice':
      return Math.min(price, Math.max(0, tier.value));
    case 'percentOff':
      return Math.max(0, price - (price * tier.value) / 100);
    case 'amountOff':
      return Math.max(0, price - tier.value);
    default:
      return price;
  }
}

/** The sale variant that applies to this line, or null. */
export function matchSaleVariant(
  sale: ProductSale | null | undefined,
  selected: SelectedAttribute[],
  qty: number,
  now: Date = new Date()
) {
  if (!sale || !sale.isActive) return null;
  if (sale.type === 'Flash') {
    if (!sale.startDate || !sale.endDate) return null;
    if (now < new Date(sale.startDate) || now > new Date(sale.endDate)) return null;
  }
  const variants = sale.variants ?? [];
  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index]!;
    const name = variant.attributeName;
    const value = variant.attributeValue;
    const matches = isAll(name)
      ? true
      : isAll(value)
        ? selected.length === 0 || selected.some((a) => a.name === name)
        : selected.some((a) => a.name === name && a.value === value);
    if (!matches) continue;
    const maxBuys = variant.maxBuys ?? 0;
    if (maxBuys > 0 && qty > maxBuys - (variant.boughtCount ?? 0)) return null;
    const hasDiscount = (variant.amountOff ?? 0) > 0 || (variant.discount ?? 0) > 0;
    return hasDiscount ? { index, variant } : null;
  }
  return null;
}

/**
 * Calculate pricing for a cart item at render time
 */
export function calculateCartItemPricing(item: CartItem, nowMs: number = Date.now()): CartItemPricing {
  const selected = item.selectedAttributes ?? [];
  const option = resolvePricedOption(item, selected);
  const listPrice = typeof option?.price === 'number' ? option.price : item.price || 0;

  const tier = findTier(item.qty, option?.pricingTiers?.length ? option.pricingTiers : item.pricingTiers);
  const tierPrice = applyTier(listPrice, tier);

  const match = matchSaleVariant(item.sale, selected, item.qty, new Date(nowMs));
  let saleUnitDiscount = 0;
  if (match) {
    const amountOff = match.variant.amountOff ?? 0;
    saleUnitDiscount = amountOff > 0 ? Math.min(amountOff, tierPrice) : (tierPrice * (match.variant.discount ?? 0)) / 100;
  }

  const unitPrice = roundKobo(Math.max(0, tierPrice - saleUnitDiscount));
  const roundedList = roundKobo(listPrice);
  const roundedTier = roundKobo(tierPrice);
  const tierApplied = tier !== null && roundedTier < roundedList;

  return {
    basePrice: roundedList,
    unitPrice,
    totalPrice: roundKobo(unitPrice * item.qty),
    appliedDiscount: roundedList > 0 ? ((roundedList - unitPrice) / roundedList) * 100 : 0,
    saleDiscount: match && roundedTier > 0 ? ((roundedTier - unitPrice) / roundedTier) * 100 : 0,
    tierDiscount: tierApplied && roundedList > 0 ? ((roundedList - roundedTier) / roundedList) * 100 : 0,
    discountAmount: roundKobo((roundedList - unitPrice) * item.qty),
    sale: match ? item.sale ?? null : null,
    pricingTier: tierApplied && tier
      ? { minQty: tier.minQty, maxQty: tier.maxQty ?? null, strategy: tier.strategy, value: tier.value, appliedPrice: roundedTier }
      : null,
  };
}

/**
 * Calculate cart totals from all items
 */
export function calculateCartTotals(items: CartItem[], nowMs: number = Date.now()): {
  subtotal: number;
  totalDiscount: number;
  total: number;
} {
  let subtotal = 0;
  let totalDiscount = 0;

  items.forEach((item) => {
    const pricing = calculateCartItemPricing(item, nowMs);
    subtotal = roundKobo(subtotal + pricing.totalPrice);
    totalDiscount = roundKobo(totalDiscount + pricing.discountAmount);
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
  selectedAttributes?: Array<{ name: string; value: string }>,
  /**
   * The clock the sale window is judged against, in ms. Client components pass `useNow()` so a
   * page rendered before a sale boundary still hydrates without a mismatch; see hooks/useNow.tsx.
   */
  nowMs: number = Date.now()
): {
  price: number;
  originalPrice: number | null;
  discountPercentage: number;
} {
  const basePrice = product.price || 0;
  let finalPrice = basePrice;
  let discountPercentage = 0;

  if (product.sale && product.sale.isActive) {
    const now = new Date(nowMs);
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
