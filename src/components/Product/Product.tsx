'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ProductDetail } from '@/types/product';
import { ProductListItem } from '@/types/product';
import { OptimisticWishlistProduct } from '@/types/wishlist';
import * as Icon from '@phosphor-icons/react/dist/ssr';
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
  shouldShowSaleProgress,
} from '@/utils/calculateSale';
import { ProductVariant, ProductVariantChild } from '@/types/product';
import { useSession } from 'next-auth/react';
import { LazyLoadImage as Image } from 'react-lazy-load-image-component';
import ProductSalesLeft from './ProductSalesLeft';
import ProductNameColors from './ProductNameColors';
import ProductPriceBlock from './ProductPriceBlock';
import { useProductSocket } from '@/hooks/useProductSocket';

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
    : product.description_images?.find((img) => img.cover_image)?.url ||
      product.description_images?.[0]?.url ||
      '';

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
        description_images: rawData.description_images || rawData.images || [],
        // Required shipping fields on Product type
        weight: 0,
        height: 0,
        width: 0,
        length: 0,
        isVolumetric: false,
        action: 'add to cart',
        createdAt: '', // not in ProductListItem
        reviewStats: {
          averageRating: 0,
          totalReviews: 0,
        },
      } as ProductDetail;
    }
    return rawData;
  }, [rawData]);
  const [activeColor, setActiveColor] = useState<string>('');
  const [activeSize, setActiveSize] = useState<string>('');
  const [openQuickShop, setOpenQuickShop] = useState<boolean>(false);
  const [localStock, setLocalStock] = useState<number>(data.stock);
  const [showCheck, setShowCheck] = useState(false);

  // Keep localStock in sync when parent data changes (e.g. React Query refetch)
  useEffect(() => {
    setLocalStock(data.stock);
  }, [data.stock]);

  // PRIMARY cart (Context API - client-first with background server sync)
  const { addToCart, updateCart, items: cartItems, itemCount } = useCart();
  const { openModalCart } = useModalCartContext();

  useProductSocket({
    productIds: [data._id],
    enabled: Boolean(data._id),
    onUpdate: (update) => {
      for (const event of update.events) {
        const e = event as unknown as { type: string; data: Record<string, unknown> };
        if (e.type === 'product_update' && typeof e.data.stock === 'number') {
          setLocalStock(e.data.stock);
        } else if (e.type === 'inventory_update' && typeof e.data.currentStock === 'number') {
          setLocalStock(e.data.currentStock);
        }
      }
    },
  });

  // Zustand store for client-side wishlist state
  const isInWishlist = useWishlistStore((state) => state.isInWishlist(data._id));
  const wishlistItems = useWishlistStore((state) => state.items);
  const wishlistItem = wishlistItems.find((item) => item.productId === data._id);
  const wishlistItemId = wishlistItem?._id;
  const addToWishlistStore = useWishlistStore((state) => state.addItem);
  const removeFromWishlistStore = useWishlistStore((state) => state.removeItem);

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
  type AttrChild = { name: string; colorCode?: string };
  type Attr = { name: string; children: AttrChild[] };
  type WithAttributes = { attributes?: Attr[] };
  type PackSize = { label: string; quantity: number; price?: number; enableAttributes?: boolean };
  type WithPackSizes = { packSizes?: PackSize[] };

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
    if (!colorAttr) return [] as { label: string; hex: string; value: string }[];
    return colorAttr.children
      .map((child) => {
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
      })
      .splice(0, 6);
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
    const attributes: Array<{ name: string; value: string }> = [];
    if (activeColor) {
      attributes.push({ name: 'Color', value: activeColor });
    }
    if (activeSize) {
      attributes.push({ name: 'Size', value: activeSize });
    }

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
        images: productImages.map((img) => ({
          url: img.url,
          cover_image: img.cover_image ?? false,
        })),
        description_images: productImages.map((img) => ({
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
  }, [
    wishlistPending,
    isInWishlist,
    wishlistItemId,
    data,
    rawData,
    wishlistItem,
    removeFromWishlistStore,
    removeFromWishlistMutation,
    addToWishlistStore,
    addToWishlistMutation,
    openModalWishlist,
    pathname,
  ]);

  const handleAddToCompare = () => {
    // if product existed in wishlit, remove from wishlist and set state to false
    if (compareState.compareArray.length < 3) {
      if (compareState.compareArray.some((item) => item._id === data._id)) {
        removeFromCompare(data._id);
      } else {
        // else, add to wishlist and set state to true
        addToCompare(data);
        setShowCheck(true);
        setTimeout(() => {
          setShowCheck(false);
        }, 1000);
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
    const daysSinceCreation =
      new Date().getTime() - new Date(data.createdAt!).getTime() / (24 * 60 * 60 * 1000);
    const isNew = daysSinceCreation <= 5;
    return isNew;
  }, [saleInfo.hasActiveSale, data.createdAt]);

  // Check if should show flash sale countdown
  const showFlashSaleCountdown = useMemo(() => {
    if (!data.sale || data.sale.type !== 'Flash' || !data.sale.startDate || !data.sale.endDate)
      return false;
    const now = new Date();
    const start = new Date(data.sale.startDate);
    const end = new Date(data.sale.endDate);
    return now >= start && now <= end;
  }, [data.sale]);

  return (
    <>
      {type === 'grid' ? (
        <div className={`product-item grid-type ${colors.length > 0 ? 'has-colors' : ''}`}>
          {/* <Link href={`/product/${data.slug}`} className="product-main cursor-pointer block"> */}
          <div className="product-main block cursor-pointer">
            <div className="product-thumb relative overflow-hidden rounded-2xl bg-white outline outline-1 outline-line">
              {isNewProduct && (
                <div className="product-tag text-button-uppercase absolute left-3 top-3 z-[1] inline-block rounded-full bg-green px-3 py-0.5">
                  New
                </div>
              )}
              {saleInfo.hasActiveSale && (
                <div className="product-tag text-button-uppercase absolute left-3 top-3 z-[1] inline-block rounded-full bg-red px-3 py-0.5 text-white">
                  Sale
                </div>
              )}
              <div className="list-action-right absolute right-3 top-3 max-lg:hidden">
                {/* {session?.user && ( */}
                <div
                  className={`add-wishlist-btn relative mb-2 flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white duration-300 ${isInWishlist ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToWishlist();
                  }}
                >
                  <div className="tag-action caption2 rounded-sm bg-black px-1.5 py-0.5 text-white">
                    Add To Wishlist
                  </div>
                  {isInWishlist ? (
                    <>
                      <Icon.Heart size={18} weight="fill" className="text-white" />
                    </>
                  ) : (
                    <>
                      <Icon.Heart size={18} />
                    </>
                  )}
                </div>
                {/* )} */}
                <div
                  className={`compare-btn relative flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white duration-300 ${session?.user ? 'mt-2' : ''} ${compareState.compareArray.some((item) => item._id === data._id) ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCompare();
                  }}
                >
                  <div className="tag-action caption2 rounded-sm bg-black px-1.5 py-0.5 text-white">
                    Compare Product
                  </div>
                  <Icon.Repeat size={18} className={`compare-icon ${!showCheck ? 'show' : ''}`} />
                  <Icon.CheckCircle
                    size={20}
                    className={`checked-icon ${showCheck ? 'show' : ''}`}
                  />
                </div>
              </div>
              <Link
                href={`/product/${data.slug}`}
                prefetch
                className="product-img block aspect-[3/4] h-full w-full"
              >
                <Image
                  fetchPriority="high"
                  loading="eager"
                  threshold={20}
                  effect={'blur'}
                  placeholderSrc={`${getProductImageCdnUrl(rawData)}`}
                  src={getProductImageCdnUrl(rawData)}
                  alt={data.name}
                  wrapperProps={{
                    style: { transitionDelay: '0.15s' },
                  }}
                  className="h-full w-full object-cover duration-700"
                  wrapperClassName="w-full h-full object-cover duration-700"
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
                  <Marquee className="banner-sale-auto absolute bottom-0 left-0 w-full bg-black py-1.5">
                    <div className={`caption2 px-2.5 font-semibold uppercase text-white`}>
                      Hot Sale {saleInfo.percentOff}% OFF
                    </div>
                    <Icon.Lightning weight="fill" className="text-red" />
                    <div className={`caption2 px-2.5 font-semibold uppercase text-white`}>
                      Hot Sale {saleInfo.percentOff}% OFF
                    </div>
                    <Icon.Lightning weight="fill" className="text-red" />
                    <div className={`caption2 px-2.5 font-semibold uppercase text-white`}>
                      Hot Sale {saleInfo.percentOff}% OFF
                    </div>
                    <Icon.Lightning weight="fill" className="text-red" />
                    <div className={`caption2 px-2.5 font-semibold uppercase text-white`}>
                      Hot Sale {saleInfo.percentOff}% OFF
                    </div>
                    <Icon.Lightning weight="fill" className="text-red" />
                    <div className={`caption2 px-2.5 font-semibold uppercase text-white`}>
                      Hot Sale {saleInfo.percentOff}% OFF
                    </div>
                    <Icon.Lightning weight="fill" className="text-red" />
                  </Marquee>
                </>
              )}
              <div
                className="list-action absolute bottom-5 grid w-full gap-3 px-3 max-lg:hidden"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 105px), 1fr))',
                }}
              >
                <div
                  className="quick-view-btn text-button-uppercase w-full whitespace-nowrap rounded-full bg-white py-2 text-center duration-300 hover:bg-black hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickviewOpen();
                  }}
                >
                  Quick View
                </div>
                {!hasNonColorAttributes ? (
                  localStock > 0 ? (
                    <div
                      className="add-cart-btn text-button-uppercase w-full cursor-pointer whitespace-nowrap rounded-full bg-white px-0.5 py-2 text-center duration-500 hover:bg-black hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart();
                      }}
                    >
                      Add To Cart
                    </div>
                  ) : (
                    <div className="add-cart-btn text-button-uppercase w-full whitespace-nowrap rounded-full border border-line bg-surface/90 px-0.5 py-2 text-center text-xs text-secondary2 duration-500">
                      Out Of Stock
                    </div>
                  )
                ) : (
                  <>
                    <div
                      className="quick-shop-btn text-button-uppercase whitespace-nowrap rounded-full bg-white py-2 text-center duration-500 hover:bg-black hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenQuickShop(!openQuickShop);
                      }}
                    >
                      Quick Shop
                    </div>
                    <div
                      className={`quick-shop-block absolute left-4 right-4 rounded-[20px] bg-white p-4 ${openQuickShop ? 'open' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {sizes.length > 0 && (
                        <div className="list-size flex flex-wrap items-center justify-center gap-2">
                          {sizes.map((item, index) => (
                            <div
                              className={`size-item ${item !== 'freesize' ? 'h-10 w-10' : 'h-10 px-4'} text-button flex items-center justify-center rounded-full border border-line bg-white ${activeSize === item ? 'active' : ''}`}
                              key={index}
                              onClick={() => handleActiveSize(item)}
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      )}
                      {localStock > 0 ? (
                        <div
                          className="button-main mt-4 w-full cursor-pointer rounded-full py-3 text-center"
                          onClick={() => {
                            handleAddToCart();
                            setOpenQuickShop(false);
                          }}
                        >
                          Add To cart
                        </div>
                      ) : (
                        <div className="button-main mt-4 w-full rounded-full border border-line bg-surface/90 py-3 text-center text-secondary2">
                          Out Of Stock
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="list-action-icon absolute bottom-3 z-[1] flex w-full items-center justify-center gap-2 lg:hidden">
                <div
                  className="quick-view-btn flex h-9 w-9 items-center justify-center rounded-lg bg-white duration-300 hover:bg-black hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickviewOpen();
                  }}
                >
                  <Icon.Eye className="text-lg" />
                </div>
                <div
                  className="add-cart-btn flex h-9 w-9 items-center justify-center rounded-lg bg-white duration-300 hover:bg-black hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart();
                  }}
                >
                  <Icon.ShoppingBagOpen className="text-lg" />
                </div>
              </div>
            </div>
            <div className="product-infor mt-4 lg:mb-7">
              <ProductNameColors
                nameColorsUi={{
                  slug: data.slug,
                  name: data.name,
                  colors,
                  activeColor,
                  onColorSelect: handleActiveColor,
                }}
              />
              <ProductPriceBlock
                priceUi={{
                  hasActiveSale: saleInfo.hasActiveSale,
                  discountedPrice: saleInfo.discountedPrice,
                  originalPrice: saleInfo.originalPrice,
                  percentOff: saleInfo.percentOff,
                  basePrice: data.price,
                }}
              />
              <ProductSalesLeft
                saleUi={{
                  showSaleProgress,
                  percentSold,
                  availableStock,
                  soldQuantity,
                  showFlashSaleCountdown,
                  saleEndDate: data.sale?.endDate,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
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
