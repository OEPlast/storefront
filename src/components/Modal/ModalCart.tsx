'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { ProductDetail } from '@/types/product';
import { useModalCartContext } from '@/context/ModalCartContext';
import { countdownTime } from '@/store/countdownTime';
import CountdownTimeType from '@/types/CountdownType';
import { useCart, useCartCount } from '@/context/CartContext';
import { calculateCartItemPricing } from '@/utils/cart-pricing';
import { getCdnUrl } from '@/libs/cdn-url';
import { TrashIcon } from '@phosphor-icons/react';
import { formatToNaira } from '@/utils/currencyFormatter';
import { useFreeShippingThreshold } from '@/hooks/useFreeShippingThreshold';

const ModalCart = ({ serverTimeLeft }: { serverTimeLeft: CountdownTimeType }) => {
  /*
     const [timeLeft, setTimeLeft] = useState(serverTimeLeft);
 
     useEffect(() => {
         const timer = setInterval(() => {
             setTimeLeft((prev) => {
                 const newTime = countdownTime();
                 // Only update if values actually changed
                 if (
                     prev.days !== newTime.days ||
                     prev.hours !== newTime.hours ||
                     prev.minutes !== newTime.minutes ||
                     prev.seconds !== newTime.seconds
                 ) {
                     return newTime;
                 }
                 return prev;
             });
         }, 1000);
 
         return () => clearInterval(timer);
     }, []);
     */

  const [activeTab, setActiveTab] = useState<string | undefined>('');
  const { isModalOpen, closeModalCart } = useModalCartContext();
  const { freeShippingThreshold } = useFreeShippingThreshold();

  // Use CartContext for cart state
  const { items: cartItems, removeItem, itemCount: cartCount } = useCart();

  // Memoize lightweight view model to reduce per-render work
  const displayItems = React.useMemo(() => {
    return cartItems.map((item) => {
      const itemId = item._id || item.id;
      const productName = item.name || 'Product';
      const productImagePath =
        item.description_images?.find((img) => img.cover_image)?.url ??
        item.description_images?.[0]?.url;

      const productImageUrl = productImagePath
        ? getCdnUrl(productImagePath)
        : '/images/placeholder.png';

      // Calculate pricing at render time
      const pricing = calculateCartItemPricing(item);

      // Check for active sale (not pricing tier discount)
      const hasSale = !!pricing.sale;
      const salePercentage = hasSale ? Math.round(pricing.saleDiscount) : 0;

      // Check for pricing tier
      const hasPricingTier = !!pricing.pricingTier;

      // Show price slash if there's EITHER a sale OR pricing tier discount
      const hasDiscount = hasSale || hasPricingTier;

      // For pricing tier, calculate the original price without tier discount
      let originalPrice = pricing.basePrice;
      if (hasPricingTier && !hasSale) {
        // If only pricing tier (no sale), show the base price before tier discount
        originalPrice = pricing.basePrice;
      } else if (hasSale) {
        // If there's a sale, show the base price before sale
        originalPrice = pricing.basePrice;
      }

      return {
        id: itemId,
        slug: item.slug,
        cartItemId: item.cartItemId,
        name: productName,
        imageUrl: productImageUrl,
        qty: item.qty,
        attrs: item.selectedAttributes.map((a) => a.value).join(', '),
        basePrice: pricing.basePrice,
        originalPrice, // Price before any discounts
        unitPrice: pricing.unitPrice, // Final unit price after all discounts
        totalPrice: pricing.totalPrice, // Total price (qty × unitPrice)
        pricingTier: pricing.pricingTier,
        hasSale,
        salePercentage,
        hasPricingTier,
        hasDiscount, // Either sale or pricing tier
      };
    });
  }, [cartItems]);

  const handleAddToCart = (productItem: ProductDetail) => {
    // This is for "You May Also Like" section - can be implemented later if needed
    console.log('Add to cart from modal:', productItem);
  };

  const handleActiveTab = (tab: string) => {
    setActiveTab(tab);
  };

  // Calculate total from cart items with render-time pricing
  const totalCart = React.useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const pricing = calculateCartItemPricing(item);
      return sum + pricing.totalPrice;
    }, 0);
  }, [cartItems]);

  const freeShippingEnabled =
    Number.isFinite(freeShippingThreshold) && freeShippingThreshold !== null;
  const normalizedThreshold = freeShippingEnabled ? Number(freeShippingThreshold) : 0;
  const freeShippingRemaining = freeShippingEnabled
    ? Math.max(normalizedThreshold - totalCart, 0)
    : 0;
  const freeShippingProgress =
    freeShippingEnabled && normalizedThreshold > 0
      ? Math.min((totalCart / normalizedThreshold) * 100, 100)
      : freeShippingEnabled
        ? 100
        : 0;
  const hasQualifiedForFreeShipping = freeShippingEnabled && freeShippingRemaining === 0;

  return (
    <>
      <div className={`modal-cart-block`} onClick={closeModalCart}>
        <div
          className={`modal-cart-main flex ${isModalOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="right cart-block relative w-full overflow-hidden py-6">
            <div className="heading relative flex items-center justify-between px-6 pb-3">
              <div className="heading5">Shopping Cart</div>
              <div
                className="close-btn absolute right-6 top-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-surface duration-300 hover:bg-black hover:text-white"
                onClick={closeModalCart}
              >
                <Icon.X size={14} />
              </div>
            </div>
            {freeShippingEnabled ? (
              <div className="heading banner mt-3 px-6">
                <div className="text">
                  {hasQualifiedForFreeShipping ? (
                    <>
                      You qualified for <span className="text-button">Free shipping</span>
                    </>
                  ) : (
                    <>
                      Buy{' '}
                      <span className="text-button">{formatToNaira(freeShippingRemaining)}</span>{' '}
                      more to get <span className="text-button italic">free shipping</span>
                    </>
                  )}
                </div>
                <div className="tow-bar-block mt-3">
                  <div
                    className="progress-line"
                    style={{ width: `${freeShippingProgress}%` }}
                  ></div>
                </div>
              </div>
            ) : null}
            <div className="flex h-[91%] flex-col">
              <div className="list-product !max-h-none flex-1 px-6">
                {cartItems.length === 0 ? (
                  <div className="py-10 text-center text-secondary">
                    <Icon.ShoppingCart className="mx-auto mb-3 text-5xl" />
                    <p className="text-button">Your cart is empty</p>
                  </div>
                ) : (
                  displayItems.map((item) => {
                    return (
                      <div
                        key={item.id}
                        className="item flex items-center justify-between gap-3 border-b border-line py-5"
                      >
                        <div className="infor flex w-full items-center gap-3">
                          <div className="bg-img aspect-square w-[100px] flex-shrink-0 overflow-hidden rounded-lg border border-gray-100">
                            <Image
                              src={item.imageUrl}
                              width={120}
                              height={120}
                              alt={item.name}
                              loading="eager"
                              priority
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="w-full">
                            {/* Sales Badge and Pricing Tier Indicator */}
                            {(item.hasSale || item.hasPricingTier) && (
                              <div className="mb-1 flex items-center gap-1.5">
                                {item.hasSale && (
                                  <span className="flex rounded bg-red-600 px-1.5 text-[12px] font-medium text-white">
                                    <span className="hidden text-[10px] md:block">-</span>
                                    {item.salePercentage}%
                                  </span>
                                )}
                                {item.hasPricingTier && (
                                  <span className="rounded bg-black px-1.5 text-[10px] font-medium text-white">
                                    Bulk Deals
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex w-full items-center justify-between">
                              <Link href={item.slug} className="name text-button hover:underline">
                                {item.name}
                              </Link>
                              <div
                                className="remove-cart-btn caption1 group cursor-pointer rounded-full p-1.5 font-semibold underline outline outline-gray-100 hover:bg-red"
                                onClick={() => removeItem(item.cartItemId)}
                              >
                                <TrashIcon className="!text-red-400 group-hover:!text-white" />
                              </div>
                            </div>
                            <div className="mt-3 flex w-full items-center justify-between gap-2">
                              <div className="flex items-center gap-2 capitalize text-secondary2">
                                <span>Qty: {item.qty}</span>
                                {item.attrs && item.attrs.length > 0 && (
                                  <span className="text-xs">({item.attrs})</span>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {/* Total Price (qty × unit price) */}
                                <div className="text-title text-lg font-bold">
                                  {formatToNaira(item.totalPrice)}
                                </div>
                                {/* Unit prices with slash if discounted */}
                                <div className="flex items-center gap-2">
                                  {item.hasDiscount && (
                                    <span className="text-xs text-secondary2 line-through">
                                      {formatToNaira(item.originalPrice)}
                                    </span>
                                  )}
                                  <span className="text-xs text-secondary">
                                    {formatToNaira(item.unitPrice)} per unit
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="footer-modal w-full flex-shrink-0 bg-white">
                <div className="flex items-center justify-center gap-8 border-b border-line px-6 py-4 lg:gap-14">
                  <div
                    className="item flex cursor-pointer items-center gap-3"
                    onClick={() => handleActiveTab('note')}
                  >
                    <Icon.NotePencil className="text-xl" />
                    <div className="caption1">Note</div>
                  </div>
                  <div
                    className="item flex cursor-pointer items-center gap-3"
                    onClick={() => handleActiveTab('shipping')}
                  >
                    <Icon.Truck className="text-xl" />
                    <div className="caption1">Shipping</div>
                  </div>
                  <div
                    className="item flex cursor-pointer items-center gap-3"
                    onClick={() => handleActiveTab('coupon')}
                  >
                    <Icon.Tag className="text-xl" />
                    <div className="caption1">Coupon</div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-6 pt-6">
                  <div className="heading5">Subtotal</div>
                  <div className="heading5">{formatToNaira(totalCart)}</div>
                </div>
                <div className="block-button p-6 text-center">
                  <div className="flex items-center gap-4">
                    <Link
                      href={'/cart'}
                      className="button-main basis-1/2 border border-black bg-white text-center uppercase text-black"
                      onClick={closeModalCart}
                    >
                      View cart
                    </Link>
                    <Link
                      href={'/checkout'}
                      className="button-main basis-1/2 text-center uppercase"
                      onClick={closeModalCart}
                    >
                      Check Out
                    </Link>
                  </div>
                  <div
                    onClick={closeModalCart}
                    className="text-button-uppercase has-line-before mt-4 inline-block cursor-pointer text-center"
                  >
                    Or continue shopping
                  </div>
                </div>
                <div className={`tab-item note-block ${activeTab === 'note' ? 'active' : ''}`}>
                  <div className="border-b border-line px-6 py-4">
                    <div className="item flex cursor-pointer items-center gap-3">
                      <Icon.NotePencil className="text-xl" />
                      <div className="caption1">Note</div>
                    </div>
                  </div>
                  <div className="form px-6 pt-4">
                    <textarea
                      name="form-note"
                      id="form-note"
                      rows={4}
                      placeholder="Add special instructions for your order..."
                      className="caption1 w-full rounded-md border-line bg-surface px-4 py-3"
                    ></textarea>
                  </div>
                  <div className="block-button px-6 pb-6 pt-4 text-center">
                    <div
                      className="button-main w-full text-center"
                      onClick={() => setActiveTab('')}
                    >
                      Save
                    </div>
                    <div
                      onClick={() => setActiveTab('')}
                      className="text-button-uppercase has-line-before mt-4 inline-block cursor-pointer text-center"
                    >
                      Cancel
                    </div>
                  </div>
                </div>
                <div className={`tab-item note-block ${activeTab === 'shipping' ? 'active' : ''}`}>
                  <div className="border-b border-line px-6 py-4">
                    <div className="item flex cursor-pointer items-center gap-3">
                      <Icon.Truck className="text-xl" />
                      <div className="caption1">Estimate shipping rates</div>
                    </div>
                  </div>
                  <div className="form px-6 pt-4">
                    <div className="">
                      <label htmlFor="select-country" className="caption1 text-secondary">
                        Country/region
                      </label>
                      <div className="select-block relative mt-2">
                        <select
                          id="select-country"
                          name="select-country"
                          className="w-full rounded-xl border border-line bg-white py-3 pl-5"
                          defaultValue={'Country/region'}
                        >
                          <option value="Country/region" disabled>
                            Country/region
                          </option>
                          <option value="France">France</option>
                          <option value="Spain">Spain</option>
                          <option value="UK">UK</option>
                          <option value="USA">USA</option>
                        </select>
                        <Icon.CaretDown
                          size={12}
                          className="absolute right-2 top-1/2 -translate-y-1/2 md:right-5"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label htmlFor="select-state" className="caption1 text-secondary">
                        State
                      </label>
                      <div className="select-block relative mt-2">
                        <select
                          id="select-state"
                          name="select-state"
                          className="w-full rounded-xl border border-line bg-white py-3 pl-5"
                          defaultValue={'State'}
                        >
                          <option value="State" disabled>
                            State
                          </option>
                          <option value="Paris">Paris</option>
                          <option value="Madrid">Madrid</option>
                          <option value="London">London</option>
                          <option value="New York">New York</option>
                        </select>
                        <Icon.CaretDown
                          size={12}
                          className="absolute right-2 top-1/2 -translate-y-1/2 md:right-5"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label htmlFor="select-code" className="caption1 text-secondary">
                        Postal/Zip Code
                      </label>
                      <input
                        className="mt-3 w-full rounded-xl border-line px-5 py-3"
                        id="select-code"
                        type="text"
                        placeholder="Postal/Zip Code"
                      />
                    </div>
                  </div>
                  <div className="block-button px-6 pb-6 pt-4 text-center">
                    <div
                      className="button-main w-full text-center"
                      onClick={() => setActiveTab('')}
                    >
                      Calculator
                    </div>
                    <div
                      onClick={() => setActiveTab('')}
                      className="text-button-uppercase has-line-before mt-4 inline-block cursor-pointer text-center"
                    >
                      Cancel
                    </div>
                  </div>
                </div>
                <div className={`tab-item note-block ${activeTab === 'coupon' ? 'active' : ''}`}>
                  <div className="border-b border-line px-6 py-4">
                    <div className="item flex cursor-pointer items-center gap-3">
                      <Icon.Tag className="text-xl" />
                      <div className="caption1">Add A Coupon Code</div>
                    </div>
                  </div>
                  <div className="form px-6 pt-4">
                    <div className="">
                      <label htmlFor="select-discount" className="caption1 text-secondary">
                        Enter Code
                      </label>
                      <input
                        className="mt-3 w-full rounded-xl border-line px-5 py-3"
                        id="select-discount"
                        type="text"
                        placeholder="Discount code"
                      />
                    </div>
                  </div>
                  <div className="block-button px-6 pb-6 pt-4 text-center">
                    <div
                      className="button-main w-full text-center"
                      onClick={() => setActiveTab('')}
                    >
                      Apply
                    </div>
                    <div
                      onClick={() => setActiveTab('')}
                      className="text-button-uppercase has-line-before mt-4 inline-block cursor-pointer text-center"
                    >
                      Cancel
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalCart;
