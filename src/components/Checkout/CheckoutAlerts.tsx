'use client';

import React from 'react';
import * as Icon from "@phosphor-icons/react/dist/ssr";

interface CouponInfo {
    code: string;
    discountAmount?: number;
    reason?: string;
}

interface ChangeDetail {
    field: string;
    previous: number | string | null;
    current: number | string | null;
    message: string;
    context?: 'item' | 'coupon' | 'subtotal' | 'total' | 'shipping' | 'other';
}

interface CorrectedCart {
    validatedCoupons?: CouponInfo[];
    rejectedCoupons?: CouponInfo[];
    couponDiscount?: number;
    status?: string;
    lastUpdated?: string;
    updatedAt?: string;
}

interface PendingCorrections {
    needsUpdate: true;
    shippingCost: number;
    deliveryType: 'shipping' | 'pickup';
    correctedCart: CorrectedCart;
    changes: string[];
    changeDetails: ChangeDetail[];
}

interface CheckoutSuccess {
    orderId: string;
    order: {
        _id: string;
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
    formatCurrency: (value: number) => string;
}

const CheckoutAlerts: React.FC<CheckoutAlertsProps> = ({
    pendingCorrections,
    checkoutError,
    checkoutSuccess,
    formatCurrency,
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
                                    {pendingCorrections.changeDetails.length > 0 ? (
                                        pendingCorrections.changeDetails.map((detail, index) => (
                                            <li key={`${detail.field}-${index}`}>
                                                <span className="font-medium capitalize">{detail.field.replace(/_/g, ' ')}:</span>{' '}
                                                {detail.message}
                                            </li>
                                        ))
                                    ) : (
                                        pendingCorrections.changes.map((change, index) => (
                                            <li key={index}>{change}</li>
                                        ))
                                    )}
                                </ul>
                                {(pendingCorrections.correctedCart.validatedCoupons?.length ?? 0) > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xs font-semibold text-amber-700">Applied coupons</p>
                                        <ul className="mt-1 space-y-1 text-xs text-amber-800">
                                            {pendingCorrections.correctedCart.validatedCoupons?.map((coupon) => (
                                                <li key={coupon.code} className="flex items-center justify-between gap-2">
                                                    <span className="uppercase tracking-wide">{coupon.code}</span>
                                                    <span>-{formatCurrency(coupon.discountAmount ?? 0)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {(pendingCorrections.correctedCart.rejectedCoupons?.length ?? 0) > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xs font-semibold text-amber-700">Coupons that need attention</p>
                                        <ul className="mt-1 space-y-1 text-xs text-amber-800">
                                            {pendingCorrections.correctedCart.rejectedCoupons?.map((coupon) => (
                                                <li key={coupon.code}>
                                                    <span className="uppercase tracking-wide">{coupon.code}</span> – {coupon.reason}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
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
