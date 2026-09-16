'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import type { IShipment } from '@/types/shipment';
import { getCdnUrl } from '@/libs/cdn-url';
import { formatToNaira } from '@/utils/currencyFormatter';
import ShipmentTrackingHistory from '@/components/Order/ShipmentTrackingHistory';

interface LookupOrder {
  orderNumber: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled' | 'Failed' | string;
  isPaid: boolean;
  deliveryType?: 'shipping' | 'pickup';
  createdAt?: string;
  paidAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  total: number;
  shippingPrice?: number;
  couponDiscount?: number;
  gigWaybill?: string;
  items: { name: string; slug?: string; image?: string; qty: number; price: number; attributes: { name?: string; value?: string }[] }[];
  deliveryArea?: { firstName?: string; city?: string; state?: string; country?: string };
  shipment: IShipment | null;
}

const formatDate = (date?: string | Date) =>
  date ? new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

/** What the order status means to a shopper, in their words rather than ours. */
function describeStatus(order: LookupOrder): { label: string; detail: string; tone: 'ok' | 'wait' | 'bad' } {
  if (order.status === 'Cancelled') return { label: 'Cancelled', detail: `Cancelled ${formatDate(order.cancelledAt) ?? ''}`.trim(), tone: 'bad' };
  if (order.status === 'Failed') return { label: 'Payment failed', detail: 'This order was not paid.', tone: 'bad' };
  if (order.status === 'Completed')
    return {
      label: order.deliveryType === 'pickup' ? 'Collected' : 'Delivered',
      detail: formatDate(order.deliveredAt) ? `On ${formatDate(order.deliveredAt)}` : 'Your order is complete.',
      tone: 'ok',
    };
  if (!order.isPaid) return { label: 'Awaiting payment', detail: 'We are waiting for your payment to confirm.', tone: 'wait' };
  if (order.shipment) return { label: 'On its way', detail: `Shipment status: ${order.shipment.status}`, tone: 'wait' };
  return {
    label: order.deliveryType === 'pickup' ? 'Being prepared for pickup' : 'Being prepared',
    detail: 'We have your payment and are packing your order.',
    tone: 'wait',
  };
}

interface OrderLookupProps {
  /** Prefilled from `?order=` (the tracking link in order emails). The email is never put in the URL. */
  initialOrderNumber?: string;
}

/** Order number + email lookup. Works for guests; the email only travels in the POST body. */
export default function OrderLookup({ initialOrderNumber = '' }: OrderLookupProps) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState('');

  const lookup = useMutation<LookupOrder, Error, { orderNumber: string; email: string }>({
    mutationFn: async (body) => {
      try {
        const response = await apiClient.post<LookupOrder>(api.orderLookup, body);
        return response.data!;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 429) throw new Error('Too many attempts. Please wait a few minutes and try again.');
          throw new Error(error.response?.data?.message || 'Could not look up the order right now.');
        }
        throw error;
      }
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    lookup.mutate({ orderNumber: orderNumber.trim().toUpperCase(), email: email.trim() });
  };

  const order = lookup.data;
  const status = order ? describeStatus(order) : null;

  return (
    <div>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lookup-order" className="mb-2 block text-sm font-medium">
            Order number
          </label>
          <input
            id="lookup-order"
            className="w-full rounded-lg border-line px-4 py-3"
            placeholder="From your confirmation email"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            autoComplete="off"
            required
            minLength={4}
          />
        </div>
        <div>
          <label htmlFor="lookup-email" className="mb-2 block text-sm font-medium">
            Email address
          </label>
          <input
            id="lookup-email"
            type="email"
            className="w-full rounded-lg border-line px-4 py-3"
            placeholder="The email you ordered with"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <button type="submit" className="button-main sm:col-span-2" disabled={lookup.isPending}>
          {lookup.isPending ? 'Finding your order…' : 'Find my order'}
        </button>
      </form>

      {lookup.isError && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-surface p-5">
          <Icon.WarningCircle size={24} className="shrink-0 text-red" />
          <div>
            <p className="font-semibold">{lookup.error.message}</p>
            <p className="caption1 mt-1 text-secondary">
              Check the order number in your confirmation email and use the same email address you ordered with.
            </p>
          </div>
        </div>
      )}

      {order && status && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
            <div>
              <h2 className="heading5">Order {order.orderNumber}</h2>
              {formatDate(order.createdAt) && <p className="caption1 mt-1 text-secondary">Placed {formatDate(order.createdAt)}</p>}
            </div>
            <div className="text-right">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                  status.tone === 'ok' ? 'bg-green' : status.tone === 'bad' ? 'bg-red text-white' : 'bg-yellow'
                }`}
              >
                {status.label}
              </span>
              <p className="caption1 mt-1 text-secondary">{status.detail}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-line p-6">
              <h3 className="heading6 mb-4">Items</h3>
              <ul className="space-y-4">
                {order.items.map((item, index) => {
                  const variant = item.attributes.map((a) => a.value).filter(Boolean).join(' · ');
                  return (
                    <li key={`${item.slug ?? item.name}-${index}`} className="flex items-center gap-3">
                      <Image
                        src={getCdnUrl(item.image) || '/images/placeholder.png'}
                        alt={item.name}
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        {item.slug ? (
                          <Link href={`/product/${item.slug}`} className="text-title line-clamp-1 hover:underline">
                            {item.name}
                          </Link>
                        ) : (
                          <p className="text-title line-clamp-1">{item.name}</p>
                        )}
                        <p className="caption1 text-secondary">
                          {variant ? `${variant} · ` : ''}Qty {item.qty}
                        </p>
                      </div>
                      <p className="text-title shrink-0">{formatToNaira(item.price * item.qty)}</p>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
                {!!order.couponDiscount && (
                  <div className="flex justify-between text-secondary">
                    <span>Discount</span>
                    <span>-{formatToNaira(order.couponDiscount)}</span>
                  </div>
                )}
                {order.deliveryType !== 'pickup' && typeof order.shippingPrice === 'number' && (
                  <div className="flex justify-between text-secondary">
                    <span>Delivery</span>
                    <span>{order.shippingPrice ? formatToNaira(order.shippingPrice) : 'Free'}</span>
                  </div>
                )}
                <div className="flex justify-between text-title">
                  <span>Total</span>
                  <span>{formatToNaira(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border border-line p-6">
                <h3 className="heading6 mb-3">{order.deliveryType === 'pickup' ? 'Store pickup' : 'Delivery'}</h3>
                {order.deliveryType !== 'pickup' && order.deliveryArea && (
                  <p className="text-secondary">
                    To {order.deliveryArea.firstName ? `${order.deliveryArea.firstName}, ` : ''}
                    {[order.deliveryArea.city, order.deliveryArea.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {order.shipment?.trackingNumber && (
                  <p className="mt-2 text-secondary">
                    Tracking number: <span className="text-title">{order.shipment.trackingNumber}</span>
                  </p>
                )}
                {order.gigWaybill && (
                  <p className="mt-1 text-secondary">
                    GIG waybill: <span className="text-title">{order.gigWaybill}</span>
                  </p>
                )}
                {order.shipment?.estimatedDelivery && order.status !== 'Completed' && (
                  <p className="mt-1 text-secondary">Estimated delivery: {formatDate(order.shipment.estimatedDelivery)}</p>
                )}
                <p className="caption1 mt-4 text-secondary">
                  Have an account? <Link href="/my-account?tab=orders" className="underline">Sign in</Link> to manage this order,
                  cancel it or request a return.
                </p>
              </div>
              {order.shipment && <ShipmentTrackingHistory shipment={order.shipment} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
