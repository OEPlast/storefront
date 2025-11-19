import React, { Suspense } from 'react';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import ShipmentClient from './ShipmentClient';

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
