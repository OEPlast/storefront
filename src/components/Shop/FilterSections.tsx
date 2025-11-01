'use client'

import React from 'react'
import * as Icon from '@phosphor-icons/react/dist/ssr'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'

// Filter Types Config
export const FILTER_CONFIG = {
    productTypes: ['t-shirt', 'dress', 'top', 'swimwear', 'shirt', 'underwear', 'sets', 'accessories'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'freesize'],
    colors: [
        { name: 'pink', bg: 'bg-[#F4C5BF]' },
        { name: 'red', bg: 'bg-red' },
        { name: 'green', bg: 'bg-green' },
        { name: 'yellow', bg: 'bg-yellow' },
        { name: 'purple', bg: 'bg-purple' },
        { name: 'black', bg: 'bg-black' },
        { name: 'white', bg: 'bg-[#F6EFDD]' },
    ],
    brands: ['adidas', 'hermes', 'zara', 'nike', 'gucci'],
}

interface ProductTypeFilterProps {
    data: any[]
    activeType: string | null
    onTypeClick: (type: string) => void
}

export const ProductTypeFilter: React.FC<ProductTypeFilterProps> = ({ data, activeType, onTypeClick }) => {
    return (
        <div className="filter-type pb-8 border-b border-line mt-7">
            <div className="heading6">Products Type</div>
            <div className="list-type mt-4">
                {FILTER_CONFIG.productTypes.map((item, index) => (
                    <div
                        key={index}
                        className={`item flex items-center justify-between cursor-pointer ${activeType === item ? 'active' : ''}`}
                        onClick={() => onTypeClick(item)}
                    >
                        <div className="text-secondary has-line-before hover:text-black capitalize">{item}</div>
                        <div className="text-secondary2">
                            ({data.filter((dataItem) => dataItem.type === item && dataItem.category === 'fashion').length})
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

interface SizeFilterProps {
    activeSize: string | null
    onSizeClick: (size: string) => void
}

export const SizeFilter: React.FC<SizeFilterProps> = ({ activeSize, onSizeClick }) => {
    return (
        <div className="filter-size pb-8 border-b border-line mt-8">
            <div className="heading6">Size</div>
            <div className="list-size flex items-center flex-wrap gap-3 gap-y-4 mt-4">
                {FILTER_CONFIG.sizes.map((item, index) => (
                    <div
                        key={index}
                        className={`size-item text-button ${item === 'freesize' ? 'px-4 py-2' : 'w-[44px] h-[44px]'
                            } flex items-center justify-center rounded-full border border-line ${activeSize === item ? 'active' : ''}`}
                        onClick={() => onSizeClick(item)}
                    >
                        {item}
                    </div>
                ))}
            </div>
        </div>
    )
}

interface PriceRangeFilterProps {
    priceRange: { min: number; max: number }
    onPriceChange: (values: number | number[]) => void
}

export const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({ priceRange, onPriceChange }) => {
    return (
        <div className="filter-price pb-8 border-b border-line mt-8">
            <div className="heading6">Price Range</div>
            <Slider
                range
                defaultValue={[0, 100]}
                min={0}
                max={100}
                onChange={onPriceChange}
                className="mt-5"
            />
            <div className="price-block flex items-center justify-between flex-wrap mt-4">
                <div className="min flex items-center gap-1">
                    <div>Min price:</div>
                    <div className="price-min">
                        $<span>{priceRange.min}</span>
                    </div>
                </div>
                <div className="min flex items-center gap-1">
                    <div>Max price:</div>
                    <div className="price-max">
                        $<span>{priceRange.max}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface ColorFilterProps {
    activeColor: string | null
    onColorClick: (color: string) => void
}

export const ColorFilter: React.FC<ColorFilterProps> = ({ activeColor, onColorClick }) => {
    return (
        <div className="filter-color pb-8 border-b border-line mt-8">
            <div className="heading6">colors</div>
            <div className="list-color flex items-center flex-wrap gap-3 gap-y-4 mt-4">
                {FILTER_CONFIG.colors.map((colorItem, index) => (
                    <div
                        key={index}
                        className={`color-item px-3 py-[5px] flex items-center justify-center gap-2 rounded-full border border-line ${activeColor === colorItem.name ? 'active' : ''
                            }`}
                        onClick={() => onColorClick(colorItem.name)}
                    >
                        <div className={`color ${colorItem.bg} w-5 h-5 rounded-full`}></div>
                        <div className="caption1 capitalize">{colorItem.name}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

interface BrandFilterProps {
    data: any[]
    activeBrand: string | null
    onBrandChange: (brand: string) => void
}

export const BrandFilter: React.FC<BrandFilterProps> = ({ data, activeBrand, onBrandChange }) => {
    return (
        <div className="filter-brand pb-8 mt-8">
            <div className="heading6">Brands</div>
            <div className="list-brand mt-4">
                {FILTER_CONFIG.brands.map((item, index) => (
                    <div key={index} className="brand-item flex items-center justify-between">
                        <div className="left flex items-center cursor-pointer">
                            <div className="block-input">
                                <input
                                    type="checkbox"
                                    name={item}
                                    id={item}
                                    checked={activeBrand === item}
                                    onChange={() => onBrandChange(item)}
                                />
                                <Icon.CheckSquare size={20} weight="fill" className="icon-checkbox" />
                            </div>
                            <label htmlFor={item} className="brand-name capitalize pl-2 cursor-pointer">
                                {item}
                            </label>
                        </div>
                        <div className="text-secondary2">
                            ({data.filter((dataItem) => dataItem.brand === item && dataItem.category === 'fashion').length})
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
