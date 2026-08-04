'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { CheckoutErrors, ProductIssue } from '@/types/checkout';
import { formatIssueMessage, getIssueBadgeColor } from '@/utils/cartCorrections';
import { getCdnUrl } from '@/libs/cdn-url';
import { useCart } from '@/context/CartContext';
import { calculateCartItemPricing } from '@/utils/cart-pricing';
import * as Icon from '@phosphor-icons/react/dist/ssr';

interface CorrectionReviewModalProps {
    isOpen: boolean;
    checkoutErrors: CheckoutErrors;
    onAcceptAll: () => void;
    onClose: () => void;
    autoScrollToIssue?: boolean;
}

export default function CorrectionReviewModal({
    isOpen,
    checkoutErrors,
    onAcceptAll,
    onClose,
    autoScrollToIssue = true,
}: CorrectionReviewModalProps) {
    const { items, updateItem, removeItem, refreshCart, isLoading } = useCart();
    const [localIssues, setLocalIssues] = useState<ProductIssue[]>([]);
    const firstCriticalIssueRef = useRef<HTMLDivElement>(null);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Memoize cart items map for fast lookup
    const cartItemsMap = useMemo(() => {
        const map = new Map<string, typeof items[0]>();
        items.forEach((item) => {
            if (item.cartItemId) {
                map.set(item.cartItemId, item);
            }
            const productId = item._id || item.id;
            if (productId) {
                map.set(productId, item);
            }
        });
        return map;
    }, [items]);

    // Initialize local issues state
    useEffect(() => {
        if (checkoutErrors?.products) {
            setLocalIssues(checkoutErrors.products);
        }
    }, [checkoutErrors]);

    // Auto-scroll to first critical attribute issue
    useEffect(() => {
        if (autoScrollToIssue && isOpen && firstCriticalIssueRef.current) {
            const hasCriticalAttributeIssue = localIssues.some(
                (issue) => issue.severity === 'critical' && issue.issueType === 'attributeUnavailable'
            );
            if (hasCriticalAttributeIssue) {
                setTimeout(() => {
                    firstCriticalIssueRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                }, 100);
            }
        }
    }, [isOpen, localIssues, autoScrollToIssue]);

    // Handle quantity change with debouncing to prevent rapid re-renders
    const handleQuantityChange = useCallback((cartItemId: string, newQty: number) => {
        if (newQty < 1) return;

        // Clear any pending timeout
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Debounce the cart update
        updateTimeoutRef.current = setTimeout(() => {
            updateItem(cartItemId, { qty: newQty });
        }, 150); // 150ms debounce

        // Update local issues immediately for responsive UI
        setLocalIssues((prev) =>
            prev.map((issue) => {
                if (issue.cartItemId === cartItemId && issue.issueType === 'quantityReduced') {
                    if (newQty <= issue.availableStock) {
                        return {
                            ...issue,
                            suggestedAction: 'reduceQuantity' as const,
                        };
                    }
                }
                return issue;
            })
        );
    }, [updateItem]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, []);

    const handleRemoveItem = useCallback((cartItemId: string) => {
        removeItem(cartItemId);

        // Remove from local issues
        setLocalIssues((prev) => prev.filter((issue) => issue.cartItemId !== cartItemId));
    }, [removeItem]);

    // Handle attribute change - updates cart attributes
    const handleAttributeChange = useCallback((
        cartItemId: string,
        updates: Array<{ name: string; value: string; }>
    ) => {
        updateItem(cartItemId, { selectedAttributes: updates });

        // Mark issue as resolved locally
        setLocalIssues((prev) =>
            prev.map((issue) => {
                if (issue.cartItemId === cartItemId && issue.issueType === 'attributeUnavailable') {
                    return {
                        ...issue,
                        suggestedAction: 'changeAttribute' as const,
                    };
                }
                return issue;
            })
        );
    }, [updateItem]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    const products = checkoutErrors.products || [];
    const hasCriticalIssues = products.some((p) => p.severity === 'critical');

    // Check if there are unresolved critical attribute issues
    const hasUnresolvedAttributeIssues = localIssues.some(
        (issue) =>
            issue.severity === 'critical' &&
            issue.issueType === 'attributeUnavailable' &&
            issue.suggestedAction !== 'remove'
    );

    return (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-line px-6 py-4 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-heading5 font-semibold">Review Cart Changes</h2>
                            <p className="text-secondary text-sm mt-1">
                                Please resolve issues below to proceed with checkout
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-surface rounded-lg transition-colors"
                            aria-label="Close modal"
                            type="button"
                        >
                            <Icon.X size={24} weight="bold" />
                        </button>
                    </div>
                </div>

                {/* Content - Scrollable cart */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {/* Cart Table Header */}
                    {products.length > 0 && (
                        <div className="mb-8">
                            <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b border-line text-sm font-semibold text-secondary">
                                <div className="col-span-6">PRODUCT</div>
                                <div className="col-span-1 text-center">UNIT PRICE</div>
                                <div className="col-span-2 text-center">QUANTITY</div>
                                <div className="col-span-2 text-center">TOTAL PRICE</div>
                                <div className="col-span-1 text-center">REMOVE</div>
                            </div>

                            {/* Cart Items with Issues */}
                            <div className="space-y-0 mt-0">
                                {products.map((issue, index) => {
                                    // Try to find cart item by cartItemId first, then by productId
                                    const cartItem = items.find((item) =>
                                        item.cartItemId === issue.cartItemId ||
                                        item._id === issue.productId ||
                                        item.id === issue.productId
                                    );
                                    if (!cartItem) {
                                        console.warn('Cart item not found for issue:', issue);
                                        return null;
                                    }

                                    const pricing = calculateCartItemPricing(cartItem);
                                    const isCriticalAttributeIssue =
                                        issue.severity === 'critical' && issue.issueType === 'attributeUnavailable';
                                    const isFirstCriticalAttributeIssue =
                                        isCriticalAttributeIssue &&
                                        !localIssues
                                            .slice(0, index)
                                            .some(
                                                (i) => i.severity === 'critical' && i.issueType === 'attributeUnavailable'
                                            );

                                    // Check if issue is resolved
                                    const isQuantityResolved = issue.issueType === 'quantityReduced' && cartItem.qty <= issue.availableStock;
                                    const isAttributeResolved = issue.issueType === 'attributeUnavailable' && issue.suggestedAction === 'changeAttribute';
                                    const isResolved = isQuantityResolved || isAttributeResolved;

                                    const productName = cartItem.name || 'Product';
                                    const productImagePath =
                                        cartItem.description_images?.find((img) => img.cover_image)?.url ??
                                        cartItem.description_images?.[0]?.url;
                                    const productImageUrl = productImagePath ? getCdnUrl(productImagePath) : '';
                                    const displayTotal = pricing.totalPrice;

                                    // Check if sale or discount exists
                                    const hasSale = !!pricing.sale;
                                    const hasPricingTier = !!pricing.pricingTier;
                                    const hasDiscount = hasSale || hasPricingTier;

                                    return (
                                        <div key={`${issue.cartItemId}-${index}`}>
                                            {/* Issue Alert Banner */}
                                            <div
                                                ref={isFirstCriticalAttributeIssue ? firstCriticalIssueRef : null}
                                                className={`p-3 mb-3 rounded-lg border-2 flex items-start gap-3 ${isResolved
                                                        ? 'bg-green-50 border-green-300'
                                                        : issue.severity === 'critical'
                                                            ? 'bg-red-50 border-red-300'
                                                            : 'bg-yellow-50 border-yellow-300'
                                                    }`}
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {isResolved ? (
                                                        <Icon.CheckCircle size={20} weight="fill" className="text-green-600" />
                                                    ) : issue.issueType === 'outOfStock' ? (
                                                        <Icon.XCircle size={20} weight="fill" className="text-red-600" />
                                                    ) : issue.issueType === 'quantityReduced' ? (
                                                        <Icon.WarningCircle size={20} weight="fill" className="text-yellow-600" />
                                                    ) : issue.issueType === 'priceChanged' ? (
                                                        <Icon.CurrencyDollar size={20} weight="fill" className="text-blue-600" />
                                                    ) : issue.issueType === 'saleExpired' ? (
                                                        <Icon.ClockCountdown size={20} weight="fill" className="text-orange-600" />
                                                    ) : (
                                                        <Icon.Warning size={20} weight="fill" className="text-red-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-semibold ${isResolved ? 'text-green-800' : issue.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'
                                                        }`}>
                                                        {isResolved ? '✓ Issue Resolved' : formatIssueMessage(issue)}
                                                    </p>
                                                    {!isResolved && issue.issueType === 'quantityReduced' && (
                                                        <p className="text-xs text-secondary mt-1">
                                                            Max available: {issue.availableStock}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Cart Item - Exact structure from cart page */}
                                            <div className="item flex mt-0 pb-5 mb-5 border-b border-line w-full transition-colors rounded-lg md:p-4 hover:bg-surface/50">
                                                <div className="w-1/2">
                                                    <div className="flex items-center gap-6">
                                                        <div className="bg-img md:w-[100px] w-20 aspect-square relative group">
                                                            {productImageUrl ? (
                                                                <Image
                                                                    src={productImageUrl}
                                                                    width={1000}
                                                                    height={1000}
                                                                    alt={productName}
                                                                    className='w-full h-full object-cover rounded-lg'
                                                                />
                                                            ) : (
                                                                <div className='w-full h-full bg-gray-200 rounded-lg flex items-center justify-center'>
                                                                    <Icon.Image size={32} className="text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-title font-semibold mb-2 flex items-center gap-2">
                                                                <span>{productName}</span>
                                                            </div>
                                                            {/* Attributes */}
                                                            {cartItem.selectedAttributes.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {cartItem.selectedAttributes.map((attr, idx) => (
                                                                        <span key={idx} className="text-xs bg-surface px-2 py-1 rounded border border-line">
                                                                            <span className="text-secondary">{attr.name}:</span> <span className="font-medium">{attr.value}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {/* Sale/Discount Badge */}
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {hasSale && (
                                                                    <span className="text-xs bg-red text-white px-2.5 py-1 rounded font-bold uppercase tracking-wide">
                                                                        SALE {Math.round(pricing.saleDiscount)}% OFF
                                                                    </span>
                                                                )}
                                                                {hasPricingTier && (
                                                                    <span className="text-xs bg-black text-white px-2 py-1 rounded font-medium">
                                                                        Bulk Deals
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="w-1/12 price flex flex-col items-center justify-center">
                                                    {hasDiscount ? (
                                                        <>
                                                            <div className="text-xs text-secondary line-through">
                                                                ₦{pricing.basePrice.toLocaleString()}
                                                            </div>
                                                            <div className="text-title text-center font-bold text-red mt-1">
                                                                ₦{pricing.unitPrice.toLocaleString()}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-title text-center font-semibold">₦{pricing.unitPrice.toLocaleString()}</div>
                                                    )}
                                                </div>
                                                <div className="w-1/6 flex items-center justify-center">
                                                    <div className="quantity-block bg-surface p-1.5 flex items-center justify-between rounded-lg border border-line md:w-[100px] flex-shrink-0 w-24 hover:border-black transition-colors">
                                                        <Icon.Minus
                                                            onClick={() => handleQuantityChange(cartItem.cartItemId!, cartItem.qty - 1)}
                                                            className={`text-base max-md:text-sm rounded p-1 transition-colors ${cartItem.qty === 1
                                                                    ? 'opacity-50 cursor-not-allowed'
                                                                    : 'cursor-pointer hover:bg-black hover:text-white'
                                                                }`}
                                                        />
                                                        <div className="text-button quantity font-semibold">{cartItem.qty}</div>
                                                        <Icon.Plus
                                                            onClick={() => handleQuantityChange(cartItem.cartItemId!, cartItem.qty + 1)}
                                                            className="text-base max-md:text-sm rounded p-1 cursor-pointer hover:bg-black hover:text-white transition-colors"
                                                        />
                                                    </div>
                                                    {issue.issueType === 'quantityReduced' && !isQuantityResolved && (
                                                        <p className="text-xs text-red-600 mt-1 text-center w-full">
                                                            Max: {issue.availableStock}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="w-1/6 flex flex-col items-center justify-center">
                                                    <div className="text-title text-center font-bold">₦{displayTotal.toLocaleString()}</div>
                                                    {cartItem.qty > 1 && (
                                                        <div className="text-xs text-secondary mt-1">
                                                            ₦{pricing.unitPrice.toLocaleString()} × {cartItem.qty}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-1/12 flex items-center justify-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(cartItem.cartItemId!)}
                                                        className="p-2 hover:bg-red/10 rounded-full transition-colors group"
                                                        title="Remove item"
                                                    >
                                                        <Icon.Trash
                                                            className='text-xl max-md:text-base text-red group-hover:scale-110 transition-transform'
                                                        />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Attribute Selection UI - Only show if not resolved */}
                                            {!isResolved && issue.issueType === 'attributeUnavailable' &&
                                                issue.availableAttributes &&
                                                issue.availableAttributes.length > 0 && (
                                                    <div className="mt-4 mb-6 p-4 bg-white border-2 border-red-300 rounded-lg">
                                                        <h5 className="text-sm font-semibold mb-3 text-red-800 flex items-center gap-2">
                                                            <Icon.Warning size={16} weight="fill" />
                                                            Select Available Option:
                                                        </h5>
                                                        <div className="space-y-3">
                                                            {issue.availableAttributes.map((attrSet, setIndex) => (
                                                                <button
                                                                    key={setIndex}
                                                                    onClick={() => handleAttributeChange(cartItem.cartItemId!, attrSet)}
                                                                    className="w-full p-3 border-2 border-line hover:border-black rounded-lg transition-colors text-left hover:bg-surface"
                                                                >
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {attrSet.map((attr) => (
                                                                            <span
                                                                                key={`${attr.name}-${attr.value}`}
                                                                                className="inline-flex items-center px-3 py-1 bg-surface rounded-md text-sm"
                                                                            >
                                                                                <span className="text-secondary">{attr.name}:</span>
                                                                                <span className="font-medium ml-1">{attr.value}</span>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                    <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                                                        <Icon.CheckCircle size={14} weight="fill" />
                                                                        Available - Click to switch
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-line px-6 py-4 rounded-b-2xl">
                    <div className="flex items-center justify-center">
                        <button
                            onClick={handleClose}
                            className="px-8 py-3 bg-black text-white hover:bg-black/90 rounded-lg transition-colors font-semibold"
                            type="button"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
