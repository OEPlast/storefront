'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Footer from '@/components/Footer/Footer';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from '@/context/CartContext';
import { calculateCartItemPricing } from '@/utils/cart-pricing';
import { countdownTime } from '@/store/countdownTime';
import { getCdnUrl } from '@/libs/cdn-url';
import { useSession } from 'next-auth/react';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import { CartIcon } from '@/components/Icons';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import PricingTierUpgrade from '@/components/Cart/PricingTierUpgrade';
import { useCartCoupons } from '@/hooks/useCoupons';
import { useValidateCoupon } from '@/hooks/useValidateCoupon';
import type { Coupon } from '@/types/coupon';
import { useCheckoutStore } from '@/store/useCheckoutStore';
import { formatToNaira } from '@/utils/currencyFormatter';
const Cart = () => {
    const [timeLeft, setTimeLeft] = useState(countdownTime());
    const router = useRouter();
    const { status } = useSession();
    const { openLoginModal } = useLoginModalStore();
    const { setShippingMethod: setCheckoutShippingMethod, setDiscountInfo } = useCheckoutStore();
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(countdownTime());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const { items: cartItems, updateItem, removeItem, isGuest, refreshCart } = useCart();
    const [quantityMap, setQuantityMap] = useState<Record<string, number>>({});
    const debouncedQuantities = useDebouncedValue(quantityMap, 400);

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

            const normalizedQty = Math.max(1, targetQty);

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
    const [discountCart, setDiscountCart] = useState<number>(0);
    const [shippingMethod, setShippingMethod] = useState<'pickup' | 'normal' | 'express'>('normal');
    const [applyCode, setApplyCode] = useState<number>(0);
    const [savingsAmount, setSavingsAmount] = useState<number>(0);
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [manualCouponCode, setManualCouponCode] = useState<string>('');

    // Fetch cart coupons
    const { data: cartCoupons = [], isLoading: couponsLoading } = useCartCoupons();
    const validateCouponMutation = useValidateCoupon();

    // Calculate total from cart items
    useEffect(() => {
        setTotalCart(optimisticSubtotal);
    }, [optimisticSubtotal]);

    // Reset discount if cart total drops below minimum
    useEffect(() => {
        if (totalCart < applyCode && applyCode > 0) {
            setApplyCode(0);
            setDiscountCart(0);
        }
    }, [totalCart, applyCode]);

    const handleApplyCode = (minValue: number, discount: number) => {
        if (totalCart >= minValue) {
            setApplyCode(minValue);
            setDiscountCart(discount);
        } else {
            alert(`Minimum order must be $${minValue}`);
        }
    };

    const handleApplyCoupon = (coupon: Coupon) => {
        setCouponError(null);

        // Collect product IDs and category IDs from cart
        const productIds = cartItems.map(item => item._id || item.id);
        // Convert categories to string array, filtering out undefined/null
        const categoryIds = cartItems
            .map(item => item.category ? String(item.category) : null)
            .filter((cat): cat is string => cat !== null);

        validateCouponMutation.mutate({
            code: coupon.coupon, // Use 'coupon' field from Coupon object
            orderTotal: totalCart,
            productIds,
            categoryIds,
        }, {
            onSuccess: (data) => {
                if (data.success && data.valid && data.data) {
                    setAppliedCoupon(coupon);
                    setDiscountCart(data.data.discount);
                    setApplyCode(0); // Clear old discount code
                } else {
                    setCouponError(data.message || 'Coupon cannot be applied');
                }
            },
            onError: (error) => {
                setCouponError(error.message || 'Failed to validate coupon');
            },
        });
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setDiscountCart(0);
        setCouponError(null);
    };

    const handleApplyManualCoupon = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCouponCode.trim()) return;

        setCouponError(null);

        // Collect product IDs and category IDs from cart
        const productIds = cartItems.map(item => item._id || item.id);
        const categoryIds = cartItems
            .map(item => item.category ? String(item.category) : null)
            .filter((cat): cat is string => cat !== null);

        validateCouponMutation.mutate({
            code: manualCouponCode.trim().toUpperCase(),
            orderTotal: totalCart,
            productIds,
            categoryIds,
        }, {
            onSuccess: (data) => {
                if (data.success && data.valid && data.data) {
                    // Create a temporary coupon object for display
                    const tempCoupon: Coupon = {
                        _id: data.data.coupon._id,
                        coupon: data.data.coupon.code,
                        discount: data.data.coupon.discount,
                        discountType: data.data.coupon.discountType,
                        minOrderValue: data.data.coupon.minOrderValue,
                        endDate: '',
                        couponType: 'normal',
                        appliesTo: data.data.coupon.appliesTo,
                        stackable: data.data.coupon.stackable,
                    };
                    setAppliedCoupon(tempCoupon);
                    setDiscountCart(data.data.discount);
                    setApplyCode(0); // Clear old discount code
                    setManualCouponCode(''); // Clear input
                } else {
                    // Show specific error message from backend (e.g., "Coupon expired", "Not stackable", etc.)
                    setCouponError(data.message || 'Coupon cannot be applied');
                }
            },
            onError: (error) => {
                setCouponError(error.message || 'Invalid coupon code');
            },
        });
    };

    const redirectToCheckout = () => {
        if (status === 'unauthenticated') {
            openLoginModal();
            return;
        }

        // Save shipping method and discount info to checkout store
        setCheckoutShippingMethod(shippingMethod as 'pickup' | 'normal' | 'express');

        if (discountCart > 0 && appliedCoupon) {
            setDiscountInfo({
                amount: discountCart,
                couponCode: appliedCoupon.coupon,
                couponDetails: {
                    code: appliedCoupon.coupon,
                    discount: appliedCoupon.discount,
                    discountType: appliedCoupon.discountType,
                    minOrderValue: appliedCoupon.minOrderValue || 0,
                },
            });
        } else {
            setDiscountInfo(null);
        }

        router.push('/checkout');
    };

    return (
        <>

            <div className="cart-block py-10 min-h-[50vh]">
                <div className="container">
                    {/* Cart Status Banner */}
                    {isGuest && cartItems.length > 0 && (
                        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                            <Icon.Warning className="text-yellow-600 text-2xl flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-yellow-800">Guest Cart</p>
                                <p className="text-xs text-yellow-700">Sign in to save your cart and get personalized deals!</p>
                            </div>
                            <Link href="/login" className="ml-auto button-main py-2 px-4 text-sm whitespace-nowrap">
                                Sign In
                            </Link>
                        </div>
                    )}

                    {/* Empty Cart State */}
                    {cartItems.length === 0 && (
                        <div className="text-center py-20">
                            <div className="p-1 bg-surface rounded-full mb-6 inline-flex justify-center h-[300px] w-[300px]">
                                <CartIcon />
                            </div>
                            <h3 className="heading4 mb-3">Your cart is empty</h3>
                            <p className="text-secondary mb-6">{`Looks like you haven't added anything to your cart yet`}</p>
                            <Link href="/" className="button-main inline-block">
                                Start Shopping
                            </Link>
                        </div>
                    )}

                    {cartItems.length > 0 && (
                        <div className="content-main flex justify-between max-xl:flex-col gap-y-8">
                            <div className="xl:w-2/3 xl:pr-3 w-full">
                                {/* Cart Items Summary Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="heading5">Cart Items ({cartItems.length})</h2>
                                    <button
                                        onClick={() => cartItems.forEach(item => removeItem(item._id))}
                                        className="text-red text-sm hover:underline flex items-center gap-1"
                                    >
                                        <Icon.Trash size={16} />
                                        Clear Cart
                                    </button>
                                </div>
                                {/* Product List */}
                                <div className="list-product w-full">
                                    <div className='w-full'>
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
                                        <div className="list-product-main w-full mt-3">
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
                                                        className={`item flex mt-5 pb-5 border-b border-line w-full transition-colors rounded-lg md:p-4 ${isUnavailable ? 'bg-surface/50 opacity-80' : 'hover:bg-surface/50'
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
                                                                        {isUnavailable && (
                                                                            <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                                                                                {unavailableLabel}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {/* Attributes */}
                                                                    {item.selectedAttributes.length > 0 && (
                                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                                            {item.selectedAttributes.map((attr, idx) => (
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
                                                                <div className="text-title text-center font-semibold">{formatToNaira(pricing.unitPrice)}</div>
                                                            )}
                                                            {/* {hasPricingTier && (
                                                                <div className="text-[10px] text-blue-600 font-medium">
                                                                    Tier price
                                                                </div>
                                                            )} */}
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
                                                                <div className="text-button quantity font-semibold">{currentQty}</div>
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
                                                            {currentQty > 1 && (
                                                                <div className="text-xs text-secondary mt-1">
                                                                    {formatToNaira(pricing.unitPrice)} × {currentQty}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="w-1/12 flex items-center justify-center">
                                                            <button
                                                                onClick={() => removeItem(item.cartItemId)}
                                                                className="p-2 hover:bg-red/10 rounded-full transition-colors group"
                                                                title="Remove item"
                                                            >
                                                                <Icon.Trash
                                                                    className='text-xl max-md:text-base text-red group-hover:scale-110 transition-transform'
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                                {/* Discount Code Section */}
                                <div className="discount-section mt-7">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Icon.Tag className="text-xl" />
                                        <h3 className="text-title font-semibold">Apply Discount Code</h3>
                                    </div>
                                    <div className="input-block discount-code w-full h-12">
                                        <form className='w-full h-full relative' onSubmit={handleApplyManualCoupon}>
                                            <input
                                                type="text"
                                                value={manualCouponCode}
                                                onChange={(e) => setManualCouponCode(e.target.value)}
                                                placeholder='Enter discount code (e.g., NEWYEAR20)'
                                                className='w-full h-full bg-surface pl-4 pr-32 rounded-lg border border-line focus:border-black focus:outline-none transition-colors'
                                                disabled={validateCouponMutation.isPending}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!manualCouponCode.trim() || validateCouponMutation.isPending}
                                                className='button-main absolute top-1 bottom-1 right-1 px-5 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                            >
                                                {validateCouponMutation.isPending ? 'Applying...' : 'Apply Code'}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Available Coupons */}
                                {cartCoupons.length > 0 && (
                                    <div className="voucher-section mt-6">
                                        <h3 className="text-title font-semibold mb-4">Available Coupons</h3>

                                        {/* Show error if coupon validation failed */}
                                        {couponError && (
                                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                                {couponError}
                                            </div>
                                        )}

                                        {/* Show applied coupon banner */}
                                        {appliedCoupon && (
                                            <div className="mb-4 p-4 bg-lime-50 border border-lime-200 rounded-lg flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Icon.CheckCircle className="text-lime-600" size={20} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-lime-800">Coupon Applied!</p>
                                                        <p className="text-xs text-lime-600">
                                                            {appliedCoupon.coupon} - Save {formatToNaira(discountCart)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleRemoveCoupon}
                                                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}

                                        <div className="list-voucher grid md:grid-cols-3 gap-4">
                                            {couponsLoading ? (
                                                <div className="col-span-3 text-center py-8 text-secondary">
                                                    Loading coupons...
                                                </div>
                                            ) : (
                                                cartCoupons.map((coupon) => {
                                                    const isApplied = appliedCoupon?.coupon === coupon.coupon;
                                                    const meetsMinOrder = totalCart >= coupon.minOrderValue;
                                                    const discountText = coupon.discountType === 'percentage'
                                                        ? `${coupon.discount}% OFF`
                                                        : `$${coupon.discount} OFF`; return (
                                                            <div
                                                                key={coupon._id}
                                                                className={`item ${isApplied ? 'bg-lime-50 border-lime-600' : 'bg-surface'
                                                                    } border border-line rounded-xl p-4 transition-all hover:shadow-md ${isApplied ? 'ring-2 ring-lime-500' : ''
                                                                    }`}
                                                            >
                                                                <div className="flex items-start justify-between mb-3">
                                                                    <div>
                                                                        <div className="text-xs text-secondary mb-1">Discount</div>
                                                                        <div className="text-2xl font-bold text-red">{discountText}</div>
                                                                    </div>
                                                                    {coupon.minOrderValue > 0 && (
                                                                        <div className="text-right">
                                                                            <div className="text-xs text-secondary">Min. Order</div>
                                                                            <div className="font-semibold">&#8358;{coupon.minOrderValue}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="border-t border-dashed border-line pt-3 mb-3">
                                                                    <div className="text-xs font-mono bg-black/5 px-2 py-1 rounded inline-block mb-2">
                                                                        CODE: {coupon.coupon}
                                                                    </div>
                                                                    <div className="text-xs text-secondary">
                                                                        {coupon.minOrderValue > 0 ? `For orders from $${coupon.minOrderValue}` : 'No minimum order'}
                                                                    </div>
                                                                    {coupon.endDate && (
                                                                        <div className="text-xs text-secondary mt-1">
                                                                            Valid until {new Date(coupon.endDate).toLocaleDateString()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${isApplied
                                                                        ? 'bg-lime-600 text-white'
                                                                        : meetsMinOrder
                                                                            ? 'bg-black text-white hover:bg-black/90'
                                                                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                                        }`}
                                                                    onClick={() => !isApplied && meetsMinOrder && handleApplyCoupon(coupon)}
                                                                    disabled={!meetsMinOrder || validateCouponMutation.isPending || isApplied}
                                                                >
                                                                    {isApplied ? (
                                                                        <span className="flex items-center justify-center gap-1">
                                                                            <Icon.CheckCircle size={16} /> Applied
                                                                        </span>
                                                                    ) : validateCouponMutation.isPending ? (
                                                                        'Validating...'
                                                                    ) : meetsMinOrder ? (
                                                                        'Apply Coupon'
                                                                    ) : (
                                                                        `Min $${coupon.minOrderValue} required`
                                                                    )}
                                                                </button>
                                                            </div>
                                                        );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Order Summary Sidebar */}
                            <div className="xl:w-1/3 xl:pl-12 w-full">
                                <div className="checkout-block bg-surface p-6 rounded-2xl border border-line sticky top-24">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Icon.Receipt className="text-2xl" />
                                        <h3 className="heading5">Order Summary</h3>
                                    </div>

                                    {/* Price Breakdown */}
                                    <div className="space-y-4">
                                        <div className="total-block flex justify-between items-center">
                                            <div className="text-secondary">Subtotal ({cartItems.length} items)</div>
                                            <div className="text-title font-semibold">{formatToNaira(totalCart)}</div>
                                        </div>

                                        {discountCart > 0 && (
                                            <div className="discount-block flex justify-between items-center text-lime-500">
                                                <div className="flex items-center gap-1">
                                                    <Icon.Tag size={16} />
                                                    <span>Discount Applied</span>
                                                </div>
                                                <div className="font-semibold">-{formatToNaira(discountCart)}</div>
                                            </div>
                                        )}

                                        <div className="border-t border-line pt-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-1 text-secondary">
                                                    <Icon.Truck size={18} />
                                                    <span>Shipping Method</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className={`flex items-center justify-between p-2.5 md:p-3 rounded-lg border cursor-pointer transition-all ${shippingMethod === 'pickup' ? 'border-black bg-black text-white' : 'border-line hover:border-gray-400'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="ship"
                                                            checked={shippingMethod === 'pickup'}
                                                            onChange={() => setShippingMethod('pickup')}
                                                            className="w-4 h-4"
                                                        />
                                                        <div>
                                                            <div className="font-medium">Pickup</div>
                                                            <div className="text-xs text-secondary mt-0.5">Pick up from store</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-semibold">&#8358;0.00</div>
                                                </label>

                                                <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${shippingMethod === 'normal' ? 'border-black bg-black text-white' : 'border-line hover:border-gray-400'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="ship"
                                                            checked={shippingMethod === 'normal'}
                                                            onChange={() => setShippingMethod('normal')}
                                                            className="w-4 h-4"
                                                        />
                                                        <div>
                                                            <div className="font-medium">Normal Delivery</div>
                                                            <div className="text-xs text-secondary mt-0.5">Calculated at checkout</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-semibold text-secondary text-sm">TBD</div>
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
                                            <div className="flex justify-between items-center">
                                                <div className="heading5">Total</div>
                                                <div className="heading4 text-red">{formatToNaira(totalCart - discountCart)}</div>
                                            </div>
                                            {(shippingMethod === 'normal' || shippingMethod === 'express') && (
                                                <div className="text-xs text-secondary mt-2">
                                                    + Shipping (calculated at checkout)
                                                </div>
                                            )}
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
                                    <div className="block-button flex flex-col items-center gap-y-3 md:gap-y-4 mt-4 md:mt-6">
                                        <button
                                            className="checkout-btn button-main text-center w-full py-3 md:py-4 font-semibold text-base md:text-lg transition-all hover:shadow-lg flex items-center justify-center gap-2"
                                            onClick={redirectToCheckout}
                                        >
                                            <Icon.ShoppingCartSimple size={20} />
                                            Proceed To Checkout
                                        </button>
                                        <Link className="text-button hover-underline text-secondary flex items-center gap-1" href={"/shop/breadcrumb1"}>
                                            <Icon.ArrowLeft size={16} />
                                            Continue shopping
                                        </Link>
                                    </div>

                                    {/* Trust Badges */}
                                    <div className="mt-6 pt-6 border-t border-line">
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
                                                <span>24/7 Support</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div >
        </>
    );
};

export default Cart;