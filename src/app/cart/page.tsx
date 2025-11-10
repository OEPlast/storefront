'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import MenuOne from '@/components/Header/Menu/MenuOne';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Footer from '@/components/Footer/Footer';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from '@/hooks/useCart';
import { countdownTime } from '@/store/countdownTime';
import { getCdnUrl } from '@/libs/cdn-url';
import { useSession } from 'next-auth/react';
import { useLoginModalStore } from '@/store/useLoginModalStore';
import { CartIcon } from '@/components/Icons';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import PricingTierUpgrade from '@/components/Cart/PricingTierUpgrade';
const Cart = () => {
    const [timeLeft, setTimeLeft] = useState(countdownTime());
    const router = useRouter();
    const { status } = useSession();
    const { openLoginModal } = useLoginModalStore();
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
            const qty = quantityMap[item._id] ?? item.qty;
            return sum + qty * item.unitPrice;
        }, 0);
    }, [cartItems, quantityMap]);

    useEffect(() => {
        setQuantityMap((prev) => {
            const next: Record<string, number> = {};
            let isSame = cartItems.length === Object.keys(prev).length;

            for (const item of cartItems) {
                const existing = prev[item._id];
                let value = existing;

                if (existing == null) {
                    value = item.qty;
                    isSame = false;
                } else if (existing !== item.qty) {
                    value = item.qty;
                    isSame = false;
                }

                next[item._id] = value ?? item.qty;
            }

            return isSame ? prev : next;
        });
    }, [cartItems]);

    // Debounce quantity updates to avoid flooding the cart API
    useEffect(() => {
        for (const item of cartItems) {
            const targetQty = debouncedQuantities[item._id];
            if (typeof targetQty !== 'number') {
                continue;
            }

            const normalizedQty = Math.max(1, targetQty);

            if (normalizedQty !== targetQty) {
                setQuantityMap((prev) => {
                    const current = prev[item._id] ?? item.qty;
                    if (current === normalizedQty) {
                        return prev;
                    }
                    return { ...prev, [item._id]: normalizedQty };
                });
            }

            if (normalizedQty !== item.qty && item.isAvailable !== false) {
                updateItem(item._id, { qty: normalizedQty });
            }
        }
    }, [debouncedQuantities, cartItems, updateItem]);

    const moneyForFreeship = 150;
    const [totalCart, setTotalCart] = useState<number>(0);
    const [discountCart, setDiscountCart] = useState<number>(0);
    const [shipCart, setShipCart] = useState<number>(30);
    const [applyCode, setApplyCode] = useState<number>(0);
    const [savingsAmount, setSavingsAmount] = useState<number>(0);

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

    // Handle shipping cost based on free shipping threshold
    useEffect(() => {
        if (cartItems.length === 0) {
            setShipCart(0);
        } else if (totalCart >= moneyForFreeship && shipCart !== 0) {
            // Don't automatically set to 0, let user choose
        } else if (totalCart < moneyForFreeship && cartItems.length > 0 && shipCart === 0) {
            setShipCart(30); // Default to local shipping if below threshold
        }
    }, [totalCart, cartItems.length, moneyForFreeship, shipCart]);

    // Calculate total savings
    useEffect(() => {
        setSavingsAmount(discountCart);
    }, [discountCart]);

    const handleApplyCode = (minValue: number, discount: number) => {
        if (totalCart >= minValue) {
            setApplyCode(minValue);
            setDiscountCart(discount);
        } else {
            alert(`Minimum order must be $${minValue}`);
        }
    };

    const redirectToCheckout = () => {
        // Determine shipping method type based on shipCart value
        if (status === 'unauthenticated') {

            // router.push(`/login`);
            openLoginModal();
            return;
        }
        const shippingMethod = shipCart === 0 ? 'pickup' : shipCart === 30 ? 'normal' : 'express';
        router.push(`/checkout?discount=${discountCart}&ship=${shipCart}&method=${shippingMethod}`);
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
                                                const productDetails = item.productDetails;
                                                const productSnapshot = (item as unknown as {
                                                    productSnapshot?: {
                                                        name?: string;
                                                        price?: number;
                                                        sku?: string | number;
                                                        image?: string;
                                                    };
                                                }).productSnapshot;
                                                const productName = productDetails?.name ?? productSnapshot?.name ?? 'Product';
                                                const productImagePath =
                                                    productDetails?.description_images?.find((img) => img.cover_image)?.url ??
                                                    productDetails?.description_images?.[0]?.url ??
                                                    productSnapshot?.image;
                                                const productImageUrl = productImagePath ? getCdnUrl(productImagePath) : '';
                                                const isUnavailable = item.isAvailable === false;
                                                const unavailableLabel = item.unavailableReason === 'variant_unavailable' ? 'Variant unavailable' : 'Out of stock';
                                                const currentQty = quantityMap[item._id] ?? item.qty;
                                                const displayTotal = currentQty * item.unitPrice;

                                                // Calculate pricing tier info
                                                const hasPricingTier = !!item.pricingTier;
                                                const tierDiscount = hasPricingTier ? item.pricingTier?.value : null;
                                                const tierStrategy = hasPricingTier ? item.pricingTier?.strategy : null;

                                                // Check if appliedDiscount exists
                                                const hasDiscount = item.appliedDiscount && item.appliedDiscount > 0;

                                                return (
                                                    <div
                                                        className={`item flex md:mt-7 md:pb-7 mt-5 pb-5 border-b border-line w-full transition-colors rounded-lg md:p-4 ${isUnavailable ? 'bg-surface/50 opacity-80' : 'hover:bg-surface/50'
                                                            }`}
                                                        key={item._id}
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
                                                                        {item.appliedDiscount && item.appliedDiscount > 0 && (
                                                                            <span className="text-xs bg-red text-white px-2.5 py-1 rounded font-bold uppercase tracking-wide">
                                                                                SALE {Math.round(item.appliedDiscount)}% OFF
                                                                            </span>
                                                                        )}
                                                                        {hasPricingTier && (
                                                                            <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded font-medium">
                                                                                {tierStrategy === 'percentOff' && `${tierDiscount}% Bulk`}
                                                                                {tierStrategy === 'amountOff' && `$${tierDiscount?.toFixed(2)} Off`}
                                                                                {tierStrategy === 'fixedPrice' && `Bulk Price`}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {isUnavailable && (
                                                                        <div className="mt-2 text-xs text-red-600">
                                                                            Please adjust or remove this item before checkout.
                                                                        </div>
                                                                    )}
                                                                    {/* Pricing Tier Upgrade Opportunity */}
                                                                    {!isUnavailable && productDetails?.pricingTiers && (
                                                                        <PricingTierUpgrade
                                                                            item={item}
                                                                            currentQty={currentQty}
                                                                            onQuantityChange={(newQty) => {
                                                                                setQuantityMap((prev) => ({
                                                                                    ...prev,
                                                                                    [item._id]: newQty,
                                                                                }));
                                                                            }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-1/12 price flex flex-col items-center justify-center">
                                                            {item.appliedDiscount && item.appliedDiscount > 0 ? (
                                                                <>
                                                                    <div className="text-xs text-secondary line-through">
                                                                        ${(item.unitPrice / (1 - item.appliedDiscount / 100)).toFixed(2)}
                                                                    </div>
                                                                    <div className="text-title text-center font-bold text-red mt-1">
                                                                        ${item.unitPrice.toFixed(2)}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="text-title text-center font-semibold">${item.unitPrice.toFixed(2)}</div>
                                                            )}
                                                            {hasPricingTier && (
                                                                <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                                                                    Tier price
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="w-1/6 flex items-center justify-center">
                                                            <div className="quantity-block bg-surface md:p-3 p-2 flex items-center justify-between rounded-lg border border-line md:w-[120px] flex-shrink-0 w-24 hover:border-black transition-colors">
                                                                <Icon.Minus
                                                                    onClick={() => {
                                                                        if (isUnavailable) {
                                                                            return;
                                                                        }
                                                                        setQuantityMap((prev) => {
                                                                            const previousQty = prev[item._id] ?? item.qty;
                                                                            const nextQty = Math.max(1, previousQty - 1);
                                                                            if (nextQty === previousQty) {
                                                                                return prev;
                                                                            }
                                                                            return { ...prev, [item._id]: nextQty };
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
                                                                            const previousQty = prev[item._id] ?? item.qty;
                                                                            const nextQty = previousQty + 1;
                                                                            if (nextQty === previousQty) {
                                                                                return prev;
                                                                            }
                                                                            return { ...prev, [item._id]: nextQty };
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
                                                            <div className="text-title text-center font-bold">${displayTotal.toFixed(2)}</div>
                                                            {currentQty > 1 && (
                                                                <div className="text-xs text-secondary mt-1">
                                                                    ${item.unitPrice.toFixed(2)} × {currentQty}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="w-1/12 flex items-center justify-center">
                                                            <button
                                                                onClick={() => removeItem(item._id)}
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
                                        <form className='w-full h-full relative' onSubmit={(e) => e.preventDefault()}>
                                            <input
                                                type="text"
                                                placeholder='Enter discount code (e.g., AN6810)'
                                                className='w-full h-full bg-surface pl-4 pr-32 rounded-lg border border-line focus:border-black focus:outline-none transition-colors'
                                            />
                                            <button className='button-main absolute top-1 bottom-1 right-1 px-5 rounded-lg flex items-center justify-center hover:bg-black/90 transition-colors'>
                                                Apply Code
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Available Vouchers */}
                                <div className="voucher-section mt-6">
                                    <h3 className="text-title font-semibold mb-4">Available Vouchers</h3>
                                    <div className="list-voucher grid md:grid-cols-3 gap-4">
                                        <div className={`item ${applyCode === 200 ? 'bg-green border-green-600' : 'bg-surface'} border border-line rounded-xl p-4 transition-all hover:shadow-md ${applyCode === 200 ? 'ring-2 ring-green-500' : ''}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="text-xs text-secondary mb-1">Discount</div>
                                                    <div className="text-2xl font-bold text-red">10% OFF</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-secondary">Min. Order</div>
                                                    <div className="font-semibold">$200</div>
                                                </div>
                                            </div>
                                            <div className="border-t border-dashed border-line pt-3 mb-3">
                                                <div className="text-xs font-mono bg-black/5 px-2 py-1 rounded inline-block mb-2">
                                                    CODE: AN6810
                                                </div>
                                                <div className="text-xs text-secondary">For orders from $200</div>
                                            </div>
                                            <button
                                                className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${applyCode === 200
                                                    ? 'bg-green-600 text-white'
                                                    : totalCart >= 200
                                                        ? 'bg-black text-white hover:bg-black/90'
                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                    }`}
                                                onClick={() => handleApplyCode(200, Math.floor((totalCart / 100) * 10))}
                                                disabled={totalCart < 200}
                                            >
                                                {applyCode === 200 ? (
                                                    <span className="flex items-center justify-center gap-1">
                                                        <Icon.CheckCircle size={16} /> Applied
                                                    </span>
                                                ) : totalCart >= 200 ? 'Apply Code' : 'Min $200 required'}
                                            </button>
                                        </div>

                                        <div className={`item ${applyCode === 300 ? 'bg-green border-green-600' : 'bg-surface'} border border-line rounded-xl p-4 transition-all hover:shadow-md ${applyCode === 300 ? 'ring-2 ring-green-500' : ''}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="text-xs text-secondary mb-1">Discount</div>
                                                    <div className="text-2xl font-bold text-red">15% OFF</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-secondary">Min. Order</div>
                                                    <div className="font-semibold">$300</div>
                                                </div>
                                            </div>
                                            <div className="border-t border-dashed border-line pt-3 mb-3">
                                                <div className="text-xs font-mono bg-black/5 px-2 py-1 rounded inline-block mb-2">
                                                    CODE: AN6810
                                                </div>
                                                <div className="text-xs text-secondary">For orders from $300</div>
                                            </div>
                                            <button
                                                className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${applyCode === 300
                                                    ? 'bg-green-600 text-white'
                                                    : totalCart >= 300
                                                        ? 'bg-black text-white hover:bg-black/90'
                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                    }`}
                                                onClick={() => handleApplyCode(300, Math.floor((totalCart / 100) * 15))}
                                                disabled={totalCart < 300}
                                            >
                                                {applyCode === 300 ? (
                                                    <span className="flex items-center justify-center gap-1">
                                                        <Icon.CheckCircle size={16} /> Applied
                                                    </span>
                                                ) : totalCart >= 300 ? 'Apply Code' : 'Min $300 required'}
                                            </button>
                                        </div>

                                        <div className={`item ${applyCode === 400 ? 'bg-green border-green-600' : 'bg-surface'} border border-line rounded-xl p-4 transition-all hover:shadow-md ${applyCode === 400 ? 'ring-2 ring-green-500' : ''}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="text-xs text-secondary mb-1">Discount</div>
                                                    <div className="text-2xl font-bold text-red">20% OFF</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-secondary">Min. Order</div>
                                                    <div className="font-semibold">$400</div>
                                                </div>
                                            </div>
                                            <div className="border-t border-dashed border-line pt-3 mb-3">
                                                <div className="text-xs font-mono bg-black/5 px-2 py-1 rounded inline-block mb-2">
                                                    CODE: AN6810
                                                </div>
                                                <div className="text-xs text-secondary">For orders from $400</div>
                                            </div>
                                            <button
                                                className={`w-full py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${applyCode === 400
                                                    ? 'bg-green-600 text-white'
                                                    : totalCart >= 400
                                                        ? 'bg-black text-white hover:bg-black/90'
                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                    }`}
                                                onClick={() => handleApplyCode(400, Math.floor((totalCart / 100) * 20))}
                                                disabled={totalCart < 400}
                                            >
                                                {applyCode === 400 ? (
                                                    <span className="flex items-center justify-center gap-1">
                                                        <Icon.CheckCircle size={16} /> Applied
                                                    </span>
                                                ) : totalCart >= 400 ? 'Apply Code' : 'Min $400 required'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
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
                                            <div className="text-title font-semibold">${totalCart.toFixed(2)}</div>
                                        </div>

                                        {discountCart > 0 && (
                                            <div className="discount-block flex justify-between items-center text-green-600">
                                                <div className="flex items-center gap-1">
                                                    <Icon.Tag size={16} />
                                                    <span>Discount Applied</span>
                                                </div>
                                                <div className="font-semibold">-${discountCart.toFixed(2)}</div>
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
                                                <label className={`flex items-center justify-between p-2.5 md:p-3 rounded-lg border cursor-pointer transition-all ${shipCart === 0 ? 'border-black bg-black text-white' : 'border-line hover:border-gray-400'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="ship"
                                                            checked={shipCart === 0}
                                                            onChange={() => setShipCart(0)}
                                                            className="w-4 h-4"
                                                        />
                                                        <div>
                                                            <div className="font-medium">Pickup</div>
                                                            <div className="text-xs text-secondary mt-0.5">Pick up from store</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-semibold">$0.00</div>
                                                </label>

                                                <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${shipCart === 30 ? 'border-black bg-black text-white' : 'border-line hover:border-gray-400'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="ship"
                                                            checked={shipCart === 30}
                                                            onChange={() => setShipCart(30)}
                                                            className="w-4 h-4"
                                                        />
                                                        <div>
                                                            <div className="font-medium">Normal Delivery</div>
                                                            <div className="text-xs text-secondary mt-0.5">Calculated at checkout</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-semibold text-secondary text-sm">TBD</div>
                                                </label>

                                                <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${shipCart === 40 ? 'border-black bg-black text-white' : 'border-line hover:border-gray-400'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="ship"
                                                            checked={shipCart === 40}
                                                            onChange={() => setShipCart(40)}
                                                            className="w-4 h-4"
                                                        />
                                                        <div>
                                                            <div className="font-medium">Express Delivery</div>
                                                            <div className="text-xs text-secondary mt-0.5">Fastest - Calculated at checkout</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-semibold text-secondary text-sm">TBD</div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Total Savings */}
                                        {discountCart > 0 && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1 text-green-700">
                                                        <Icon.Sparkle size={16} />
                                                        <span className="text-sm font-medium">Total Savings</span>
                                                    </div>
                                                    <div className="text-green-700 font-bold">
                                                        ${discountCart.toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        )}                                        {/* Grand Total */}
                                        <div className="border-t border-line pt-4">
                                            <div className="flex justify-between items-center">
                                                <div className="heading5">Total</div>
                                                <div className="heading4 text-red">${(totalCart - discountCart + shipCart).toFixed(2)}</div>
                                            </div>
                                        </div>
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
            <Footer />
        </>
    );
};

export default Cart;