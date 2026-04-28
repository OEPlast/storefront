'use client';

import Image from 'next/image';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import PricingTierUpgrade from '@/components/Cart/PricingTierUpgrade';
import { calculateCartItemPricing } from '@/utils/cart-pricing';
import { getCdnUrl } from '@/libs/cdn-url';
import { formatToNaira } from '@/utils/currencyFormatter';
import type { CartItem } from '@/context/CartContext';
import type { Dispatch, SetStateAction } from 'react';

type CartItemsSectionProps = {
    cartItems: CartItem[];
    quantityMap: Record<string, number>;
    setQuantityMap: Dispatch<SetStateAction<Record<string, number>>>;
    removeItem: (cartItemId: string) => void;
};

export default function CartItemsSection({
    cartItems,
    quantityMap,
    setQuantityMap,
    removeItem,
}: CartItemsSectionProps) {
    return (
        <>
            <div className="flex items-center justify-between mb-3">
                <h2 className="heading5">Cart Items ({cartItems.length})</h2>
                <button
                    onClick={() => cartItems.forEach((item) => removeItem(item._id))}
                    className="text-red text-sm hover:underline flex items-center gap-1"
                >
                    <Icon.Trash size={16} />
                    Clear Cart
                </button>
            </div>

            <div className="list-product w-full">
                <div className="w-full">
                    <div className="heading bg-surface bora-4 pt-4 pb-4">
                        <div className="flex">
                            <div className="w-1/2">
                                <div className="text-button text-center">Products</div>
                            </div>
                            <div className="w-1/12">
                                <div className="text-button text-center">Price</div>
                            </div>
                            <div className="w-1/6">
                                <div className="text-button text-center">Quantity</div>
                            </div>
                            <div className="w-1/6">
                                <div className="text-button text-center">Total</div>
                            </div>
                        </div>
                    </div>

                    <div className="list-product-main w-full mt-2">
                        {cartItems.map((item) => {
                            const itemId = item._id || item.id;
                            const currentQty = quantityMap[itemId] ?? item.qty;

                            const pricing = calculateCartItemPricing({ ...item, qty: currentQty });

                            const productName = item.name || 'Product';
                            const productImagePath =
                                item.description_images?.find((img) => img.cover_image)?.url ??
                                item.description_images?.[0]?.url;
                            const productImageUrl = productImagePath ? getCdnUrl(productImagePath) : '';
                            const isUnavailable = item.stock === 0;
                            const unavailableLabel = 'Out of stock';
                            const displayTotal = pricing.totalPrice;

                            const hasPricingTier = !!pricing.pricingTier;
                            const hasSale = !!pricing.sale;
                            const hasDiscount = hasSale || hasPricingTier;

                            return (
                                <div
                                    className={`item flex mt-3 pb-3 border-b border-line w-full transition-colors rounded-lg md:p-3 ${isUnavailable ? 'bg-surface/50 opacity-80' : 'hover:bg-surface/50'
                                        }`}
                                    key={itemId}
                                >
                                    <div className="w-1/2">
                                        <div className="flex items-center gap-6">
                                            <div className="bg-img md:w-[100px] w-20 aspect-square relative group">
                                                {productImageUrl ? (
                                                    <Image
                                                        src={productImageUrl}
                                                        width={1000}
                                                        height={1000}
                                                        alt={productName}
                                                        className="w-full h-full object-cover rounded-lg"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                                                        <Icon.Image size={32} className="text-gray-400" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1">
                                                <div className="text-title font-semibold mb-2 flex items-center gap-2">
                                                    <span>{productName}</span>
                                                    {isUnavailable && (
                                                        <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                                                            {unavailableLabel}
                                                        </span>
                                                    )}
                                                </div>

                                                {item.selectedAttributes.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {item.selectedAttributes.map((attr, idx) => (
                                                            <span key={idx} className="text-xs bg-surface px-2 py-1 rounded border border-line">
                                                                <span className="text-secondary">{attr.name}:</span>{' '}
                                                                <span className="font-medium">{attr.value}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {hasSale && (
                                                        <span className="text-xs bg-red text-white px-2.5 py-1 rounded font-bold uppercase tracking-wide">
                                                            SALE {Math.round(pricing.saleDiscount)}% OFF
                                                        </span>
                                                    )}
                                                    {hasPricingTier && (
                                                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-medium">
                                                            Bulk Deals
                                                        </span>
                                                    )}
                                                </div>

                                                {isUnavailable && (
                                                    <div className="mt-2 text-xs text-red-600">
                                                        Please adjust or remove this item before checkout.
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {!isUnavailable && item.pricingTiers && (
                                            <PricingTierUpgrade
                                                item={item}
                                                currentQty={currentQty}
                                                onQuantityChange={(newQty) => {
                                                    setQuantityMap((prev) => ({
                                                        ...prev,
                                                        [itemId]: newQty,
                                                    }));
                                                }}
                                            />
                                        )}
                                    </div>

                                    <div className="w-1/12 price flex flex-col items-center justify-center">
                                        {hasDiscount ? (
                                            <>
                                                <div className="text-xs text-secondary line-through">
                                                    {formatToNaira(pricing.basePrice)}
                                                </div>
                                                <div className="text-title text-center font-bold text-red mt-1">
                                                    {formatToNaira(pricing.unitPrice)}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-title text-center font-semibold">
                                                {formatToNaira(pricing.unitPrice)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-1/6 flex items-center justify-center">
                                        <div className="quantity-block bg-surface p-1.5 flex items-center justify-between rounded-lg border border-line md:w-[100px] flex-shrink-0 w-24 hover:border-black transition-colors">
                                            <Icon.Minus
                                                onClick={() => {
                                                    if (isUnavailable) {
                                                        return;
                                                    }
                                                    setQuantityMap((prev) => {
                                                        const previousQty = prev[itemId] ?? item.qty;
                                                        const nextQty = Math.max(1, previousQty - 1);
                                                        if (nextQty === previousQty) {
                                                            return prev;
                                                        }
                                                        return { ...prev, [itemId]: nextQty };
                                                    });
                                                }}
                                                className={`text-base max-md:text-sm rounded p-1 transition-colors ${currentQty === 1 || isUnavailable
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : 'cursor-pointer hover:bg-black hover:text-white'
                                                    }`}
                                            />
                                            <input
                                                type="number"
                                                min={1}
                                                value={currentQty}
                                                inputMode="numeric"
                                                className="text-button quantity font-semibold w-10 bg-transparent text-center outline-none"
                                                onChange={(event) => {
                                                    const nextValue = Number.parseInt(event.target.value, 10);
                                                    const sanitized = Number.isFinite(nextValue) ? nextValue : 0;
                                                    setQuantityMap((prev) => {
                                                        const previousQty = prev[itemId] ?? item.qty;
                                                        if (previousQty === sanitized) {
                                                            return prev;
                                                        }
                                                        return { ...prev, [itemId]: sanitized };
                                                    });
                                                }}
                                            />
                                            <Icon.Plus
                                                onClick={() => {
                                                    if (isUnavailable) {
                                                        return;
                                                    }
                                                    setQuantityMap((prev) => {
                                                        const previousQty = prev[itemId] ?? item.qty;
                                                        const nextQty = previousQty + 1;
                                                        if (nextQty === previousQty) {
                                                            return prev;
                                                        }
                                                        return { ...prev, [itemId]: nextQty };
                                                    });
                                                }}
                                                className={`text-base max-md:text-sm rounded p-1 transition-colors ${isUnavailable
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : 'cursor-pointer hover:bg-black hover:text-white'
                                                    }`}
                                            />
                                        </div>
                                    </div>

                                    <div className="w-1/6 flex flex-col items-center justify-center">
                                        <div className="text-title text-center font-bold">{formatToNaira(displayTotal)}</div>
                                    </div>

                                    <div className="w-1/12 flex items-center justify-center">
                                        <button
                                            onClick={() => removeItem(item.cartItemId)}
                                            className="p-2 hover:bg-red/10 rounded-full transition-colors group"
                                            title="Remove item"
                                        >
                                            <Icon.Trash className="text-xl max-md:text-base text-red group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
