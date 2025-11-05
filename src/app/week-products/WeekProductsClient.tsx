'use client';

import React, { useCallback, useState } from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import HandlePagination from '@/components/Other/HandlePagination';
import Product from '@/components/Product/Product';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useWeekProducts } from '@/hooks/queries/useProductLists';
import { useWeekProductsFilters } from '@/hooks/queries/useProductFilters';
import CategoryFilterSidebar from '@/components/Shop/CategoryFilterSidebar';
import type { SortOption } from '@/types/product';

type LayoutType = 'grid3' | 'grid4' | 'grid5';

const SORT_OPTIONS: { value: SortOption; label: string; }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'alphabetical', label: 'A-Z' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'order_frequency', label: 'Best Selling' },
    { value: 'rating', label: 'Highest Rated' },
];

export default function WeekProductsClient() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [openSidebar, setOpenSidebar] = useState<boolean>(false);
    const [layoutCol, setLayoutCol] = useState<LayoutType>('grid5');

    // Helper to get params
    const getParam = useCallback(
        (key: string): string[] => {
            if (!searchParams) return [];
            const all = searchParams.getAll(key);
            if (all.length > 0) return all;
            const single = searchParams.get(key);
            if (single) return [single];
            return [];
        },
        [searchParams]
    );

    // Update URL helper
    const updateParam = useCallback(
        (key: string, value: string | string[] | undefined, resetPage = true) => {
            const params = new URLSearchParams(searchParams?.toString());
            if (resetPage) params.delete('page');
            params.delete(key);

            if (Array.isArray(value)) {
                value.forEach((v) => params.append(key, v));
            } else if (value) {
                params.set(key, value);
            }

            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [router, pathname, searchParams]
    );

    // Extract current filter state from URL
    const minPrice = getParam('minPrice')[0];
    const maxPrice = getParam('maxPrice')[0];
    const inStock = getParam('inStock')[0] === 'true';
    const packSize = getParam('packSize')[0];
    const tagsParam = getParam('tags');
    const colorsParam = getParam('Color');
    const sortValues = getParam('sort');

    const validSortOptions: SortOption[] = [
        'alphabetical',
        'newest',
        'price_asc',
        'price_desc',
        'popular',
        'stock',
        'order_frequency',
        'rating',
    ];
    const sortParam =
        sortValues[0] && validSortOptions.includes(sortValues[0] as SortOption)
            ? (sortValues[0] as SortOption)
            : 'order_frequency';
    const page = getParam('page')[0] || '1';

    // Get all URL params for dynamic filter rendering
    const allParams = searchParams ? Object.fromEntries(searchParams.entries()) : {};
    const filterableParams = ['minPrice', 'maxPrice', 'inStock', 'packSize', 'tags', 'Color', 'sort', 'page'];

    // Extract attributes dynamically
    const activeAttributes: { key: string; value: string; }[] = [];
    Object.entries(allParams).forEach(([key, value]) => {
        if (!filterableParams.includes(key) && value) {
            activeAttributes.push({ key, value });
        }
    });

    // API queries
    const { data: filters, isLoading: filtersLoading } = useWeekProductsFilters();

    const {
        data: productsData,
        isLoading,
        isFetching,
    } = useWeekProducts({
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        inStock: inStock ? true : undefined,
        packSize,
        tags: tagsParam.length > 0 ? tagsParam : undefined,
        attributes: colorsParam.length > 0 ? { Color: colorsParam } : undefined,
        sort: [sortParam],
        page: parseInt(page, 10),
        limit: 12,
    });

    const products = productsData?.data;
    const meta = productsData?.meta;

    // Handlers
    const handleLayoutClick = (layout: LayoutType) => setLayoutCol(layout);

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const option = e.target.value as SortOption;
        updateParam('sort', option);
    };

    const handlePageChange = (selected: number) => {
        const params = new URLSearchParams(searchParams?.toString());
        params.set('page', (selected + 1).toString());
        router.replace(`${pathname}?${params.toString()}`, { scroll: true });
    };

    const clearAllFilters = () => {
        router.replace(pathname, { scroll: false });
    };

    const handleOpenSidebar = () => {
        setOpenSidebar((prev) => !prev);
    };

    const hasActiveFilters =
        minPrice || maxPrice || inStock || packSize || tagsParam.length > 0 || colorsParam.length > 0 || activeAttributes.length > 0;

    // Layout grid classes
    const gridClass =
        layoutCol === 'grid3'
            ? 'grid xl:grid-cols-3 sm:grid-cols-2 grid-cols-1'
            : layoutCol === 'grid4'
                ? 'grid xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1'
                : 'grid xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 grid-cols-2';

    return (
        <>
            {/* Simple Text Header */}
            <div className="breadcrumb-block style-shared bg-surface">
                <div className="breadcrumb-main overflow-hidden">
                    <div className="container lg:pt-[134px] pt-24 pb-10 relative">
                        <div className="main-content w-full h-full flex flex-col items-center justify-center relative z-[1]">
                            <div className="text-content">
                                <div className="heading2 text-center">Top of the Week</div>
                                <div className="link flex items-center justify-center gap-1 caption1 mt-3">
                                    <Link href="/">Homepage</Link>
                                    <Icon.CaretRight size={14} className="text-secondary2" />
                                    <div className="text-secondary2 capitalize">Top of the Week</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Canvas Sidebar */}
            <div
                className={`sidebar style-canvas ${openSidebar ? 'open' : ''}`}
                onClick={handleOpenSidebar}
            >
                <div className="sidebar-main" onClick={(e) => { e.stopPropagation(); }}>
                    <div className="heading flex items-center justify-between">
                        <div className="heading5">Filters</div>
                        <Icon.X size={20} weight='bold' onClick={handleOpenSidebar} className='cursor-pointer' />
                    </div>
                    <CategoryFilterSidebar filters={filters} isLoading={filtersLoading} />
                </div>
            </div>

            {/* Main Content */}
            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="list-product-block relative">
                        {/* Toolbar */}
                        <div className="filter-heading flex items-center justify-between gap-5 flex-wrap">
                            <div className="left flex has-line items-center flex-wrap gap-5">
                                <div
                                    className="filter-sidebar-btn flex items-center gap-2 cursor-pointer"
                                    onClick={() => setOpenSidebar(true)}
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
                                        className={`item three-col p-2 border border-line rounded flex items-center justify-center cursor-pointer ${layoutCol === 'grid3' ? 'active' : ''}`}
                                        onClick={() => handleLayoutClick('grid3')}
                                    >
                                        <div className='flex items-center gap-0.5'>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        </div>
                                    </div>
                                    <div
                                        className={`item four-col p-2 border border-line rounded flex items-center justify-center cursor-pointer ${layoutCol === 'grid4' ? 'active' : ''}`}
                                        onClick={() => handleLayoutClick('grid4')}
                                    >
                                        <div className='flex items-center gap-0.5'>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                            <span className='w-[3px] h-4 bg-secondary2 rounded-sm'></span>
                                        </div>
                                    </div>
                                    <div
                                        className={`item five-col p-2 border border-line rounded flex items-center justify-center cursor-pointer ${layoutCol === 'grid5' ? 'active' : ''}`}
                                        onClick={() => handleLayoutClick('grid5')}
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
                            </div>
                            <div className="right flex items-center gap-3">
                                <label htmlFor="select-filter" className="caption1 capitalize">
                                    Sort by
                                </label>
                                <div className="select-block relative">
                                    <select
                                        id="select-filter"
                                        name="select-filter"
                                        className="caption1 py-2 pl-3 md:pr-20 pr-10 rounded-lg border border-line"
                                        value={sortParam}
                                        onChange={handleSortChange}
                                    >
                                        {SORT_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    <Icon.CaretDown size={12} className="absolute top-1/2 -translate-y-1/2 md:right-4 right-2" />
                                </div>
                            </div>
                        </div>

                        {/* Active Filters */}
                        {hasActiveFilters && (
                            <div className="filter-tags flex items-center gap-3 flex-wrap mt-4">
                                <div className="caption1 text-secondary2 font-semibold">Active filters:</div>
                                {minPrice && (
                                    <div className="tag bg-white px-3 py-1.5 border border-line rounded-full flex items-center gap-2">
                                        <span className="caption2">Min: ${minPrice}</span>
                                        <button onClick={() => updateParam('minPrice', undefined)}>
                                            <Icon.X size={12} />
                                        </button>
                                    </div>
                                )}
                                {maxPrice && (
                                    <div className="tag bg-white px-3 py-1.5 border border-line rounded-full flex items-center gap-2">
                                        <span className="caption2">Max: ${maxPrice}</span>
                                        <button onClick={() => updateParam('maxPrice', undefined)}>
                                            <Icon.X size={12} />
                                        </button>
                                    </div>
                                )}
                                {inStock && (
                                    <div className="tag bg-white px-3 py-1.5 border border-line rounded-full flex items-center gap-2">
                                        <span className="caption2">In Stock</span>
                                        <button onClick={() => updateParam('inStock', undefined)}>
                                            <Icon.X size={12} />
                                        </button>
                                    </div>
                                )}
                                {packSize && (
                                    <div className="tag bg-white px-3 py-1.5 border border-line rounded-full flex items-center gap-2">
                                        <span className="caption2">Pack: {packSize}</span>
                                        <button onClick={() => updateParam('packSize', undefined)}>
                                            <Icon.X size={12} />
                                        </button>
                                    </div>
                                )}
                                {tagsParam.map((tag) => (
                                    <div
                                        key={tag}
                                        className="tag bg-white px-3 py-1.5 border border-line rounded-full flex items-center gap-2"
                                    >
                                        <span className="caption2">{tag}</span>
                                        <button
                                            onClick={() => {
                                                const newTags = tagsParam.filter((t) => t !== tag);
                                                updateParam('tags', newTags.length > 0 ? newTags : undefined);
                                            }}
                                        >
                                            <Icon.X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {colorsParam.map((color) => (
                                    <div
                                        key={color}
                                        className="tag bg-white px-3 py-1.5 border border-line rounded-full flex items-center gap-2"
                                    >
                                        <span className="caption2">Color: {color}</span>
                                        <button
                                            onClick={() => {
                                                const newColors = colorsParam.filter((c) => c !== color);
                                                updateParam('Color', newColors.length > 0 ? newColors : undefined);
                                            }}
                                        >
                                            <Icon.X size={12} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={clearAllFilters}
                                    className="text-button-uppercase text-red underline"
                                >
                                    Clear All
                                </button>
                            </div>
                        )}

                        {/* Products Grid */}
                        <div className={`list-filtered mt-7 ${gridClass} sm:gap-[30px] gap-[20px]`}>
                            {isLoading || isFetching ? (
                                <div className="col-span-full text-center py-10">
                                    <div className="text-secondary">Loading products...</div>
                                </div>
                            ) : products && products.length > 0 ? (
                                products.map((product, index) => (
                                    <Product key={index} data={product} type="grid" />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-10">
                                    <div className="text-secondary">No products found matching your filters.</div>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {meta && meta.pages > 1 && (
                            <div className="list-pagination w-full flex items-center justify-center md:mt-10 mt-7">
                                <HandlePagination
                                    pageCount={meta.pages}
                                    onPageChange={handlePageChange}
                                    initialPage={meta.page - 1}
                                />\n                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
