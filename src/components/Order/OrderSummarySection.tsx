'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { EnrichedOrder } from '@/types/order';
import { getCdnUrl } from '@/libs/cdn-url';

interface OrderSummarySectionProps {
  order: EnrichedOrder;
  formatCurrency: (amount: number) => string;
}

// Product Item Component - using enriched product data
const OrderProductItem = ({
  product,
  index,
  formatCurrency,
}: {
  product: EnrichedOrder['products'][0];
  index: number;
  formatCurrency: (amount: number) => string;
}) => {
  return (
    <div className="flex gap-4 border-b border-line pb-5 last:border-0 last:pb-0">
      <div className="bg-img h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface">
        <Image
          src={getCdnUrl(product.image) || '/images/product/1000x1000.png'}
          width={100}
          height={100}
          alt={product.name}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex-1">
        <Link
          href={`/product/${product.slug}`}
          className="text-title line-clamp-2 font-semibold hover:underline"
        >
          {product.name}
        </Link>
        {product.attributes && product.attributes.length > 0 && (
          <div className="caption1 mt-2 flex gap-2 text-secondary">
            {product.attributes.map((attr, i) => (
              <span key={i}>
                <span className="capitalize">{attr.name}:</span> {attr.value}
                {i < product.attributes.length - 1 && <span className="mx-1">/</span>}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-secondary">Qty: {product.quantity}</span>
          <span className="text-secondary">×</span>
          <span className="text-title font-semibold">{formatCurrency(product.price)}</span>
        </div>
        {product.sale && product.saleDiscount > 0 && (
          <div className="mt-1">
            <span className="rounded bg-red/10 px-2 py-0.5 text-xs text-red">
              -{+product.saleDiscount.toFixed(2)}% Sale Discount
            </span>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-title font-semibold">
          {formatCurrency(product.price * product.quantity)}
        </div>
      </div>
    </div>
  );
};

export default function OrderSummarySection({ order, formatCurrency }: OrderSummarySectionProps) {
  // Calculate order totals
  const subtotal = order.totalBeforeDiscount || order.total;
  const discount = order.couponDiscount || 0;
  const shipping = order.shippingPrice || 0;
  const tax = order.taxPrice || 0;

  return (
    <div className="space-y-6">
      {/* Products List */}
      <div className="rounded-xl border border-line p-6">
        <h6 className="heading6 mb-6">Order Items ({order.products.length})</h6>
        <div className="space-y-5">
          {order.products.map((product, index) => (
            <OrderProductItem
              key={index}
              product={product}
              index={index}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="rounded-xl border border-line bg-surface p-6">
        <h6 className="heading6 mb-6">Order Summary</h6>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-secondary">Subtotal:</span>
            <span className="text-title font-semibold">{formatCurrency(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between">
              <span className="text-secondary">
                Discount {order.coupon.code && `(${order.coupon.code})`}:
              </span>
              <span className="font-semibold text-green-500">-{formatCurrency(discount)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-secondary">Shipping ({order.deliveryType}):</span>
            <span className="text-title font-semibold">
              {shipping === 0 ? 'Free' : formatCurrency(shipping)}
            </span>
          </div>

          {tax > 0 && (
            <div className="flex justify-between">
              <span className="text-secondary">Tax:</span>
              <span className="text-title font-semibold">{formatCurrency(tax)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-line pt-4">
            <span className="heading6">Total:</span>
            <span className="heading6">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {order.status === 'Pending' && !order.isPaid && (
          <button className="button-main flex-1">Pay Now</button>
        )}
        {order.status === 'Pending' && (
          <button className="flex-1 rounded-lg border border-red px-6 py-3 font-semibold text-red transition-all hover:bg-red hover:text-white">
            Cancel Order
          </button>
        )}
        {order.status === 'Completed' && (
          <>
            <button className="button-main flex-1">Reorder</button>
            <button className="flex-1 rounded-lg border border-line px-6 py-3 font-semibold transition-all hover:bg-black hover:text-white">
              Leave Review
            </button>
          </>
        )}
        {order?.shipment?.trackingNumber && order.status === 'Processing' && (
          <Link
            href={`/order-tracking?tracking=${order.shipment.trackingNumber}`}
            className="button-main flex-1"
          >
            Track Order
          </Link>
        )}
      </div>

      {/* Help section */}
      <div className="bg-blue/5 rounded-xl border border-line p-6">
        <div className="flex gap-4">
          <Icon.Info className="text-blue flex-shrink-0 text-3xl" />
          <div>
            <h6 className="mb-2 font-semibold">Need Help?</h6>
            <p className="text-sm text-secondary">
              If you have any questions about your order, please contact our customer support team.
            </p>
            <Link
              href="/pages/contact"
              className="text-button text-blue mt-2 inline-block hover:underline"
            >
              Contact Support →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
