import { Metadata } from 'next';
import React from 'react';
import WeekProductsClient from './WeekProductsClient';

export const metadata: Metadata = {
    title: 'Top of the Week - Best Selling Products',
    description: 'Discover the most popular products from the last 7 days. Shop what\'s trending this week.',
};

export default function WeekProductsPage() {
    return <WeekProductsClient />;
}
