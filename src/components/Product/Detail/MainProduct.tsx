'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ProductDetail } from '@/types/product';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, Scrollbar } from 'swiper/modules';
import 'swiper/css/bundle';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import SwiperCore from 'swiper/core';
import { useCart } from '@/context/CartContext';
import { useModalCartContext } from '@/context/ModalCartContext';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useAddToWishlist, useRemoveFromWishlist } from '@/hooks/mutations/useWishlistMutations';
import { useModalWishlistContext } from '@/context/ModalWishlistContext';
import { useCompare } from '@/context/CompareContext';
import { useModalCompareContext } from '@/context/ModalCompareContext';
import { convert as htmlToText } from 'html-to-text';
import PricingTiersHorizontal from './PricingTiersHorizontal';
import { useProduct } from '@/hooks/queries/useProduct';
import RelatedProducts from '../RelatedProducts';
import PaymentMethodsBadge from '@/components/Product/PaymentMethodsBadge';
import ReviewsList from '../Reviews/ReviewsList';
import { getCdnUrl } from '@/libs/cdn-url';
import Color from 'color';
import SalesCountdownTimer from './SalesCountdownTimer';
import ProductDescription from './ProductDescription';
import { calculateBestSale } from '@/utils/calculateSale';
import { ProductListItem } from '@/types/product';
import { OptimisticWishlistProduct } from '@/types/wishlist';
import type { ProductSale } from '@/types/product';
import {
    normalizePricingTiers,
    calculateTierBasePrice,
    findTierForQuantity,
    NormalizedPricingTier,
} from './pricingHelpers';
import LimitedProductProgress from './LimitedProductProgress';
import { formatToNaira } from '@/utils/currencyFormatter';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import { Review } from '@/hooks/queries/useProductReviews';


interface Props {
    slug: string;
}

