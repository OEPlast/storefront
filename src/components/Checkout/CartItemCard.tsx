'use client';

import React from 'react';
import Image from 'next/image';
import { CartItem } from '@/context/CartContext';
import { calculateCartItemPricing } from '@/utils/cart-pricing';
import { getCdnUrl } from '@/libs/cdn-url';
import { formatToNaira } from '@/utils/currencyFormatter';
import {
    LINE_DISCOUNT_TAG_CLASS,
    formatVariantLabel,
    getLineDiscountTags,
} from '@/utils/variantLabel';

export interface CartItemCardProps {
    item: CartItem;
    /** Line-level, driven by outOfStockCartItemIds — NOT the product-id set. */
    isUnavailable?: boolean;
    /** Overlay the qty on the thumbnail and drop the inline "Qty: N" row. Default true. */
    showQuantityBadge?: boolean;
    /** Render formatVariantLabel(item.selectedAttributes). Default true. */
    showVariant?: boolean;
    /** Render the sale / bulk / out-of-stock tag row. Default true. */
    showDiscountTags?: boolean;
    /** Render the right-aligned line total. Default true. */
    showLineTotal?: boolean;
    /** Tighter spacing + 48px thumbnail, for the mobile summary drawer. Default false. */
    compact?: boolean;
    className?: string;
}

/**
 * A malformed cart line can carry price 0, and cart-pricing then divides by it —
 * NaN/Infinity would otherwise reach formatToNaira and render "₦NaN".
 */
const formatMoney = (value: number): string =>
    Number.isFinite(value) ? formatToNaira(value) : '—';

const CartItemCard: React.FC<CartItemCardProps> = ({
    item,
    isUnavailable = false,
    showQuantityBadge = true,
    showVariant = true,
    showDiscountTags = true,
    showLineTotal = true,
    compact = false,
    className = '',
}) => {
    // Use ModalCart's exact pricing calculation method
    const pricing = calculateCartItemPricing(item);

    const productName = item.name || 'Product';
    const productImagePath =
        item.description_images?.find((img) => img.cover_image)?.url ??
        item.description_images?.[0]?.url;
    const productImageUrl = productImagePath ? getCdnUrl(productImagePath) : '/images/placeholder.png';

    const variantLabel = showVariant ? formatVariantLabel(item.selectedAttributes) : '';
    const discountTags = showDiscountTags ? getLineDiscountTags(pricing, { isUnavailable }) : [];

    // Strikethrough only on a real price drop. `hasSale || hasPricingTier` also fired for a
    // 0%-off sale, printing a struck-through price identical to the one beside it.
    const hasPriceDrop =
        Number.isFinite(pricing.unitPrice) &&
        Number.isFinite(pricing.basePrice) &&
        pricing.unitPrice < pricing.basePrice;

    return (
        <div
            className={`item flex items-start border-b border-line last:border-b-0 ${compact ? 'gap-3 py-2.5' : 'gap-3 md:gap-4 py-3 md:py-4'
                } ${className}`}
        >
            {/* Product Image — the badge hangs off this wrapper, not the image box:
                that box is overflow-hidden and would clip it. */}
            <div className="relative flex-shrink-0">
                <div
                    className={`bg-img aspect-square rounded-lg overflow-hidden border border-line ${compact ? 'w-12' : 'w-[60px] md:w-[70px]'
                        }`}
                >
                    <Image
                        src={productImageUrl}
                        width={200}
                        height={200}
                        alt={productName}
                        className='w-full h-full object-cover'
                    />
                </div>

                {showQuantityBadge && (
                    <>
                        <span
                            aria-hidden="true"
                            className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1.5 rounded-full bg-black text-white text-[11px] font-semibold flex items-center justify-center z-[1]"
                        >
                            {item.qty}
                        </span>
                        <span className="sr-only">Quantity: {item.qty}</span>
                    </>
                )}
            </div>

            <div className="flex-1 min-w-0">
                {/* Product Name */}
                <div className="name text-sm font-medium line-clamp-2">{productName}</div>

                {/* Variant — without it two lines of the same product read as a duplicate bug */}
                {variantLabel && (
                    <div className="caption1 text-secondary mt-0.5">{variantLabel}</div>
                )}

                {/* Quantity — only when the thumbnail badge is not carrying it */}
                {!showQuantityBadge && (
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-secondary">Qty:</span>
                        <span className="text-sm font-semibold">{item.qty}</span>
                    </div>
                )}

                {/* Badges */}
                {discountTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {discountTags.map((tag) => (
                            <span
                                key={tag.key}
                                className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${LINE_DISCOUNT_TAG_CLASS[tag.tone]}`}
                            >
                                {tag.label}
                            </span>
                        ))}
                    </div>
                )}

                {/* Pricing */}
                <div className="flex items-center justify-between gap-3 mt-2">
                    {/* Unit Price with slash if discounted */}
                    <div className="text-xs">
                        {hasPriceDrop ? (
                            <div className="flex items-center gap-2">
                                <span className="text-secondary line-through">
                                    {formatMoney(pricing.basePrice)}
                                </span>
                                <span className="text-red font-medium">
                                    {formatMoney(pricing.unitPrice)} each
                                </span>
                            </div>
                        ) : (
                            <span className="text-secondary">
                                {formatMoney(pricing.unitPrice)} each
                            </span>
                        )}
                    </div>

                    {/* Total Price */}
                    {showLineTotal && (
                        <div className="text-base font-bold text-blue-600 flex-shrink-0">
                            {formatMoney(pricing.totalPrice)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CartItemCard;
