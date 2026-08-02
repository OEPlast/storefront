'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAccountStore } from '@/store/accountStore';
import { useOrders } from '@/hooks/queries/useOrders';
import { WithPagination } from '@/components/common/WithPaginationIndependent';
import {
  EnrichedOrderProduct,
  OrderHistoryType,
  OrderQueryParams,
  OrderStatus,
} from '@/types/order';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { getCdnUrl } from '@/libs/cdn-url';
import { formatToNaira } from '@/utils/currencyFormatter';
import CancelOrderButton from '@/components/Order/CancelOrderButton';

const STATUS_STYLES: Record<OrderStatus, string> = {
  Pending: 'bg-yellow text-yellow',
  Processing: 'bg-purple text-purple',
  Completed: 'bg-success text-success',
  Cancelled: 'bg-red text-red',
  Failed: 'bg-red text-red',
};

// The API rejects cancellation once an order is Completed or already closed,
// so only these statuses get the button.
const CANCELLABLE_STATUSES: OrderStatus[] = ['Pending', 'Processing'];

// Order ids are 24-char ObjectIds - the tail is enough to identify an order at a glance.
const shortOrderNumber = (id: string) => `#${id.slice(-8).toUpperCase()}`;

const formatOrderDate = (date: string | Date) =>
  new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// Loading skeleton component
const OrderSkeleton = () => (
  <div className="order_item box-shadow-xs mt-5 animate-pulse rounded-lg border border-line">
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
      <div className="h-5 w-40 rounded bg-surface"></div>
      <div className="h-6 w-20 rounded-full bg-surface"></div>
    </div>
    <div className="list_prd border-t border-line px-5">
      <div className="prd_item flex items-center gap-4 py-4">
        <div className="aspect-square w-14 flex-shrink-0 rounded-lg bg-surface"></div>
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/2 rounded bg-surface"></div>
          <div className="h-4 w-1/3 rounded bg-surface"></div>
        </div>
        <div className="h-5 w-20 rounded bg-surface"></div>
      </div>
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
      <div className="h-4 w-32 rounded bg-surface"></div>
      <div className="h-9 w-24 rounded-lg bg-surface"></div>
    </div>
  </div>
);

// A single product line: image, name, and one meta line holding quantity, variant and discount
const OrderProductRow = ({ item }: { item: EnrichedOrderProduct }) => {
  return (
    <div className="prd_item flex items-center gap-4 py-4">
      <Link
        href={`/product/${item.slug}`}
        className="flex min-w-0 flex-1 items-center gap-4 duration-300 hover:opacity-75"
      >
        <div className="bg-img aspect-square w-14 flex-shrink-0 overflow-hidden rounded-lg border border-line">
          <Image
            src={getCdnUrl(item.image) || '/images/product/1000x1000.png'}
            width={80}
            height={80}
            alt={item.name || 'Product'}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="prd_name text-title truncate">{item.name}</div>
          <div className="caption1 truncate text-[13px] text-secondary">
            Qty {item.quantity}
            {(item.attributes ?? []).map((attr, idx) => (
              <span key={idx}>
                {' · '}
                <span className="capitalize">{attr.name}</span>:{' '}
                <span className="uppercase">{attr.value}</span>
              </span>
            ))}
          </div>
        </div>
      </Link>
      <div className="prd_price text-title flex-shrink-0 text-secondary">
        {formatToNaira(item.price * item.quantity)}
      </div>
    </div>
  );
};

