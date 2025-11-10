'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Footer from '@/components/Footer/Footer'
import { useCart } from '@/context/CartContext'
import { useModalCartContext } from '@/context/ModalCartContext'
import Rate from '@/components/Other/Rate'
import { getCdnUrl } from '@/libs/cdn-url'
import { useProductBySlug } from '@/hooks/queries/useProducts'
import type { ProductSpecification, ProductDimension, ProductDetail } from '@/types/product'

const CompareClient = () => {
    const searchParams = useSearchParams();
    const productSlugs = searchParams.get('products')?.split(',').filter(Boolean) || [];
    const { addToCart } = useCart();
    const { openModalCart } = useModalCartContext();

    // Fetch all products using React Query
    const productQueries = productSlugs.map(slug =>
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useProductBySlug(slug)
    );

    // Check loading states
    const isLoading = productQueries.some(query => query.isLoading);
    const hasError = productQueries.some(query => query.isError);

    // Get successfully loaded products
    const loadedProducts = productQueries
        .filter(query => query.data)
        .map(query => query.data as ProductDetail);

    // Helper: pick best image for compare
    const selectCompareImage = (product: ProductDetail): string => {
        const descCover = product.description_images?.find((img) => img.cover_image)?.url
        if (descCover) return descCover
        const firstDesc = product.description_images?.[0]?.url
        if (firstDesc) return firstDesc
        return ''
    }

    const normalizeKey = (s: string) => s.trim().toLowerCase();

    // Build merged specification rows
    const specKeyToLabel = new Map<string, string>();
    loadedProducts.forEach(p => (p.specifications ?? []).forEach(spec => {
        const norm = normalizeKey(spec.key);
        if (!specKeyToLabel.has(norm)) specKeyToLabel.set(norm, spec.key);
    }));
    const mergedSpecs = Array.from(specKeyToLabel.entries()).map(([norm, label]) => ({
        label,
        values: loadedProducts.map(p => (p.specifications ?? []).find(s => normalizeKey(s.key) === norm)?.value ?? ''),
    }));

    // Build merged dimension rows
    const dimOrder: Array<ProductDimension['key']> = ['length', 'breadth', 'height', 'volume', 'width', 'weight'];
    const dimKeysSet = new Set<string>();
    loadedProducts.forEach(p => (p.dimension ?? []).forEach(d => dimKeysSet.add(d.key)));
    const orderedDimKeys = [
        ...dimOrder.filter(k => dimKeysSet.has(k)),
        ...Array.from(dimKeysSet).filter(k => !dimOrder.includes(k as ProductDimension['key'])),
    ];
    const mergedDims = orderedDimKeys.map(key => ({
        key,
        values: loadedProducts.map(p => (p.dimension ?? []).find(d => d.key === key)?.value ?? ''),
    }));

    const handleAddToCart = (product: ProductDetail) => {
        // Simple add to cart without full conversion
        addToCart({
            id: product._id,
            name: product.name,
            price: product.price,
            slug: product.slug,
            quantity: 1,
        } as any);
        openModalCart();
    };

    // Show loading state
    if (isLoading) {
        return (
            <>
                <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1] py-20">
                    <div className="text-content">
                        <div className="heading2 text-center">Loading products...</div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    // Show error state
    if (hasError && loadedProducts.length === 0) {
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
                <Footer />
            </>
        );
    }

    // Show empty state
    if (productSlugs.length === 0 || loadedProducts.length === 0) {
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
                <Footer />
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
                                    {loadedProducts.map(item => (
                                        <div className="product-item px-10 pt-6 pb-5 border-r border-line" key={item._id}>
                                            <div className="bg-img w-full aspect-[3/4] rounded-lg overflow-hidden flex-shrink-0">
                                                <Image
                                                    src={getCdnUrl(selectCompareImage(item))}
                                                    width={1000}
                                                    height={1500}
                                                    alt={item.name}
                                                    className='w-full h-full object-cover'
                                                />
                                            </div>
                                            <div className="text-title text-center mt-4">{item.name}</div>
                                            <div className="caption2 font-semibold text-secondary2 uppercase text-center mt-1">{item.brand}</div>
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
                                    {mergedSpecs.map((row) => (
                                        <div key={`spec-left-${row.label}`} className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line">
                                            {row.label}
                                        </div>
                                    ))}
                                    {mergedDims.map((row) => (
                                        <div key={`dim-left-${row.key}`} className="item text-button flex items-center h-[60px] px-8 w-full border-b border-line capitalize">
                                            {row.key}
                                        </div>
                                    ))}
                                </div>
                                <table className="right border-collapse w-full border-t border-r border-line">
                                    <tbody>
                                        <tr className="flex w-full items-center">
                                            {loadedProducts.map((item, index) => (
                                                <td className="w-full border border-line h-[60px] border-t-0 border-r-0" key={index}>
                                                    <div className='h-full flex items-center justify-center'>
                                                        <Rate currentRate={item.rating || 0} size={12} />
                                                        <p className='pl-1'>({item.rating?.toFixed(1) || '0.0'})</p>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="flex w-full items-center">
                                            {loadedProducts.map((item, index) => (
                                                <td className="w-full border border-line h-[60px] border-t-0 border-r-0" key={index}>
                                                    <div className='h-full flex items-center justify-center'>
                                                        ${item.price.toFixed(2)}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="flex w-full items-center">
                                            {loadedProducts.map((item, index) => (
                                                <td className="w-full border border-line h-[60px] border-t-0 border-r-0" key={index}>
                                                    <div className='h-full flex items-center justify-center capitalize'>
                                                        {item.category?.name || '-'}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="flex w-full items-center">
                                            {loadedProducts.map((item, index) => (
                                                <td className="w-full border border-line h-[60px] border-t-0 border-r-0" key={index}>
                                                    <div className='h-full flex items-center justify-center capitalize'>
                                                        {item.brand || '-'}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="flex w-full items-center">
                                            {loadedProducts.map((item, index) => (
                                                <td className="w-full border border-line h-[60px] border-t-0 border-r-0" key={index}>
                                                    <div className='h-full flex items-center justify-center'>
                                                        {item.sku || '-'}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="flex w-full items-center">
                                            {loadedProducts.map((item, index) => (
                                                <td className="w-full border border-line h-[60px] border-t-0 border-r-0" key={index}>
                                                    <div className='h-full flex items-center justify-center'>
                                                        {item.stock !== undefined ? (
                                                            <span className={item.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                                                                {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                                                            </span>
                                                        ) : '-'}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        <tr className="flex w-full items-center">
                                            {loadedProducts.map((item, index) => (
                                                <td className="w-full border border-line h-[60px] border-t-0 border-r-0" key={index}>
                                                    <div className='h-full flex items-center justify-center'>
                                                        <div
                                                            className='button-main py-1.5 px-5 cursor-pointer'
                                                            onClick={() => handleAddToCart(item)}
                                                        >
                                                            Add To Cart
                                                        </div>
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                        {mergedSpecs.map((row, rIdx) => (
                                            <tr key={`spec-row-${rIdx}`} className="flex w-full items-center">
                                                {row.values.map((val, cIdx) => (
                                                    <td key={cIdx} className="w-full border border-line h-[60px] border-t-0 border-r-0">
                                                        <div className='h-full flex items-center justify-center'>
                                                            {val || '-'}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        {mergedDims.map((row, rIdx) => (
                                            <tr key={`dim-row-${rIdx}`} className="flex w-full items-center">
                                                {row.values.map((val, cIdx) => (
                                                    <td key={cIdx} className="w-full border border-line h-[60px] border-t-0 border-r-0">
                                                        <div className='h-full flex items-center justify-center capitalize'>
                                                            {val || '-'}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default CompareClient
