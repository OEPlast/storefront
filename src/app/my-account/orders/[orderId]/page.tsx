import { notFound, redirect } from 'next/navigation';
import { auth } from '../../../../../auth';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/provider/react-query';
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import { EnrichedOrder, OrderType } from '@/types/order';
import OrderDetailsClient from './Client';
import serverAPI from '@/libs/api/serverAPI';
import { OrderByIdResponse } from '@/hooks/queries/useOrderById';

// Fetch function for server-side prefetch
async function prefetchOrder(orderId: string, token?: string): Promise<EnrichedOrder> {
  const response = await serverAPI.get<EnrichedOrder>(api.orders.byId(orderId), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.data) {
    throw new Error('Order not found');
  }

  return response.data;
}

export default async function OrderDetailsPage({
  params
}: {
  params: Promise<{ orderId: string; }>;
}) {
  // Server-side auth check
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { orderId } = await params;

  // Create a new QueryClient for this request
  const queryClient = new QueryClient();

  // Prefetch order data on the server

  try {
    await queryClient.prefetchQuery({
      queryKey: ['order', orderId],
      queryFn: () => prefetchOrder(orderId, session?.user.token
      ),
    });
  } catch (error) {
    throw notFound();
    // Don't redirect, let the client handle the error
  }


  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrderDetailsClient orderId={orderId} />
    </HydrationBoundary>
  );
}
