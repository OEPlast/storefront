'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { ProductDetail } from '@/types/product';
import { useModalCartContext } from '@/context/ModalCartContext';
import { countdownTime } from '@/store/countdownTime';
import CountdownTimeType from '@/types/CountdownType';
import { useCart, useCartCount } from '@/context/CartContext';
import { calculateCartItemPricing } from '@/utils/cart-pricing';
import { getCdnUrl } from '@/libs/cdn-url';
import { TrashIcon } from '@phosphor-icons/react';
import { formatToNaira } from '@/utils/currencyFormatter';

const ModalCart = ({ serverTimeLeft }: { serverTimeLeft: CountdownTimeType; }) => {
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

            const productImageUrl = productImagePath ? getCdnUrl(productImagePath) : '/images/placeholder.png';

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

    let moneyForFreeship = 150;

    // Calculate total from cart items with render-time pricing
    const totalCart = React.useMemo(() => {
        return cartItems.reduce((sum, item) => {
            const pricing = calculateCartItemPricing(item);
            return sum + pricing.totalPrice;
        }, 0);
    }, [cartItems]);

    return (
        <>
            <div className={`modal-cart-block`} onClick={closeModalCart}>
                <div
                    className={`modal-cart-main flex ${isModalOpen ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation(); }}
                >

                    <div className="right cart-block w-full py-6 relative overflow-hidden">
                        <div className="heading px-6 pb-3 flex items-center justify-between relative">
                            <div className="heading5">Shopping Cart</div>
                            <div
                                className="close-btn absolute right-6 top-0 w-6 h-6 rounded-full bg-surface flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                                onClick={closeModalCart}
                            >
                                <Icon.X size={14} />
                            </div>
                        </div>
                        <div className="heading banner mt-3 px-6">
                            <div className="text">Buy <span className="text-button"> $<span className="more-price">{moneyForFreeship - totalCart > 0 ? (moneyForFreeship - totalCart) : 0}</span>.00 </span>
                                <span>more to get </span>
                                <span className="text-button">freeship</span></div>
                            <div className="tow-bar-block mt-3">
                                <div
                                    className="progress-line"
                                    style={{ width: totalCart <= moneyForFreeship ? `${(totalCart / moneyForFreeship) * 100}%` : `100%` }}
                                ></div>
                            </div>
                        </div>
                        <div className='flex flex-col h-[91%]'>
                            <div className="list-product px-6 !max-h-none flex-1">
                                {cartItems.length === 0 ? (
                                    <div className="text-center py-10 text-secondary">
                                        <Icon.ShoppingCart className="text-5xl mx-auto mb-3" />
                                        <p className="text-button">Your cart is empty</p>
                                    </div>
                                ) : (
                                    displayItems.map((item) => {
                                        return (
                                            <div key={item.id} className='item py-5 flex items-center justify-between gap-3 border-b border-line'>
                                                <div className="infor flex items-center gap-3 w-full">
                                                    <div className="bg-img w-[100px] aspect-square flex-shrink-0 rounded-lg overflow-hidden">
                                                        <Image
                                                            src={item.imageUrl}
                                                            width={120}
                                                            height={120}
                                                            alt={item.name}
                                                            loading="eager"
                                                            priority
                                                            className='w-full h-full object-cover'
                                                        />
                                                    </div>
                                                    <div className='w-full'>
                                                        {/* Sales Badge and Pricing Tier Indicator */}
                                                        {(item.hasSale || item.hasPricingTier) && (
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                {item.hasSale && (
                                                                    <span className="px-1.5 bg-red-600 text-white text-[10px] font-semibold rounded flex">
                                                                        <span className='hidden md:block text-[10px]'>SALE-</span>{item.salePercentage}%
                                                                    </span>
                                                                )}
                                                                {item.hasPricingTier && (
                                                                    <span className="px-1.5 rounded text-[10px] font-semibold text-white bg-blue-600">Bulk Deals</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between w-full">
                                                            <Link href={item.slug} className="name text-button hover:underline">{item.name}</Link>
                                                            <div
                                                                className="remove-cart-btn caption1 font-semibold  underline cursor-pointer group hover:bg-red p-1.5 rounded-full outline outline-gray-100"
                                                                onClick={() => removeItem(item.cartItemId)}
                                                            >
                                                                <TrashIcon className='!text-red-400 group-hover:!text-white' />
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-2 mt-3 w-full">
                                                            <div className="flex items-center gap-2 text-secondary2 capitalize">
                                                                <span>Qty: {item.qty}</span>
                                                                {item.attrs && item.attrs.length > 0 && (
                                                                    <span className="text-xs">({item.attrs})</span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                {/* Total Price (qty × unit price) */}
                                                                <div className="text-title font-bold text-lg">
                                                                    {formatToNaira(item.totalPrice)}
                                                                </div>
                                                                {/* Unit prices with slash if discounted */}
                                                                <div className="flex items-center gap-2">
                                                                    {item.hasDiscount && (
                                                                        <span className="text-secondary2 line-through text-xs">
                                                                            {formatToNaira(item.originalPrice)}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-secondary text-xs">
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
                            <div className="footer-modal bg-white  w-full flex-shrink-0 ">
                                <div className="flex items-center justify-center lg:gap-14 gap-8 px-6 py-4 border-b border-line">
                                    <div
                                        className="item flex items-center gap-3 cursor-pointer"
                                        onClick={() => handleActiveTab('note')}
                                    >
                                        <Icon.NotePencil className='text-xl' />
                                        <div className="caption1">Note</div>
                                    </div>
                                    <div
                                        className="item flex items-center gap-3 cursor-pointer"
                                        onClick={() => handleActiveTab('shipping')}
                                    >
                                        <Icon.Truck className='text-xl' />
                                        <div className="caption1">Shipping</div>
                                    </div>
                                    <div
                                        className="item flex items-center gap-3 cursor-pointer"
                                        onClick={() => handleActiveTab('coupon')}
                                    >
                                        <Icon.Tag className='text-xl' />
                                        <div className="caption1">Coupon</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-6 px-6">
                                    <div className="heading5">Subtotal</div>
                                    <div className="heading5">{formatToNaira(totalCart)}</div>
                                </div>
                                <div className="block-button text-center p-6">
                                    <div className="flex items-center gap-4">
                                        <Link
                                            href={'/cart'}
                                            className='button-main basis-1/2 bg-white border border-black text-black text-center uppercase'
                                            onClick={closeModalCart}
                                        >
                                            View cart
                                        </Link>
                                        <Link
                                            href={'/checkout'}
                                            className='button-main basis-1/2 text-center uppercase'
                                            onClick={closeModalCart}
                                        >
                                            Check Out
                                        </Link>
                                    </div>
                                    <div onClick={closeModalCart} className="text-button-uppercase mt-4 text-center has-line-before cursor-pointer inline-block">Or continue shopping</div>
                                </div>
                                <div className={`tab-item note-block ${activeTab === 'note' ? 'active' : ''}`}>
                                    <div className="px-6 py-4 border-b border-line">
                                        <div className="item flex items-center gap-3 cursor-pointer">
                                            <Icon.NotePencil className='text-xl' />
                                            <div className="caption1">Note</div>
                                        </div>
                                    </div>
                                    <div className="form pt-4 px-6">
                                        <textarea name="form-note" id="form-note" rows={4} placeholder='Add special instructions for your order...' className='caption1 py-3 px-4 bg-surface border-line rounded-md w-full'></textarea>
                                    </div>
                                    <div className="block-button text-center pt-4 px-6 pb-6">
                                        <div className='button-main w-full text-center' onClick={() => setActiveTab('')}>Save</div>
                                        <div onClick={() => setActiveTab('')} className="text-button-uppercase mt-4 text-center has-line-before cursor-pointer inline-block">Cancel</div>
                                    </div>
                                </div>
                                <div className={`tab-item note-block ${activeTab === 'shipping' ? 'active' : ''}`}>
                                    <div className="px-6 py-4 border-b border-line">
                                        <div className="item flex items-center gap-3 cursor-pointer">
                                            <Icon.Truck className='text-xl' />
                                            <div className="caption1">Estimate shipping rates</div>
                                        </div>
                                    </div>
                                    <div className="form pt-4 px-6">
                                        <div className="">
                                            <label htmlFor='select-country' className="caption1 text-secondary">Country/region</label>
                                            <div className="select-block relative mt-2">
                                                <select
                                                    id="select-country"
                                                    name="select-country"
                                                    className='w-full py-3 pl-5 rounded-xl bg-white border border-line'
                                                    defaultValue={'Country/region'}
                                                >
                                                    <option value="Country/region" disabled>Country/region</option>
                                                    <option value="France">France</option>
                                                    <option value="Spain">Spain</option>
                                                    <option value="UK">UK</option>
                                                    <option value="USA">USA</option>
                                                </select>
                                                <Icon.CaretDown size={12} className='absolute top-1/2 -translate-y-1/2 md:right-5 right-2' />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <label htmlFor='select-state' className="caption1 text-secondary">State</label>
                                            <div className="select-block relative mt-2">
                                                <select
                                                    id="select-state"
                                                    name="select-state"
                                                    className='w-full py-3 pl-5 rounded-xl bg-white border border-line'
                                                    defaultValue={'State'}
                                                >
                                                    <option value="State" disabled>State</option>
                                                    <option value="Paris">Paris</option>
                                                    <option value="Madrid">Madrid</option>
                                                    <option value="London">London</option>
                                                    <option value="New York">New York</option>
                                                </select>
                                                <Icon.CaretDown size={12} className='absolute top-1/2 -translate-y-1/2 md:right-5 right-2' />
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <label htmlFor='select-code' className="caption1 text-secondary">Postal/Zip Code</label>
                                            <input className="border-line px-5 py-3 w-full rounded-xl mt-3" id="select-code" type="text" placeholder="Postal/Zip Code" />
                                        </div>
                                    </div>
                                    <div className="block-button text-center pt-4 px-6 pb-6">
                                        <div className='button-main w-full text-center' onClick={() => setActiveTab('')}>Calculator</div>
                                        <div onClick={() => setActiveTab('')} className="text-button-uppercase mt-4 text-center has-line-before cursor-pointer inline-block">Cancel</div>
                                    </div>
                                </div>
                                <div className={`tab-item note-block ${activeTab === 'coupon' ? 'active' : ''}`}>
                                    <div className="px-6 py-4 border-b border-line">
                                        <div className="item flex items-center gap-3 cursor-pointer">
                                            <Icon.Tag className='text-xl' />
                                            <div className="caption1">Add A Coupon Code</div>
                                        </div>
                                    </div>
                                    <div className="form pt-4 px-6">
                                        <div className="">
                                            <label htmlFor='select-discount' className="caption1 text-secondary">Enter Code</label>
                                            <input className="border-line px-5 py-3 w-full rounded-xl mt-3" id="select-discount" type="text" placeholder="Discount code" />
                                        </div>
                                    </div>
                                    <div className="block-button text-center pt-4 px-6 pb-6">
                                        <div className='button-main w-full text-center' onClick={() => setActiveTab('')}>Apply</div>
                                        <div onClick={() => setActiveTab('')} className="text-button-uppercase mt-4 text-center has-line-before cursor-pointer inline-block">Cancel</div>
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