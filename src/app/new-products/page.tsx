import { Metadata } from 'next';
import React from 'react';
import NewProductsClient from './NewProductsClient';
import { getDefaultMetadata } from '@/libs/seo';

export const metadata: Metadata = getDefaultMetadata({
    title: 'New Arrivals - Latest Products',
    description: 'Discover our newest products and latest arrivals. Shop the freshest additions to our collection.',
    keywords: ['new arrivals', 'latest products', 'new items', 'shop new', 'fresh arrivals'],
    openGraph: {
        title: 'New Arrivals - Latest Products',
        description: 'Discover our newest products and latest arrivals. Shop the freshest additions to our collection.',
    },
});

export default function NewProductsPage() {
    return <NewProductsClient />;
}
