'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';

interface ShippingMethodSelectorProps {
    currentMethod: 'pickup' | 'normal' | 'express' | 'gig';
    availableMethods: Array<'pickup' | 'normal' | 'gig'>;
    shippingEtaLabel: string;
    isExpanded: boolean;
    onToggle: () => void;
    onMethodChange: (method: 'pickup' | 'normal' | 'express' | 'gig') => void;
}

const ShippingMethodSelector: React.FC<ShippingMethodSelectorProps> = ({
    currentMethod,
    availableMethods,
    shippingEtaLabel,
    isExpanded,
    onToggle,
    onMethodChange,
}) => {
    const getMethodDisplayName = (method: 'pickup' | 'normal' | 'express' | 'gig'): string => {
        if (method === 'pickup') return 'Pickup';
        if (method === 'normal') return 'Normal Delivery';
        if (method === 'gig') return 'GIG Logistics';
        return 'Express Delivery';
    };

    return (

        <div className="my-6 checkout-block ">
            <div className="heading5">Delivery</div>
            <div className="deli_type mt-5">
                {availableMethods.includes('pickup') && (
                    <div className="item flex items-center gap-2 relative px-5 border border-line rounded-t-lg">
                        <input type="radio" name="deli_type" id="store_type" className="cursor-pointer" checked={currentMethod === 'pickup'} onClick={() => onMethodChange('pickup')} />
                        <label htmlFor="store_type" className="w-full py-4 cursor-pointer">Pickup in store</label>
                        <Icon.Storefront className="text-xl absolute top-1/2 right-5 -translate-y-1/2" />
                    </div>
                )}
                {availableMethods.includes('normal') && (
                    <div className="item flex items-center gap-2 relative px-5 border border-line">
                        <input type="radio" name="deli_type" id="ship_type" className="cursor-pointer" checked={currentMethod === 'normal'} onClick={() => onMethodChange('normal')} />
                        <label htmlFor="ship_type" className="w-full py-4 cursor-pointer">
                            <span>Shipping</span>
                            <span className="text-xs text-secondary ml-2">({shippingEtaLabel})</span>
                        </label>
                        <Icon.Truck className="text-xl absolute top-1/2 right-5 -translate-y-1/2" />
                    </div>
                )}
                {availableMethods.includes('gig') && (
                    <div className="item flex items-center gap-2 relative px-5 border border-line rounded-b-lg">
                        <input type="radio" name="deli_type" id="gig_type" className="cursor-pointer" checked={currentMethod === 'gig'} onClick={() => onMethodChange('gig')} />
                        <label htmlFor="gig_type" className="w-full py-4 cursor-pointer">
                            <span>GIG Logistics</span>
                            <span className="text-xs text-secondary ml-2">(Third-party courier)</span>
                        </label>
                        <Icon.Package className="text-xl absolute top-1/2 right-5 -translate-y-1/2" />
                    </div>
                )}
            </div>
        </div>
    );
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

                </div>
            )}
        </div>
    );
};

export default ShippingMethodSelector;
/*
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
*/