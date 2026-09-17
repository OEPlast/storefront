'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TrackingNumberInput from '@/components/Order/TrackingNumberInput';
import ShipmentResults from './ShipmentResults';
import { useTrackShipment } from '@/hooks/queries/useTrackShipment';
import OrderLookup from './OrderLookup';

export default function ShipmentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackingNumber = searchParams.get('tracking') || '';
  // Order emails link here with ?order=<orderNumber>; a courier tracking number arrives as ?tracking=.
  const orderParam = searchParams.get('order') || '';
  const [mode, setMode] = useState<'order' | 'tracking'>(trackingNumber ? 'tracking' : 'order');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clearTrigger, setClearTrigger] = useState(0);

  // Query for shipment data
  const { data: shipment, isLoading, error, isFetching } = useTrackShipment(trackingNumber);

  // Reset submitting state when data loads or error occurs
  useEffect(() => {
    if (!isFetching && isSubmitting) {
      setIsSubmitting(false);
    }
  }, [isFetching, isSubmitting]);

  // Trigger immediate loading feedback when tracking number changes
  useEffect(() => {
    if (trackingNumber) {
      setIsSubmitting(true);
    }
  }, [trackingNumber]);

  const handleClear = () => {
    setIsSubmitting(false);
    setClearTrigger((prev) => prev + 1);
    router.push('/order-tracking');
  };

  const showLoading = isSubmitting || isLoading || isFetching;

  const tabClass = (active: boolean) =>
    `flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold duration-300 ${active ? 'bg-black text-white' : 'text-secondary hover:text-black'}`;

  return (
    <div className="container">
      <div className="content-main mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="heading4 mb-2">Track your order</h1>
          <p className="mb-6 text-secondary">
            Use your order number and email, or the courier tracking number from your shipping
            email.
          </p>
          <div
            role="tablist"
            aria-label="How to track"
            className="mb-6 flex max-w-md gap-1 rounded-xl border border-line p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'order'}
              className={tabClass(mode === 'order')}
              onClick={() => setMode('order')}
            >
              Order number
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'tracking'}
              className={tabClass(mode === 'tracking')}
              onClick={() => setMode('tracking')}
            >
              Tracking number
            </button>
          </div>
          {mode === 'order' && <OrderLookup key={orderParam} initialOrderNumber={orderParam} />}
          {mode === 'tracking' && (
            <TrackingNumberInput
              key={clearTrigger}
              initialValue={trackingNumber}
              onClear={handleClear}
            />
          )}
        </div>

        {mode === 'tracking' && (
          <>
            {/* Loading State */}
            {showLoading && trackingNumber && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-black"></div>
                <p className="text-secondary">Loading shipment information...</p>
              </div>
            )}

            {/* Results Section - Show when we have a tracking number and not loading */}
            {trackingNumber && !showLoading && (
              <ShipmentResults
                trackingNumber={trackingNumber}
                shipment={shipment || null}
                error={error}
              />
            )}

            {/* Empty State - No tracking number entered yet */}
            {!trackingNumber && !showLoading && (
              <div className="rounded-xl border border-line bg-surface py-12 text-center">
                <svg
                  className="mx-auto mb-4 h-20 w-20 text-secondary opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h2 className="heading6 mb-2">Enter a Tracking Number</h2>
                <p className="mx-auto max-w-md text-secondary">
                  Enter your tracking number above to get started. You can find this in your order
                  confirmation email or shipping notification.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
