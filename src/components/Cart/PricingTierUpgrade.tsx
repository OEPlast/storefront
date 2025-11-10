'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import type { GuestCartItem } from '@/libs/guestCart';
import { calculateNextTierSavings, getTierDescription, formatTierRange } from '@/utils/pricingTiers';

interface PricingTierUpgradeProps {
    item: GuestCartItem;
    currentQty: number;
    onQuantityChange?: (newQty: number) => void;
}

const PricingTierUpgrade: React.FC<PricingTierUpgradeProps> = ({
    item,
    currentQty,
    onQuantityChange,
}) => {
    // Get product details for pricing tiers
    const productDetails = item.productDetails;
    const pricingTiers = productDetails?.pricingTiers;

    if (!pricingTiers || pricingTiers.length === 0) {
        return null;
    }

    // Calculate base price (before any discounts/tiers)
    const basePrice = productDetails?.price ?? item.unitPrice;

    const nextTierInfo = calculateNextTierSavings(
        currentQty,
        item.unitPrice,
        basePrice,
        pricingTiers
    );

    if (!nextTierInfo) {
        // User is already at the highest tier
        return (
            <div className="mt-1.5 flex items-center gap-1.5 text-green-700">
                <Icon.CheckCircle size={12} weight="fill" />
                <span className="text-[11px]">Best bulk price</span>
            </div>
        );
    }

    const { nextTier, qtyNeeded, potentialSavings, potentialUnitPrice } = nextTierInfo;

    if (!nextTier) return null;

    const savingsPerUnit = item.unitPrice - potentialUnitPrice;

    return (
        <div className="mt-1.5">
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
                <Icon.TrendUp size={12} className="flex-shrink-0" />
                <span>
                    Buy {qtyNeeded} more: <span className="font-semibold">{getTierDescription(nextTier)}</span>
                    {' '}<span className="text-green-600">(save ${savingsPerUnit.toFixed(2)}/unit)</span>
                    {onQuantityChange && (
                        <button
                            onClick={() => onQuantityChange(nextTier.minQty)}
                            className="ml-2 px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-semibold hover:bg-blue-700 transition-colors"
                        >
                            +{qtyNeeded}
                        </button>
                    )}
                </span>
            </div>
        </div>
    );
};

export default PricingTierUpgrade;
