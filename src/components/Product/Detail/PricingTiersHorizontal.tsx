
'use client';

import React from 'react';
import {
    calculateTierBasePrice,
    findTierForQuantity,
    NormalizedPricingTier,
} from './pricingHelpers';
import { formatToNaira } from '@/utils/currencyFormatter';

interface PricingTiersHorizontalProps {
    basePrice: number;
    tiers?: NormalizedPricingTier[];
    salePercent?: number;
    saleMultiplier?: number;
    currentQuantity?: number;
    onTierClick?: (minQty: number) => void;
}

const PricingTiersHorizontal: React.FC<PricingTiersHorizontalProps> = ({
    basePrice,
    tiers = [],
    salePercent = 0,
    saleMultiplier = 1,
    currentQuantity = 1,
    onTierClick,
}) => {
    const resolvedTiers = tiers.length > 0 ? tiers : [{ minQty: 1, strategy: 'fixedPrice', value: Math.max(0, basePrice) }];
    const activeTier = findTierForQuantity(resolvedTiers, currentQuantity);
    const comparisonBase = saleMultiplier < 1 ? basePrice * saleMultiplier : basePrice;
    const showSale = saleMultiplier < 1;

    if (tiers.length === 0) return null;
    return (
        <div className="pricing-tiers-horizontal mt-6">
            <div className="flex items-center justify-between mb-3">
                <div className="text-title">Wholesale prices</div>
            </div>

            <div className="grid lg:grid-cols-3 sm:grid-cols-3 grid-cols-3 gap-2 sm:gap-3">
                {resolvedTiers.map((tier, index) => {
                    const rangeLabel = tier.maxQty ? `${tier.minQty}-${tier.maxQty}` : `${tier.minQty}+`;
                    const originalPrice = calculateTierBasePrice(basePrice, tier);
                    const discountedPrice = showSale ? Math.max(0, originalPrice * saleMultiplier) : originalPrice;
                    const displaySavingsSource = showSale ? comparisonBase : basePrice;
                    const savings = Math.max(0, Math.round((1 - discountedPrice / displaySavingsSource) * 100));
                    const isActive = Boolean(activeTier && activeTier.minQty === tier.minQty && activeTier.maxQty === tier.maxQty);
                    const showStrikeThrough = showSale && discountedPrice < originalPrice - 0.009;

                    return (
                        <div
                            key={index}
                            onClick={() => onTierClick?.(tier.minQty)}
                            className={`tier-card border-2 rounded-lg p-3 transition-all duration-200 cursor-pointer group ${isActive
                                ? 'border-green-900 bg-green bg-opacity-5'
                                : 'border-line hover:border-black'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="text-sm font-semibold">{rangeLabel}</div>
                                {savings > 0 && (
                                    <div className="text-xs bg-lime-500 text-white px-1.5 py-0.5 rounded font-semibold">
                                        -{savings}%
                                    </div>
                                )}
                            </div>
                            <div className="font-bold text-lg group-hover:text-black">
                                {showStrikeThrough && (
                                    <div className="text-xs text-secondary2 line-through">{formatToNaira(originalPrice)}</div>
                                )}
                                <div>{formatToNaira(discountedPrice)}</div>
                            </div>
                            <div className="text-xs text-secondary2 mt-0.5">per unit</div>
                        </div>
                    );
                })}
            </div>
            {showSale && (
                <div className="text-xs text-secondary2 mt-2">
                    Sale applied: -{Math.round(salePercent ?? 0)}% across tiers
                </div>
            )}
        </div>
    );
};

export default PricingTiersHorizontal;
