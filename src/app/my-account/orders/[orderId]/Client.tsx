'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useOrderById } from '@/hooks/queries/useOrderById';
import { EnrichedOrder } from '@/types/order';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import OrderStatusTimeline from '@/components/Order/OrderStatusTimeline';
import OrderContactInfo from '@/components/Order/OrderContactInfo';
import OrderAddresses from '@/components/Order/OrderAddresses';
import OrderPaymentInfo from '@/components/Order/OrderPaymentInfo';
import OrderTrackingHistory from '@/components/Order/OrderTrackingHistory';
import OrderSummarySection from '@/components/Order/OrderSummarySection';
// import CancelOrderButton from '@/components/Order/CancelOrderButton';

interface OrderDetailsClientProps {
  orderId: string;
}

// Status badge styling helper
const getStatusBadge = (status: EnrichedOrder['status']) => {
  const statusConfig = {
    Pending: 'bg-yellow text-yellow',
    Processing: 'bg-purple text-purple',
    Completed: 'bg-success text-success',
    Cancelled: 'bg-red text-red',
    Failed: 'bg-red text-red',
  };

  return statusConfig[status] || 'bg-secondary text-secondary';
};

// Format date helper
const formatDate = (date: string | Date | undefined) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format currency helper
const formatCurrency = (amount: number) => {
  return `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function OrderDetailsClient({ orderId }: OrderDetailsClientProps) {
  const router = useRouter();
  const { data: order, isLoading, isError, error } = useOrderById(orderId);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Icon.CircleNotch className="text-5xl animate-spin text-black mx-auto" />
          <p className="mt-4 text-secondary">Loading order details...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (isError || !order) {
    return (
      <div className="order-detail-block md:py-20 py-10">
        <div className="container">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Icon.WarningCircle className="text-7xl text-red mb-4" />
            <h3 className="heading3 mb-2">Order Not Found</h3>
            <p className="text-secondary mb-6">
              {error?.message || 'The order you are looking for does not exist or you do not have permission to view it.'}
            </p>
            <button onClick={() => router.back()} className="button-main">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail-block md:py-20 py-10">
      <div className="container">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-secondary hover:text-black transition-colors mb-6"
        >
          <Icon.CaretLeft className="text-xl" />
          <span className="text-button">Back to Orders</span>
        </button>

        {/* Order header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-line">
          <div>
            <h3 className="heading3">Order #{order.orderNumber}</h3>
            <p className="text-secondary mt-2">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <span
            className={`tag px-5 py-2.5 rounded-full bg-opacity-10 text-button font-semibold ${getStatusBadge(order.status)}`}
          >
            {order.status}
          </span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left column - Order information */}
          <div className="space-y-6">
            <OrderStatusTimeline order={order} formatDate={formatDate} />
            <OrderTrackingHistory order={order} formatDate={formatDate} />
            <OrderContactInfo order={order} />
            <OrderAddresses order={order} />
            <OrderPaymentInfo order={order} formatDate={formatDate} />
          </div>

          {/* Right column - Products and Summary */}
          <OrderSummarySection order={order} formatCurrency={formatCurrency} />
        </div>
      </div>
    </div>
    // </div>
  );
}
