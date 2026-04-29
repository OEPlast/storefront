'use client';

import React from 'react';
import Link from 'next/link';
import * as Icon from "@phosphor-icons/react/dist/ssr";
import type { ProductDetail } from '@/hooks/queries/useProduct';

interface Props {
    product: ProductDetail;
}

const BreadcrumbProduct: React.FC<Props> = ({ product }) => {
    // Breadcrumbs for visual navigation. JSON-LD is injected from the product page
    return (
        <>
            <div className="breadcrumb-product">
                <div className="main bg-surface py-[14px]">
                    <div className="container flex items-center justify-between flex-wrap gap-3">
                        <div className="left flex items-center gap-1">
                            <Link href={'/'} className='caption1 text-secondary2 hover:underline'>
                                Homepage
                            </Link>
                            <Icon.CaretRight size={12} className='text-secondary2' />
                            {product.category && (
                                <>
                                    <Link
                                        href={`/shop/category/${product.category.slug}`}
                                        className='caption1 text-secondary2 hover:underline'
                                    >
                                        {product.category.name}
                                    </Link>
                                    <Icon.CaretRight size={12} className='text-secondary2' />
                                </>
                            )}
                            <div className='caption1 capitalize text-black'>{product.name}</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BreadcrumbProduct;