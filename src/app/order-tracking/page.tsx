import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import ShipmentClient from './ShipmentClient';
import { getDefaultMetadata } from '@/libs/seo';

export const metadata: Metadata = getDefaultMetadata({
    title: 'Order Tracking',
    description: 'Track your order status and delivery. Enter your tracking number to see real-time updates.',
    keywords: ['order tracking', 'track order', 'delivery status', 'shipment tracking'],
    openGraph: {
        title: 'Order Tracking',
        description: 'Track your order status and delivery. Enter your tracking number to see real-time updates.',
    },
});

export default async function OrderTrackingPage() {
  return (
    <>
      <div id="header" className="relative w-full">
        <Breadcrumb heading="Order Tracking" />
      </div>
      <br />
      <div className="order-tracking md:py-20 py-10">
        <Suspense
          fallback={
            <div className="container">
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mb-4"></div>
                <p className="text-secondary">Loading tracking page...</p>
              </div>
            </div>
          }
        >
          <ShipmentClient />
        </Suspense>
      </div>
    </>
  );
}