const Sale: React.FC<Props> = ({ slug }) => {
    SwiperCore.use([Navigation, Thumbs]);
    const queryClient = useQueryClient();
    // Fetch product data using React Query
    const { data: productMain, isLoading, error } = useProduct({ slug });

    const swiperRef: any = useRef(undefined);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [openPopupImg, setOpenPopupImg] = useState(false);
    const [openSizeGuide, setOpenSizeGuide] = useState<boolean>(false);
    const [thumbsSwiper, setThumbsSwiper] = useState<SwiperCore | null>(null);
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<string | undefined>('description');
    const [quantity, setQuantity] = useState<number>(1);
    const { addToCart } = useCart();
    const { openModalCart } = useModalCartContext();

    // Zustand store for client-side wishlist state
    const isInWishlist = useWishlistStore(state => state.isInWishlist(productMain?._id || ''));
    const wishlistItems = useWishlistStore(state => state.items);
    const wishlistItem = wishlistItems.find(item => item.productId === (productMain?._id || ''));
    const wishlistItemId = wishlistItem?._id;
    const addToWishlistStore = useWishlistStore(state => state.addItem);
    const removeFromWishlistStore = useWishlistStore(state => state.removeItem);

    // React Query mutations for server sync
    const { mutate: addToWishlistMutation } = useAddToWishlist();
    const { mutate: removeFromWishlistMutation } = useRemoveFromWishlist();
    const { openModalWishlist } = useModalWishlistContext();
    const { addToCompare, removeFromCompare, compareState } = useCompare();
    const { openModalCompare } = useModalCompareContext();

    // Debounce state for wishlist toggle (must be declared before any early returns)
    const [wishlistPending, setWishlistPending] = useState(false);

    const handleAddToWishlist = useCallback(() => {
        // Prevent rapid-fire clicks
        if (wishlistPending || !productMain) return;

        setWishlistPending(true);

        // if product existed in wishlist, remove from wishlist
        if (isInWishlist) {
            // Optimistically remove from Zustand
            removeFromWishlistStore(productMain._id);

            if (wishlistItemId) {
                // Send to server
                removeFromWishlistMutation(wishlistItemId, {
                    onSuccess: () => {
                        setWishlistPending(false);
                    },
                    onError: () => {
                        // Rollback on error - re-add to Zustand
                        if (wishlistItem) {
                            addToWishlistStore(productMain._id, wishlistItem.product);
                        }
                        setWishlistPending(false);
                    },
                });
            } else {
                setWishlistPending(false);
            }
        } else {
            // Build product data for optimistic update
            const productImages = productMain.description_images || [];

            const optimisticProduct: ProductListItem = {
                _id: productMain._id,
                name: productMain.name,
                slug: productMain.slug,
                price: productMain.price,
                images: productImages.map(img => ({
                    url: img.url,
                    cover_image: img.cover_image ?? false,
                })),
                description_images: productImages.map(img => ({
                    url: img.url,
                    cover_image: img.cover_image ?? false,
                })),
                category: {
                    _id: productMain.category?._id || '',
                    name: productMain.category?.name || '',
                    image: productMain.category?.image || '',
                    slug: productMain.category?.slug || '',
                },
                stock: productMain.stock,
                originStock: productMain.originStock,
                sku: productMain.sku ?? '',
                sale: null,
            };

            // Optimistically add to Zustand
            addToWishlistStore(productMain._id, optimisticProduct);

            // Send to server (just needs productId)
            const optimisticPayload: OptimisticWishlistProduct = {
                _id: optimisticProduct._id,
                name: optimisticProduct.name,
                slug: optimisticProduct.slug,
                price: optimisticProduct.price,
                images: optimisticProduct.images,
                category: optimisticProduct.category,
                stock: optimisticProduct.stock,
                originStock: optimisticProduct.originStock,
                sku: optimisticProduct.sku,
                sale: null,
            };

            addToWishlistMutation(
                { productId: productMain._id, product: optimisticPayload },
                {
                    onSuccess: () => {
                        setWishlistPending(false);
                    },
                    onError: () => {
                        // Rollback on error - remove from Zustand
                        removeFromWishlistStore(productMain._id);
                        setWishlistPending(false);
                    },
                }
            );
            openModalWishlist();
        }
    }, [wishlistPending, productMain, isInWishlist, wishlistItemId, wishlistItem, addToWishlistStore, removeFromWishlistStore, addToWishlistMutation, removeFromWishlistMutation, openModalWishlist]);

    useEffect(() => {
        if (productMain?._id) {
            // Prefetch reviews stats
            queryClient.prefetchQuery({
                queryKey: ['reviews', 'stats', productMain._id],
                queryFn: async () => {
                    const response = await apiClient.get(api.reviews.stats(productMain._id));
                    return response.data;
                },
            });

            // Optionally prefetch reviews list too
            queryClient.prefetchQuery({
                queryKey: ['reviews', productMain._id, 1, 10, 'newest'],
                queryFn: async () => {

                    const response = await apiClient.getWithMeta<
                        Review[],
                        { nextCursor: string | null; count: number; }
                    >(`${api.reviews.byProduct(productMain._id)}?page=1&limit=10&sortBy=newest`
                    );
                    return response.data;
                },
            });
        }
    }, [productMain?._id, queryClient]);


    // Process attributes similar to Product.tsx
    const attributes = useMemo(() => {
        return productMain?.attributes || [];
    }, [productMain]);

    // Extract colors with Color package processing
    const colors = useMemo(() => {
        const colorAttr = attributes.find(
            (a) => a.name.toLowerCase() === 'color' || a.name.toLowerCase() === 'colours'
        );
        if (!colorAttr) return [] as { label: string, hex: string, value: string; }[];

        return colorAttr.children.map((child) => {
            let hex = child.name;

            try {
                // Try to parse the color and create a lighter version
                const originalColor = Color(child.name.toLowerCase());
                hex = originalColor.mix(Color('#ffffff'), 0.15).hex(); // Lighten by 15%
            } catch {
                // If color parsing fails, use colorCode if available or default light gray
                hex = (child as any).colorCode || '#E5E5E5';
            }

            return { label: child.name, hex, value: child.name };
        });
    }, [attributes]);

    // Extract non-color attributes for rendering
    const otherAttributes = useMemo(() => {
        return attributes.filter(
            (a) => a.name.toLowerCase() !== 'color' && a.name.toLowerCase() !== 'colours'
        );
    }, [attributes]);

    const normalizedTiers = useMemo<NormalizedPricingTier[]>(
        () => normalizePricingTiers((productMain?.pricingTiers as any) || []),
        [productMain?.pricingTiers]
    );

    const attributePriceOverride = useMemo(() => {
        if (!productMain?.attributes) return undefined;
        for (const attr of productMain.attributes) {
            const selectedValue = selectedAttributes[attr.name];
            if (!selectedValue) continue;
            const matchedChild = attr.children.find((child) => child.name === selectedValue);
            if (matchedChild && typeof matchedChild.price === 'number' && matchedChild.price > 0) {
                return matchedChild.price;
            }
        }
        return undefined;
    }, [productMain?.attributes, selectedAttributes]);

    const selectedSaleAttribute = useMemo(() => {
        const entry = Object.entries(selectedAttributes).find(([, value]) => Boolean(value));
        if (!entry) return undefined;
        const [name, value] = entry as [string, string];
        return { name, value };
    }, [selectedAttributes]);

    const normalizedSale = useMemo<ProductSale | null>(() => {
        if (!productMain?.sale) return null;
        const variants = productMain.sale.variants?.map((variant: any) => ({
            attributeName: variant.attributeName ?? null,
            attributeValue: variant.attributeValue ?? null,
            discount: Number(variant.discount ?? variant.percentOff ?? 0),
            amountOff: Number(variant.amountOff ?? 0),
            maxBuys: Number(variant.maxBuys ?? 0),
            boughtCount: Number(variant.boughtCount ?? 0),
        })) ?? [];

        return {
            ...productMain.sale,
            variants,
        } as ProductSale;
    }, [productMain?.sale]);

    const saleCalculation = useMemo(
        () => calculateBestSale(normalizedSale, productMain?.price ?? 0, selectedSaleAttribute),
        [normalizedSale, productMain?.price, selectedSaleAttribute]
    );

    const basePrice = productMain?.price ?? 0;
    const originalUnitPrice = attributePriceOverride ?? basePrice;

    const rawMultiplier = saleCalculation.hasActiveSale
        ? saleCalculation.percentOff > 0
            ? 1 - saleCalculation.percentOff / 100
            : basePrice > 0
                ? saleCalculation.discountedPrice / basePrice
                : 1
        : 1;

    const saleMultiplier = Math.max(0, rawMultiplier);
    const hasSale = saleCalculation.hasActiveSale && saleMultiplier < 1;
    const salePercent = hasSale ? saleCalculation.percentOff : 0;

    const discountedBasePrice = Math.max(0, originalUnitPrice * saleMultiplier);

    const currentTier = useMemo(
        () => findTierForQuantity(normalizedTiers, quantity),
        [normalizedTiers, quantity]
    );

    const tierBasePrice = currentTier
        ? calculateTierBasePrice(originalUnitPrice, currentTier)
        : originalUnitPrice;

    const currentUnitPrice = Math.max(0, tierBasePrice * saleMultiplier);
    const totalPrice = currentUnitPrice * quantity;

    // Initialize selected attributes with first option of each attribute
    useEffect(() => {
        if (attributes.length > 0 && Object.keys(selectedAttributes).length === 0) {
            const initialSelection: Record<string, string> = {};
            attributes.forEach(attr => {
                if (attr.children.length > 0) {
                    initialSelection[attr.name] = attr.children[0].name;
                }
            });
            setSelectedAttributes(initialSelection);
        }
    }, [attributes, selectedAttributes]);
    const limitedSaleStats = useMemo(() => {
        if (normalizedSale?.type !== 'Limited') return { sold: 0, total: 0 };

        const sold = normalizedSale.variants.reduce((acc, variant) => acc + (variant.boughtCount || 0), 0);
        const total = normalizedSale.variants.reduce((acc, variant) => acc + (variant.maxBuys || 0), 0);

        return { sold, total };
    }, [normalizedSale]);
    // Handle loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black"></div>
            </div>
        );
    }

    // Handle error state
    if (error || !productMain) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="text-red-600 text-xl mb-4">Failed to load product</p>
                <Link href="/shop" className="button-main">
                    Back to Shop
                </Link>
            </div>
        );
    }

    // Use productMain directly with computed properties
    const product: ProductDetail = {
        ...productMain,
        id: productMain._id,
        originPrice: originalUnitPrice,
        price: discountedBasePrice,
        type: productMain.category?.name || '',
        rate: productMain.rating || 0,
        quantityPurchase: quantity,
        // Merge specifications and dimensions into one array
        specifications: [
            ...(productMain.specifications || []),
            ...(productMain.dimension?.map(({ key, value }) => ({ key, value })) || [])
        ],
        sold: productMain.originStock - productMain.stock,
        quantity: productMain.stock,
    };

    const handleOpenSizeGuide = () => {
        setOpenSizeGuide(true);
    };

    const handleCloseSizeGuide = () => {
        setOpenSizeGuide(false);
    };

    const handleSwiper = (swiper: SwiperCore) => {
        // Do something with the thumbsSwiper instance
        setThumbsSwiper(swiper);
    };

    const handleAttributeChange = (attributeName: string, value: string) => {
        setSelectedAttributes(prev => ({
            ...prev,
            [attributeName]: value
        }));
    };

    const handleIncreaseQuantity = () => {
        const newQty = quantity + 1;
        setQuantity(newQty);
        product.quantityPurchase = newQty;
    };

    const handleDecreaseQuantity = () => {
        if (quantity > 1) {
            const newQty = quantity - 1;
            setQuantity(newQty);
            product.quantityPurchase = newQty;
        }
    };

    const handleQuantityChange = (value: string) => {
        const numValue = parseInt(value) || 0;
        const validQty = numValue <= 0 ? 1 : numValue;
        setQuantity(validQty);
        product.quantityPurchase = validQty;
    };

    const handleTierClick = (minQty: number) => {
        setQuantity(minQty);
        product.quantityPurchase = minQty;
    };

    const handleAddToCart = () => {
        if (!productMain) return;

        // Build attributes array from selected attributes (simple pass-through)
        const attributes: Array<{ name: string; value: string; }> = [];
        Object.entries(selectedAttributes).forEach(([name, value]) => {
            if (value) attributes.push({ name, value });
        });

        // Add to cart with full product and selected attributes
        addToCart(productMain, quantity, attributes);
        openModalCart();
    };


    const handleAddToCompare = () => {
        // if product existed in wishlit, remove from wishlist and set state to false
        if (compareState.compareArray.length < 3) {
            if (compareState.compareArray.some(item => item._id === product._id)) {
                removeFromCompare(product._id);
            } else {
                // else, add to wishlist and set state to true
                addToCompare(product);
            }
        } else {
            alert('Compare up to 3 products');
        }

        openModalCompare();
    };

    const handleActiveTab = (tab: string) => {
        setActiveTab(tab);
    };




    return (
        <>
            <div className="product-detail sale">
                <div className="featured-product underwear py-10">
                    <div className="container flex justify-between gap-y-6 flex-wrap">
                        <div className={`list-img md:w-1/2 md:pr-[45px] w-full md:!sticky md:top-6 md:h-fit ${openPopupImg ? 'md:z-[201]' : ''}`}>
                            <Swiper
                                slidesPerView={1}
                                spaceBetween={0}
                                thumbs={{ swiper: thumbsSwiper }}
                                modules={[Thumbs]}
                                className="mySwiper2 rounded-2xl overflow-hidden"
                            >
                                {product.description_images?.map((item: any, index: number) => (
                                    <SwiperSlide
                                        key={index}
                                        className='!w-full max-h-[75vh] lg:max-h-[82vh]'
                                        onClick={() => {
                                            swiperRef.current?.slideTo(index);
                                            setOpenPopupImg(true);
                                        }}
                                    >
                                        <Image
                                            src={getCdnUrl(item.url)}
                                            width={1000}
                                            height={1000}
                                            alt='prd-img'
                                            className='w-full object-cover h-auto'
                                        />
                                    </SwiperSlide>
                                )
                                )}
                            </Swiper>
                            <Swiper
                                onSwiper={handleSwiper}
                                spaceBetween={0}
                                slidesPerView={4}
                                freeMode={true}
                                watchSlidesProgress={true}
                                modules={[Navigation, Thumbs]}
                                className="mySwiper style-rectangle"
                            >
                                {product.description_images?.map((item: any, index: number) => (
                                    <SwiperSlide key={index}>
                                        <Image
                                            src={getCdnUrl(item.url)}
                                            width={1000}
                                            height={1300}
                                            alt='prd-img'
                                            className='w-full aspect-[3/4] object-cover rounded-xl'
                                        />
                                    </SwiperSlide>
                                ))}
                            </Swiper>
                            <div className={`popup-img ${openPopupImg ? 'open' : ''}`}>
                                <span
                                    className="close-popup-btn absolute top-4 right-4 z-[2] cursor-pointer"
                                    onClick={() => {
                                        setOpenPopupImg(false);
                                    }}
                                >
                                    <Icon.X className="text-3xl text-white" />
                                </span>
                                <Swiper
                                    spaceBetween={0}
                                    slidesPerView={1}
                                    modules={[Navigation, Thumbs]}
                                    navigation={true}
                                    loop={true}
                                    className="popupSwiper"
                                    onSwiper={(swiper) => {
                                        swiperRef.current = swiper;
                                    }}
                                >
                                    {product.description_images?.map((item: any, index: number) => (
                                        <SwiperSlide
                                            key={index}
                                            onClick={() => {
                                                setOpenPopupImg(false);
                                            }}
                                        >
                                            <Image
                                                src={getCdnUrl(item.url)}
                                                width={1000}
                                                height={1000}
                                                alt='prd-img'
                                                className='w-full aspect-[3/4] object-cover rounded-xl'
                                                onClick={(e) => {
                                                    e.stopPropagation(); // prevent
                                                }}
                                            />
                                        </SwiperSlide>
                                    ))}
                                </Swiper>
                            </div>
                        </div>
                        <div className={`product-infor ${product.stock === 0 ? 'style-out-of-stock' : ''} md:w-1/2 w-full lg:pl-[15px] md:pl-2`}>
                            <div className="flex justify-between">
                                <div>
                                    <div className="caption2 text-secondary font-semibold uppercase">{product.type}</div>
                                    <div className="heading4 mt-1">{product.name}</div>
                                </div>
                                <div
                                    className={`add-wishlist-btn w-12 h-12 flex items-center justify-center border border-line cursor-pointer rounded-xl duration-300 hover:bg-black hover:text-white ${isInWishlist ? 'active' : ''}`}
                                    onClick={handleAddToWishlist}
                                >
                                    {isInWishlist ? (
                                        <>
                                            <Icon.Heart size={24} weight='fill' className='text-white' />
                                        </>
                                    ) : (
                                        <>
                                            <Icon.Heart size={24} />
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap mt-2.5 pb-6 border-b border-line">
                                <div className="product-price heading5 font-semibold">{formatToNaira(discountedBasePrice)}</div>
                                {hasSale && (
                                    <>
                                        <div className='w-px h-4 bg-line'></div>
                                        <div className="product-origin-price font-normal text-secondary2">
                                            <del>{formatToNaira(originalUnitPrice)}</del>
                                        </div>
                                        <div className="product-sale caption2 font-semibold bg-green px-3 py-0.5 inline-block rounded-full">
                                            -{Math.round(salePercent)}%
                                        </div>
                                    </>
                                )}
                                <div className='desc text-secondary mt-3'>{htmlToText(product.description ?? '', { wordwrap: 100 })}</div>
                            </div>
                            <div className="list-action mt-6 gap-4 flex-col">
                                <SalesCountdownTimer sale={normalizedSale} salesType={productMain.sale?.type} />
                                <LimitedProductProgress
                                    sold={normalizedSale?.type === 'Limited' ? limitedSaleStats.sold : (product.sold ?? 0)}
                                    totalQuantity={normalizedSale?.type === 'Limited' ? limitedSaleStats.total : (product.quantity ?? 0)}
                                    salesType={productMain.sale?.type}
                                />

                                {/* Color Attribute - Rendered with Color package */}
                                {colors.length > 0 && (
                                    <div className="choose-color mt-5">
                                        <div className="text-title">
                                            Colors: <span className='text-title color'>{selectedAttributes['Color'] || selectedAttributes['Colour'] || ''}</span>
                                        </div>
                                        <div className="list-color flex items-center gap-2 flex-wrap mt-3">
                                            {colors.map((item, index) => (
                                                <div
                                                    className={`color-item w-12 h-12 rounded-xl duration-300 relative cursor-pointer ${(selectedAttributes['Color'] === item.label || selectedAttributes['Colour'] === item.label) ? 'active' : ''
                                                        }`}
                                                    key={index}
                                                    style={{ backgroundColor: item.hex }}
                                                    onClick={() => handleAttributeChange(
                                                        attributes.find(a => a.name.toLowerCase() === 'color' || a.name.toLowerCase() === 'colours')?.name || 'Color',
                                                        item.label
                                                    )}
                                                >
                                                    <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">
                                                        {item.label}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Other Attributes - Rendered as plain text */}
                                {otherAttributes.map((attr, attrIndex) => (
                                    <div key={attrIndex} className="choose-attribute mt-5">
                                        <div className="text-title">
                                            {attr.name}: <span className='text-title'>{selectedAttributes[attr.name] || ''}</span>
                                        </div>
                                        <div className="list-options flex items-center gap-2 flex-wrap mt-3">
                                            {attr.children.map((option, optIndex) => (
                                                <div
                                                    className={`option-item px-4 py-2 flex items-center justify-center text-button rounded-lg border border-line cursor-pointer duration-300 hover:bg-neutral-700 hover:text-white ${selectedAttributes[attr.name] === option.name ? 'active bg-black text-white' : 'bg-white'
                                                        }`}
                                                    key={optIndex}
                                                    onClick={() => handleAttributeChange(attr.name, option.name)}
                                                >
                                                    {option.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Wholesale Pricing Tiers */}
                                <PricingTiersHorizontal
                                    basePrice={originalUnitPrice}
                                    tiers={normalizedTiers}
                                    salePercent={salePercent}
                                    saleMultiplier={saleMultiplier}
                                    currentQuantity={quantity}
                                    onTierClick={handleTierClick}
                                />


                                <div className="text-title mt-5">Quantity:</div>

                                {/* Total Price Display */}
                                <div className="mt-4 p-4 bg-surface rounded-lg border border-line">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-secondary2 text-sm">Total Price</div>
                                            <div className="text-xs text-secondary2 mt-0.5">
                                                {quantity} × {formatToNaira(currentUnitPrice)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="heading5 text-black">{formatToNaira(totalPrice)}</div>
                                            {quantity > 1 && (
                                                <div className="text-xs text-secondary2 mt-0.5">
                                                    {formatToNaira(currentUnitPrice)} per unit
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="choose-quantity flex items-center lg:justify-between gap-5 gap-y-3 mt-3">
                                    <div className="quantity-block md:p-3 max-md:py-1.5 max-md:px-3 flex items-center justify-between rounded-lg border border-line sm:w-[180px] w-[120px] flex-shrink-0">
                                        <Icon.Minus
                                            size={20}
                                            onClick={handleDecreaseQuantity}
                                            className={`${quantity === 1 ? 'disabled' : ''} cursor-pointer`}
                                        />
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => handleQuantityChange(e.target.value)}
                                            className="body1 font-semibold w-16 text-center bg-transparent border-none outline-none"
                                            min="1"
                                        />
                                        <Icon.Plus
                                            size={20}
                                            onClick={handleIncreaseQuantity}
                                            className='cursor-pointer'
                                        />
                                    </div>
                                    {product.stock > 0 ? (
                                        <div onClick={handleAddToCart} className="button-main w-full text-center bg-white text-black border border-black">Add To Cart</div>
                                    ) : (
                                        <div className="button-main w-full text-center bg-surface text-secondary2 border border-line hover:bg-surface hover:text-secondary">Out Of Stock</div>
                                    )}
                                </div>


                                <div className="flex items-center lg:gap-20 gap-8 mt-5 pb-6 border-b border-line">
                                    <div className="compare flex items-center gap-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleAddToCompare(); }}>
                                        <div className="compare-btn md:w-12 md:h-12 w-10 h-10 flex items-center justify-center border border-line cursor-pointer rounded-xl duration-300 hover:bg-black hover:text-white">
                                            <Icon.ArrowsCounterClockwise className='heading6' />
                                        </div>
                                        <span>Compare</span>
                                    </div>
                                    <div className="share flex items-center gap-3 cursor-pointer">
                                        <div className="share-btn md:w-12 md:h-12 w-10 h-10 flex items-center justify-center border border-line cursor-pointer rounded-xl duration-300 hover:bg-black hover:text-white">
                                            <Icon.ShareNetwork weight='fill' className='heading6' />
                                        </div>
                                        <span>Share Products</span>
                                    </div>
                                </div><div className="more-infor mt-6">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-1">
                                            <Icon.ArrowClockwise className='body1' />
                                            <div className="text-title">Delivery & Return</div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Icon.Question className='body1' />
                                            <div className="text-title">Ask A Question</div>
                                        </div>
                                    </div>
                                    {/* <div className="flex items-center gap-1 mt-3">
                                        <Icon.Eye className='body1' />
                                        <div className="text-title">38</div>
                                        <div className="text-secondary">people viewing this product right now!</div>
                                    </div> */}
                                    <div className="flex items-center gap-1 mt-3">
                                        <div className="text-title">SKU:</div>
                                        <div className="text-secondary">{product.sku || 'N/A'}</div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-3">
                                        <div className="text-title">Categories:</div>
                                        <div className="text-secondary">{typeof product.category === 'string' ? product.category : product.category?.name || 'N/A'}</div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-3">
                                        <div className="text-title">Tag:</div>
                                        <div className="text-secondary">{product.type}</div>
                                    </div>
                                </div>
                                <PaymentMethodsBadge className="mt-7" title="Guaranteed safe checkout" />
                            </div>
                            <div className="get-it mt-6">
                                <div className="heading5">Get it today</div>
                                <div className="item flex items-center gap-3 mt-4">
                                    <div className="icon-delivery-truck text-4xl"></div>
                                    <div>
                                        <div className="text-title">Free shipping</div>
                                        <div className="caption1 text-secondary mt-1">Free shipping on orders over &#8358; 500,000.</div>
                                    </div>
                                </div>
                                <div className="item flex items-center gap-3 mt-4">
                                    <div className="icon-phone-call text-4xl"></div>
                                    <div>
                                        <div className="text-title">Support everyday</div>
                                        <div className="caption1 text-secondary mt-1">Support from 9:00 AM to 9:00 PM everyday</div>
                                    </div>
                                </div>
                                <div className="item flex items-center gap-3 mt-4">
                                    <div className="icon-return text-4xl"></div>
                                    <div>
                                        <div className="text-title">2 Day Returns</div>
                                        <div className="caption1 text-secondary mt-1">Not impressed? Get a refund. You have 2 days to break our hearts.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <hr className='w-full my-8 opacity-30' />
                <div className="desc-tab">
                    <div className="container">
                        <div className="flex items-center justify-center w-full">
                            <div className="menu-tab flex items-center md:gap-[60px] gap-8">
                                <div
                                    className={`tab-item heading5 has-line-before text-secondary2 hover:text-black duration-300 ${activeTab === 'description' ? 'active' : ''}`}
                                    onClick={() => handleActiveTab('description')}
                                >
                                    Description
                                </div>
                                <div
                                    className={`tab-item heading5 has-line-before text-secondary2 hover:text-black duration-300 ${activeTab === 'specifications' ? 'active' : ''}`}
                                    onClick={() => handleActiveTab('specifications')}
                                >
                                    Specifications
                                </div>
                                <div
                                    className={`tab-item heading5 has-line-before text-secondary2 hover:text-black duration-300 ${activeTab === 'review' ? 'active' : ''}`}
                                    onClick={() => handleActiveTab('review')}
                                >
                                    Review
                                </div>
                            </div>
                        </div>
                        <div className="desc-block mt-8">
                            <div className={`desc-item description ${activeTab === 'description' ? 'open' : ''}`}>
                                <ProductDescription description={productMain.description} />
                            </div>
                            <div className={`desc-item specifications flex items-center justify-center ${activeTab === 'specifications' ? 'open' : ''}`}>
                                <div className='lg:w-1/2 sm:w-3/4 w-full'>
                                    {product.specifications && product.specifications.length > 0 ? (
                                        product.specifications.map((spec: any, index: number) => (
                                            <div
                                                key={index}
                                                className={`item flex items-center gap-8 py-3 px-10 ${index % 2 === 0 ? 'bg-surface' : ''}`}
                                            >
                                                <div className="text-title sm:w-1/4 w-1/3 capitalize">{spec.key}</div>
                                                <p>{spec.value}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-secondary py-8">
                                            No specifications available for this product.
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={`desc-item review-block ${activeTab === 'review' ? 'open' : ''}`}>
                                <ReviewsList productId={product._id} />
                            </div>
                        </div>
                    </div>
                </div>
                <br /> <br />
                <RelatedProducts productId={product.id} limit={4} />
            </div >
        </>
    );
};

export default Sale;