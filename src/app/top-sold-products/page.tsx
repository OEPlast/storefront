import { Metadata } from 'next';
import React from 'react';
import TopSoldProductsClient from './TopSoldProductsClient';

export const metadata: Metadata = {
    title: 'Best Sellers - Top Selling Products of All Time',
    description: 'Shop our most popular products. Discover customer favorites and best-selling items.',
};

export default function TopSoldProductsPage() {
    return <TopSoldProductsClient />;
}
