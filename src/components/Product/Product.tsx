'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ProductDetail } from '@/types/product';
import { ProductListItem } from '@/types/product';
import { OptimisticWishlistProduct } from '@/types/wishlist';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useCart } from '@/context/CartContext';
import { useModalCartContext } from '@/context/ModalCartContext';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useAddToWishlist, useRemoveFromWishlist } from '@/hooks/mutations/useWishlistMutations';
import { useModalWishlistContext } from '@/context/ModalWishlistContext';
import { useCompare } from '@/context/CompareContext';
import { useModalCompareContext } from '@/context/ModalCompareContext';
import { useModalQuickviewContext } from '@/context/ModalQuickviewContext';
import { usePathname, useRouter } from 'next/navigation';
import Marquee from 'react-fast-marquee';
import Rate from '../Other/Rate';
import { getCdnUrl } from '@/libs/cdn-url';
import Color from 'color';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
    calculateBestSale,
    calculateSoldFromSale,
    calculateAvailableFromSale,
    calculateSaleProgress,
    shouldShowSaleMarquee,
    shouldShowSaleProgress
} from '@/utils/calculateSale';
import { ProductVariant, ProductVariantChild } from '@/types/product';
import { CheckCircleIcon } from '@phosphor-icons/react';
import { useSession } from 'next-auth/react';
import { formatToNaira } from '@/utils/currencyFormatter';
import { LazyLoadImage as Image } from 'react-lazy-load-image-component';
import Countdown from './Countdown'; // Import Countdown component

// Cart context already imported correctly at top

interface ProductProps {
    data: ProductDetail | ProductListItem;
    type: 'grid' | 'list' | 'marketplace';
}

// Type guard to check if data is ProductListItem
function isProductListItem(data: ProductDetail | ProductListItem): data is ProductListItem {
    return 'images' in data && Array.isArray(data.images);
}

/**
 * Get the CDN URL for the primary product image (cover image or first available)
 * @param product - Product data (ProductDetail or ProductListItem)
 * @returns CDN URL string (empty string if no image found)
 */
export function getProductImageCdnUrl(product: ProductDetail | ProductListItem): string {
    const imageUrl = isProductListItem(product)
        ? product.images.find((img) => img.cover_image)?.url || product.images[0]?.url || ''
        : product.description_images?.find((img) => img.cover_image)?.url || product.description_images?.[0]?.url || '';

    return getCdnUrl(imageUrl);
}

