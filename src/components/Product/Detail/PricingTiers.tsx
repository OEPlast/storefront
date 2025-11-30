'use client';

import { formatToNaira } from '@/utils/currencyFormatter';
import React from 'react';

interface PricingTier {
    minQty: number;
    maxQty?: number;
    strategy: 'fixedPrice' | 'percentOff' | 'amountOff';
    value: number;
}

// Dummy data for demonstration
const dummyPricingTiers: PricingTier[] = [
    {
        minQty: 1,
        maxQty: 9,
        strategy: 'fixedPrice' as const,
        value: 45.0,
    },
    {
        minQty: 10,
        maxQty: 49,
        strategy: 'percentOff' as const,
        value: 10, // 10% off
    },
    {
        minQty: 50,
        maxQty: 99,
        strategy: 'percentOff' as const,
        value: 15, // 15% off
    },
    {
        minQty: 100,
        maxQty: undefined, // unlimited
        strategy: 'amountOff' as const,
        value: 10.0, // $10 off per unit
    },
];

interface PricingTiersProps {
    basePrice: number;
    tiers?: PricingTier[];
    salesDiscount?: number; // Percentage off from sales/campaign
    attributePrice?: number; // Optional price override from selected attribute
}

const PricingTiers: React.FC<PricingTiersProps> = ({
    basePrice,
    tiers = dummyPricingTiers,
    salesDiscount = 0,
    attributePrice,
}) => {
    // Calculate effective price based on attribute or base price
    const effectiveBasePrice = attributePrice || basePrice;

    // Apply sales discount if applicable
    const priceAfterSales = salesDiscount > 0
        ? effectiveBasePrice * (1 - salesDiscount / 100)
        : effectiveBasePrice;

    // Calculate final price for each tier
    const calculateTierPrice = (tier: PricingTier): number => {
        switch (tier.strategy) {
            case 'fixedPrice':
                return tier.value;
            case 'percentOff':
                return priceAfterSales * (1 - tier.value / 100);
            case 'amountOff':
                return priceAfterSales - tier.value;
            default:
                return priceAfterSales;
        }
    };

    // Calculate savings percentage for display
    const calculateSavings = (finalPrice: number): number => {
        if (finalPrice >= effectiveBasePrice) return 0;
        return Math.round(((effectiveBasePrice - finalPrice) / effectiveBasePrice) * 100);
    };

    return (
        <div className="pricing-tiers mt-6 border border-line rounded-lg p-4">
            <div className="heading6 mb-3">Wholesale Pricing</div>
            <div className="text-secondary2 text-sm mb-4">
                Buy more, save more! Choose your quantity tier:
            </div>

            <div className="tiers-container flex flex-col gap-3">
                {tiers.map((tier, index) => {
                    const finalPrice = calculateTierPrice(tier);
                    const savings = calculateSavings(finalPrice);
                    const quantityRange = tier.maxQty
                        ? `${tier.minQty} - ${tier.maxQty}`
                        : `${tier.minQty}+`;

                    return (
                        <div
                            key={index}
                            className="tier-item flex items-center justify-between p-3 bg-surface rounded-lg hover:bg-black hover:text-white transition-all duration-300 cursor-pointer border border-line hover:border-black"
                        >
                            {/* Quantity Range */}
                            <div className="flex flex-col">
                                <div className="font-semibold text-sm">
                                    {quantityRange} units
                                </div>
                                <div className="text-xs opacity-70 mt-0.5">
                                    {tier.strategy === 'fixedPrice' && 'Fixed Price'}
                                    {tier.strategy === 'percentOff' && `${tier.value}% Off`}
                                    {tier.strategy === 'amountOff' && `$${tier.value} Off per unit`}
                                </div>
                            </div>

                            {/* Price Display */}
                            <div className="flex items-center gap-3">
                                {savings > 0 && (
                                    <div className="bg-green text-white px-2 py-1 rounded text-xs font-semibold">
                                        Save {savings}%
                                    </div>
                                )}
                                <div className="text-right">
                                    <div className="font-bold text-lg">
                                        {formatToNaira(finalPrice)}
                                    </div>
                                    <div className="text-xs opacity-70">per unit</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Sales Info */}
            {salesDiscount > 0 && (
                <div className="mt-4 p-3 bg-red bg-opacity-10 border border-red rounded-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red rounded-full"></div>
                        <div className="text-sm text-red font-semibold">
                            Sale Active: {salesDiscount}% off applied before wholesale pricing
                        </div>
                    </div>
                </div>
            )}

            {/* Attribute Price Override Info */}
            {attributePrice && attributePrice !== basePrice && (
                <div className="mt-3 p-3 bg-blue bg-opacity-10 border border-blue rounded-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue rounded-full"></div>
                        <div className="text-sm text-blue font-semibold">
                            Selected variant price: {formatToNaira(attributePrice)} (base: {formatToNaira(basePrice)})
                        </div>
                    </div>
                </div>
            )}

            {/* Info Footer */}
            <div className="mt-4 pt-4 border-t border-line text-xs text-secondary2">
                * Prices shown are per unit. Total order value will be calculated at checkout.
            </div>
        </div>
    );
};

export default PricingTiers;
