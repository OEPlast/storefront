export type PricingStrategy = 'fixedPrice' | 'percentOff' | 'amountOff';

export interface NormalizedPricingTier {
  minQty: number;
  maxQty?: number;
  strategy: PricingStrategy;
  value: number;
}

type RawTier = Partial<{
  minQty: number;
  maxQty?: number;
  strategy: PricingStrategy;
  value: number;
  minQuantity: number;
  maxQuantity?: number;
  fixedPrice: number;
  percentOff: number;
  amountOff: number;
}>;

export function normalizePricingTiers(rawTiers?: RawTier[] | null): NormalizedPricingTier[] {
  if (!Array.isArray(rawTiers)) {
    return [];
  }

  return rawTiers
    .map((raw) => {
      const minQty = raw.minQty ?? raw.minQuantity ?? 0;
      if (!Number.isFinite(minQty) || minQty <= 0) {
        return null;
      }

      const maxQty = raw.maxQty ?? raw.maxQuantity;

      let strategy: PricingStrategy | undefined = raw.strategy;
      let value: number | undefined = raw.value;

      if (!strategy) {
        if (Number.isFinite(raw.fixedPrice)) {
          strategy = 'fixedPrice';
          value = Number(raw.fixedPrice);
        } else if (Number.isFinite(raw.percentOff)) {
          strategy = 'percentOff';
          value = Number(raw.percentOff);
        } else if (Number.isFinite(raw.amountOff)) {
          strategy = 'amountOff';
          value = Number(raw.amountOff);
        }
      }

      if (!strategy) {
        strategy = 'fixedPrice';
      }

      if (!Number.isFinite(value)) {
        if (strategy === 'fixedPrice') {
          value = 0;
        } else {
          value = 0;
        }
      }

      return {
        minQty,
        maxQty,
        strategy,
        value: Number(value),
      } satisfies NormalizedPricingTier;
    })
    .filter((tier): tier is NormalizedPricingTier => Boolean(tier));
}

export function calculateTierBasePrice(basePrice: number, tier: NormalizedPricingTier): number {
  const safeBase = Math.max(0, basePrice);

  switch (tier.strategy) {
    case 'fixedPrice':
      return Math.max(0, tier.value);
    case 'percentOff':
      return Math.max(0, safeBase * (1 - Math.max(0, tier.value) / 100));
    case 'amountOff':
      return Math.max(0, safeBase - Math.max(0, tier.value));
    default:
      return safeBase;
  }
}

export function findTierForQuantity(
  tiers: NormalizedPricingTier[],
  quantity: number
): NormalizedPricingTier | null {
  if (!tiers.length) return null;

  for (const tier of tiers) {
    const withinLower = quantity >= tier.minQty;
    const withinUpper = tier.maxQty == null || quantity <= tier.maxQty;

    if (withinLower && withinUpper) {
      return tier;
    }
  }

  return null;
}