const Product: React.FC<ProductProps> = ({ data: rawData, type }) => {
    const pathname = usePathname();
    // Normalize data to ensure compatibility with legacy ProductDetail fields
    const data = useMemo<ProductDetail>(() => {
        if (isProductListItem(rawData)) {
            // Convert ProductListItem to ProductDetail for component compatibility
            return {
                ...rawData,
                id: rawData._id,
                type: '', // not used
                gender: '', // not used
                new: false, // calculated separately
                rate: rawData.rating ?? 0,
                originPrice: rawData.price,
                brand: '', // not provided in ProductListItem
                sold: rawData.originStock - rawData.stock,
                quantity: rawData.stock,
                quantityPurchase: 1,
                sizes: [], // handled via attributes
                variation: [], // handled via attributes
                description: '', // not in ProductListItem
                description_images: [], // not in ProductListItem
                action: 'add to cart',
                createdAt: '', // not in ProductListItem
                reviewStats: {
                    averageRating: 0,
                    totalReviews: 0,
                }
            } as ProductDetail;
        }
        return rawData;
    }, [rawData]);
    const [activeColor, setActiveColor] = useState<string>('');
    const [activeSize, setActiveSize] = useState<string>('');
    const [openQuickShop, setOpenQuickShop] = useState<boolean>(false);

    // PRIMARY cart (Context API - client-first with background server sync)
    const { addToCart, updateCart, items: cartItems, itemCount } = useCart();
    const { openModalCart } = useModalCartContext();

    // Zustand store for client-side wishlist state
    const isInWishlist = useWishlistStore(state => state.isInWishlist(data._id));
    const wishlistItems = useWishlistStore(state => state.items);
    const wishlistItem = wishlistItems.find(item => item.productId === data._id);
    const wishlistItemId = wishlistItem?._id;
    const addToWishlistStore = useWishlistStore(state => state.addItem);
    const removeFromWishlistStore = useWishlistStore(state => state.removeItem);

    // React Query mutations for server sync
    const { mutate: addToWishlistMutation } = useAddToWishlist();
    const { mutate: removeFromWishlistMutation } = useRemoveFromWishlist();
    const { openModalWishlist } = useModalWishlistContext();
    const { addToCompare, removeFromCompare, compareState } = useCompare();
    const { openModalCompare } = useModalCompareContext();
    const { openQuickview } = useModalQuickviewContext();
    const router = useRouter();
    const { data: session } = useSession();

    // Narrow types for optional new fields without changing global ProductDetail
    type AttrChild = { name: string; colorCode?: string; };
    type Attr = { name: string; children: AttrChild[]; };
    type WithAttributes = { attributes?: Attr[]; };
    type PackSize = { label: string; quantity: number; price?: number; enableAttributes?: boolean; };
    type WithPackSizes = { packSizes?: PackSize[]; };

    const attributes: Attr[] = useMemo(() => {
        const hasAttributes = (obj: unknown): obj is WithAttributes =>
            typeof obj === 'object' && obj !== null && 'attributes' in (obj as Record<string, unknown>);

        return hasAttributes(data) && Array.isArray((data as WithAttributes).attributes)
            ? ((data as WithAttributes).attributes as ProductVariant[])
            : [];
    }, [data]);

    const colors = useMemo(() => {
        const colorAttr = attributes.find(
            (a) => a.name.toLowerCase() === 'color' || a.name.toLowerCase() === 'colors'
        );
        if (!colorAttr) return [] as { label: string, hex: string, value: string; }[];
        return colorAttr.children.map((child) => {
            let hex = child.name;

            try {
                // Try to parse the color and create a lighter version
                const originalColor = Color(child.name.toLowerCase());
                hex = originalColor.mix(Color('#ffffff'), 0.15).hex(); // Lighten by 30%
            } catch {
                // If color parsing fails, use a default light gray
                hex = '#E5E5E5';
            }

            return { label: child.name, hex, value: child.name };
        }).splice(0, 6);
    }, [attributes]);
    const sizes = useMemo(() => {
        const sizeAttr = attributes.find(
            (a) => a.name.toLowerCase() === 'size' || a.name.toLowerCase() === 'sizes'
        );
        return sizeAttr ? sizeAttr.children.map((c) => c.name) : [];
    }, [attributes]);

    // Check if there are non-color attributes (to determine quick shop vs add to cart)
    const hasNonColorAttributes = useMemo(() => {
        return attributes.some(
            (a) => a.name.toLowerCase() !== 'color' && a.name.toLowerCase() !== 'colors'
        );
    }, [attributes]);

    const packSizes: PackSize[] = useMemo(() => {
        const hasPackSizes = (obj: unknown): obj is WithPackSizes =>
            typeof obj === 'object' && obj !== null && 'packSizes' in (obj as Record<string, unknown>);

        return hasPackSizes(data) && Array.isArray((data as WithPackSizes).packSizes)
            ? ((data as WithPackSizes).packSizes as PackSize[])
            : [];
    }, [data]);

    const singlePack = useMemo(() => {
        return packSizes.find((p) => p.label?.toLowerCase() === 'single');
    }, [packSizes]);

    // Initialize defaults for color/size when available
    useEffect(() => {
        if (!activeColor && colors.length > 0) {
            setActiveColor(colors[0].label);
        }
        if (!activeSize && sizes.length > 0) {
            setActiveSize(sizes[0]);
        }
    }, [colors, sizes, activeColor, activeSize]);

    const handleActiveColor = (item: string) => {
        setActiveColor(item);
    };

    const handleActiveSize = (item: string) => {
        setActiveSize(item);
    };

    const handleAddToCart = () => {
        // If product has pack sizes, only allow quick add when a "Single" pack exists
        if (packSizes.length > 0 && !singlePack) {
            // Redirect to PDP for selection if Single pack doesn't exist
            handleDetailProduct(data.id);
            return;
        }

        const qty = singlePack?.quantity ?? data.quantityPurchase ?? 1;

        // Build attributes array
        const attributes: Array<{ name: string; value: string; }> = [];
        if (activeColor) {
            attributes.push({ name: 'Color', value: activeColor });
        }
        if (activeSize) {
            attributes.push({ name: 'Size', value: activeSize });
        }
        console.log(data);

        // Add full product to cart with quantity and selected attributes
        addToCart(data, qty, attributes);
        openModalCart();
    };

    // Debounce state for wishlist toggle
    const [wishlistPending, setWishlistPending] = useState(false);

    const handleAddToWishlist = useCallback(() => {
        // Prevent rapid-fire clicks
        if (wishlistPending) return;

        setWishlistPending(true);

        // if product existed in wishlist, remove from wishlist
        if (isInWishlist && wishlistItemId) {
            // Optimistically remove from Zustand
            removeFromWishlistStore(data._id);

            // Send to server
            removeFromWishlistMutation(wishlistItemId, {
                onSuccess: () => {
                    setWishlistPending(false);
                },
                onError: () => {
                    // Rollback on error - re-add to Zustand
                    if (wishlistItem) {
                        addToWishlistStore(data._id, wishlistItem.product);
                    }
                    setWishlistPending(false);
                },
            });
        } else {
            // Build product data for optimistic update
            const productImages = isProductListItem(rawData)
                ? rawData.images
                : rawData.description_images || [];

            const productCategory = isProductListItem(rawData)
                ? rawData.category
                : {
                    _id: '',
                    name: '',
                    image: '',
                    slug: '',
                };

            const optimisticProduct: ProductListItem = {
                _id: data._id,
                name: data.name,
                slug: data.slug,
                price: data.price,
                images: productImages.map(img => ({
                    url: img.url,
                    cover_image: img.cover_image ?? false,
                })),
                description_images: productImages.map(img => ({
                    url: img.url,
                    cover_image: img.cover_image ?? false,
                })),
                category: {
                    _id: productCategory._id,
                    name: productCategory.name,
                    image: productCategory.image || '',
                    slug: productCategory.slug,
                },
                stock: data.stock,
                originStock: data.originStock,
                sku: data.sku!,
                sale: null,
            };

            // Optimistically add to Zustand
            addToWishlistStore(data._id, optimisticProduct);

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
                { productId: data._id, product: optimisticPayload },
                {
                    onSuccess: () => {
                        setWishlistPending(false);
                    },
                    onError: () => {
                        // Rollback on error - remove from Zustand
                        removeFromWishlistStore(data._id);
                        setWishlistPending(false);
                    },
                }
            );
        }
        if (pathname !== '/wishlist') {
            openModalWishlist();
        }
    }, [wishlistPending, isInWishlist, wishlistItemId, data, rawData, wishlistItem,
        removeFromWishlistStore, removeFromWishlistMutation, addToWishlistStore,
        addToWishlistMutation, openModalWishlist, pathname]);

    const handleAddToCompare = () => {
        // if product existed in wishlit, remove from wishlist and set state to false
        if (compareState.compareArray.length < 3) {
            if (compareState.compareArray.some(item => item._id === data._id)) {
                removeFromCompare(data._id);
            } else {
                // else, add to wishlist and set state to true
                addToCompare(data);
            }
        } else {
            alert('Compare up to 3 products');
        }

        openModalCompare();
    };

    const handleQuickviewOpen = () => {
        openQuickview(data._id || data.id);
    };

    const handleDetailProduct = (productId: string) => {
        // redirect to shop with category selected
        router.push(`/product/default?id=${productId}`);
    };

    // Calculate the best sale discount for this product
    const saleInfo = useMemo(() => {
        return calculateBestSale(data.sale, data.price);
    }, [data.sale, data.price]);


    // Calculate sold quantity from sale variants (cumulative boughtCount)
    const soldQuantity = useMemo(() => {
        return calculateSoldFromSale(data.sale);
    }, [data.sale]);

    // Calculate available quantity from sale variants (maxBuys - boughtCount)
    const availableStock = useMemo(() => {
        return calculateAvailableFromSale(data.sale);
    }, [data.sale]);

    // Calculate sold percentage based on maxBuys and boughtCount
    const percentSold = useMemo(() => {
        return calculateSaleProgress(data.sale);
    }, [data.sale]);

    // Check if should show sale marquee (isHot = true and not sold out)
    const showSaleMarquee = useMemo(() => {
        return shouldShowSaleMarquee(data.sale);
    }, [data.sale]);

    // Check if should show sold/available progress (isHot = true and not sold out)
    const showSaleProgress = useMemo(() => {
        return shouldShowSaleProgress(data.sale);
    }, [data.sale]);

    const isNewProduct = useMemo(() => {
        if (saleInfo.hasActiveSale) return false;
        const daysSinceCreation = new Date().getTime() - new Date(data.createdAt!).getTime() / (24 * 60 * 60 * 1000);
        const isNew = daysSinceCreation <= 5;
        return isNew;
    }, [saleInfo.hasActiveSale, data.createdAt]);

    // Check if should show flash sale countdown
    const showFlashSaleCountdown = useMemo(() => {
        if (!data.sale || data.sale.type !== 'Flash' || !data.sale.startDate || !data.sale.endDate) return false;
        const now = new Date();
        const start = new Date(data.sale.startDate);
        const end = new Date(data.sale.endDate);
        return now >= start && now <= end;
    }, [data.sale]);


    return (
        <>
            {type === "grid" ? (
                <div className={`product-item grid-type ${colors.length > 0 ? 'has-colors' : ''}`}>
                    {/* <Link href={`/product/${data.slug}`} className="product-main cursor-pointer block"> */}
                    <div className="product-main cursor-pointer block">
                        <div className="product-thumb bg-white relative overflow-hidden rounded-2xl  outline outline-1 outline-line">
                            {isNewProduct && (
                                <div className="product-tag text-button-uppercase bg-green px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                                    New
                                </div>
                            )}
                            {saleInfo.hasActiveSale && (
                                <div className="product-tag text-button-uppercase text-white bg-red px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                                    Sale
                                </div>
                            )}
                            <div className="list-action-right absolute top-3 right-3 max-lg:hidden">
                                {/* {session?.user && ( */}
                                <div
                                    className={`add-wishlist-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative mb-2 ${isInWishlist ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToWishlist();
                                    }}
                                >
                                    <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Add To Wishlist</div>
                                    {isInWishlist ? (
                                        <>
                                            <Icon.Heart size={18} weight='fill' className='text-white' />
                                        </>
                                    ) : (
                                        <>
                                            <Icon.Heart size={18} />
                                        </>
                                    )}
                                </div>
                                {/* )} */}
                                <div
                                    className={`compare-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative ${session?.user ? 'mt-2' : ''} ${compareState.compareArray.some(item => item._id === data._id) ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToCompare();
                                    }}
                                >
                                    <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Compare Product</div>
                                    <Icon.Repeat size={18} className='compare-icon' />
                                    <Icon.CheckCircle size={20} className='checked-icon' />
                                </div>
                            </div>
                            <Link href={`/product/${data.slug}`} prefetch className="product-img w-full h-full aspect-[3/4] block">
                                <Image
                                    effect={'blur'}
                                    placeholderSrc={`${getProductImageCdnUrl(rawData)}?class=minify`}
                                    src={getProductImageCdnUrl(rawData)}
                                    alt={data.name}
                                    wrapperProps={
                                        {
                                            style: { transitionDelay: '0.5s' }
                                        }
                                    }
                                    className='w-full h-full object-cover duration-700'
                                    wrapperClassName='w-full h-full object-cover duration-700'
                                />
                                {/* {activeColor ? (
                                    <>
                                        {
                                        }
                                    </>
                                ) : (
                                    <>
                                        {
                                            data.thumbImage.map((img, index) => (
                                                <Image
                                                    key={index}
                                                    src={img}
                                                    width={500}
                                                    height={500}
                                                    priority={true}
                                                    alt={data.name}
                                                    className='w-full h-full object-cover duration-700'
                                                />
                                            ))
                                        }
                                    </>
                                )} */}
                            </Link>
                            {showSaleMarquee && (
                                <>
                                    <Marquee className='banner-sale-auto bg-black absolute bottom-0 left-0 w-full py-1.5'>
                                        <div className={`caption2 font-semibold uppercase text-white px-2.5`}>Hot Sale {saleInfo.percentOff}% OFF</div>
                                        <Icon.Lightning weight='fill' className='text-red' />
                                        <div className={`caption2 font-semibold uppercase text-white px-2.5`}>Hot Sale {saleInfo.percentOff}% OFF</div>
                                        <Icon.Lightning weight='fill' className='text-red' />
                                        <div className={`caption2 font-semibold uppercase text-white px-2.5`}>Hot Sale {saleInfo.percentOff}% OFF</div>
                                        <Icon.Lightning weight='fill' className='text-red' />
                                        <div className={`caption2 font-semibold uppercase text-white px-2.5`}>Hot Sale {saleInfo.percentOff}% OFF</div>
                                        <Icon.Lightning weight='fill' className='text-red' />
                                        <div className={`caption2 font-semibold uppercase text-white px-2.5`}>Hot Sale {saleInfo.percentOff}% OFF</div>
                                        <Icon.Lightning weight='fill' className='text-red' />
                                    </Marquee>
                                </>
                            )}
                            <div className="list-action grid gap-3 px-3 absolute w-full bottom-5 max-lg:hidden"
                                style={{
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 105px), 1fr))'
                                }}
                            >
                                <div
                                    className="quick-view-btn w-full text-button-uppercase py-2 text-center rounded-full duration-300 bg-white hover:bg-black hover:text-white whitespace-nowrap"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickviewOpen();
                                    }}
                                >
                                    Quick View
                                </div>
                                {!hasNonColorAttributes ? (
                                    data.stock > 0 ? (<div
                                        className="add-cart-btn w-full text-button-uppercase py-2 px-0.5 text-center rounded-full duration-500 bg-white hover:bg-black hover:text-white cursor-pointer whitespace-nowrap"
                                        onClick={e => {
                                            e.stopPropagation();
                                            handleAddToCart();
                                        }}
                                    >
                                        Add To Cart
                                    </div>) : (
                                        <div className="add-cart-btn w-full text-button-uppercase py-2 px-0.5 text-center rounded-full duration-500 bg-surface/90 text-secondary2 border border-line whitespace-nowrap text-xs">Out Of Stock</div>

                                    )
                                ) : (
                                    <>
                                        <div
                                            className="quick-shop-btn text-button-uppercase py-2 text-center rounded-full duration-500 bg-white hover:bg-black hover:text-white whitespace-nowrap"
                                            onClick={e => {
                                                e.stopPropagation();
                                                setOpenQuickShop(!openQuickShop);
                                            }}
                                        >
                                            Quick Shop
                                        </div>
                                        <div
                                            className={`quick-shop-block absolute left-4 right-4 bg-white p-4 rounded-[20px] ${openQuickShop ? 'open' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            {sizes.length > 0 && (
                                                <div className="list-size flex items-center justify-center flex-wrap gap-2">
                                                    {sizes.map((item, index) => (
                                                        <div
                                                            className={`size-item ${item !== 'freesize' ? 'w-10 h-10' : 'h-10 px-4'} flex items-center justify-center text-button bg-white rounded-full border border-line ${activeSize === item ? 'active' : ''}`}
                                                            key={index}
                                                            onClick={() => handleActiveSize(item)}
                                                        >
                                                            {item}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {data.stock > 0 ? (
                                                <div
                                                    className="button-main w-full text-center rounded-full py-3 mt-4 cursor-pointer"
                                                    onClick={() => {
                                                        handleAddToCart();
                                                        setOpenQuickShop(false);
                                                    }}
                                                >
                                                    Add To cart
                                                </div>) : (
                                                <div className="button-main w-full text-center rounded-full py-3 mt-4 bg-surface/90 text-secondary2 border border-line">Out Of Stock</div>

                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="list-action-icon flex items-center justify-center gap-2 absolute w-full bottom-3 z-[1] lg:hidden">
                                <div
                                    className="quick-view-btn w-9 h-9 flex items-center justify-center rounded-lg duration-300 bg-white hover:bg-black hover:text-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickviewOpen();
                                    }}
                                >
                                    <Icon.Eye className='text-lg' />
                                </div>
                                <div
                                    className="add-cart-btn w-9 h-9 flex items-center justify-center rounded-lg duration-300 bg-white hover:bg-black hover:text-white"
                                    onClick={e => {
                                        e.stopPropagation();
                                        handleAddToCart();
                                    }}
                                >
                                    <Icon.ShoppingBagOpen className='text-lg' />
                                </div>
                            </div>
                        </div>
                        <div className="product-infor mt-4 lg:mb-7">
                            {showSaleProgress && (
                                <div className="product-sold pb-2">
                                    <div className="progress bg-line h-[3px] md:h-[5px] w-full rounded-full overflow-hidden relative">
                                        <div
                                            className={`progress-sold bg-red absolute left-0 top-0 h-full`}
                                            style={{ width: `${percentSold}%` }}
                                        >
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 gap-y-1 flex-wrap mt-1">
                                        <div className="text-button-uppercase hidden xxs:block">
                                            <span className='text-secondary2 text-sm lg:text-base font-medium'>Sold: </span>
                                            <span className='text-sm lg:text-base'>{soldQuantity}</span>
                                        </div>
                                        <div className="text-button-uppercase">
                                            <span className='text-secondary2 text-sm lg:text-base font-medium'>Available: </span>
                                            <span className='text-sm lg:text-base'>{availableStock}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showFlashSaleCountdown && data.sale?.endDate && (
                                <Countdown endDate={data.sale.endDate} />
                            )}

                            <div className='w-full relative '>
                                <Link href={`/product/${data.slug}`} prefetch className="product-name text-title duration-300 hover-underline-animation cursor-pointer">{data.name}</Link>
                                {colors.length > 0 && (
                                    <div className="list-color py-2 max-md:hidden flex items-center gap-3 flex-wrap duration-500">
                                        {colors.map((item, index) => (
                                            <div
                                                key={index}
                                                className={`color-item rounded-full duration-300 relative w-7 h-7  ${activeColor === item.value ? 'active' : 'outline outline-[0.6px] outline-gray-200'}`}
                                                style={{ backgroundColor: item.hex }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleActiveColor(item.value);
                                                }}>
                                                {activeColor === item.value ?
                                                    <>
                                                        <CheckCircleIcon className="text-gray-300 w-4 h-4 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                                    </> : null
                                                }
                                                <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">{item.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>


                            <div className="product-price-block flex items-center gap-2 flex-wrap mt-0.5 duration-300 relative z-[1]">
                                {saleInfo.hasActiveSale ? (
                                    <>
                                        <div className="product-price text-title">{formatToNaira(saleInfo.discountedPrice)}</div>
                                        <div className="product-origin-price caption1 text-secondary2"><del>{formatToNaira(saleInfo.originalPrice)}</del></div>
                                        <div className="product-sale text-xs lg:text-sm font-medium bg-green px-1.5 md:px-2 py-0.5 inline-block rounded-full">
                                            -{saleInfo.percentOff}%
                                        </div>
                                    </>
                                ) : (
                                    <div className="product-price text-title">{formatToNaira(data.price)}</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null
            }


        </>
    );
};

export default Product;



/*


(
                <>
                    {type === "list" ? (
                        <>
                            <div className="product-item list-type">
                                <div className="product-main cursor-pointer flex lg:items-center sm:justify-between gap-7 max-lg:gap-5">
                                    <div onClick={() => handleDetailProduct(data.id)} className="product-thumb bg-white relative overflow-hidden rounded-2xl block max-sm:w-1/2">
                                        {data.new && (
                                            <div className="product-tag text-button-uppercase bg-green px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                                                New
                                            </div>
                                        )}
                                        {saleInfo.hasActiveSale && (
                                            <div className="product-tag text-button-uppercase text-white bg-red px-3 py-0.5 inline-block rounded-full absolute top-3 left-3 z-[1]">
                                                Sale
                                            </div>
                                        )}
                                        <div className="product-img w-full aspect-[3/4] rounded-2xl overflow-hidden">
                                            {data.images.map((img, index) => (
                                                <Image
                                                    key={index}
                                                    src={getCdnUrl(img.url)}
                                                    width={500}
                                                    height={500}
                                                    priority={true}
                                                    alt={data.name}
                                                    className='w-full h-full object-cover duration-700'
                                                />
                                            ))}
                                        </div>
                                        <div className="list-action px-5 absolute w-full bottom-5 max-lg:hidden">
                                            <div
                                                className={`quick-shop-block absolute left-4 right-4 bg-white p-4 rounded-[20px] ${openQuickShop ? 'open' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                }}
                                            >
                                                <div className="list-size flex items-center justify-center flex-wrap gap-2">
                                                    {data.sizes.map((item, index) => (
                                                        <div
                                                            className={`size-item ${item !== 'freesize' ? 'w-10 h-10' : 'h-10 px-4'} flex items-center justify-center text-button bg-white rounded-full border border-line ${activeSize === item ? 'active' : ''}`}
                                                            key={index}
                                                            onClick={() => handleActiveSize(item)}
                                                        >
                                                            {item}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div
                                                    className="button-main w-full text-center cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddToCart();
                                                    }}
                                                >
                                                    Add To cart
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='flex sm:items-center gap-7 max-lg:gap-4 max-lg:flex-wrap max-lg:w-full max-sm:flex-col max-sm:w-1/2'>
                                        <div className="product-infor max-sm:w-full">
                                            <div onClick={() => handleDetailProduct(data.id)} className="product-name heading6 inline-block duration-300">{data.name}</div>
                                            <div className="product-price-block flex items-center gap-2 flex-wrap mt-2 duration-300 relative z-[1]">
                                                {saleInfo.hasActiveSale ? (
                                                    <>
                                                        <div className="product-price text-title">{formatPrice(saleInfo.discountedPrice)}</div>
                                                        <div className="product-origin-price caption1 text-secondary2"><del>{formatPrice(saleInfo.originalPrice)}</del></div>
                                                        <div className="product-sale caption1 font-medium bg-green px-3 py-0.5 inline-block rounded-full">
                                                            -{saleInfo.percentOff}%
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="product-price text-title">{formatPrice(data.price)}</div>
                                                )}
                                            </div>
                                            {data.variation.length > 0 && data.action === 'add to cart' ? (
                                                <div className="list-color max-md:hidden py-2 mt-5 mb-1 flex items-center gap-3 flex-wrap duration-300">
                                                    {data.variation.map((item, index) => (
                                                        <div
                                                            key={index}
                                                            className={`color-item w-8 h-8 rounded-full duration-300 relative`}
                                                            style={{ backgroundColor: `${item.colorCode}` }}
                                                        >
                                                            <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">{item.color}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <>
                                                    {data.variation.length > 0 && data.action === 'quick shop' ? (
                                                        <>
                                                            <div className="list-color flex items-center gap-2 flex-wrap mt-5">
                                                                {data.variation.map((item, index) => (
                                                                    <div
                                                                        className={`color-item w-12 h-12 rounded-xl duration-300 relative ${activeColor === item.color ? 'active' : ''}`}
                                                                        key={index}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleActiveColor(item.color);
                                                                        }}
                                                                    >
                                                                        <Image
                                                                            src={item.colorImage}
                                                                            width={100}
                                                                            height={100}
                                                                            alt='color'
                                                                            priority={true}
                                                                            className='rounded-xl'
                                                                        />
                                                                        <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">
                                                                            {item.color}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <></>
                                                    )}
                                                </>
                                            )}
                                            <div className='text-secondary desc mt-5 max-sm:hidden'>{data.description}</div>
                                        </div>
                                        <div className="action w-fit flex flex-col items-center justify-center">
                                            <div
                                                className="quick-shop-btn button-main whitespace-nowrap py-2 px-9 max-lg:px-5 rounded-full bg-white text-black border border-black hover:bg-black hover:text-white"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setOpenQuickShop(!openQuickShop);
                                                }}
                                            >
                                                Quick Shop
                                            </div>
                                            <div className="list-action-right flex items-center justify-center gap-3 mt-4">
                                                <div
                                                    className={`add-wishlist-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative ${isInWishlist ? 'active' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddToWishlist();
                                                    }}
                                                >
                                                    <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Add To Wishlist</div>
                                                    {isInWishlist ? (
                                                        <>
                                                            <Icon.Heart size={18} weight='fill' className='text-white' />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Icon.Heart size={18} />
                                                        </>
                                                    )}
                                                </div>
                                                <div
                                                    className={`compare-btn w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative ${compareState.compareArray.some(item => item._id === data._id) ? 'active' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddToCompare();
                                                    }}
                                                >
                                                    <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Compare Product</div>
                                                    <Icon.ArrowsCounterClockwise size={18} className='compare-icon' />
                                                    <Icon.CheckCircle size={20} className='checked-icon' />
                                                </div>
                                                <div
                                                    className="quick-view-btn-list w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white duration-300 relative"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleQuickviewOpen();
                                                    }}
                                                >
                                                    <div className="tag-action bg-black text-white caption2 px-1.5 py-0.5 rounded-sm">Quick View</div>
                                                    <Icon.Eye size={18} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <></>
                    )}
                </>
            )
