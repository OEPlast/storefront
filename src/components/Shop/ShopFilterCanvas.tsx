'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { ProductType } from '@/type/ProductType'
import Product from '../Product/Product';
import HandlePagination from '../Other/HandlePagination';
import SubCategorySlider from './SubCategorySlider';
import { useProductFilters } from '@/hooks/useProductFilters';
import {
    ProductTypeFilter,
    SizeFilter,
    PriceRangeFilter,
    ColorFilter,
    BrandFilter,
} from './FilterSections';

interface Props {
    data: Array<ProductType>;
    productPerPage: number
    dataType: string | null
}

// Sub-categories configuration (can be moved to a separate config file)
const SUB_CATEGORIES = [
    { name: 'All', slug: 'all', image: '/images/product/fashion/1-1.png' },
    { name: 'Clothing', slug: 'clothing', image: '/images/product/fashion/2-1.png' },
    { name: 'Shoes', slug: 'shoes', image: '/images/product/fashion/3-1.png' },
    { name: 'Jewelry & Accessories', slug: 'jewelry', image: '/images/product/fashion/4-1.png' },
    { name: 'Underwear & Sleepwear', slug: 'underwear', image: '/images/product/fashion/5-1.png' },
    { name: 'Bags', slug: 'bags', image: '/images/product/fashion/6-1.png' },
    { name: 'Watches', slug: 'watches', image: '/images/product/fashion/7-1.png' },
    { name: 'Sports', slug: 'sports', image: '/images/product/fashion/8-1.png' },
    { name: 'All', slug: 'all', image: '/images/product/fashion/1-1.png' },
    { name: 'Clothing', slug: 'clothing', image: '/images/product/fashion/2-1.png' },
    { name: 'Shoes', slug: 'shoes', image: '/images/product/fashion/3-1.png' },
    { name: 'Jewelry & Accessories', slug: 'jewelry', image: '/images/product/fashion/4-1.png' },
    { name: 'Underwear & Sleepwear', slug: 'underwear', image: '/images/product/fashion/5-1.png' },
    { name: 'Bags', slug: 'bags', image: '/images/product/fashion/6-1.png' },
    { name: 'Watches', slug: 'watches', image: '/images/product/fashion/7-1.png' },
    { name: 'Sports', slug: 'sports', image: '/images/product/fashion/8-1.png' },
    { name: 'All', slug: 'all', image: '/images/product/fashion/1-1.png' },
    { name: 'Clothing', slug: 'clothing', image: '/images/product/fashion/2-1.png' },
    { name: 'Shoes', slug: 'shoes', image: '/images/product/fashion/3-1.png' },
    { name: 'Jewelry & Accessories', slug: 'jewelry', image: '/images/product/fashion/4-1.png' },
    { name: 'Underwear & Sleepwear', slug: 'underwear', image: '/images/product/fashion/5-1.png' },
    { name: 'Bags', slug: 'bags', image: '/images/product/fashion/6-1.png' },
    { name: 'Watches', slug: 'watches', image: '/images/product/fashion/7-1.png' },
    { name: 'Sports', slug: 'sports', image: '/images/product/fashion/8-1.png' },
    { name: 'All', slug: 'all', image: '/images/product/fashion/1-1.png' },
    { name: 'Clothing', slug: 'clothing', image: '/images/product/fashion/2-1.png' },
    { name: 'Shoes', slug: 'shoes', image: '/images/product/fashion/3-1.png' },
    { name: 'Jewelry & Accessories', slug: 'jewelry', image: '/images/product/fashion/4-1.png' },
    { name: 'Underwear & Sleepwear', slug: 'underwear', image: '/images/product/fashion/5-1.png' },
    { name: 'Bags', slug: 'bags', image: '/images/product/fashion/6-1.png' },
    { name: 'Watches', slug: 'watches', image: '/images/product/fashion/7-1.png' },
    { name: 'Sports', slug: 'sports', image: '/images/product/fashion/8-1.png' },
    { name: 'All', slug: 'all', image: '/images/product/fashion/1-1.png' },
    { name: 'Clothing', slug: 'clothing', image: '/images/product/fashion/2-1.png' },
    { name: 'Shoes', slug: 'shoes', image: '/images/product/fashion/3-1.png' },
    { name: 'Jewelry & Accessories', slug: 'jewelry', image: '/images/product/fashion/4-1.png' },
    { name: 'Underwear & Sleepwear', slug: 'underwear', image: '/images/product/fashion/5-1.png' },
    { name: 'Bags', slug: 'bags', image: '/images/product/fashion/6-1.png' },
    { name: 'Watches', slug: 'watches', image: '/images/product/fashion/7-1.png' },
    { name: 'Sports', slug: 'sports', image: '/images/product/fashion/8-1.png' },
];

