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

};

export default ShippingMethodSelector;
