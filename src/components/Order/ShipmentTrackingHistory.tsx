'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { IShipment } from '@/types/shipment';

interface ShipmentTrackingHistoryProps {
  shipment: IShipment;
}

// Format date helper
const formatDate = (date: string | Date | undefined): string => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ShipmentTrackingHistory({ shipment }: ShipmentTrackingHistoryProps) {
  if (!shipment.trackingHistory || shipment.trackingHistory.length === 0) {
    return null;
  }

  // Sort tracking history by timestamp (most recent first)
  const sortedHistory = [...shipment.trackingHistory].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="p-6 border border-line rounded-xl">
      <h6 className="heading6 mb-6">Tracking History</h6>

      <div className="relative">
        {sortedHistory.map((track, index) => (
          <div key={track._id || index} className="relative">
            {/* Timeline dot and line */}
            <div className="flex gap-4">
              {/* Left side - Timeline */}
              <div className="flex flex-col items-center">
                {/* Icon/Dot */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-black flex items-center justify-center z-10">
                  <Icon.MapPin className="text-white text-lg" weight="fill" />
                </div>

                {/* Dashed line connecting to next item */}
                {index < sortedHistory.length - 1 && (
                  <div className="w-0.5 h-full min-h-[60px] border-l-2 border-dashed border-line my-2" />
                )}
              </div>

              {/* Right side - Content */}
              <div className="flex-1 pb-8">
                {/* Location */}
                {track.location && (
                  <div className="font-semibold text-title text-base mb-1">
                    {track.location}
                  </div>
                )}

                {/* Description */}
                {track.description && (
                  <div className="text-secondary mb-2">
                    {track.description}
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs text-secondary">
                  {formatDate(track.timestamp)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state message if no meaningful data */}
      {sortedHistory.length === 0 && (
        <div className="text-center py-8 text-secondary">
          <Icon.Package className="mx-auto text-4xl mb-2 opacity-50" />
          <p>No tracking updates available yet</p>
        </div>
      )}
    </div>
  );
}
