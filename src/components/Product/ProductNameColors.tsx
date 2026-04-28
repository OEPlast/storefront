'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircleIcon } from '@phosphor-icons/react';

interface ProductColorItem {
    label: string;
    value: string;
    hex: string;
}

interface ProductNameColorsUi {
    slug: string;
    name: string;
    colors: ProductColorItem[];
    activeColor: string;
    onColorSelect: (color: string) => void;
}

interface ProductNameColorsProps {
    nameColorsUi: ProductNameColorsUi;
}

const ProductNameColors: React.FC<ProductNameColorsProps> = ({ nameColorsUi }) => {
    return (
        <div className="w-full relative">
            <Link
                href={`/product/${nameColorsUi.slug}`}
                prefetch
                className="product-name text-title duration-300 hover-underline-animation cursor-pointer "
            >
                {nameColorsUi.name}
            </Link>

            {nameColorsUi.colors.length > 0 && (
                <div className="list-color py-2 max-md:hidden flex items-center gap-3 flex-wrap duration-500">
                    {nameColorsUi.colors.map((item, index) => (
                        <div
                            key={index}
                            className={`color-item rounded-full duration-300 relative w-7 h-7 ${nameColorsUi.activeColor === item.value ? 'active' : 'outline outline-[0.6px] outline-gray-200'
                                }`}
                            style={{ backgroundColor: item.hex }}
                            onClick={(e) => {
                                e.stopPropagation();
                                nameColorsUi.onColorSelect(item.value);
                            }}
                        >
                            {nameColorsUi.activeColor === item.value ? (
                                <CheckCircleIcon className="text-gray-300 w-4 h-4 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                            ) : null}
                            <div className="tag-action bg-black text-white caption2 capitalize px-1.5 py-0.5 rounded-sm">
                                {item.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductNameColors;
