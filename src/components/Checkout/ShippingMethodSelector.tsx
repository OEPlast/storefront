'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';

interface ShippingMethodSelectorProps {
    currentMethod: 'pickup' | 'normal' | 'express';
    isExpanded: boolean;
    onToggle: () => void;
    onMethodChange: (method: 'pickup' | 'normal' | 'express') => void;
}

const ShippingMethodSelector: React.FC<ShippingMethodSelectorProps> = ({
    currentMethod,
    isExpanded,
    onToggle,
    onMethodChange,
}) => {
    const getMethodDisplayName = (method: 'pickup' | 'normal' | 'express'): string => {
        if (method === 'pickup') return 'Pickup';
        if (method === 'normal') return 'Normal Delivery';
        return 'Express Delivery';
    };

    return (
        <div className="mt-5 mb-5 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Icon.Truck size={20} weight="duotone" className="text-blue w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                    <div>
                        <div className="text-xs sm:text-sm font-medium text-blue-900">
                            Selected Method: <span className="capitalize">{getMethodDisplayName(currentMethod)}</span>
                        </div>
                        {currentMethod === 'pickup' && (
                            <div className="text-xs text-blue-700 mt-0.5">No shipping address required</div>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onToggle}
                    className="text-xs sm:text-sm text-blue-700 hover:text-blue-900 font-medium underline flex items-center gap-1 whitespace-nowrap"
                >
                    Change Method
                    {isExpanded ? (
                        <Icon.CaretUp size={12} weight="bold" />
                    ) : (
                        <Icon.CaretDown size={12} weight="bold" />
                    )}
                </button>
            </div>

            {/* Shipping Method Options - Show when changing */}
            {isExpanded && (
                <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-blue-200 space-y-2">
                    <div className="text-xs sm:text-sm font-medium text-blue-900 mb-2">Choose shipping method:</div>

                    {/* Pickup Option */}
                    {currentMethod !== 'pickup' && (
                        <button
                            type="button"
                            onClick={() => onMethodChange('pickup')}
                            className="w-full flex items-center justify-between p-2 sm:p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <Icon.Storefront size={16} weight="duotone" className="text-blue" />
                                <div>
                                    <div className="text-sm font-medium text-left">Pickup</div>
                                    <div className="text-xs text-secondary text-left">Free - Pick up from store</div>
                                </div>
                            </div>
                            <Icon.ArrowRight size={16} weight="bold" className="text-blue" />
                        </button>
                    )}

                    {/* Normal Delivery Option */}
                    {currentMethod !== 'normal' && (
                        <button
                            type="button"
                            onClick={() => onMethodChange('normal')}
                            className="w-full flex items-center justify-between p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <Icon.Package size={16} weight="duotone" className="text-blue" />
                                <div>
                                    <div className="text-sm font-medium text-left">Normal Delivery</div>
                                    <div className="text-xs text-secondary text-left">Calculated at checkout</div>
                                </div>
                            </div>
                            <Icon.ArrowRight size={16} weight="bold" className="text-blue" />
                        </button>
                    )}

                    {/* Express Delivery Option */}
                    {currentMethod !== 'express' && (
                        <button
                            type="button"
                            onClick={() => onMethodChange('express')}
                            className="w-full flex items-center justify-between p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <Icon.Lightning size={16} weight="duotone" className="text-blue" />
                                <div>
                                    <div className="text-sm font-medium text-left">Express Delivery</div>
                                    <div className="text-xs text-secondary text-left">Fastest - Calculated at checkout</div>
                                </div>
                            </div>
                            <Icon.ArrowRight size={16} weight="bold" className="text-blue" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ShippingMethodSelector;
