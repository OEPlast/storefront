'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { IShipment } from '@/types/shipment';

interface ShipmentInfoDisplayProps {
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

// Get status color classes
const getStatusColor = (status: IShipment['status']): string => {
  switch (status) {
    case 'Delivered':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Shipped':
    case 'Dispatched':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'In-Warehouse':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Returned':
    case 'Failed':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function ShipmentInfoDisplay({ shipment }: ShipmentInfoDisplayProps) {
  const { shippingAddress } = shipment;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="p-6 border border-line rounded-xl bg-surface">
        <div className="flex items-center justify-between mb-4">
          <h6 className="heading6">Shipment Status</h6>
          <span
            className={`px-4 py-2 rounded-lg text-sm font-semibold border ${getStatusColor(
              shipment.status
            )}`}
          >
            {shipment.status}
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Courier */}
          {shipment.courier && (
            <div className="flex items-start gap-3">
              <Icon.Truck className="text-xl text-secondary flex-shrink-0 mt-1" />
              <div>
                <div className="text-sm text-secondary">Courier</div>
                <div className="font-semibold text-title">{shipment.courier}</div>
              </div>
            </div>
          )}

          {/* Estimated Delivery */}
          {shipment.estimatedDelivery && !shipment.deliveredOn && (
            <div className="flex items-start gap-3">
              <Icon.CalendarDots className="text-xl text-secondary flex-shrink-0 mt-1" />
              <div>
                <div className="text-sm text-secondary">Estimated Delivery</div>
                <div className="font-semibold text-title">
                  {formatDate(shipment.estimatedDelivery)}
                </div>
              </div>
            </div>
          )}

          {/* Delivered On */}
          {shipment.deliveredOn && (
            <div className="flex items-start gap-3">
              <Icon.CheckCircle className="text-xl text-green-600 flex-shrink-0 mt-1" />
              <div>
                <div className="text-sm text-secondary">Delivered On</div>
                <div className="font-semibold text-title">{formatDate(shipment.deliveredOn)}</div>
              </div>
            </div>
          )}

          {/* Order Reference */}
          {shipment.orderId && typeof shipment.orderId === 'object' && (
            <div className="flex items-start gap-3">
              <Icon.FileText className="text-xl text-secondary flex-shrink-0 mt-1" />
              <div>
                <div className="text-sm text-secondary">Order Number</div>
                <div className="font-semibold text-title">{shipment.orderId._id}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shipping Address Card */}
      <div className="p-6 border border-line rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Icon.MapPin className="text-xl text-secondary" />
          <h6 className="heading6">Shipping Address</h6>
        </div>

        <div className="space-y-2">
          <div className="font-semibold text-title">
            {shippingAddress.firstName} {shippingAddress.lastName}
          </div>
          <div className="text-secondary">{shippingAddress.phoneNumber}</div>
          <div className="text-secondary">
            <div>{shippingAddress.address1}</div>
            {shippingAddress.address2 && <div>{shippingAddress.address2}</div>}
            <div>
              {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
            </div>
            <div>{shippingAddress.country}</div>
          </div>
        </div>
      </div>

      {/* Notes (if any) */}
      {shipment.notes && (
        <div className="p-6 border border-line rounded-xl bg-yellow-50">
          <div className="flex items-start gap-3">
            <Icon.Info className="text-xl text-yellow-800 flex-shrink-0 mt-1" />
            <div>
              <div className="font-semibold text-yellow-900 mb-1">Note</div>
              <div className="text-sm text-yellow-800">{shipment.notes}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
