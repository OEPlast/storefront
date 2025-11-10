'use client';
import React, { useState, useEffect } from 'react';
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

const Cart = () => {
    const [timeLeft, setTimeLeft] = useState(countdownTime());
    const router = useRouter();

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(countdownTime());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const { items: cartItems, updateItem, removeItem, subtotal, isGuest, isLoading } = useCart();

    const handleQuantityChange = (itemId: string, newQuantity: number) => {
        updateItem(itemId, { qty: newQuantity });
    };

    const moneyForFreeship = 150;
    const [totalCart, setTotalCart] = useState<number>(0);
    const [discountCart, setDiscountCart] = useState<number>(0);
    const [shipCart, setShipCart] = useState<number>(30);
    const [applyCode, setApplyCode] = useState<number>(0);
    const [savingsAmount, setSavingsAmount] = useState<number>(0);

    // Calculate total from cart items
    useEffect(() => {
        setTotalCart(subtotal);
    }, [subtotal]);

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
        let savings = discountCart;
        if (shipCart === 0 && totalCart >= moneyForFreeship) {
            savings += 30; // Add free shipping savings
        }
        setSavingsAmount(savings);
    }, [discountCart, shipCart, totalCart, moneyForFreeship]);

    const handleApplyCode = (minValue: number, discount: number) => {
        if (totalCart >= minValue) {
            setApplyCode(minValue);
            setDiscountCart(discount);
        } else {
            alert(`Minimum order must be $${minValue}`);
        }
    };

    const redirectToCheckout = () => {
        router.push(`/checkout?discount=${discountCart}&ship=${shipCart}`);
    };

    return (
        <>
            <div id="header" className='relative w-full'>
                <Breadcrumb heading='Shopping cart' subHeading='Shopping cart' />
            </div>
            <div className="cart-block md:py-20 py-10">
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
                            <div className="inline-block p-6 bg-surface rounded-full mb-6">
                                <Icon.ShoppingCart className="text-6xl text-secondary" />
                            </div>
                            <h3 className="heading4 mb-3">Your cart is empty</h3>
                            <p className="text-secondary mb-6">Looks like you haven't added anything to your cart yet</p>
                            <Link href="/shop/breadcrumb1" className="button-main inline-block">
                                Start Shopping
                            </Link>
                        </div>
                    )}

                    {cartItems.length > 0 && (
                        <div className="content-main flex justify-between max-xl:flex-col gap-y-8">
                            <div className="xl:w-2/3 xl:pr-3 w-full">
                                {/* Progress Bar for Free Shipping */}
                                <div className="heading banner bg-surface p-5 rounded-xl mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Icon.Truck className="text-xl" />
                                            <span className="font-semibold">Shipping Progress</span>
                                        </div>
                                        {totalCart >= moneyForFreeship ? (
                                            <span className="text-green-600 font-semibold flex items-center gap-1">
                                                <Icon.CheckCircle className="text-lg" />
                                                Free Shipping Unlocked!
                                            </span>
                                        ) : (
                                            <span className="text-secondary text-sm">
                                                ${(moneyForFreeship - totalCart).toFixed(2)} away from free shipping
                                            </span>
                                        )}
                                    </div>
                                    <div className="tow-bar-block">
                                        <div
                                            className={`progress-line ${totalCart >= moneyForFreeship ? 'bg-green-500' : ''}`}
                                            style={{ width: totalCart <= moneyForFreeship ? `${(totalCart / moneyForFreeship) * 100}%` : `100%` }}
                                        ></div>
                                    </div>
                                </div>

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
                                            {cartItems.map((item) => (
                                                <div className="item flex md:mt-7 md:pb-7 mt-5 pb-5 border-b border-line w-full hover:bg-surface/50 transition-colors rounded-lg md:p-4" key={item._id}>
                                                    <div className="w-1/2">
                                                        <div className="flex items-center gap-6">
                                                            <div className="bg-img md:w-[100px] w-20 aspect-square relative group">
                                                                {item.productSnapshot.image ? (
                                                                    <Image
                                                                        src={getCdnUrl(item.productSnapshot.image)}
                                                                        width={1000}
                                                                        height={1000}
                                                                        alt={item.productSnapshot.name}
                                                                        className='w-full h-full object-cover rounded-lg'
                                                                    />
                                                                ) : (
                                                                    <div className='w-full h-full bg-gray-200 rounded-lg flex items-center justify-center'>
                                                                        <Icon.Image size={32} className="text-gray-400" />
                                                                    </div>
                                                                )}
                                                                {/* SKU Badge */}
                                                                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                                                                    SKU: {item.productSnapshot.sku}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="text-title font-semibold mb-2">{item.productSnapshot.name}</div>
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
                                                                {item.appliedDiscount && item.appliedDiscount > 0 && (
                                                                    <div className="mt-2">
                                                                        <span className="text-xs bg-red text-white px-2 py-1 rounded font-semibold">
                                                                            {item.appliedDiscount}% OFF
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="w-1/12 price flex flex-col items-center justify-center">
                                                        <div className="text-title text-center font-semibold">${item.unitPrice.toFixed(2)}</div>
                                                        {item.appliedDiscount && (
                                                            <div className="text-xs text-secondary line-through mt-1">
                                                                ${(item.unitPrice / (1 - item.appliedDiscount / 100)).toFixed(2)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="w-1/6 flex items-center justify-center">
                                                        <div className="quantity-block bg-surface md:p-3 p-2 flex items-center justify-between rounded-lg border border-line md:w-[120px] flex-shrink-0 w-24 hover:border-black transition-colors">
                                                            <Icon.Minus
                                                                onClick={() => {
                                                                    if (item.qty > 1) {
                                                                        handleQuantityChange(item._id, item.qty - 1);
                                                                    }
                                                                }}
                                                                className={`text-base max-md:text-sm cursor-pointer hover:bg-black hover:text-white rounded p-1 transition-colors ${item.qty === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            />
                                                            <div className="text-button quantity font-semibold">{item.qty}</div>
                                                            <Icon.Plus
                                                                onClick={() => handleQuantityChange(item._id, item.qty + 1)}
                                                                className='text-base max-md:text-sm cursor-pointer hover:bg-black hover:text-white rounded p-1 transition-colors'
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="w-1/6 flex flex-col items-center justify-center">
                                                        <div className="text-title text-center font-bold">${item.totalPrice.toFixed(2)}</div>
                                                        {item.qty > 1 && (
                                                            <div className="text-xs text-secondary mt-1">
                                                                ${item.unitPrice.toFixed(2)} × {item.qty}
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
                                            ))}
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
                                                <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${shipCart === 0 ? 'border-black bg-black text-white' : 'border-line hover:border-gray-400'} ${moneyForFreeship - totalCart > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            name="ship"
                                                            checked={shipCart === 0}
                                                            onChange={() => setShipCart(0)}
                                                            disabled={moneyForFreeship - totalCart > 0}
                                                            className="w-4 h-4"
                                                        />
                                                        <div>
                                                            <div className="font-medium">Free Shipping</div>
                                                            {moneyForFreeship - totalCart > 0 && (
                                                                <div className="text-xs text-secondary mt-0.5">
                                                                    Add ${(moneyForFreeship - totalCart).toFixed(2)} more
                                                                </div>
                                                            )}
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
                                                            <div className="font-medium">Local Delivery</div>
                                                            <div className="text-xs text-secondary mt-0.5">2-3 business days</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-semibold">$30.00</div>
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
                                                            <div className="font-medium">Express Shipping</div>
                                                            <div className="text-xs text-secondary mt-0.5">Next day delivery</div>
                                                        </div>
                                                    </div>
                                                    <div className="font-semibold">$40.00</div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Total Savings */}
                                        {(discountCart > 0 || (shipCart === 0 && totalCart >= moneyForFreeship)) && (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1 text-green-700">
                                                        <Icon.Sparkle size={16} />
                                                        <span className="text-sm font-medium">Total Savings</span>
                                                    </div>
                                                    <div className="text-green-700 font-bold">
                                                        ${(discountCart + (shipCart === 0 && totalCart >= moneyForFreeship ? 30 : 0)).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Grand Total */}
                                        <div className="border-t border-line pt-4">
                                            <div className="flex justify-between items-center">
                                                <div className="heading5">Total</div>
                                                <div className="heading4 text-red">${(totalCart - discountCart + shipCart).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Checkout Button */}
                                    <div className="block-button flex flex-col items-center gap-y-4 mt-6">
                                        <button
                                            className="checkout-btn button-main text-center w-full py-4 font-semibold text-lg hover:bg-black/90 transition-all hover:shadow-lg flex items-center justify-center gap-2"
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