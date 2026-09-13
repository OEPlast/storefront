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
  const productImageUrl = productImagePath
    ? getCdnUrl(productImagePath)
    : '/images/placeholder.png';

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
      className={`item flex items-start border-b border-line last:border-b-0 ${
        compact ? 'gap-3 py-2.5' : 'gap-3 py-3 md:gap-4 md:py-4'
      } ${className}`}
    >
      {/* Product Image — the badge hangs off this wrapper, not the image box:
                that box is overflow-hidden and would clip it. */}
      <div className="relative flex-shrink-0">
        <div
          className={`bg-img aspect-square overflow-hidden rounded-lg border border-line ${
            compact ? 'w-12' : 'w-[60px] md:w-[70px]'
          }`}
        >
          <Image
            src={productImageUrl}
            width={200}
            height={200}
            alt={productName}
            className="h-full w-full object-cover"
          />
        </div>

        {showQuantityBadge && (
          <>
            <span
              aria-hidden="true"
              className="absolute -right-2 -top-2 z-[1] flex h-5 min-w-[20px] items-center justify-center rounded-full bg-black px-1.5 text-[11px] font-semibold text-white"
            >
              {item.qty}
            </span>
            <span className="sr-only">Quantity: {item.qty}</span>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* Product Name */}
        <div className="name line-clamp-2 text-sm font-medium">{productName}</div>

        {/* Variant — without it two lines of the same product read as a duplicate bug */}
        {variantLabel && <div className="caption1 mt-0.5 text-secondary">{variantLabel}</div>}

        {/* Quantity — only when the thumbnail badge is not carrying it */}
        {!showQuantityBadge && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-secondary">Qty:</span>
            <span className="text-sm font-semibold">{item.qty}</span>
          </div>
        )}

        {/* Badges */}
        {discountTags.length > 0 && (
          <div className="mt-2 flex h-fit flex-wrap items-center gap-1">
            {discountTags.map((tag) => (
              <span
                key={tag.key}
                className={tag.key === 'sale' ? 'price-tag text-[11px]' : `bulk-tag text-[11px]`}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {/* Pricing */}
        <div className="mt-2 flex items-center justify-between gap-3 font-medium">
          {/* Unit Price with slash if discounted */}
          <div className="text-xs">
            {hasPriceDrop ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-secondary line-through">
                  {formatMoney(pricing.basePrice)}
                </span>
                <span className="text-sm font-medium text-red">
                  {formatMoney(pricing.unitPrice)} each
                </span>
              </div>
            ) : (
              <span className="text-secondary">{formatMoney(pricing.unitPrice)} each</span>
            )}
          </div>

          {/* Total Price */}
          {showLineTotal && (
            <div className="flex-shrink-0 text-base font-bold">
              {formatMoney(pricing.totalPrice)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartItemCard;
