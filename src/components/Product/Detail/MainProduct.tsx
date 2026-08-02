'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ProductDetail } from '@/types/product';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Thumbs, Scrollbar } from 'swiper/modules';
import 'swiper/css/bundle';
import * as Icon from '@phosphor-icons/react/dist/ssr';
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
import { getCdnUrl } from '@/libs/cdn-url';
import Color from 'color';
import SalesCountdownTimer from './SalesCountdownTimer';
import ProductDetailTabs from './ProductDetailTabs';
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
import { useProductSocket } from '@/hooks/useProductSocket';

interface Props {
  slug: string;
}

const Sale: React.FC<Props> = ({ slug }) => {
  SwiperCore.use([Navigation, Thumbs]);
  const queryClient = useQueryClient();
  // Fetch product data using React Query
  const { data: productMain, isLoading, error } = useProduct({ slug });

  useProductSocket({
    productIds: productMain?._id ? [productMain._id] : [],
    enabled: Boolean(productMain?._id),
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['product', slug] });
    },
  });

  const swiperRef: any = useRef(undefined);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [openPopupImg, setOpenPopupImg] = useState(false);
  const [openSizeGuide, setOpenSizeGuide] = useState<boolean>(false);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperCore | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState<number>(1);
  const { addToCart } = useCart();
  const { openModalCart } = useModalCartContext();

  // Zustand store for client-side wishlist state
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(productMain?._id || ''));
  const wishlistItems = useWishlistStore((state) => state.items);
  const wishlistItem = wishlistItems.find((item) => item.productId === (productMain?._id || ''));
  const wishlistItemId = wishlistItem?._id;
  const addToWishlistStore = useWishlistStore((state) => state.addItem);
  const removeFromWishlistStore = useWishlistStore((state) => state.removeItem);

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
        images: productImages.map((img) => ({
          url: img.url,
          cover_image: img.cover_image ?? false,
        })),
        description_images: productImages.map((img) => ({
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
  }, [
    wishlistPending,
    productMain,
    isInWishlist,
    wishlistItemId,
    wishlistItem,
    addToWishlistStore,
    removeFromWishlistStore,
    addToWishlistMutation,
    removeFromWishlistMutation,
    openModalWishlist,
  ]);

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
            { nextCursor: string | null; count: number }
          >(`${api.reviews.byProduct(productMain._id)}?page=1&limit=10&sortBy=newest`);
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
    if (!colorAttr) return [] as { label: string; hex: string; value: string }[];

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
    const variants =
      productMain.sale.variants?.map((variant: any) => ({
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
      attributes.forEach((attr) => {
        if (attr.children.length > 0) {
          initialSelection[attr.name] = attr.children[0].name;
        }
      });
      setSelectedAttributes(initialSelection);
    }
  }, [attributes, selectedAttributes]);
  const limitedSaleStats = useMemo(() => {
    if (normalizedSale?.type !== 'Limited') return { sold: 0, total: 0 };

    const sold = normalizedSale.variants.reduce(
      (acc, variant) => acc + (variant.boughtCount || 0),
      0
    );
    const total = normalizedSale.variants.reduce((acc, variant) => acc + (variant.maxBuys || 0), 0);

    return { sold, total };
  }, [normalizedSale]);
  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-black"></div>
      </div>
    );
  }

  // Handle error state
  if (error || !productMain) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="mb-4 text-xl text-red-600">Failed to load product</p>
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
    // Prefer the live per-product aggregate; fall back to the denormalized field.
    rate: productMain.reviewStats?.averageRating ?? productMain.ratingAverage ?? 0,
    quantityPurchase: quantity,
    // Merge specifications and dimensions into one array
    specifications: [
      ...(productMain.specifications || []),
      ...(productMain.dimension?.map(({ key, value }) => ({ key, value })) || []),
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
    setSelectedAttributes((prev) => ({
      ...prev,
      [attributeName]: value,
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
    const attributes: Array<{ name: string; value: string }> = [];
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
      if (compareState.compareArray.some((item) => item._id === product._id)) {
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

  return (
    <>
      <div className="product-detail sale">
        <div className="featured-product underwear py-10">
          <div className="container flex flex-wrap justify-between gap-y-6">
            <div
              className={`list-img w-full md:!sticky md:top-6 md:h-fit md:w-1/2 md:pr-[45px] ${openPopupImg ? 'md:z-[201]' : ''}`}
            >
              <Swiper
                slidesPerView={1}
                spaceBetween={0}
                thumbs={{ swiper: thumbsSwiper }}
                modules={[Thumbs]}
                className="mySwiper2 overflow-hidden rounded-2xl border"
              >
                {product.description_images?.map((item: any, index: number) => (
                  <SwiperSlide
                    key={index}
                    className="!flex max-h-[75vh] !w-full items-center lg:max-h-[82vh]"
                    onClick={() => {
                      if (item.mediaType !== 'video') {
                        swiperRef.current?.slideTo(index);
                        setOpenPopupImg(true);
                      }
                    }}
                  >
                    {item.mediaType === 'video' ? (
                      <VideoPlayer
                        src={getCdnUrl(item.url)}
                        className="max-h-[75vh] w-full lg:max-h-[82vh]"
                      />
                    ) : (
                      <Image
                        src={getCdnUrl(item.url)}
                        width={1000}
                        height={1000}
                        alt="prd-img"
                        className="h-auto w-full object-cover object-center"
                      />
                    )}
                  </SwiperSlide>
                ))}
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
                    <div className="relative aspect-[3/4] w-full">
                      <Image
                        src={
                          item.mediaType === 'video' && item.miniUrl
                            ? getCdnUrl(item.miniUrl)
                            : getCdnUrl(item.url)
                        }
                        width={1000}
                        height={1300}
                        alt="prd-img"
                        className="h-full w-full rounded-xl object-cover object-center"
                      />
                      {item.mediaType === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60">
                            <svg viewBox="0 0 12 12" className="ml-0.5 h-3 w-3 fill-white">
                              <polygon points="2,1 11,6 2,11" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
              <div className={`popup-img ${openPopupImg ? 'open' : ''}`}>
                <span
                  className="close-popup-btn absolute right-4 top-4 z-[2] cursor-pointer"
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
                  {product.description_images
                    ?.filter((item: any) => item.mediaType !== 'video')
                    .map((item: any, index: number) => (
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
                          alt="prd-img"
                          className="w-full rounded-xl object-cover"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        />
                      </SwiperSlide>
                    ))}
                </Swiper>
              </div>
            </div>
            <div
              className={`product-infor ${product.stock === 0 ? 'style-out-of-stock' : ''} w-full md:w-1/2 md:pl-2 lg:pl-[15px]`}
            >
              <div className="flex justify-between">
                <div>
                  <div className="caption2 font-semibold uppercase text-secondary">
                    {product.type}
                  </div>
                  <div className="heading4 mt-1">{product.name}</div>
                </div>
                <div
                  className={`add-wishlist-btn flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border border-line duration-300 hover:bg-black hover:text-white ${isInWishlist ? 'active' : ''}`}
                  onClick={handleAddToWishlist}
                >
                  {isInWishlist ? (
                    <>
                      <Icon.Heart size={24} weight="fill" className="text-white" />
                    </>
                  ) : (
                    <>
                      <Icon.Heart size={24} />
                    </>
                  )}
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-3 border-b border-line pb-6">
                <div className="product-price heading5 font-semibold">
                  {formatToNaira(discountedBasePrice)}
                </div>
                {hasSale && (
                  <>
                    <div className="h-4 w-px bg-line"></div>
                    <div className="product-origin-price font-normal text-secondary2">
                      <del>{formatToNaira(originalUnitPrice)}</del>
                    </div>
                    <div className="product-sale caption2 inline-block rounded-full bg-green px-3 py-0.5 font-semibold">
                      -{Math.round(salePercent)}%
                    </div>
                  </>
                )}
                <div className="desc mt-3 text-secondary">
                  {htmlToText(product.description ?? '', { wordwrap: 100 })}
                </div>
              </div>
              <div className="list-action mt-6 flex-col gap-4">
                <SalesCountdownTimer sale={normalizedSale} salesType={productMain.sale?.type} />
                <LimitedProductProgress
                  sold={
                    normalizedSale?.type === 'Limited' ? limitedSaleStats.sold : (product.sold ?? 0)
                  }
                  totalQuantity={
                    normalizedSale?.type === 'Limited'
                      ? limitedSaleStats.total
                      : (product.quantity ?? 0)
                  }
                  salesType={productMain.sale?.type}
                />

                {/* Color Attribute - Rendered with Color package */}
                {colors.length > 0 && (
                  <div className="choose-color mt-5">
                    <div className="text-title">
                      Colors:{' '}
                      <span className="text-title color">
                        {selectedAttributes['Color'] || selectedAttributes['Colour'] || ''}
                      </span>
                    </div>
                    <div className="list-color mt-3 flex flex-wrap items-center gap-2">
                      {colors.map((item, index) => (
                        <div
                          className={`color-item relative h-12 w-12 cursor-pointer rounded-xl duration-300 ${
                            selectedAttributes['Color'] === item.label ||
                            selectedAttributes['Colour'] === item.label
                              ? 'active'
                              : ''
                          }`}
                          key={index}
                          style={{ backgroundColor: item.hex }}
                          onClick={() =>
                            handleAttributeChange(
                              attributes.find(
                                (a) =>
                                  a.name.toLowerCase() === 'color' ||
                                  a.name.toLowerCase() === 'colours'
                              )?.name || 'Color',
                              item.label
                            )
                          }
                        >
                          <div className="tag-action caption2 rounded-sm bg-black px-1.5 py-0.5 capitalize text-white">
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
                      {attr.name}:{' '}
                      <span className="text-title">{selectedAttributes[attr.name] || ''}</span>
                    </div>
                    <div className="list-options mt-3 flex flex-wrap items-center gap-2">
                      {attr.children.map((option, optIndex) => (
                        <div
                          className={`option-item text-button flex cursor-pointer items-center justify-center rounded-lg border border-line px-4 py-2 duration-300 hover:bg-neutral-700 hover:text-white ${
                            selectedAttributes[attr.name] === option.name
                              ? 'active bg-black text-white'
                              : 'bg-white'
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

                <div className="text-title mt-6">Quantity:</div>

                {/* Total Price Display */}
                <div className="mt-1 rounded-lg border border-line bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-secondary2">Total Price</div>
                      <div className="mt-0.5 text-xs text-secondary2">
                        {quantity} × {formatToNaira(currentUnitPrice)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="heading5 text-black">{formatToNaira(totalPrice)}</div>
                    </div>
                  </div>
                </div>
                <div className="choose-quantity mt-3 flex items-center gap-5 gap-y-3 lg:justify-between">
                  <div className="quantity-block flex w-[120px] flex-shrink-0 items-center justify-between rounded-lg border border-line max-md:px-3 max-md:py-1.5 sm:w-[180px] md:p-3">
                    <Icon.Minus
                      size={20}
                      onClick={handleDecreaseQuantity}
                      className={`${quantity === 1 ? 'disabled' : ''} cursor-pointer`}
                    />
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      className="body1 w-16 border-none bg-transparent text-center font-semibold outline-none"
                      min="1"
                    />
                    <Icon.Plus
                      size={20}
                      onClick={handleIncreaseQuantity}
                      className="cursor-pointer"
                    />
                  </div>
                  {product.stock > 0 ? (
                    <div
                      onClick={handleAddToCart}
                      className="button-main w-full border border-black bg-white text-center text-black"
                    >
                      Add To Cart
                    </div>
                  ) : (
                    <div className="button-main w-full border border-line bg-surface text-center text-secondary2 hover:bg-surface hover:text-secondary">
                      Out Of Stock
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center gap-8 border-b border-line pb-6 lg:gap-20">
                  <div
                    className="compare flex cursor-pointer items-center gap-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCompare();
                    }}
                  >
                    <div className="compare-btn flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-line duration-300 hover:bg-black hover:text-white md:h-12 md:w-12">
                      <Icon.ArrowsCounterClockwise className="heading6" />
                    </div>
                    <span>Compare</span>
                  </div>
                  <div className="share flex cursor-pointer items-center gap-3">
                    <div className="share-btn flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-line duration-300 hover:bg-black hover:text-white md:h-12 md:w-12">
                      <Icon.ShareNetwork weight="fill" className="heading6" />
                    </div>
                    <span>Share Products</span>
                  </div>
                </div>
                <div className="more-infor mt-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Icon.ArrowClockwise className="body1" />
                      <div className="text-title">Delivery & Return</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon.Question className="body1" />
                      <div className="text-title">Ask A Question</div>
                    </div>
                  </div>
                  {/* <div className="flex items-center gap-1 mt-3">
                                        <Icon.Eye className='body1' />
                                        <div className="text-title">38</div>
                                        <div className="text-secondary">people viewing this product right now!</div>
                                    </div> */}
                  <div className="mt-3 flex items-center gap-1">
                    <div className="text-title">SKU:</div>
                    <div className="text-secondary">{product.sku || 'N/A'}</div>
                  </div>
                  <div className="mt-3 flex items-center gap-1">
                    <div className="text-title">Categories:</div>
                    <div className="text-secondary">
                      {typeof product.category === 'string'
                        ? product.category
                        : product.category?.name || 'N/A'}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1">
                    <div className="text-title">Tag:</div>
                    <div className="text-secondary">{product.type}</div>
                  </div>
                </div>
                <PaymentMethodsBadge className="mt-7" title="Guaranteed safe checkout" />
              </div>
              <div className="get-it mt-6">
                <div className="heading5">Get it today</div>
                <div className="item mt-4 flex items-center gap-3">
                  <div className="icon-delivery-truck text-4xl"></div>
                  <div>
                    <div className="text-title">Free shipping</div>
                    <div className="caption1 mt-1 text-secondary">
                      Free shipping on orders over &#8358; 500,000.
                    </div>
                  </div>
                </div>
                <div className="item mt-4 flex items-center gap-3">
                  <div className="icon-phone-call text-4xl"></div>
                  <div>
                    <div className="text-title">Support everyday</div>
                    <div className="caption1 mt-1 text-secondary">
                      Support from 9:00 AM to 9:00 PM everyday
                    </div>
                  </div>
                </div>
                <div className="item mt-4 flex items-center gap-3">
                  <div className="icon-return text-4xl"></div>
                  <div>
                    <div className="text-title">2 Day Returns</div>
                    <div className="caption1 mt-1 text-secondary">
                      Not impressed? Get a refund. You have 2 days to break our hearts.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <hr className="my-8 w-full opacity-30" />
        <ProductDetailTabs
          productId={product._id}
          description={productMain.description}
          specifications={product.specifications}
        />
        <br /> <br />
        <RelatedProducts productId={product.id} limit={4} />
      </div>
    </>
  );
};

function VideoPlayer({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const isPlayingRef = useRef(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlayingRef.current) setShowOverlay(false);
    }, 2500);
  };

  const handleMouseMove = () => {
    setShowOverlay(true);
    scheduleHide();
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div
      className={`relative select-none ${className ?? ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlayingRef.current) scheduleHide();
      }}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        className="h-full w-full object-cover"
        onPlay={() => {
          setIsPlaying(true);
          isPlayingRef.current = true;
          scheduleHide();
        }}
        onPause={() => {
          setIsPlaying(false);
          isPlayingRef.current = false;
          setShowOverlay(true);
          if (hideTimer.current) clearTimeout(hideTimer.current);
        }}
        onEnded={() => {
          setIsPlaying(false);
          isPlayingRef.current = false;
          setShowOverlay(true);
          if (hideTimer.current) clearTimeout(hideTimer.current);
        }}
      />
      <div
        className={`absolute inset-0 flex cursor-pointer items-center justify-center transition-opacity duration-500 ${showOverlay ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={togglePlay}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white">
              <rect x="5" y="4" width="4" height="16" rx="1" />
              <rect x="15" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-8 w-8 translate-x-0.5 fill-white">
              <polygon points="5,3 20,12 5,21" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export default Sale;
