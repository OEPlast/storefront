'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { CartItem } from '@/context/CartContext';
import CartItemCard from '@/components/Checkout/CartItemCard';
import { hasProductIssues } from '@/utils/cartCorrections';
import type { CheckoutErrors } from '@/types/checkout';
import { formatToNaira } from '@/utils/currencyFormatter';

type CheckoutCorrectionPayload = {
    needsUpdate: true;
    errors?: CheckoutErrors;
    summary: {
        itemsRemaining: number;
        newSubtotal: number;
        newTotal: number;
        shippingCost: number;
        deliveryType: 'shipping' | 'pickup';
        couponDiscount: number;
    };
};

interface DiscountInfo {
    couponCode?: string;
    amount: number;
}

interface OrderSummaryBlockProps {
    // Cart data
    items: CartItem[];
    isLoading: boolean;

    // Display state
    isExpanded: boolean;
    onToggle: () => void;

    // Cart statistics
    cartStats: { totalItems: number; uniqueProducts: number };

    // Pricing
    resolvedSubtotal: number;
    resolvedDiscount: number;
    resolvedShippingCost: number | null;
    resolvedTotal: number | null;

    // Shipping state
    shippingMethod: 'pickup' | 'normal' | 'express';
    isCalculatingShipping: boolean;
    shippingCalculationError: string | null;

    // Corrections
    pendingCorrections: CheckoutCorrectionPayload | null;
    parsedCheckoutErrors: CheckoutErrors | null;

    // Discount info
    discountInfo: DiscountInfo | null;
}

