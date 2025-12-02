'use client'
import React, { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext'
import { useModalCartContext } from '@/context/ModalCartContext'
import Rate from '@/components/Other/Rate'
import { getCdnUrl } from '@/libs/cdn-url'
import { useCompareProducts } from '@/hooks/queries/useProducts'
import type { ProductDimension, ProductDetail } from '@/types/product'
import { formatToNaira } from '@/utils/currencyFormatter'

const CompareContent = () => {
    const searchParams = useSearchParams();
    const identifiers = searchParams.get('identifiers')?.split(',').filter(Boolean) || [];
    const { addToCart } = useCart();
    const { openModalCart } = useModalCartContext();

    // Fetch all products using the bulk comparison API
    const { data: loadedProductsData, isLoading, isError, error } = useCompareProducts(identifiers);

    // Filter out null products (not found)
    const loadedProducts = (loadedProductsData || []).filter((p): p is ProductDetail => p !== null);

    // Track which products are unavailable (null)
    const productsWithAvailability = (loadedProductsData || []).map((product, index) => ({
        product,
        identifier: identifiers[index],
        isAvailable: product !== null,
    }));

    const handleAddToCart = (productItem: ProductDetail) => {
        // Add product to cart with quantity 1 and no specific attributes/variant
        addToCart(productItem, 1, []);
        openModalCart();
    };

    // Helper: pick best image for compare
    const selectCompareImage = (product: ProductDetail): string => {
        const descCover = product.description_images?.find((img) => img.cover_image)?.url
        if (descCover) return descCover
        const firstDesc = product.description_images?.[0]?.url
        if (firstDesc) return firstDesc
        return ''
    }

    const normalizeKey = (s: string) => s.trim().toLowerCase();

    // Build merged specification rows (only from available products)
    const specKeyToLabel = new Map<string, string>();
    loadedProducts.forEach(p => (p.specifications ?? []).forEach(spec => {
        const norm = normalizeKey(spec.key);
        if (!specKeyToLabel.has(norm)) specKeyToLabel.set(norm, spec.key);
    }));
    const mergedSpecs = Array.from(specKeyToLabel.entries()).map(([norm, label]) => ({
        label,
        values: productsWithAvailability.map(({ product }) =>
            product ? ((product.specifications ?? []).find(s => normalizeKey(s.key) === norm)?.value ?? 'N/A') : 'N/A'
        ),
    }));

    // Build merged dimension rows (only from available products)
    const dimOrder: Array<ProductDimension['key']> = ['length', 'breadth', 'height', 'volume', 'width', 'weight'];
    const dimKeysSet = new Set<string>();
    loadedProducts.forEach(p => (p.dimension ?? []).forEach(d => dimKeysSet.add(d.key)));
    const orderedDimKeys = [
        ...dimOrder.filter(k => dimKeysSet.has(k)),
        ...Array.from(dimKeysSet).filter(k => !dimOrder.includes(k as ProductDimension['key'])),
    ];
    const mergedDims = orderedDimKeys.map(key => ({
        key,
        values: productsWithAvailability.map(({ product }) =>
            product ? ((product.dimension ?? []).find(d => d.key === key)?.value ?? 'N/A') : 'N/A'
        ),
    }));

    // Show loading state
    if (isLoading) {
        return (
            <>
                <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1] py-20">
                    <div className="text-content">
                        <div className="heading2 text-center">Loading products...</div>
                    </div>
                </div>
            </>
        );
    }

    // Show error state
    if (isError && loadedProducts.length === 0) {
        return (
            <>
                <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1] py-20">
                    <div className="text-content">
                        <div className="heading2 text-center text-red-600">Error loading products</div>
                        <p className="text-center mt-4">Unable to load product comparison. Please try again.</p>
                        <Link href="/" className="button-main mt-6 inline-block">
                            Go Home
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    // Show empty state
    if (identifiers.length === 0 || loadedProducts.length === 0) {
        return (
            <>
                <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1] py-20">
                    <div className="text-content">
                        <div className="heading2 text-center">No products to compare</div>
                        <p className="text-center mt-4">Add products to your comparison list to see them here.</p>
                        <Link href="/" className="button-main mt-6 inline-block">
                            Start Shopping
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                <div className="text-content">
                    <div className="heading2 text-center">Compare Products</div>
                </div>
            </div>
            <div className="compare-block md:py-20 py-10">
                <div className="container">
                    <div className="content-main">
                        <div>
                            <div className="list-product flex">
                                <div className="left lg:w-[240px] w-[170px] flex-shrink-0"></div>
                                <div className="right flex w-full border border-line rounded-t-2xl border-b-0">
                                    {productsWithAvailability.map(({ product, identifier, isAvailable }, index) => (
                                        <div className={`product-item w-full px-10 pt-6 pb-5 border-r border-line last:border-r-0 ${!isAvailable ? 'bg-gray-200' : ''}`} key={identifier}>
                                            {isAvailable && product ? (
                                                <>
                                                    <div className="bg-img w-full aspect-[3/4] rounded-lg overflow-hidden flex-shrink-0">
                                                        <Image
                                                            src={getCdnUrl(selectCompareImage(product))}
                                                            width={1000}
                                                            height={1500}
                                                            alt={product.name}
                                                            className='w-full h-full object-cover'
                                                        />
                                                    </div>
                                                    <div className="text-title text-center mt-4">{product.name}</div>
                                                    <div className="caption2 font-semibold text-secondary2 uppercase text-center mt-1">{product.brand}</div>
                                                </>
                                            ) : (
                                                <div className="w-full aspect-[3/4] flex items-center justify-center">
                                                    <div className="text-center">
                                                        <div className="text-title">Product Unavailable</div>
                                                        <div className="caption2 text-secondary2 mt-2">Not found</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="compare-table flex">
                                <div className="left lg:w-[240px] w-[170px] flex-shrink-0 border border-line border-r-0 rounded-l-2xl">
                                    <div className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line">Rating</div>
                                    <div className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line">Price</div>
                                    <div className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line">Category</div>
                                    <div className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line">Brand</div>
                                    <div className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line">SKU</div>
                                    <div className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line">Stock</div>
                                    <div className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line">Add To Cart</div>
                                    {/* Dynamic Specifications */}
                                    {mergedSpecs.map((row) => (
                                        <div key={`spec-left-${row.label}`} className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line">
                                            {row.label}
                                        </div>
                                    ))}
                                    {/* Dynamic Dimensions */}
                                    {mergedDims.map((row) => (
                                        <div key={`dim-left-${row.key}`} className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line capitalize">
                                            {row.key}
                                        </div>
                                    ))}
                                </div>
                                <table className="right border-collapse w-full border-t border-r border-line">
                                    <tbody>
                                        <tr className={`flex w-full items-center`}>
                                            {productsWithAvailability.map(({ product, identifier, isAvailable }, index) => (
                                                <td className={`w-full border border-line h-[60px] border-t-0 border-r-0 ${!isAvailable ? 'bg-gray-200' : ''}`} key={identifier}>
                                                    <div className='h-full flex items-center justify-center'>
                                                        {isAvailable && product ? (
                                                            <>
                                                                <Rate currentRate={product.rating || 0} size={12} />
                                                                <p className='pl-1'>({product.rating?.toFixed(1) || '0.0'})</p>
                                                            </>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className={`flex w-full items-center`}>
                                            {productsWithAvailability.map(({ product, identifier, isAvailable }, index) => (
                                                <td className={`w-full border border-line h-[60px] border-t-0 border-r-0 ${!isAvailable ? 'bg-gray-200' : ''}`} key={identifier}>
                                                    <div className='h-full flex items-center justify-center'>
                                                        {isAvailable && product ? `${formatToNaira(product.price)}` : null}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className={`flex w-full items-center`}>
                                            {productsWithAvailability.map(({ product, identifier, isAvailable }, index) => (
                                                <td className={`w-full border border-line h-[60px] border-t-0 border-r-0 ${!isAvailable ? 'bg-gray-200' : ''}`} key={identifier}>
                                                    <div className='h-full flex items-center justify-center capitalize'>
                                                        {isAvailable && product ? (product.category?.name || 'N/A') : null}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className={`flex w-full items-center`}>
                                            {productsWithAvailability.map(({ product, identifier, isAvailable }, index) => (
                                                <td className={`w-full border border-line h-[60px] border-t-0 border-r-0 ${!isAvailable ? 'bg-gray-200' : ''}`} key={identifier}>
                                                    <div className='h-full flex items-center justify-center capitalize'>
                                                        {isAvailable && product ? (product.brand || 'N/A') : null}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className={`flex w-full items-center`}>
                                            {productsWithAvailability.map(({ product, identifier, isAvailable }, index) => (
                                                <td className={`w-full border border-line h-[60px] border-t-0 border-r-0 ${!isAvailable ? 'bg-gray-200' : ''}`} key={identifier}>
                                                    <div className='h-full flex items-center justify-center'>
                                                        {isAvailable && product ? (product.sku || 'N/A') : null}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className={`flex w-full items-center`}>
                                            {productsWithAvailability.map(({ product, identifier, isAvailable }, index) => (
                                                <td className={`w-full border border-line h-[60px] border-t-0 border-r-0 ${!isAvailable ? 'bg-gray-200' : ''}`} key={identifier}>
                                                    <div className='h-full flex items-center justify-center'>
                                                        {isAvailable && product && product.stock !== undefined ? (
                                                            <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                                                                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className={`flex w-full items-center`}>
                                            {productsWithAvailability.map(({ product, identifier, isAvailable }, index) => (
                                                <td className={`w-full border border-line h-[60px] border-t-0 border-r-0 ${!isAvailable ? 'bg-gray-200' : ''}`} key={identifier}>
                                                    <div className='h-full flex items-center justify-center'>
                                                        {isAvailable && product ? (
                                                            <div
                                                                className='button-main py-1.5 px-5 cursor-pointer'
                                                                onClick={() => handleAddToCart(product)}
                                                            >
                                                                Add To Cart
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        {/* Dynamic Specification rows */}
                                        {mergedSpecs.map((row, rIdx) => (
                                            <tr key={`spec-row-${rIdx}`} className={`flex w-full items-center`}>
                                                {row.values.map((val, cIdx) => {
                                                    const isAvailable = productsWithAvailability[cIdx].isAvailable;
                                                    return (
                                                        <td key={cIdx} className={`w-full border border-line h-[60px] border-t-0 border-r-0 ${!isAvailable ? 'bg-gray-200' : ''}`}>
                                                            <div className='h-full flex items-center justify-center'>
                                                                {isAvailable ? val : null}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        {/* Dynamic Dimension rows */}
                                        {mergedDims.map((row, rIdx) => (
                                            <tr key={`dim-row-${rIdx}`} className={`flex w-full items-center`}>
                                                {row.values.map((val, cIdx) => {
                                                    const isAvailable = productsWithAvailability[cIdx].isAvailable;
                                                    return (
                                                        <td key={cIdx} className={`w-full border border-line h-[60px] border-t-0 border-r-0 ${!isAvailable ? 'bg-gray-200' : ''}`}>
                                                            <div className='h-full flex items-center justify-center capitalize'>
                                                                {isAvailable ? val : null}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

const Compare = () => {
    return (
        <Suspense fallback={
            <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1] py-20">
                <div className="text-content">
                    <div className="heading2 text-center">Loading...</div>
                </div>
            </div>
        }>
            <CompareContent />
        </Suspense>
    )
}

export default Compare

