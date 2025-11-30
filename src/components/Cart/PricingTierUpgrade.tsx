'use client';

import React, { useMemo } from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import type { CartItem } from '@/context/CartContext';
import { calculateCartItemPricing } from '@/utils/cart-pricing';
import { calculateNextTierSavings, getTierDescription, formatTierRange } from '@/utils/pricingTiers';
import { formatToNaira } from '@/utils/currencyFormatter';

interface PricingTierUpgradeProps {
    item: CartItem;
    currentQty: number;
    onQuantityChange?: (newQty: number) => void;
}

const PricingTierUpgrade: React.FC<PricingTierUpgradeProps> = React.memo(({
    item,
    currentQty,
    onQuantityChange,
}) => {
    const pricingTiers = item.pricingTiers;

    // Memoize pricing calculation to prevent recalculation on every render
    const pricing = useMemo(() => {
        return calculateCartItemPricing({ ...item, qty: currentQty });
    }, [item, currentQty]);

    const basePrice = item.price || 0;

    // Memoize next tier calculation
    const nextTierInfo = useMemo(() => {
        return calculateNextTierSavings(
            currentQty,
            pricing.unitPrice,
            basePrice,
            pricingTiers || []
        );
    }, [currentQty, pricing.unitPrice, basePrice, pricingTiers]);

    if (!pricingTiers || pricingTiers.length === 0) {
        return null;
    }

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

    const savingsPerUnit = pricing.unitPrice - potentialUnitPrice;

    return (
        <div className="mt-9">
            <div className="flex items-center gap-0.5 text-sm">
                {/* <Icon.Tag weight='fill' size={14} className="text-green-900 flex-shrink-0" /> */}
                {onQuantityChange ? (
                    <button
                        onClick={() => onQuantityChange(nextTier.minQty)}
                        className="text-black hover:text-green-600 transition-colors text-left text-[11px]"
                    >
                        <span className="font-semibold p-1 px-1.5 rounded-md cursor-pointer bg-black text-white text-[12px] hover:scale-105">Buy {qtyNeeded} more</span>
                        {' : '}<span className="text-green-600 ">(to save <span className="font-semibold text-green-600">{getTierDescription(nextTier)}</span> )</span>
                    </button>
                ) : (
                    <span className="text-black">
                        Buy <span className="font-semibold">{qtyNeeded}</span> more: <span className="font-semibold text-green-600">{getTierDescription(nextTier)}</span>
                        {' '}<span className="text-green-600">(save {formatToNaira(savingsPerUnit)}/unit)</span>
                    </span>
                )}
            </div>
        </div>
    );
});

PricingTierUpgrade.displayName = 'PricingTierUpgrade';

export default PricingTierUpgrade;
