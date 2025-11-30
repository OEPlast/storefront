'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAccountStore } from '@/store/accountStore';
import { useOrders } from '@/hooks/queries/useOrders';
import { WithPagination } from '@/components/common/WithPaginationIndependent';
import { OrdersResponse, OrderHistoryType, OrderQueryParams } from '@/types/order';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { getCdnUrl } from '@/libs/cdn-url';
import { formatToNaira } from '@/utils/currencyFormatter';

// Loading skeleton component
const OrderSkeleton = () => (
  <div className="order_item mt-5 border border-line rounded-lg box-shadow-xs animate-pulse">
    <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-line">
      <div className="h-6 bg-surface rounded w-48"></div>
      <div className="h-8 bg-surface rounded w-24"></div>
    </div>
    <div className="list_prd px-5">
      {[1, 2].map((i) => (
        <div key={i} className="prd_item flex flex-wrap items-center justify-between gap-3 py-5 border-b border-line">
          <div className="flex items-center gap-5">
            <div className="bg-surface md:w-[100px] w-20 aspect-square rounded-lg"></div>
            <div className="space-y-2">
              <div className="h-5 bg-surface rounded w-48"></div>
              <div className="h-4 bg-surface rounded w-32"></div>
            </div>
          </div>
          <div className="h-5 bg-surface rounded w-24"></div>
        </div>
      ))}
    </div>
    <div className="flex gap-4 p-5">
      <div className="h-10 bg-surface rounded w-32"></div>
    </div>
  </div>
);

// Order item component
const OrderItem = ({ order }: { order: OrderHistoryType; }) => {

  // Determine status badge styling
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      Pending: 'bg-yellow text-yellow',
      Processing: 'bg-purple text-purple',
      Completed: 'bg-success text-success',
      Cancelled: 'bg-red text-red',
      Failed: 'bg-red text-red',
    };

    return statusConfig[status as keyof typeof statusConfig] || 'bg-secondary text-secondary';
  };

  return (
    <div className="order_item mt-5 border border-line rounded-lg box-shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-line">
        <div className="flex items-center gap-2">
          <strong className="text-title">Order Number:</strong>
          <strong className="order_number text-button uppercase">{order._id}</strong>
        </div>
        <div className="flex items-center gap-2">
          <strong className="text-title">Order status:</strong>
          <span
            className={`tag px-4 py-1.5 rounded-full bg-opacity-10 caption1 font-semibold ${getStatusBadge(order.status)}`}
          >
            {order.status}
          </span>
        </div>
      </div>
      <div className="list_prd px-5">
        {order.products.map((item, index) => (
          <div
            key={index}
            className="prd_item flex flex-wrap items-center justify-between gap-3 py-5 border-b border-line last:border-b-0"
          >
            <Link href={`/product/${item.slug}`} className="flex items-center gap-5">
              <div className="bg-img flex-shrink-0 md:w-[100px] w-20 aspect-square rounded-lg overflow-hidden">
                <Image
                  src={getCdnUrl(item.image) || '/images/product/1000x1000.png'}
                  width={100}
                  height={100}
                  alt={item.name || 'Product'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="prd_name text-title">{item.name}</div>
                {item.attributes && item.attributes.length > 0 && (
                  <div className="caption1 text-secondary mt-2">
                    {item.attributes.map((attr, idx) => (
                      <span key={idx}>
                        <span className="capitalize">{attr.name}</span>: <span className="uppercase">{attr.value}</span>
                        {idx < item.attributes.length - 1 && ' / '}
                      </span>
                    ))}
                  </div>
                )}
                {item.saleDiscount > 0 && (
                  <div className="mt-1">
                    <span className="text-xs px-2 py-0.5 bg-red/10 text-red rounded">
                      -{item.saleDiscount}% Sale
                    </span>
                  </div>
                )}
              </div>
            </Link>
            <div className="text-title">
              <span className="prd_quantity">{item.quantity}</span>
              <span> X </span>
              <span className="prd_price">{formatToNaira(item.price)}</span>
            </div>
          </div>
        ))}
        {order.totalProducts > 2 && (
          <div className="py-3 text-center text-secondary caption1">
            Showing 2 of {order.totalProducts} products ({order.totalItems} total items)
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-4 p-5">
        <Link href={`/my-account/orders/${order._id}`} className="button-main">
          Order Details
        </Link>
        {order.status === 'Pending' && (
          <button className="button-main bg-surface border border-line hover:bg-black text-black hover:text-white">
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
};

export default function HistoryOrders() {
  const { activeTab, activeOrders, setActiveOrders, orderPage, setOrderPage, orderLimit } = useAccountStore();

  const handleActiveOrders = (order: OrderQueryParams['status']) => {
    setActiveOrders(order);
    setOrderPage(1);
  };

  // Get the query based on active tab
  const query = useOrders(
    activeOrders,
    orderPage,
    orderLimit
  );

  const { data: OrdersData, isLoading: isOrdersLoading, isFetching: isOrdersFetching, isError: isOrdersFetchingError, refetch: refetchOrder } = query;
  console.log(OrdersData);

  const isLoading = isOrdersFetching || isOrdersLoading;
  // Early return AFTER all hooks have been called
  if (activeTab !== 'orders') return null;

  return (
    <div className="tab text-content overflow-hidden w-full p-7 border border-line rounded-xl">
      <h6 className="heading6">Your Orders</h6>
      <div className="w-full overflow-x-auto">
        <div className="menu-tab grid grid-cols-5 max-lg:w-[500px] border-b border-line mt-3">
          {(['All', 'Pending', 'Processing', 'Completed', 'Cancelled'] as OrderQueryParams['status'][]).map((item, index) => (
            <button
              key={index}
              className={`item relative px-3 py-2.5 text-secondary text-center duration-300 hover:text-black border-b-2 ${activeOrders === item ? 'active border-black' : 'border-transparent'
                }`}
              onClick={() => handleActiveOrders(item)}
            >
              <span className="relative text-button z-[1] capitalize">{item}</span>
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
        <div className="flex flex-col items-center gap-3 text-center py-12">
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
            <div className="flex flex-col items-center gap-3 text-center py-12">
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