// Order item component
const OrderItem = ({ order }: { order: OrderHistoryType }) => {
  const [expanded, setExpanded] = useState(false);

  // The list endpoint only enriches the first 2 products of an order, so anything
  // past what we received here lives on the order details page.
  const hiddenCount = Math.max(order.totalProducts - 1, 0);
  const notLoadedCount = Math.max(order.totalProducts - order.products.length, 0);
  const visibleProducts = expanded ? order.products : order.products.slice(0, 1);
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);

  return (
    <div className="order_item box-shadow-xs mt-5 rounded-lg border border-line">
      {/* Header: identity on the left, status on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <strong className="order_number text-button" title={order._id}>
            {shortOrderNumber(order._id)}
          </strong>
          <span className="caption1 text-secondary">{formatOrderDate(order.createdAt)}</span>
        </div>
        <span
          className={`tag caption1 rounded-full bg-opacity-10 px-3 py-1 font-semibold ${
            STATUS_STYLES[order.status] || 'bg-secondary text-secondary'
          }`}
        >
          {order.status}
        </span>
      </div>

      {/* Products: first one only until expanded */}
      <div className="list_prd divide-y divide-line border-t border-line px-5">
        {visibleProducts.map((item) => (
          <OrderProductRow key={item._id} item={item} />
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="caption1 flex w-full items-center justify-center gap-1 py-2.5 text-secondary duration-300 hover:text-black"
          >
            {expanded ? 'Show less' : `${hiddenCount} more item${hiddenCount > 1 ? 's' : ''}`}
            <Icon.CaretDown className={`duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}

        {expanded && notLoadedCount > 0 && (
          <Link
            href={`/my-account/orders/${order._id}`}
            className="caption1 block py-2.5 text-center text-secondary underline duration-300 hover:text-black"
          >
            View the remaining {notLoadedCount} item{notLoadedCount > 1 ? 's' : ''}
          </Link>
        )}
      </div>

      {/* Footer: totals on the left, actions on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
        <div className="caption1">
          <span className="text-title font-medium">Total: {formatToNaira(order.total)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCancel && (
            <CancelOrderButton
              orderId={order._id}
              orderNumber={shortOrderNumber(order._id)}
              variant="subtle"
            />
          )}
          <Link
            href={`/my-account/orders/${order._id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white duration-300 hover:bg-green hover:text-black"
          >
            Details
            <Icon.CaretRight weight="bold" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function HistoryOrders() {
  const { activeTab, activeOrders, setActiveOrders, orderPage, setOrderPage, orderLimit } =
    useAccountStore();

  const handleActiveOrders = (order: OrderQueryParams['status']) => {
    setActiveOrders(order);
    setOrderPage(1);
  };

  // Get the query based on active tab
  const query = useOrders(activeOrders, orderPage, orderLimit);

  const {
    data: OrdersData,
    isLoading: isOrdersLoading,
    isFetching: isOrdersFetching,
    isError: isOrdersFetchingError,
    refetch: refetchOrder,
  } = query;

  const isLoading = isOrdersFetching || isOrdersLoading;
  // Early return AFTER all hooks have been called
  if (activeTab !== 'orders') return null;

  return (
    <div className="tab text-content w-full overflow-hidden rounded-xl border border-line p-7">
      <h6 className="heading6">Your Orders</h6>
      <div className="w-full overflow-x-auto">
        <div className="menu-tab mt-3 grid grid-cols-6 border-b border-line max-lg:w-[600px]">
          {(
            [
              'All',
              'Pending',
              'Processing',
              'Completed',
              'Cancelled',
              'Failed',
            ] as OrderQueryParams['status'][]
          ).map((item, index) => (
            <button
              key={index}
              className={`item relative border-b-2 px-3 py-2.5 text-center text-secondary duration-300 hover:text-black ${
                activeOrders === item ? 'active border-black' : 'border-transparent'
              }`}
              onClick={() => handleActiveOrders(item)}
            >
              <span className="text-button relative z-[1] capitalize">{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="list_order">
          {[1, 2, 3].map((i) => (
            <OrderSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {isOrdersFetchingError && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Icon.WarningCircle className="text-5xl text-red" />
          <p className="text-title font-semibold">Error loading orders</p>
          <p className="text-secondary">{'Something went wrong'}</p>
          <button onClick={() => refetchOrder()} className="button-main mt-4">
            Try Again
          </button>
        </div>
      )}

      {/* Success state with pagination */}
      {!isLoading && !isOrdersFetchingError && (
        <WithPagination
          query={query}
          currentPage={orderPage}
          onPageChange={setOrderPage}
          emptyComponent={
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Icon.Package className="text-5xl text-secondary" />
              <p className="text-title font-semibold">No orders found</p>
            </div>
          }
        >
          <div className="list_order">
            {OrdersData?.orders.map((order) => (
              <OrderItem key={order._id} order={order} />
            ))}
          </div>
        </WithPagination>
      )}
    </div>
  );
}
