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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="heading5">Cart Items ({cartItems.length})</h2>
        <button
          onClick={() => cartItems.forEach((item) => removeItem(item._id))}
          className="flex items-center gap-1 text-sm text-red hover:underline"
        >
          Clear Cart
        </button>
      </div>

      <div className="list-product w-full">
        <div className="w-full">
          <div className="heading bora-4 bg-surface pb-4 pt-4">
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

          <div className="list-product-main mt-2 w-full">
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
                  className={`item mt-3 flex w-full rounded-lg border-b border-line pb-3 transition-colors md:p-3 ${
                    isUnavailable ? 'bg-surface/50 opacity-80' : 'hover:bg-surface/50'
                  }`}
                  key={itemId}
                >
                  <div className="w-1/2">
                    <div className="flex items-center gap-6">
                      <div className="bg-img group relative aspect-square w-20 md:w-[100px]">
                        {productImageUrl ? (
                          <Image
                            src={productImageUrl}
                            width={1000}
                            height={1000}
                            alt={productName}
                            className="h-full w-full rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-200">
                            <Icon.Image size={32} className="text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="text-title mb-2 flex items-center gap-2 font-semibold">
                          <span>{productName}</span>
                          {isUnavailable && (
                            <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
                              {unavailableLabel}
                            </span>
                          )}
                        </div>

                        {item.selectedAttributes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.selectedAttributes.map((attr, idx) => (
                              <span
                                key={idx}
                                className="rounded border border-line bg-surface px-2 py-1 text-xs"
                              >
                                <span className="text-secondary">{attr.name}:</span>{' '}
                                <span className="font-medium">{attr.value}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2">
                          {hasSale && (
                            <span className="rounded bg-red px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                              SALE {Math.round(pricing.saleDiscount)}% OFF
                            </span>
                          )}
                          {hasPricingTier && (
                            <span className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white">
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

                  <div className="price flex w-1/12 flex-col items-center justify-center">
                    {hasDiscount ? (
                      <>
                        <div className="text-xs text-secondary line-through">
                          {formatToNaira(pricing.basePrice)}
                        </div>
                        <div className="text-title mt-1 text-center font-bold text-red">
                          {formatToNaira(pricing.unitPrice)}
                        </div>
                      </>
                    ) : (
                      <div className="text-title text-center font-semibold">
                        {formatToNaira(pricing.unitPrice)}
                      </div>
                    )}
                  </div>

                  <div className="flex w-1/6 items-center justify-center">
                    <div className="quantity-block flex w-24 flex-shrink-0 items-center justify-between rounded-lg border border-line bg-surface p-1.5 transition-colors hover:border-black md:w-[100px]">
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
                        className={`rounded p-1 text-base transition-colors max-md:text-sm ${
                          currentQty === 1 || isUnavailable
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:bg-black hover:text-white'
                        }`}
                      />
                      <input
                        type="number"
                        min={1}
                        value={currentQty}
                        inputMode="numeric"
                        className="text-button quantity w-10 bg-transparent text-center font-semibold outline-none"
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
                        className={`rounded p-1 text-base transition-colors max-md:text-sm ${
                          isUnavailable
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:bg-black hover:text-white'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex w-1/6 flex-col items-center justify-center">
                    <div className="text-title text-center font-bold">
                      {formatToNaira(displayTotal)}
                    </div>
                  </div>

                  <div className="flex w-1/12 items-center justify-center">
                    <button
                      onClick={() => removeItem(item.cartItemId)}
                      className="group rounded-full p-2 transition-colors hover:bg-red/10"
                      title="Remove item"
                    >
                      <Icon.Trash className="text-xl text-red transition-transform group-hover:scale-110 max-md:text-base" />
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
