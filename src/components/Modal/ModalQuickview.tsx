'use client';

// Quickview.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LazyLoadImage as Image } from 'react-lazy-load-image-component';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { useModalQuickviewContext } from '@/context/ModalQuickviewContext';
import { useCart } from '@/context/CartContext';
import { useModalCartContext } from '@/context/ModalCartContext';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useAddToWishlist, useRemoveFromWishlist } from '@/hooks/mutations/useWishlistMutations';
import { useModalWishlistContext } from '@/context/ModalWishlistContext';
import { useCompare } from '@/context/CompareContext';
import { useModalCompareContext } from '@/context/ModalCompareContext';
import Rate from '../Other/Rate';
import { useProductById } from '@/hooks/queries/useProducts';
import { useSession } from 'next-auth/react';
import { getCdnUrl } from '@/libs/cdn-url';
import Color from 'color';
import {
    calculateBestSale,
    calculateSoldFromSale,
    calculateAvailableFromSale,
    calculateSaleProgress,
    shouldShowSaleProgress,
} from '@/utils/calculateSale';
import { ProductVariant, ProductListItem } from '@/types/product';
import { OptimisticWishlistProduct } from '@/types/wishlist';
import Link from 'next/link';
import { formatToNaira } from '@/utils/currencyFormatter';
import PaymentMethodsBadge from '../Product/PaymentMethodsBadge';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const ModalQuickview = () => {
    const [photoIndex, setPhotoIndex] = useState(0);
    const [openPopupImg, setOpenPopupImg] = useState(false);
    const [openSizeGuide, setOpenSizeGuide] = useState<boolean>(false);
    const { selectedProductId, closeQuickview } = useModalQuickviewContext();
    const [activeColor, setActiveColor] = useState<string>('');
    const [activeSize, setActiveSize] = useState<string>('');
    const [quantity, setQuantity] = useState(1);
    const { addToCart, items: cartItems } = useCart();
    const { openModalCart } = useModalCartContext();

    // Modern wishlist pattern: Zustand + React Query
    const isInWishlist = useWishlistStore(state => state.isInWishlist(selectedProductId || ''));
    const wishlistItems = useWishlistStore(state => state.items);
    const wishlistItem = wishlistItems.find(item => item.productId === (selectedProductId || ''));
    const wishlistItemId = wishlistItem?._id;
    const addToWishlistStore = useWishlistStore(state => state.addItem);
    const removeFromWishlistStore = useWishlistStore(state => state.removeItem);
    const { mutate: addToWishlistMutation } = useAddToWishlist();
    const { mutate: removeFromWishlistMutation } = useRemoveFromWishlist();

    const { openModalWishlist } = useModalWishlistContext();
    const { addToCompare, removeFromCompare, compareState } = useCompare();
    const { openModalCompare } = useModalCompareContext();

    // Fetch product data with retry:0 for instant modal UX
    const { data: product, isLoading, error } = useProductById(selectedProductId || '', { retry: 0 });

    // Parse attributes from product data (same as Product.tsx)
    type AttrChild = { name: string; colorCode?: string; };
    type Attr = { name: string; children: AttrChild[]; };
    type WithAttributes = { attributes?: Attr[]; };

    const attributes: Attr[] = useMemo(() => {
        const hasAttributes = (obj: unknown): obj is WithAttributes =>
            typeof obj === 'object' && obj !== null && 'attributes' in (obj as Record<string, unknown>);

        return hasAttributes(product) && Array.isArray((product as WithAttributes).attributes)
            ? ((product as WithAttributes).attributes as ProductVariant[])
            : [];
    }, [product]);

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
                hex = originalColor.mix(Color('#ffffff'), 0.15).hex(); // Lighten by 15%
            } catch {
                // If color parsing fails, use a default light gray
                hex = '#E5E5E5';
            }

            return { label: child.name, hex, value: child.name };
        });
    }, [attributes]);

    // Get all non-color attributes dynamically
    const otherAttributes = useMemo(() => {
        return attributes.filter(
            (a) => a.name.toLowerCase() !== 'color' && a.name.toLowerCase() !== 'colors'
        );
    }, [attributes]);

    // Calculate sale info from product.sale (same as Product.tsx)
    const saleInfo = useMemo(() => {
        return calculateBestSale(product?.sale, product?.price || 0);
    }, [product?.sale, product?.price]);

    // Calculate sold quantity from sale variants (cumulative boughtCount)
    const soldQuantity = useMemo(() => {
        return calculateSoldFromSale(product?.sale);
    }, [product?.sale]);

    // Calculate available quantity from sale variants (maxBuys - boughtCount)
    const availableStock = useMemo(() => {
        return calculateAvailableFromSale(product?.sale);
    }, [product?.sale]);

    // Calculate sold percentage based on maxBuys and boughtCount
    const percentSold = useMemo(() => {
        return calculateSaleProgress(product?.sale);
    }, [product?.sale]);

    // Check if should show sold/available progress (isHot = true and not sold out)
    const showSaleProgress = useMemo(() => {
        return shouldShowSaleProgress(product?.sale);
    }, [product?.sale]);

    // Reset state when modal closes or product changes
    useEffect(() => {
        if (selectedProductId) {
            setActiveColor('');
            setActiveSize('');
            setQuantity(1);
        }
    }, [selectedProductId]);

    // Initialize defaults for color and first non-color attribute when available
    useEffect(() => {
        if (!activeColor && colors.length > 0) {
            setActiveColor(colors[0].label);
        }
        if (!activeSize && otherAttributes.length > 0 && otherAttributes[0].children.length > 0) {
            setActiveSize(otherAttributes[0].children[0].name);
        }
    }, [colors, otherAttributes, activeColor, activeSize]);

    const handleOpenSizeGuide = () => {
        setOpenSizeGuide(true);
    };

    const handleCloseSizeGuide = () => {
        setOpenSizeGuide(false);
    };

    const handleActiveColor = (item: string) => {
        setActiveColor(item);
    };

    const handleActiveSize = (item: string) => {
        setActiveSize(item);
    };

    const handleIncreaseQuantity = () => {
        setQuantity(prev => prev + 1);
    };

    const handleDecreaseQuantity = () => {
        if (quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

    const handleAddToCart = () => {
        if (!product) return;

        // Build attributes array from active color and all other selected attributes
        const attributes: Array<{ name: string; value: string; }> = [];
        if (activeColor) {
            attributes.push({ name: 'Color', value: activeColor });
        }
        if (activeSize) {
            // For now, we assume activeSize is the first non-color attribute
            // You could extend this to track multiple attribute selections
            const firstNonColorAttr = otherAttributes[0];
            if (firstNonColorAttr) {
                attributes.push({ name: firstNonColorAttr.name, value: activeSize });
            }
        }

        // Add to cart with full product and selected attributes
        addToCart(product, quantity, attributes);
        openModalCart();
        closeQuickview();
    };

    // Debounce state for wishlist toggle
    const [wishlistPending, setWishlistPending] = useState(false);

    const handleAddToWishlist = useCallback(() => {
        // Prevent rapid-fire clicks
        if (wishlistPending || !product) return;

        setWishlistPending(true);

        // if product existed in wishlist, remove from wishlist
        if (isInWishlist) {
            // Optimistically remove from Zustand
            removeFromWishlistStore(product._id);

            if (wishlistItemId) {
                // Send to server
                removeFromWishlistMutation(wishlistItemId, {
                    onSuccess: () => {
                        setWishlistPending(false);
                    },
                    onError: () => {
                        // Rollback on error - re-add to Zustand
                        if (wishlistItem) {
                            addToWishlistStore(product._id, wishlistItem.product);
                        }
                        setWishlistPending(false);
                    },
                });
            } else {
                setWishlistPending(false);
            }
        } else {
            // Build product data for optimistic update
            const productImages = product.description_images || [];

            const optimisticProduct: ProductListItem = {
                _id: product._id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                images: productImages.map(img => ({
                    url: img.url,
                    cover_image: img.cover_image ?? false,
                })),
                description_images: productImages.map(img => ({
                    url: img.url,
                    cover_image: img.cover_image ?? false,
                })),
                category: {
                    _id: product.category?._id || '',
                    name: product.category?.name || '',
                    image: product.category?.image || '',
                    slug: product.category?.slug || '',
                },
                stock: product.stock,
                originStock: product.originStock,
                sku: product.sku ?? '',
                sale: null,
            };

            // Optimistically add to Zustand
            addToWishlistStore(product._id, optimisticProduct);

            // Send to server (mutation only uses productId, but pass full product for type safety)
            // Ensure sale is explicitly null for OptimisticWishlistProduct type
            const wishlistPayload: OptimisticWishlistProduct = {
                ...optimisticProduct,
                sale: null, // Wishlist products don't have sales
            };

            addToWishlistMutation(
                { productId: product._id, product: wishlistPayload },
                {
                    onSuccess: () => {
                        setWishlistPending(false);
                    },
                    onError: () => {
                        // Rollback on error - remove from Zustand
                        removeFromWishlistStore(product._id);
                        setWishlistPending(false);
                    },
                }
            );
        }

        openModalWishlist();
    }, [product, isInWishlist, wishlistItemId, wishlistItem, wishlistPending,
        removeFromWishlistStore, removeFromWishlistMutation, addToWishlistStore,
        addToWishlistMutation, openModalWishlist]);

    const handleAddToCompare = () => {
        if (product) {
            const productId = product._id;
            if (compareState.compareArray.length < 3) {
                if (compareState.compareArray.some(item => item._id === productId)) {
                    removeFromCompare(productId);
                } else {
                    addToCompare(product);
                }
            } else {
                alert('Compare up to 3 products');
            }
        }
        openModalCompare();
    };

    // Skeleton loader component
    const SkeletonLoader = () => (
        <div className="animate-pulse">
            <div className="flex h-full max-md:flex-col-reverse gap-y-6">
                <div className="left lg:w-[388px] md:w-[300px] flex-shrink-0 px-6">
                    <div className="bg-img w-full aspect-[3/4] bg-gray-200 rounded-[20px]" />
                </div>
                <div className="right w-full px-3 sm:px-4">
                    <div className="heading pb-6 px-4">
                        <div className="h-8 bg-gray-200 rounded w-1/3" />
                    </div>
                    <div className="px-4 space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-3/4" />
                        <div className="h-6 bg-gray-200 rounded w-1/2" />
                        <div className="h-20 bg-gray-200 rounded w-full" />
                    </div>
                </div>
            </div>
        </div>
    );

    // Error state component
    if (error) {
        return (
            <div className={`modal-quickview-block`} onClick={closeQuickview}>
                <div
                    className={`modal-quickview-main py-6 ${selectedProductId ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation(); }}
                >
                    <div className="flex items-center justify-center p-12">
                        <div className="text-center">
                            <Icon.WarningCircle size={48} className="mx-auto mb-4 text-red" />
                            <h3 className="heading5 mb-2">Failed to load product</h3>
                            <p className="text-secondary">Please try again later</p>
                            <button
                                className="button-main mt-4 px-6 py-2"
                                onClick={closeQuickview}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`modal-quickview-block`} onClick={closeQuickview}>
                <div
                    className={`modal-quickview-main py-6 ${selectedProductId ? 'open' : ''}`}
                    onClick={(e) => { e.stopPropagation(); }}
                >
                    {isLoading || !product ? (
                        <SkeletonLoader />
                    ) : (
                        <div className="flex h-full max-md:flex-col-reverse gap-y-6">
                            <div className="left lg:w-[388px] md:w-[300px] flex-shrink-0 px-6 hidden md:block">
                                <div className="list-img max-md:flex items-center gap-4">
                                    {product?.description_images?.map((item, index) => (
                                        <div className="bg-img w-full aspect-[3/4] max-md:w-[150px] max-md:flex-shrink-0 rounded-[20px] overflow-hidden md:mt-6" key={index}>
                                            <Image
                                                wrapperClassName="w-full h-full object-cover object-center"
                                                src={getCdnUrl(item.url)}
                                                alt={product.name}
                                                effect="blur"
                                                placeholderSrc={`${getCdnUrl(item.url)}?class=minify`}
                                                className='w-auto h-full object-cover'
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="right w-full px-3 sm:px-4">
                                <div className="heading pb-6 px-4 flex items-center justify-between relative">
                                    <div className="heading5">Quick View</div>
                                    <div
                                        className="close-btn absolute right-0 top-0 w-6 h-6 rounded-full bg-surface flex items-center justify-center duration-300 cursor-pointer hover:bg-black hover:text-white"
                                        onClick={closeQuickview}
                                    >
                                        <Icon.X size={14} />
                                    </div>
                                </div>
                                <div className="product-infor sm:px-4">
                                    <div className="flex justify-between">
                                        <div>
                                            <div className="caption2 text-secondary font-semibold uppercase">{product?.category?.name}</div>
                                            <div className="heading4 mt-1">{product?.name}</div>
                                        </div>
                                        <div
                                            className={`add-wishlist-btn w-10 h-10 flex items-center justify-center border border-line cursor-pointer rounded-lg duration-300 flex-shrink-0 hover:bg-black hover:text-white ${isInWishlist ? 'active' : ''}`}
                                            onClick={handleAddToWishlist}
                                        >
                                            {isInWishlist ? (
                                                <>
                                                    <Icon.Heart size={20} weight='fill' className='text-red' />
                                                </>
                                            ) : (
                                                <>
                                                    <Icon.Heart size={20} />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center mt-2">
                                        <Rate currentRate={product?.reviewStats.averageRating || 0} size={14} />
                                        <span className='caption1 text-secondary'>({product?.reviewStats.totalReviews || 0} reviews)</span>
                                    </div>

                                    <div className="list-img !h-auto my-4 md:hidden ">
                                        <Swiper
                                            spaceBetween={16}
                                            slidesPerView={1.02}
                                            modules={[Pagination]}
                                            pagination={{ clickable: true }}
                                            breakpoints={{
                                                640: {
                                                    slidesPerView: 1,
                                                    spaceBetween: 16,
                                                },
                                            }}
                                            className="quickview-swiper"
                                        >
                                            {product?.description_images?.map((item, index) => (
                                                <SwiperSlide key={index} className=''>
                                                    <div className="bg-img w-full aspect-video border rounded-md overflow-hidden">
                                                        <Image
                                                            wrapperClassName="w-full h-full object-cover object-center"
                                                            src={getCdnUrl(item.url)}

                                                            alt={product.name}
                                                            className="w-full h-full object-cover select-none"
                                                            effect="blur"
                                                            placeholderSrc={`${getCdnUrl(item.url)}?class=minify`}
                                                        />
                                                    </div>
                                                </SwiperSlide>
                                            ))}
                                        </Swiper>
                                    </div>


                                    <div className="flex items-center gap-1.5 md:gap-3 flex-wrap md:mt-5 pb-6 border-b border-line">
                                        {saleInfo.hasActiveSale ? (
                                            <>
                                                <div className="product-price heading5">{formatToNaira(saleInfo.discountedPrice)}</div>
                                                <div className='w-px h-4 bg-line'></div>
                                                <div className="product-origin-price font-normal text-secondary2"><del>{formatToNaira(saleInfo.originalPrice)}</del></div>
                                                <div className="product-sale caption2 font-semibold bg-green px-3 py-0.5 inline-block rounded-full">
                                                    -{saleInfo.percentOff}%
                                                </div>
                                            </>
                                        ) : (
                                            <div className="product-price heading5">{formatToNaira(product?.price || 0)}</div>
                                        )}
                                        <div className='desc text-secondary md:mt-3 w-full' dangerouslySetInnerHTML={{ __html: product?.description || '' }} />
                                    </div>
                                    <div className="list-action mt-6">
                                        {showSaleProgress && (
                                            <div className="sold flex justify-between flex-wrap gap-4">
                                                <div className="text-title">Sold:</div>
                                                <div className="right w-3/4">
                                                    <div className="progress h-2 rounded-full overflow-hidden bg-line relative">
                                                        <div
                                                            className="percent-sold absolute top-0 left-0 h-full bg-red"
                                                            style={{ width: `${percentSold}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-2">
                                                        <span>{percentSold}% Sold -</span>
                                                        <span className='text-secondary'>{availableStock} units left!</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {colors.length > 0 && (
                                            <div className="choose-color">
                                                <div className="text-title">Colors: <span className='text-title color'>{activeColor}</span></div>
                                                <div className="list-color flex items-center gap-2 flex-wrap mt-3">
                                                    {colors.map((color, index) => (
                                                        <div
                                                            className={`color-item w-12 h-12 rounded-xl duration-300 relative outline outline-gray-200 cursor-pointer ${activeColor === color.label ? 'active' : ''}`}
                                                            key={index}
                                                            style={{ backgroundColor: color.hex }}
                                                            onClick={() => handleActiveColor(color.label)}
                                                        >
                                                            <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm absolute bottom-0 left-0 right-0 text-center max-h-[20px]">
                                                                {color.label}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {otherAttributes.map((attr, attrIndex) => (
                                            <div className="choose-attribute mt-5" key={attrIndex}>
                                                <div className="text-title">{attr.name}: <span className='text-title'>{activeSize}</span></div>
                                                <div className="list-options flex items-center gap-2 flex-wrap mt-3">
                                                    {attr.children.map((child, childIndex) => (
                                                        <div
                                                            className={`option-item ${child.name.toLowerCase() === 'freesize' ? 'px-3 py-2' : 'w-12 h-12'} flex items-center justify-center text-button rounded-full bg-white border border-line cursor-pointer ${activeSize === child.name ? 'active !border-black border-2' : ''}`}
                                                            key={childIndex}
                                                            onClick={() => handleActiveSize(child.name)}
                                                        >
                                                            {child.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        <div className="text-title mt-5">Quantity:</div>
                                        <div className="choose-quantity flex items-center max-xl:flex-wrap lg:justify-between gap-5 mt-3">
                                            <div className="quantity-block md:p-3 max-md:py-1.5 max-md:px-3 flex items-center justify-between rounded-lg border border-line sm:w-[140px] w-[120px] flex-shrink-0">
                                                <Icon.Minus
                                                    onClick={handleDecreaseQuantity}
                                                    className={`${quantity === 1 ? 'disabled' : ''} cursor-pointer body1`}
                                                />
                                                <div className="body1 font-semibold">{quantity}</div>
                                                <Icon.Plus
                                                    onClick={handleIncreaseQuantity}
                                                    className='cursor-pointer body1'
                                                />
                                            </div>
                                            {product.stock > 0 ? (
                                                <div
                                                    onClick={handleAddToCart}
                                                    className={`flex-1 button-main w-full text-center bg-white text-black border border-black cursor-pointer`}
                                                >
                                                    Add To Cart
                                                </div>
                                            ) : (
                                                <div className="button-main w-full text-center bg-surface text-secondary2 border border-line hover:bg-surface hover:text-secondary">Out Of Stock</div>
                                            )}
                                        </div>

                                        <div className="flex items-center flex-wrap lg:gap-20 gap-8 gap-y-4 mt-5">
                                            <div className="compare flex items-center gap-3 cursor-pointer" onClick={handleAddToCompare}>
                                                <div
                                                    className="compare-btn md:w-12 md:h-12 w-10 h-10 flex items-center justify-center border border-line cursor-pointer rounded-xl duration-300 hover:bg-black hover:text-white"
                                                >
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
                                        </div>
                                        <div className="more-infor mt-6">
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
                                            <div className="flex items-center flex-wrap gap-1 mt-3">
                                                <Icon.Timer className='body1' />
                                                <span className="text-title">Estimated Delivery:</span>
                                                <span className="text-secondary">14 January - 18 January</span>
                                            </div>
                                            {/* <div className="flex items-center flex-wrap gap-1 mt-3">
                                                <Icon.Eye className='body1' />
                                                <span className="text-title">38</span>
                                                <span className="text-secondary">people viewing this product right now!</span>
                                            </div> */}
                                            <div className="flex items-center gap-1 mt-3">
                                                <div className="text-title">SKU:</div>
                                                <div className="text-secondary">53453412</div>
                                            </div>
                                            <div className="flex items-center gap-1 mt-3">
                                                <div className="text-title">Category:</div>
                                                <Link href={`/category/${product.category?.slug}`} className="text-secondary hover:underline hover:text-black">{product?.category?.name || 'N/A'}</Link>
                                            </div>
                                            {product?.tags && product.tags.length > 0 && (
                                                <div className="flex items-center gap-1 mt-3">
                                                    <div className="text-title">Tags:</div>
                                                    <div className="text-secondary">{product.tags.join(', ')}</div>
                                                </div>
                                            )}
                                        </div>

                                        <PaymentMethodsBadge className="mt-7 w-full" innerClassname='max-md:w-full' title="Guaranteed safe checkout" />

                                    </div>
                                </div>
                            </div>
                        </div>)}
                </div>
            </div>

        </>
    );
};

export default ModalQuickview;
