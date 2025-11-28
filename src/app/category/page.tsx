'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TopNavOne from '@/components/Header/TopNav/TopNavOne';
import MenuEight from '@/components/Header/Menu/MenuEight';
// import ShopFilterCanvas from '@/components/Shop/ShopFilterCanvas'
import productData from '@/data/Product.json';
import Footer from '@/components/Footer/Footer';

export default function Fullwidth() {
    const searchParams = useSearchParams();
    const type = searchParams.get('type');
    const category = searchParams.get('category');

    return (
        <>
            {/* <ShopFilterCanvas data={productData} productPerPage={12} dataType={type} /> */}
            <Footer />
        </>
    );
}
