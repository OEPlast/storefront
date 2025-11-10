'use client';

import React, { useState, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Product from '@/components/Product/Product';
import HandlePagination from '@/components/Other/HandlePagination';
import CategoryFilterSidebar from '@/components/Shop/CategoryFilterSidebar';
import { useSearchResultProducts, useSearchResultFilters } from '@/hooks/queries/useProducts';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import type { SortOption, ProductListItem } from '@/types/product';
import Link from 'next/link';
import { SearchIcon, UnboxingIcon } from '@/components/Icons';

interface SearchResultClientProps {
    searchQuery: string;
}

type LayoutType = 'grid3' | 'grid4' | 'grid5';

// Map frontend SortOption to backend sortBy + sortOrder
const mapSortToBackend = (sort: SortOption): { sortBy: 'price' | 'name' | 'createdAt' | 'rating' | 'sales'; sortOrder: 'asc' | 'desc'; } => {
    switch (sort) {
        case 'alphabetical':
            return { sortBy: 'name', sortOrder: 'asc' };
        case 'newest':
            return { sortBy: 'createdAt', sortOrder: 'desc' };
        case 'price_asc':
            return { sortBy: 'price', sortOrder: 'asc' };
        case 'price_desc':
            return { sortBy: 'price', sortOrder: 'desc' };
        case 'rating':
            return { sortBy: 'rating', sortOrder: 'desc' };
        case 'popular':
        case 'order_frequency':
            return { sortBy: 'sales', sortOrder: 'desc' };
        default:
            return { sortBy: 'createdAt', sortOrder: 'desc' };
    }
};

export default function SearchResultClient({ searchQuery }: SearchResultClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // UI State
    const [openSidebar, setOpenSidebar] = useState<boolean>(false);
    const [layoutCol, setLayoutCol] = useState<LayoutType>('grid5');

    // Helper to get params (matching category page pattern)
    const getParam = useCallback(
        (key: string): string[] => {
            const params = searchParams;
            if (params) {
                const all = params.getAll(key);
                if (all.length > 0) return all;
                const single = params.get(key);
                if (single) return [single];
            }
            return [];
        },
        [searchParams]
    );

    // Update URL helper (matching category page pattern)
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

    // Validate sort value
    const validSortOptions: SortOption[] = ['alphabetical', 'newest', 'price_asc', 'price_desc', 'popular', 'stock', 'order_frequency', 'rating'];
    const sortParam = (sortValues[0] && validSortOptions.includes(sortValues[0] as SortOption))
        ? (sortValues[0] as SortOption)
        : 'newest';
    const page = getParam('page')[0] || '1';

    // Get all URL params for dynamic filter rendering
    const allParams = searchParams ? Object.fromEntries(searchParams.entries()) : {};
    const filterableParams = ['minPrice', 'maxPrice', 'inStock', 'packSize', 'tags', 'Color', 'sort', 'page', 'query'];

    // Extract attributes dynamically
    const activeAttributes: { key: string; value: string; }[] = [];
    Object.entries(allParams).forEach(([key, value]) => {
        if (!filterableParams.includes(key) && value) {
            activeAttributes.push({ key, value });
        }
    });

    // Fetch products with filters
    const { sortBy, sortOrder } = mapSortToBackend(sortParam);

    // Build attributes object from Color param and dynamic attributes
    const attributesMap: Record<string, string[]> = {};
    if (colorsParam.length > 0) {
        attributesMap['Color'] = colorsParam;
    }
    activeAttributes.forEach(attr => {
        attributesMap[attr.key] = [attr.value];
    });

    const {
        data: productsData,
        isLoading,
        isFetching,
        error: productError,
    } = useSearchResultProducts({
        query: searchQuery || undefined,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        inStock: inStock ? true : undefined,
        packSize,
        tags: tagsParam.length > 0 ? tagsParam : undefined,
        attributes: Object.keys(attributesMap).length > 0 ? attributesMap : undefined,
        sortBy,
        sortOrder,
        page: parseInt(page, 10),
        limit: 12,
    });

    // Fetch available filters
    const { data: filters, isLoading: filtersLoading } = useSearchResultFilters({
        query: searchQuery || undefined,
    });

    const products = productsData?.data;
    const meta = productsData?.meta;

    // Handlers
    const handleLayoutClick = (layout: LayoutType) => setLayoutCol(layout);

    const handleSortChange = (option: SortOption) => {
        updateParam('sort', option);
    };

    const handlePageChange = (selected: number) => {
        const params = new URLSearchParams(searchParams?.toString());
        params.set('page', (selected + 1).toString());
        router.replace(`${pathname}?${params.toString()}`, { scroll: true });
    };

    const clearAllFilters = () => {
        const params = new URLSearchParams();
        if (searchQuery) {
            params.set('query', searchQuery);
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handleOpenSidebar = () => {
        setOpenSidebar(prev => !prev);
    };

    const hasActiveFilters =
        minPrice ||
        maxPrice ||
        inStock ||
        packSize ||
        tagsParam.length > 0 ||
        colorsParam.length > 0 ||
        activeAttributes.length > 0;

    // Layout grid classes (matching category page)
    const gridClass =
        layoutCol === 'grid3'
            ? 'grid xl:grid-cols-3 sm:grid-cols-2 grid-cols-1'
            : layoutCol === 'grid4'
                ? 'grid xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 grid-cols-1'
                : 'grid xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-3 grid-cols-2';

    return (
        <>

            {/* Filter Sidebar */}
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

            {/* Product List */}
            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                <div className="container">
                    <div className="list-product-block relative">
                        {/* Filter Controls */}
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
                                <label htmlFor='select-filter' className="caption1 capitalize">Sort by</label>
                                <div className="select-block relative">
                                    <select
                                        id="select-filter"
                                        name="select-filter"
                                        className='caption1 py-2 pl-3 md:pr-20 pr-10 rounded-lg border border-line'
                                        onChange={(e) => { handleSortChange(e.target.value as SortOption); }}
                                        value={sortParam}
                                    >
                                        <option value="newest">Newest</option>
                                        <option value="alphabetical">A-Z</option>
                                        <option value="price_asc">Price Low To High</option>
                                        <option value="price_desc">Price High To Low</option>
                                        <option value="popular">Popular</option>
                                        <option value="order_frequency">Best Selling</option>
                                        <option value="rating">Highest Rated</option>
                                    </select>
                                    <Icon.CaretDown size={12} className='absolute top-1/2 -translate-y-1/2 md:right-4 right-2' />
                                </div>
                            </div>
                        </div>

                        {/* Active Filters Display */}
                        <div className="list-filtered flex items-center gap-3 mt-4">
                            <div className="total-product">
                                {(isLoading || isFetching) ? 'Loading...' :
                                    <>
                                        {meta?.total || 0}
                                        <span className='text-secondary pl-1'>Products Found</span>
                                    </>
                                }
                            </div>
                            {hasActiveFilters && (
                                <>
                                    <div className="list flex items-center gap-3">
                                        <div className='w-px h-4 bg-line'></div>

                                        {/* Price filters */}
                                        {minPrice && (
                                            <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => updateParam('minPrice', undefined, false)}>
                                                <Icon.X className='cursor-pointer' />
                                                <span>Min: ₦{minPrice}</span>
                                            </div>
                                        )}
                                        {maxPrice && (
                                            <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => updateParam('maxPrice', undefined, false)}>
                                                <Icon.X className='cursor-pointer' />
                                                <span>Max: ₦{maxPrice}</span>
                                            </div>
                                        )}

                                        {/* In Stock filter */}
                                        {inStock && (
                                            <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => updateParam('inStock', undefined, false)}>
                                                <Icon.X className='cursor-pointer' />
                                                <span>In Stock</span>
                                            </div>
                                        )}

                                        {/* Pack Size filter */}
                                        {packSize && (
                                            <div className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize" onClick={() => updateParam('packSize', undefined, false)}>
                                                <Icon.X className='cursor-pointer' />
                                                <span>Pack: {packSize}</span>
                                            </div>
                                        )}

                                        {/* Tags filters */}
                                        {tagsParam.map((tag) => (
                                            <div
                                                key={tag}
                                                className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize"
                                                onClick={() => {
                                                    const newTags = tagsParam.filter((t) => t !== tag);
                                                    updateParam('tags', newTags.length > 0 ? newTags : undefined, false);
                                                }}
                                            >
                                                <Icon.X className='cursor-pointer' />
                                                <span>{tag}</span>
                                            </div>
                                        ))}

                                        {/* Color filters */}
                                        {colorsParam.map((color) => (
                                            <div
                                                key={color}
                                                className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize"
                                                onClick={() => {
                                                    const newColors = colorsParam.filter((c) => c !== color);
                                                    updateParam('Color', newColors.length > 0 ? newColors : undefined, false);
                                                }}
                                            >
                                                <Icon.X className='cursor-pointer' />
                                                <span>{color}</span>
                                            </div>
                                        ))}

                                        {/* Dynamic attributes */}
                                        {activeAttributes.map((attr) => {
                                            const isColor = attr.key.toLowerCase() === 'color';

                                            if (isColor) {
                                                return (
                                                    <div
                                                        key={attr.key}
                                                        className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize"
                                                        onClick={() => updateParam(attr.key, undefined, false)}
                                                    >
                                                        <Icon.X className='cursor-pointer' />
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="w-4 h-4 rounded-full border border-line"
                                                                style={{ backgroundColor: attr.value }}
                                                            />
                                                            <span>{attr.value}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={attr.key}
                                                    className="item flex items-center px-2 py-1 gap-1 bg-linear rounded-full capitalize"
                                                    onClick={() => updateParam(attr.key, undefined, false)}
                                                >
                                                    <Icon.X className='cursor-pointer' />
                                                    <span>{attr.key}: {attr.value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div
                                        className="clear-btn flex items-center px-2 py-1 gap-1 rounded-full border border-red cursor-pointer"
                                        onClick={clearAllFilters}
                                    >
                                        <Icon.X color='rgb(219, 68, 68)' className='cursor-pointer' />
                                        <span className='text-button-uppercase text-red'>Clear All</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Error State */}
                        {productError && (
                            <div className="shop-product breadcrumb1 lg:py-20 md:py-14 py-10">
                                <div className="container">
                                    <div className="text-center text-red-500">
                                        Failed to load products. Please try again.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Product Grid */}
                        {!productError && (
                            <div className={`list-product hide-product-sold ${gridClass} sm:gap-[30px] gap-[20px] mt-7`}>
                                {isLoading ? (
                                    Array.from({ length: 12 }).map((_, i) => (
                                        <div key={i} className="bg-gray-300 animate-pulse h-80 rounded-lg" />
                                    ))
                                ) : products && products.length > 0 ? (
                                    products.map((product: ProductListItem) => (
                                        <Product key={product._id} data={product} type="grid" />
                                    ))
                                ) : (
                                    <div className="col-span-full text-center text-secondary2 py-10 min-h-[400px]">

                                        <SearchIcon className='w-3/12 h-3/12 inline-flex justify-center' />
                                        <p className='text-sm md:text-md'>No products found for <span className='text-black underline'>{searchQuery}</span> <br />. Change search query or filters to see more products.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pagination */}
                        {meta && meta.pages > 1 && (
                            <div className="list-pagination flex items-center justify-center md:mt-10 mt-7">
                                <HandlePagination
                                    pageCount={meta.pages}
                                    onPageChange={handlePageChange}
                                    initialPage={parseInt(page, 10) - 1}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
