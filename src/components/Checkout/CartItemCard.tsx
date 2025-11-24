'use client';

import React from 'react';
import Image from 'next/image';
import { CartItem } from '@/context/CartContext';
import { calculateCartItemPricing } from '@/utils/cart-pricing';
import { getCdnUrl } from '@/libs/cdn-url';

interface CartItemCardProps {
    item: CartItem;
}

const CartItemCard: React.FC<CartItemCardProps> = ({ item }) => {
    // Use ModalCart's exact pricing calculation method
    const pricing = calculateCartItemPricing(item);

    const itemId = item._id || item.id;
    const productName = item.name || 'Product';
    const productImagePath =
        item.description_images?.find((img) => img.cover_image)?.url ??
        item.description_images?.[0]?.url;
    const productImageUrl = productImagePath ? getCdnUrl(productImagePath) : '/images/placeholder.png';

    // Check for active sale (not pricing tier discount)
    const hasSale = !!pricing.sale;
    const salePercentage = hasSale ? Math.round(pricing.saleDiscount) : 0;

    // Check for pricing tier
    const hasPricingTier = !!pricing.pricingTier;

    // Show price slash if there's EITHER a sale OR pricing tier discount
    const hasDiscount = hasSale || hasPricingTier;

    // Original price before any discounts
    const originalPrice = pricing.basePrice;

    return (
        <div key={itemId} className="item flex items-start gap-3 md:gap-4 py-3 md:py-4 border-b border-line last:border-b-0">
            {/* Product Image */}
            <div className="bg-img w-[60px] md:w-[70px] aspect-square flex-shrink-0 rounded-lg overflow-hidden border border-line">
                <Image
                    src={productImageUrl}
                    width={200}
                    height={200}
                    alt={productName}
                    className='w-full h-full object-cover'
                />
            </div>

            <div className="flex-1 min-w-0">
                {/* Product Name */}
                <div className="name text-sm font-medium line-clamp-2 mb-2">{productName}</div>

                {/* Quantity */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-secondary">Qty:</span>
                    <span className="text-sm font-semibold">{item.qty}</span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-2">
                    {/* Sale Badge */}
                    {hasSale && (
                        <span className="inline-block text-[10px] bg-red text-white px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                            SALE {salePercentage}% OFF
                        </span>
                    )}

                    {/* Bulk/Pricing Tier Badge */}
                    {hasPricingTier && (
                        <span className="inline-block text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-semibold uppercase">
                            BULK DEALS
                        </span>
                    )}
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between mt-2">
                    {/* Unit Price with slash if discounted */}
                    <div className="text-xs">
                        {hasDiscount ? (
                            <div className="flex items-center gap-2">
                                <span className="text-secondary line-through">
                                    ${originalPrice.toFixed(2)}
                                </span>
                                <span className="text-red font-medium">
                                    ${pricing.unitPrice.toFixed(2)} each
                                </span>
                            </div>
                        ) : (
                            <span className="text-secondary">
                                ${pricing.unitPrice.toFixed(2)} each
                            </span>
                        )}
                    </div>

                    {/* Total Price */}
                    <div className="text-base font-bold text-blue">
                        ${pricing.totalPrice.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartItemCard;