----------------------

            {type === 'marketplace' ? (
                <div className="product-item style-marketplace p-4 border border-line rounded-2xl" onClick={() => handleDetailProduct(data.id)}>
                    <div className="bg-img relative w-full">
                        <Image className='w-full aspect-square' width={5000} height={5000} src={getCdnUrl(data.images.find((img) => img.cover_image)!.url)} alt="img" />
                        <div className="list-action flex flex-col gap-1 absolute top-0 right-0">
                            {session?.user && (
                                <span
                                    className={`add-wishlist-btn w-8 h-8 bg-white flex items-center justify-center rounded-full box-shadow-sm duration-300 ${isInWishlist ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToWishlist();
                                    }}
                                >
                                    {isInWishlist ? (
                                        <>
                                            <Icon.Heart size={18} weight='fill' className='text-white' />
                                        </>
                                    ) : (
                                        <>
                                            <Icon.Heart size={18} />
                                        </>
                                    )}
                                </span>
                            )}
                            <span
                                className={`compare-btn w-8 h-8 bg-white flex items-center justify-center rounded-full box-shadow-sm duration-300 ${compareState.compareArray.some(item => item._id === data._id) ? 'active' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCompare();
                                }}
                            >
                                <Icon.Repeat size={18} className='compare-icon' />
                                <Icon.CheckCircle size={20} className='checked-icon' />
                            </span>
                            <span
                                className="quick-view-btn w-8 h-8 bg-white flex items-center justify-center rounded-full box-shadow-sm duration-300"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickviewOpen();
                                }}
                            >
                                <Icon.Eye />
                            </span>
                            <span
                                className="add-cart-btn w-8 h-8 bg-white flex items-center justify-center rounded-full box-shadow-sm duration-300"
                                onClick={e => {
                                    e.stopPropagation();
                                    handleAddToCart();
                                }}
                            >
                                <Icon.ShoppingBagOpen />
                            </span>
                        </div>
                    </div>
                    <div className="product-infor mt-4">
                        <span className="text-title">{data.name}</span>
                        <div className="flex gap-0.5 mt-1">
                            <Rate currentRate={data.rate} size={16} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {saleInfo.hasActiveSale ? (
                                <>
                                    <span className="text-title inline-block">{formatPrice(saleInfo.discountedPrice)}</span>
                                    <span className="text-secondary2 line-through text-sm">{formatPrice(saleInfo.originalPrice)}</span>
                                </>
                            ) : (
                                <span className="text-title inline-block">{formatPrice(data.price)}</span>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <></>
            )}

            */