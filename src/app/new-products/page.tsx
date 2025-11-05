import { Metadata } from 'next';
import React from 'react';
import NewProductsClient from './NewProductsClient';

export const metadata: Metadata = {
    title: 'New Arrivals - Latest Products',
    description: 'Discover our newest products and latest arrivals. Shop the freshest additions to our collection.',
};

export default function NewProductsPage() {
    return <NewProductsClient />;
}
