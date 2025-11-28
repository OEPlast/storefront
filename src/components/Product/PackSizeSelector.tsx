'use client';

import React, { useState, useEffect } from 'react';
import { ProductPackSize } from '@/types/product';

interface PackSizeSelectorProps {
    packSizes?: ProductPackSize[];
    basePrice: number;
    baseStock: number;
    onPackChange: (selectedPack: ProductPackSize | null, effectivePrice: number, effectiveStock: number) => void;
    className?: string;
}

const PackSizeSelector: React.FC<PackSizeSelectorProps> = ({
    packSizes,
    basePrice,
    baseStock,
    onPackChange,
    className = '',
}) => {
    const [selectedPackIndex, setSelectedPackIndex] = useState<number | null>(null);

    // Auto-select first pack on mount
    useEffect(() => {
        if (packSizes && packSizes.length > 0 && selectedPackIndex === null) {
            handlePackSelect(0);
        }
    }, [packSizes]);


    // If no pack sizes defined, return null (product sold as single unit)
    if (!packSizes || packSizes.length === 0) {
        return null;
    }

    // Calculate effective price and stock for a pack
    const getPackEffectivePrice = (pack: ProductPackSize): number => {
        return pack.price ?? (basePrice * pack.quantity);
    };

    const getPackEffectiveStock = (pack: ProductPackSize): number => {
        return pack.stock ?? baseStock;
    };

    // Calculate unit price for comparison
    const getUnitPrice = (pack: ProductPackSize): number => {
        const effectivePrice = getPackEffectivePrice(pack);
        return effectivePrice / pack.quantity;
    };

    // Calculate savings percentage
    const getSavingsPercent = (pack: ProductPackSize): number => {
        const effectivePrice = getPackEffectivePrice(pack);
        const fullPrice = basePrice * pack.quantity;
        if (effectivePrice >= fullPrice) return 0;
        return Math.round(((fullPrice - effectivePrice) / fullPrice) * 100);
    };

    const handlePackSelect = (index: number) => {
        setSelectedPackIndex(index);
        const selectedPack = packSizes[index];
        const effectivePrice = getPackEffectivePrice(selectedPack);
        const effectiveStock = getPackEffectiveStock(selectedPack);

        onPackChange(selectedPack, effectivePrice, effectiveStock);
    };


    return (
        <div className={`pack-size-selector ${className}`}>
            <div className="text-title mb-3">Pack Size:</div>
            <div className="grid grid-cols-1 gap-3">
                {packSizes.map((pack, index) => {
                    const effectivePrice = getPackEffectivePrice(pack);
                    const effectiveStock = getPackEffectiveStock(pack);
                    const unitPrice = getUnitPrice(pack);
                    const savings = getSavingsPercent(pack);
                    const isSelected = selectedPackIndex === index;
                    const isOutOfStock = effectiveStock <= 0;

                    return (
                        <div
                            key={index}
                            className={`pack-size-item relative p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                ? 'border-black bg-gray-50'
                                : 'border-line bg-white hover:border-gray-400'
                                } ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => !isOutOfStock && handlePackSelect(index)}
                        >
                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="absolute top-3 right-3 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                                    <svg
                                        className="w-3 h-3 text-white"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                            )}

                            {/* Savings Badge */}
                            {savings > 0 && !isOutOfStock && (
                                <div className="absolute -top-2 -right-2 bg-red text-white text-xs font-bold px-2 py-1 rounded-full">
                                    Save {savings}%
                                </div>
                            )}

                            {/* Out of Stock Badge */}
                            {isOutOfStock && (
                                <div className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                    Out of Stock
                                </div>
                            )}

                            {/* Pack Info */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="font-semibold text-base">{pack.label}</div>
                                    <div className="text-sm text-secondary mt-1">
                                        Quantity: {pack.quantity} {pack.quantity === 1 ? 'unit' : 'units'}
                                    </div>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="flex items-end justify-between mt-3">
                                <div>
                                    <div className="text-xl font-bold">
                                        ${effectivePrice.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-secondary">
                                        ${unitPrice.toFixed(2)} per unit
                                    </div>
                                </div>

                                {/* Stock Indicator */}
                                {!isOutOfStock && effectiveStock < 20 && (
                                    <div className="text-xs text-red font-medium">
                                        Only {effectiveStock} left
                                    </div>
                                )}
                            </div>

                            {/* Attribute Info */}
                            {pack.enableAttributes ? (
                                <div className="mt-3 pt-3 border-t border-line">
                                    <div className="text-xs text-secondary flex items-center gap-1">
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </svg>
                                        Customize colors & options available
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-3 pt-3 border-t border-line">
                                    <div className="text-xs text-secondary flex items-center gap-1">
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                            />
                                        </svg>
                                        Pre-packaged - no customization
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PackSizeSelector;
