'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer/Footer';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { useCart } from '@/context/CartContext';
import { calculateCartItemPricing } from '@/utils/cart-pricing';
import { countdownTime } from '@/store/countdownTime';
import { getCdnUrl } from '@/libs/cdn-url';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import { CartIcon } from '@/components/Icons';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import PricingTierUpgrade from '@/components/Cart/PricingTierUpgrade';
import { useCheckoutStore } from '@/store/useCheckoutStore';
import { formatToNaira } from '@/utils/currencyFormatter';
import { useFreeShippingThreshold } from '@/hooks/useFreeShippingThreshold';
import { useProductSocket } from '@/hooks/useProductSocket';
const Cart = () => {
  const [timeLeft, setTimeLeft] = useState(countdownTime());
  const router = useRouter();
  const { freeShippingThreshold } = useFreeShippingThreshold();
  const { openLoginModal } = useLoginModalStore();
  const { setShippingMethod: setCheckoutShippingMethod } = useCheckoutStore();
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(countdownTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const { items: cartItems, updateItem, removeItem, isGuest, refreshCart } = useCart();
  const cartProductIds = useMemo(() => cartItems.map((i) => i._id).filter(Boolean), [cartItems]);
  useProductSocket({ productIds: cartProductIds });
  const [quantityMap, setQuantityMap] = useState<Record<string, number>>({});
  const debouncedQuantities = useDebouncedValue(quantityMap, 500);

  // Refresh cart data on mount to get latest pricing/sales info
  useEffect(() => {
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  const optimisticSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const qty = quantityMap[item._id || item.id] ?? item.qty;
      const pricing = calculateCartItemPricing({ ...item, qty });
      return sum + pricing.unitPrice * qty;
    }, 0);
  }, [cartItems, quantityMap]);

  useEffect(() => {
    setQuantityMap((prev) => {
      const next: Record<string, number> = {};
      let isSame = cartItems.length === Object.keys(prev).length;

      for (const item of cartItems) {
        const itemId = item._id || item.id;
        const existing = prev[itemId];
        let value = existing;

        if (existing == null) {
          value = item.qty;
          isSame = false;
        } else if (existing !== item.qty) {
          value = item.qty;
          isSame = false;
        }

        next[itemId] = value ?? item.qty;
      }

      return isSame ? prev : next;
    });
  }, [cartItems]);

  // Debounce quantity updates to avoid flooding the cart API
  useEffect(() => {
    for (const item of cartItems) {
      const itemId = item._id || item.id;
      const targetQty = debouncedQuantities[itemId];
      if (typeof targetQty !== 'number') {
        continue;
      }

      const legacyQuantity = Number(item.quantity ?? Number.NaN);
      const availableStock =
        Number.isFinite(item.stock) && item.stock > 0
          ? Number(item.stock)
          : Number.isFinite(legacyQuantity) && legacyQuantity > 0
            ? legacyQuantity
            : null;

      let normalizedQty = Math.max(1, targetQty);
      if (availableStock !== null) {
        normalizedQty = Math.min(normalizedQty, availableStock);
      }

      if (normalizedQty !== targetQty) {
        setQuantityMap((prev) => {
          const current = prev[itemId] ?? item.qty;
          if (current === normalizedQty) {
            return prev;
          }
          return { ...prev, [itemId]: normalizedQty };
        });
      }

      if (normalizedQty !== item.qty) {
        updateItem(item.cartItemId, { qty: normalizedQty });
      }
    }
  }, [debouncedQuantities, cartItems, updateItem]);

  const [totalCart, setTotalCart] = useState<number>(0);
  const [shippingMethod, setShippingMethod] = useState<'pickup' | 'normal' | 'express'>('normal');

  const freeShippingEnabled =
    Number.isFinite(freeShippingThreshold) && freeShippingThreshold !== null;
  const normalizedFreeShippingThreshold = freeShippingEnabled ? Number(freeShippingThreshold) : 0;
  const freeShippingRemaining = freeShippingEnabled
    ? Math.max(normalizedFreeShippingThreshold - totalCart, 0)
    : 0;
  const hasQualifiedForFreeShipping = freeShippingEnabled && freeShippingRemaining === 0;
  const freeShippingProgress = freeShippingEnabled
    ? normalizedFreeShippingThreshold > 0
      ? Math.min((totalCart / normalizedFreeShippingThreshold) * 100, 100)
      : 100
    : 0;

  // Calculate total from cart items
  useEffect(() => {
    setTotalCart(optimisticSubtotal);
  }, [optimisticSubtotal]);

  const redirectToCheckout = () => {
    // Save shipping method to checkout store
    setCheckoutShippingMethod(shippingMethod as 'pickup' | 'normal' | 'express');

    // Guests go straight through: checkout collects their email and offers the login popup.
    router.push('/checkout');
  };

  return (
    <>
      <div className="cart-block min-h-[50vh] py-10">
        <div className="container">
          {/* Cart Status Banner */}
          {isGuest && cartItems.length > 0 && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <Icon.Warning className="flex-shrink-0 text-2xl text-yellow-600" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Guest Cart</p>
                <p className="text-xs text-yellow-700">
                  Sign in to save your cart and get personalized deals!
                </p>
              </div>
              <button
                type="button"
                onClick={() => openLoginModal()}
                className="button-main ml-auto whitespace-nowrap px-4 py-2 text-sm"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Empty Cart State */}
          {cartItems.length === 0 && (
            <div className="py-20 text-center">
              <div className="mb-6 inline-flex h-[300px] w-[300px] justify-center rounded-full bg-surface p-1">
                <CartIcon />
              </div>
              <h3 className="heading4 mb-3">Your cart is empty</h3>
              <p className="mb-6 text-secondary">{`Looks like you haven't added anything to your cart yet`}</p>
              <Link href="/" className="button-main inline-block">
                Start Shopping
              </Link>
            </div>
          )}

          {cartItems.length > 0 && (
            <div className="content-main flex justify-between gap-y-6 max-xl:flex-col">
              <div className="w-full xl:w-2/3 xl:pr-3">
                {freeShippingEnabled ? (
                  <div className="mb-3 px-1">
                    <div className="text-sm leading-tight text-black">
                      {hasQualifiedForFreeShipping ? (
                        <>
                          You qualified for{' '}
                          <span className="font-semibold text-green-600">free delivery</span>.
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-green-600">
                            {formatToNaira(freeShippingRemaining)}
                          </span>{' '}
                          away from free delivery
                        </>
                      )}
                    </div>

                    <div className="mt-2 pr-5">
                      <div className="relative h-1 rounded-full bg-green-100">
                        <div
                          className="h-full rounded-full bg-green-600 transition-all"
                          style={{ width: `${freeShippingProgress}%` }}
                        />

                        <div
                          className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                          style={{ left: `${freeShippingProgress}%` }}
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white bg-green-600 text-white shadow-sm">
                            <Icon.ShoppingCartSimple size={7} weight="bold" />
                          </span>
                        </div>

                        <div className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/3">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-green-600 bg-white text-green-600">
                            <Icon.Truck size={7} weight="bold" />
                          </span>
                        </div>
                      </div>

                      <br />
                      <br />
                    </div>
                  </div>
                ) : null}

                {/* Cart Items Summary Header */}
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="heading5">Cart Items ({cartItems.length})</h2>
                  <button
                    onClick={() => cartItems.forEach((item) => removeItem(item._id))}
                    className="flex items-center gap-1 text-sm text-red hover:underline"
                  >
                    Clear Cart
                  </button>
                </div>
                {/* Product List */}
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

                        // Calculate pricing at render time
                        const pricing = calculateCartItemPricing({ ...item, qty: currentQty });

                        const productName = item.name || 'Product';
                        const productImagePath =
                          item.description_images?.find((img) => img.cover_image)?.url ??
                          item.description_images?.[0]?.url;
                        const productImageUrl = productImagePath ? getCdnUrl(productImagePath) : '';
                        const isUnavailable = false; // TODO: Check stock availability
                        const unavailableLabel = 'Out of stock';
                        const displayTotal = pricing.totalPrice;

                        // Pricing tier info
                        const hasPricingTier = !!pricing.pricingTier;
                        const tierDiscount = pricing.pricingTier?.value ?? null;
                        const tierStrategy = pricing.pricingTier?.strategy ?? null;

                        // Check if sale or discount exists
                        const hasSale = !!pricing.sale;
                        const hasDiscount = hasSale || hasPricingTier;

                        return (
                          <div
                            className={`item mt-3 w-full rounded-lg border-b border-line pb-3 transition-colors md:p-3 ${
                              isUnavailable ? 'bg-surface/50 opacity-80' : 'hover:bg-surface/50'
                            }`}
                            key={itemId}
                          >
                            <div className="flex w-full">
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
                                    {/* Attributes */}
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
                                    {/* Sale/Discount Badge */}
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {hasSale && (
                                        <span className="price-tag text-[11px]">
                                          -{Math.round(pricing.saleDiscount)}% OFF
                                        </span>
                                      )}
                                      {hasPricingTier && (
                                        <span className="bulk-tag text-[11px]">Bulk</span>
                                      )}
                                    </div>
                                    {isUnavailable && (
                                      <div className="mt-2 text-xs text-red-600">
                                        Please adjust or remove this item before checkout.
                                      </div>
                                    )}
                                  </div>
                                </div>
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
                                {/* {hasPricingTier && (
                                                                <div className="text-[10px] text-blue-600 font-medium">
                                                                    Tier price
                                                                </div>
                                                            )} */}
                              </div>
                              <div className="flex w-1/6 items-center justify-center">
                                <div className="quantity-block flex w-fit flex-shrink-0 items-center justify-between rounded-lg border border-line bg-surface p-1.5 transition-colors hover:border-black md:w-[100px]">
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
                                  <div className="text-button quantity px-1 font-semibold">
                                    {currentQty}
                                  </div>
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

                            {/* Pricing Tier Upgrade Opportunity */}
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
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              {/* Order Summary Sidebar */}
              <div className="w-full xl:w-1/3 xl:pl-12">
                <div className="checkout-block sticky top-24 rounded-2xl border border-line bg-surface p-5">
                  <div className="mb-5 flex items-center gap-2">
                    <Icon.Receipt className="text-2xl" />
                    <h3 className="heading5">Order Summary</h3>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-4">
                    <div className="total-block flex items-center justify-between">
                      <div className="text-secondary">Subtotal</div>
                      <div className="text-title font-semibold">{formatToNaira(totalCart)}</div>
                    </div>

                    <div className="border-t border-line pt-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-secondary">
                          <Icon.Truck size={18} />
                          <span>Shipping</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label
                          className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-all ${shippingMethod === 'pickup' ? 'border-black bg-black text-white' : 'border-line hover:border-gray-400'}`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="ship"
                              checked={shippingMethod === 'pickup'}
                              onChange={() => setShippingMethod('pickup')}
                              className="h-4 w-4"
                            />
                            <div>
                              <div className="font-medium">Pickup</div>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-green-500">FREE</div>
                        </label>

                        <label
                          className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-all ${shippingMethod === 'normal' ? 'border-black bg-black text-white' : 'border-line hover:border-gray-400'}`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="ship"
                              checked={shippingMethod === 'normal'}
                              onChange={() => setShippingMethod('normal')}
                              className="h-4 w-4"
                            />
                            <div>
                              <div className="font-medium">Delivery</div>
                            </div>
                          </div>
                          <div
                            className={`text-sm font-semibold ${hasQualifiedForFreeShipping ? 'text-green-500' : 'text-secondary'}`}
                          >
                            {hasQualifiedForFreeShipping ? 'FREE SHIPPING' : 'TBD'}
                          </div>
                        </label>

                        {/* <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${shippingMethod === 'express' ? 'border-black bg-black text-white' : 'border-line hover:border-gray-400'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="ship"
                                                            checked={shippingMethod === 'express'}
                                                            onChange={() => setShippingMethod('express')}
                                                            className="w-4 h-4"
                                                        />
                                                        <div>
                                                            <div className="font-medium">Express Delivery</div>
                                                            <div className="text-xs text-secondary mt-0.5">Fastest - Calculated at checkout</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-semibold text-secondary text-sm">TBD</div>
                                                </label> */}
                      </div>
                    </div>

                    {/* Grand Total */}
                    <div className="border-t border-line pt-4">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold">Total</div>
                        <div className="text-3xl font-bold text-black">
                          {formatToNaira(totalCart)}
                        </div>
                      </div>
                    </div>
                    {/* {(shippingMethod === 'normal' || shippingMethod === 'express') && (
                                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <div className="flex items-start gap-2">
                                                    <Icon.Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                                    <div className="text-xs text-blue-700">
                                                        <span className="font-semibold">Shipping cost</span> will be calculated at checkout based on your delivery address and package weight.
                                                    </div>
                                                </div>
                                            </div>
                                        )} */}
                  </div>

                  {/* Checkout Button */}
                  <div className="block-button mt-4 flex flex-col items-center md:mt-5">
                    <button
                      className="checkout-btn button-main flex w-full items-center justify-center gap-2 py-3 text-center text-base font-semibold transition-all hover:shadow-lg md:text-lg"
                      onClick={redirectToCheckout}
                    >
                      <Icon.ShoppingCartSimple size={20} />
                      Checkout
                    </button>
                    <Link
                      className="text-button flex items-center gap-1 text-[13px] text-secondary hover:underline"
                      href={'/'}
                    >
                      <Icon.ArrowLeft size={16} />
                      Continue shopping
                    </Link>
                  </div>

                  {/* Trust Badges */}
                  <div className="mt-6 border-t border-line pt-6">
                    <div className="grid grid-cols-2 gap-3 text-xs text-secondary">
                      <div className="flex items-center gap-2">
                        <Icon.ShieldCheck size={16} className="text-green-600" />
                        <span>Secure Payment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon.Package size={16} className="text-blue-600" />
                        <span>Easy Returns</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon.Truck size={16} className="text-orange-600" />
                        <span>Fast Delivery</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon.Headset size={16} className="text-purple-600" />
                        <span>Customer support</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Cart;
