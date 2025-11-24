'use client';

import React from 'react';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { formatToNaira } from '@/utils/currencyFormatter';

interface CheckoutSummary {
    itemsRemaining: number;
    newSubtotal: number;
    newTotal: number;
    shippingCost: number;
    deliveryType: 'shipping' | 'pickup';
    couponDiscount: number;
}

export interface CheckoutErrorsType {
    products?: Array<{
        productId: string;
        message: string;
    }>;
    coupons?: Array<{
        code: string;
        reason: string;
    }>;
    shipping?: {
        previousCost: number;
        currentCost: number;
        reason: string;
    };
    total?: {
        message: string;
    };
}

interface PendingCorrections {
    needsUpdate: true;
    errors?: CheckoutErrorsType;
    summary: CheckoutSummary;
}

interface CheckoutSuccess {
    orderId: string;
    summary: {
        total: number;
        subtotal: number;
    };
    payment?: {
        paymentUrl?: string;
        reference?: string;
        transactionId?: string;
    } | null;
}

interface CheckoutAlertsProps {
    pendingCorrections: PendingCorrections | null;
    checkoutError: string | null;
    checkoutSuccess: CheckoutSuccess | null;
}

const CheckoutAlerts: React.FC<CheckoutAlertsProps> = ({
    pendingCorrections,
    checkoutError,
    checkoutSuccess,
}) => {
    return (
        <>
            {pendingCorrections && (
                <div className="mt-6 md:mt-8 lg:mt-10 space-y-3">
                    <div className="p-4 border border-amber-300 bg-amber-50 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Icon.WarningDiamond size={20} weight="duotone" className="text-amber-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-700 mb-1">
                                    We updated your cart to match current availability.
                                </p>
                                <ul className="space-y-1 text-xs text-amber-800">
                                    {/* Product errors */}
                                    {pendingCorrections.errors?.products?.map((error, index) => (
                                        <li key={`product-${index}`}>
                                            <span className="font-medium">Product:</span> {error.message}
                                        </li>
                                    ))}
                                    {/* Coupon errors */}
                                    {pendingCorrections.errors?.coupons?.map((error, index) => (
                                        <li key={`coupon-${index}`}>
                                            <span className="font-medium uppercase">{error.code}:</span> {error.reason}
                                        </li>
                                    ))}
                                    {/* Shipping changes */}
                                    {pendingCorrections.errors?.shipping && (
                                        <li>
                                            <span className="font-medium">Shipping:</span> {pendingCorrections.errors.shipping.reason}
                                            {' '}({formatToNaira(pendingCorrections.errors.shipping.previousCost)} → {formatToNaira(pendingCorrections.errors.shipping.currentCost)})
                                        </li>
                                    )}
                                    {/* Total errors */}
                                    {pendingCorrections.errors?.total && (
                                        <li>
                                            <span className="font-medium">Total:</span> {pendingCorrections.errors.total.message}
                                        </li>
                                    )}
                                </ul>
                                <p className="text-xs text-amber-700 mt-3">
                                    Review the changes and accept to continue checkout.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {checkoutError && (
                <div className="mt-6 md:mt-8 lg:mt-10 p-4 border border-red-300 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
                    <Icon.WarningCircle size={18} weight="bold" className="mt-0.5" />
                    <span className="text-sm">{checkoutError}</span>
                </div>
            )}

            {checkoutSuccess && !checkoutSuccess.payment?.paymentUrl && (
                <div className="mt-6 md:mt-8 lg:mt-10 p-4 border border-green-300 bg-green-50 text-green-700 rounded-lg">
                    <div className="flex items-start gap-2">
                        <Icon.CheckCircle size={20} weight="bold" className="mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold">Checkout secured!</p>
                            <p className="text-xs mt-1">Order #{checkoutSuccess.orderId} is ready. Follow the payment instructions sent to your email.</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CheckoutAlerts;