const ShopFilterCanvas: React.FC<Props> = ({ data, productPerPage, dataType }) => {
    const [layoutCol, setLayoutCol] = useState<number | null>(4)
    const [openSidebar, setOpenSidebar] = useState(false)

    // Use the custom hook for all filtering logic
    const filters = useProductFilters(data, dataType, productPerPage);

    const handleLayoutCol = (col: number) => {
        setLayoutCol(col)
    }

    const handleOpenSidebar = () => {
        setOpenSidebar(prev => !prev)
    }

    // Destructure values from the filter hook for easier access
    const {
        showOnlySale,
        sortOption,
        type,
        size,
        color,
        brand,
        priceRange,
        currentPage,
        currentProducts,
        totalProducts,
        pageCount,
        handleShowOnlySale,
        handleSortChange,
        handleType,
        handleSize,
        handlePriceChange,
        handleColor,
        handleBrand,
        handlePageChange,
        handleClearAll,
    } = filters;

    return (
        <>
            <div className="breadcrumb-block style-img">
                <div className="breadcrumb-main bg-linear overflow-hidden">
                    <div className="container lg:pt-[134px] pt-24 pb-10 relative">
                        <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                            <div className="text-content">
                                <div className="heading2 text-center">{dataType === null ? 'Shop' : dataType}</div>
                                <div className="link flex items-center justify-center gap-1 caption1 mt-3">
                                    <Link href={'/'}>Homepage</Link>
                                    <Icon.CaretRight size={14} className='text-secondary2' />
                                    <div className='text-secondary2 capitalize'>{dataType === null ? 'Shop' : dataType}</div>
                                </div>
                            </div>

                            {/* Sub-category slider with circular images */}
                            <SubCategorySlider
                                categories={SUB_CATEGORIES}
                                activeCategory={type}
                                onCategoryClick={handleType}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div
                className={`sidebar style-canvas ${openSidebar ? 'open' : ''}`}
                onClick={handleOpenSidebar}
            >
                <div className="sidebar-main" onClick={(e) => { e.stopPropagation() }}>
                    <div className="heading flex items-center justify-between">
                        <div className="heading5">Filters</div>
                        <Icon.X size={20} weight='bold' onClick={handleOpenSidebar} className='cursor-pointer' />
                    </div>

                    {/* Optimized filter sections using iteration */}
                    <ProductTypeFilter
                        data={data}
                        activeType={type}
                        onTypeClick={handleType}
                    />
                    <SizeFilter
                        activeSize={size}
                        onSizeClick={handleSize}
                    />
                    <PriceRangeFilter
                        priceRange={priceRange}
                        onPriceChange={handlePriceChange}
                    />
                    <ColorFilter
                        activeColor={color}
                        onColorClick={handleColor}
                    />
                    <BrandFilter
                        data={data}
                        activeBrand={brand}
                        onBrandChange={handleBrand}
                    />
                </div>
            </div>

            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="list-product-block relative">
                        <div className="filter-heading flex items-center justify-between gap-5 flex-wrap">
                            <div className="left flex has-line items-center flex-wrap gap-5">
                                <div
                                    className="filter-sidebar-btn flex items-center gap-2 cursor-pointer"
                                    onClick={handleOpenSidebar}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path d="M4 21V14" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M4 10V3" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M12 21V12" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M12 8V3" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M20 21V16" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M20 12V3" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M1 14H7" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M9 8H15" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M17 16H23" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span>Filters</span>
                                </div>
                                <div className="choose-layout flex items-center gap-2">
                                    <div
                                        className={`item three-col p-2 border border-line rounded flex items-center justify-center cursor-pointer ${layoutCol === 3 ? 'active' : ''}`}
                                        onClick={() => handleLayoutCol(3)}
                                    >
                                        <div className='flex items-center gap-0.5'>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        </div>
                                    </div>
                                    <div
                                        className={`item four-col p-2 border border-line rounded flex items-center justify-center cursor-pointer ${layoutCol === 4 ? 'active' : ''}`}
                                        onClick={() => handleLayoutCol(4)}
                                    >
                                        <div className='flex items-center gap-0.5'>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        </div>
                                    </div>
                                    <div
                                        className={`item five-col p-2 border border-line rounded flex items-center justify-center cursor-pointer ${layoutCol === 5 ? 'active' : ''}`}
                                        onClick={() => handleLayoutCol(5)}
                                    >
                                        <div className='flex items-center gap-0.5'>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="check-sale flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="filterSale"
                                        id="filter-sale"
                                        className='border-line'
                                        onChange={handleShowOnlySale}
                                    />
                                    <label htmlFor="filter-sale" className='cation1 cursor-pointer'>Show only products on sale</label>
                                </div>
                            </div>
                            <div className="right flex items-center gap-3">
                                <label htmlFor='select-filter' className="caption1 capitalize">Sort by</label>
                                <div className="select-block relative">
                                    <select
                                        id="select-filter"
                                        name="select-filter"
                                        className='caption1 py-2 pl-3 md:pr-20 pr-10 rounded-lg border border-line'
                                        onChange={(e) => { handleSortChange(e.target.value) }}
                                        defaultValue={'Sorting'}
                                    >
                                        <option value="Sorting" disabled>Sorting</option>
                                        <option value="soldQuantityHighToLow">Best Selling</option>
                                        <option value="discountHighToLow">Best Discount</option>
                                        <option value="priceHighToLow">Price High To Low</option>
                                        <option value="priceLowToHigh">Price Low To High</option>
                                    </select>
                                    <Icon.CaretDown size={12} className='absolute top-1/2 -translate-y-1/2 md:right-4 right-2' />
                                </div>
                            </div>
                        </div>



                        <div className="list-filtered flex items-center gap-3 mt-4">
                            <div className="total-product">
                                {totalProducts}
                                <span className='text-secondary pl-1'>Products Found</span>
                            </div>
                            {
                                (type || size || color || brand) && (
                                    <>
                                        <div className="list flex items-center gap-3">
                                            <div className='w-px h-4 bg-line'></div>
                                            {type && (
                                                <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleType(type)}>
                                                    <Icon.X className='cursor-pointer' />
                                                    <span>{type}</span>
                                                </div>
                                            )}
                                            {size && (
                                                <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleSize(size)}>
                                                    <Icon.X className='cursor-pointer' />
                                                    <span>{size}</span>
                                                </div>
                                            )}
                                            {color && (
                                                <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleColor(color)}>
                                                    <Icon.X className='cursor-pointer' />
                                                    <span>{color}</span>
                                                </div>
                                            )}
                                            {brand && (
                                                <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => handleBrand(brand)}>
                                                    <Icon.X className='cursor-pointer' />
                                                    <span>{brand}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className="clear-btn flex items-center px-2 py-1 gap-1 rounded-full border border-red cursor-pointer"
                                            onClick={handleClearAll}
                                        >
                                            <Icon.X color='rgb(219, 68, 68)' className='cursor-pointer' />
                                            <span className='text-button-uppercase text-red'>Clear All</span>
                                        </div>
                                    </>
                                )
                            }
                        </div>

                        <div className={`list-product hide-product-sold grid lg:grid-cols-${layoutCol} sm:grid-cols-3 grid-cols-2 sm:gap-[30px] gap-[20px] mt-7`}>
                            {currentProducts.map((item) => (
                                item.id === 'no-data' ? (
                                    <div key={item.id} className="no-data-product">No products match the selected criteria.</div>
                                ) : (
                                    <Product key={item.id} data={item} type='grid' />
                                )
                            ))}
                        </div>

                        {pageCount > 1 && (
                            <div className="list-pagination flex items-center justify-center md:mt-10 mt-7">
                                <HandlePagination pageCount={pageCount} onPageChange={handlePageChange} />
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </>
    )
}

export default ShopFilterCanvas