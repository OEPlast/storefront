'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TrackingNumberInput from '@/components/Order/TrackingNumberInput';
import ShipmentResults from './ShipmentResults';
import { useTrackShipment } from '@/hooks/queries/useTrackShipment';

export default function ShipmentClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackingNumber = searchParams.get('tracking') || '';
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
    setClearTrigger(prev => prev + 1);
    router.push('/order-tracking');
  };

  const showLoading = isSubmitting || isLoading || isFetching;

  return (
    <div className="container">
      <div className="content-main max-w-6xl mx-auto">
        {/* Input Section - Always visible */}
        <div className="mb-8">
          <div className="heading4 mb-2">Track Your Shipment</div>
          <div className="text-secondary mb-6">
            Enter your tracking number below to view real-time shipment status and delivery updates.
          </div>
          <TrackingNumberInput
            key={clearTrigger}
            initialValue={trackingNumber}
            onClear={handleClear}
          />
        </div>

        {/* Loading State */}
        {showLoading && trackingNumber && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mb-4"></div>
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
          <div className="text-center py-12 border border-line rounded-xl bg-surface">
            <svg
              className="w-20 h-20 mx-auto mb-4 text-secondary opacity-50"
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
            <h6 className="heading6 mb-2">Enter a Tracking Number</h6>
            <p className="text-secondary max-w-md mx-auto">
              Enter your tracking number above to get started. You can find this in your order
              confirmation email or shipping notification.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
