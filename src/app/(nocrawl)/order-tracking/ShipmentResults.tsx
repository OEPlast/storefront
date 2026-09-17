'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { IShipment } from '@/types/shipment';
import ShipmentInfoDisplay from '@/components/Order/ShipmentInfoDisplay';
import ShipmentTrackingHistory from '@/components/Order/ShipmentTrackingHistory';
import DeliveryTruck from '@/components/Icons/DeliveryTruck';

interface ShipmentResultsProps {
  trackingNumber: string;
  shipment: IShipment | null;
  error?: Error | null;
}

export default function ShipmentResults({ trackingNumber, shipment, error }: ShipmentResultsProps) {
  const router = useRouter();

  const handleClearResults = () => {
    router.push('/order-tracking');
  };

  // Error state - Shipment not found
  if (error || !shipment) {
    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h5 className="heading5">Tracking: {trackingNumber}</h5>
            <p className="text-sm text-secondary mt-1">Unable to find shipment information</p>
          </div>
          <button
            onClick={handleClearResults}
            className="px-6 py-3 border border-line rounded-lg hover:bg-surface transition-colors flex items-center gap-2"
          >
            <Icon.X className="text-lg" />
            Clear Results
          </button>
        </div>

        <div className="p-12 border border-line rounded-xl text-center bg-surface">
          <DeliveryTruck className="w-32 h-32 mx-auto mb-6" />
          <h6 className="heading6 mb-2">Shipment Not Found</h6>
          <p className="text-secondary mb-6 max-w-md mx-auto">
            Shipment not found.
            <br />
            Please check the tracking number and try again.
          </p>
          <button onClick={handleClearResults} className="button-main">
            Try Another Tracking Number
          </button>
        </div>
      </div>
    );
  }

  // Success state - Display shipment information
  return (
    <div className="mt-8">
      {/* Header with tracking number and clear button */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-line">
        <div>
          <h5 className="heading5">Tracking: {trackingNumber}</h5>
          <p className="text-sm text-secondary mt-1">
            Status: <span className="font-semibold text-title">{shipment.status}</span>
          </p>
        </div>
        <button
          onClick={handleClearResults}
          className="px-6 py-3 border border-line rounded-lg hover:bg-surface transition-colors flex items-center gap-2"
        >
          <Icon.X className="text-lg" />
          Clear Results
        </button>
      </div>

      {/* Shipment content in two-column grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column - Shipment info */}
        <div>
          <ShipmentInfoDisplay shipment={shipment} />
        </div>

        {/* Right column - Tracking history */}
        <div>
          <ShipmentTrackingHistory shipment={shipment} />
        </div>
      </div>
    </div>
  );
}
