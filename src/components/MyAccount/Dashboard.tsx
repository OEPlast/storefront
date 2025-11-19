'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { useAccountStore } from '@/store/accountStore';
import { useOrders } from '@/hooks/queries/useOrders';
import { useOrderStatistics } from '@/hooks/queries/useOrderStatistics';
import { getCdnUrl } from '@/libs/cdn-url';

export default function Dashboard() {
  const { activeTab } = useAccountStore();

  // Fetch order statistics for dashboard cards
  const { data: stats, isLoading: isStatsLoading } = useOrderStatistics();

  // Fetch recent orders for the table (6 most recent)
  const { data: recentOrdersData, isLoading: isOrdersLoading } = useOrders('All', 1, 6);

  if (activeTab !== 'dashboard') return null;

  const orders = recentOrdersData?.orders || [];

  // Status badge helper
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
    <div className="tab text-content w-full">
      <div className="overview grid sm:grid-cols-3 gap-5">
        <div className="item flex items-center justify-between p-5 border border-line rounded-lg box-shadow-xs">
          <div className="counter">
            <span className="text-secondary">Awaiting Pickup</span>
            <h5 className="heading5 mt-1">{isStatsLoading ? '...' : stats?.pendingOrders || 0}</h5>
          </div>
          <Icon.HourglassMedium className="text-4xl" />
        </div>
        <div className="item flex items-center justify-between p-5 border border-line rounded-lg box-shadow-xs">
          <div className="counter">
            <span className="text-secondary">Cancelled Orders</span>
            <h5 className="heading5 mt-1">{isStatsLoading ? '...' : stats?.cancelledOrders || 0}</h5>
          </div>
          <Icon.ReceiptX className="text-4xl" />
        </div>
        <div className="item flex items-center justify-between p-5 border border-line rounded-lg box-shadow-xs">
          <div className="counter">
            <span className="text-secondary">Total Orders</span>
            <h5 className="heading5 mt-1">{isStatsLoading ? '...' : stats?.totalOrders || 0}</h5>
          </div>
          <Icon.Package className="text-4xl" />
        </div>
      </div>

      <div className="recent_order pt-5 px-5 pb-2 mt-7 border border-line rounded-xl">
        <h6 className="heading6">Recent Orders</h6>

        {isOrdersLoading ? (
          <div className="py-8 text-center text-secondary">
            <Icon.CircleNotch className="text-4xl animate-spin mx-auto" />
            <p className="mt-2">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center text-secondary">
            <Icon.Package className="text-4xl mx-auto mb-2" />
            <p>No orders yet</p>
          </div>
        ) : (
          <div className="list overflow-x-auto w-full mt-5">
            <table className="w-full max-[1400px]:w-[700px] max-md:w-[700px]">
              <thead className="border-b border-line">
                <tr>
                  <th scope="col" className="pb-3 text-left text-sm font-bold uppercase text-secondary whitespace-nowrap">
                    Order
                  </th>
                  <th scope="col" className="pb-3 text-left text-sm font-bold uppercase text-secondary whitespace-nowrap">
                    Products
                  </th>
                  <th scope="col" className="pb-3 text-left text-sm font-bold uppercase text-secondary whitespace-nowrap">
                    Pricing
                  </th>
                  <th scope="col" className="pb-3 text-center text-sm font-bold uppercase text-secondary whitespace-nowrap">
                    Paid
                  </th>
                  <th
                    scope="col"
                    className="pb-3 text-right text-sm font-bold uppercase text-secondary whitespace-nowrap"
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const firstProduct = order.products[0];
                  return (
                    <tr key={order._id} className="item duration-300 border-b border-line">
                      <th scope="row" className="py-3 text-left">
                        <Link href={`/my-account/orders/${order._id}`} className='hover:underline'>
                          <strong className="text-title">{order._id}</strong>
                        </Link>
                      </th>
                      <td className="py-3">
                        {firstProduct ? (
                          <Link href={`/product/${firstProduct.slug}`} className="product flex items-center gap-3">
                            <Image
                              src={getCdnUrl(firstProduct.image) || '/images/product/1000x1000.png'}
                              width={48}
                              height={48}
                              alt={firstProduct.name}
                              className="flex-shrink-0 w-12 h-12 rounded object-cover"
                            />
                            <div className="info flex flex-col">
                              <div className="product-name">{firstProduct.name}</div>
                              {firstProduct.attributes && firstProduct.attributes.length > 0 && (
                                <div className="caption1 text-secondary mt-1">
                                  {firstProduct.attributes.map((attr, i) => (
                                    <span key={i}>
                                      {attr.value}
                                      {i < firstProduct.attributes.length - 1 && ' / '}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </Link>
                        ) : (
                          <span className="text-secondary">No products</span>
                        )}
                      </td>
                      <td className="py-3 price">₦{order.total.toLocaleString()}</td>
                      <td className="py-3 text-center">
                        {order.isPaid ? (
                          <Icon.CheckCircle className="text-success text-xl inline-block" weight="fill" />
                        ) : (
                          <Icon.XCircle className="text-red text-xl inline-block" weight="fill" />
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`tag px-4 py-1.5 rounded-full bg-opacity-10 caption1 font-semibold ${getStatusBadge(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