const OrderSummaryBlock: React.FC<OrderSummaryBlockProps> = ({
    items,
    isLoading,
    isExpanded,
    onToggle,
    cartStats,
    resolvedSubtotal,
    resolvedDiscount,
    resolvedShippingCost,
    resolvedTotal,
    shippingMethod,
    isCalculatingShipping,
    shippingCalculationError,
    pendingCorrections,
    parsedCheckoutErrors,
    discountInfo,
}) => {
    return (
        <div className="checkout-block lg:sticky lg:top-[120px] border border-line rounded-xl md:rounded-2xl p-4 md:p-6 bg-white shadow-sm">
            {/* Order Summary Header - Collapsible */}
            <div
                className="flex items-center justify-between cursor-pointer pb-3 md:pb-4"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <Icon.ShoppingCart size={24} weight="duotone" className="text-blue w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                    <div>
                        <div className="heading5">Your Order</div>
                        {!isExpanded && (
                            <div className="text-secondary text-xs sm:text-sm mt-1 flex flex-wrap items-center gap-1 sm:gap-2">
                                <span className="whitespace-nowrap">{cartStats.totalItems} items</span>
                                <span className="hidden xs:inline">•</span>
                                <span className="whitespace-nowrap">{cartStats.uniqueProducts} products</span>
                            </div>
                        )}
                    </div>
                </div>
                {isExpanded ? (
                    <Icon.CaretUp size={20} weight="bold" />
                ) : (
                    <Icon.CaretDown size={20} weight="bold" />
                )}
            </div>

            {/* Order Items - Collapsible */}
            {isExpanded && (
                <div className="list-product-checkout max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="flex flex-col items-center gap-3">
                                <Icon.CircleNotch size={32} weight="bold" className="animate-spin text-blue" />
                                <p className='text-button text-secondary'>Loading cart...</p>
                            </div>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="flex flex-col items-center gap-3 text-secondary">
                                <Icon.ShoppingCartSimple size={32} weight="bold" />
                                <p className='text-button'>No product in cart</p>
                            </div>
                        </div>
                    ) : (
                        items.map((item) => <CartItemCard key={item._id || item.id} item={item} />)
                    )}
                </div>
            )}

            {/* Order Summary - Always Visible */}
            <div className="order-summary mt-4 md:mt-5 pt-4 md:pt-5 border-t border-line space-y-2 md:space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between items-center">
                    <span className="text-secondary text-sm md:text-base">Subtotal</span>
                    <span className="text-sm md:text-base font-medium">{formatToNaira(resolvedSubtotal)}</span>
                </div>

                {/* Discount */}
                {resolvedDiscount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                        <span className="flex items-center gap-1 text-sm md:text-base">
                            <Icon.Tag size={16} weight="duotone" className="w-4 h-4 flex-shrink-0" />
                            Discount {discountInfo?.couponCode && `(${discountInfo.couponCode})`}
                        </span>
                        <span className="font-semibold">-${resolvedDiscount.toFixed(2)}</span>
                    </div>
                )}

                {/* Shipping */}
                <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 text-secondary text-sm md:text-base">
                        <Icon.Truck size={16} weight="duotone" className="w-4 h-4 flex-shrink-0" />
                        Shipping
                    </span>
                    <span className="text-button">
                        {shippingMethod === 'pickup' ? (
                            <span className="text-green-600 font-semibold">Free (Pickup)</span>
                        ) : isCalculatingShipping ? (
                            <span className="flex items-center gap-1 text-blue">
                                <Icon.CircleNotch size={14} weight="bold" className="animate-spin" />
                                Calculating...
                            </span>
                        ) : shippingCalculationError ? (
                            <span className="text-red-600 text-xs">Error</span>
                        ) : resolvedShippingCost !== null ? (
                            formatToNaira(resolvedShippingCost)
                        ) : (
                            <span className="text-secondary text-xs">Enter address</span>
                        )}
                    </span>
                </div>

                {/* Shipping Calculation Error */}
                {shippingCalculationError && (
                    <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <Icon.WarningCircle size={14} weight="bold" className="flex-shrink-0 mt-0.5" />
                        <span>{shippingCalculationError}</span>
                    </div>
                )}

                {pendingCorrections && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                        <Icon.WarningDiamond size={14} weight="duotone" className="mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium">Cart updated by store</p>
                            <p className="mt-0.5 leading-snug">
                                Accept the updates to keep your totals accurate before completing payment.
                            </p>
                        </div>
                    </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-line">
                    <span className="text-base md:text-lg font-semibold">Total</span>
                    <span className="text-lg md:text-xl lg:text-2xl font-bold text-blue">
                        {resolvedTotal !== null ? (
                            formatToNaira(resolvedTotal)
                        ) : (
                            <span className="text-secondary text-sm">Add shipping info</span>
                        )}
                    </span>
                </div>
            </div>

            {/* Trust Badges - Always Visible */}
            <div className="trust-badges mt-4 md:mt-5 pt-4 md:pt-5 grid grid-cols-2 gap-2 md:gap-3 justify-center">
                <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-secondary">
                    <Icon.ShieldCheck size={16} weight="duotone" className="text-green-600" />
                    <span>Secure Payment</span>
                </div>
            </div>

            {/* Inline Alerts for Shipping/Coupon Changes */}
            {parsedCheckoutErrors && !hasProductIssues(parsedCheckoutErrors) && (
                <div className="mt-4 space-y-2">
                    {/* Shipping Update Alert */}
                    {parsedCheckoutErrors.shipping && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                            <Icon.Truck className="text-blue text-xl flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-blue-900">Shipping Cost Updated</p>
                                <p className="text-blue-700 text-xs mt-1">
                                    {parsedCheckoutErrors.shipping.reason} (₦
                                    {parsedCheckoutErrors.shipping.previousCost.toLocaleString()} → ₦
                                    {parsedCheckoutErrors.shipping.currentCost.toLocaleString()})
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Coupon Rejection Alert */}
                    {parsedCheckoutErrors.coupons && parsedCheckoutErrors.coupons.length > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                            <Icon.Warning className="text-yellow-600 text-xl flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-yellow-900 mb-1">Coupon Issue</p>
                                {parsedCheckoutErrors.coupons.map((coupon: { code: string; reason: string }, idx: number) => (
                                    <p key={idx} className="text-yellow-700 text-xs">
                                        • {coupon.code}: {coupon.reason}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Total-Only Error (Blocking) */}
            {parsedCheckoutErrors?.total && (
                <div className="mt-4 flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <Icon.XCircle className="text-red-600 text-xl flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-red-900">Checkout Error</p>
                        <p className="text-red-700 text-xs mt-1">{parsedCheckoutErrors.total.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderSummaryBlock;
