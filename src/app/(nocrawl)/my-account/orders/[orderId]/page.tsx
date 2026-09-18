import axios from 'axios';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@@/auth';
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

  // Fetch order data on the server. `fetchQuery`, not `prefetchQuery`: prefetch swallows every
  // error, so a notFound() in its catch could never run. Only a definite "no such order on this
  // account" is a 404 — Main-server answers 404 for a missing or someone else's order and 400 for an
  // ID that isn't one. Anything else (a blip, an expired token) leaves the query unseeded and the
  // client fetches it again and shows its own error state.
  //
  // This page renders inside loading.tsx's Suspense boundary, so the 404 and the /login redirect
  // above both go out as a 200 and are carried out in the browser. That is deliberate: the page is
  // private and noindexed, so its status code matters to no one. Making them real status codes
  // means moving these checks into a layout (see app/product/[slug]/layout.tsx), and that would cost
  // a Main-server order lookup for every order link the account page prefetches.
  let missing = false;
  try {
    await queryClient.fetchQuery({
      queryKey: ['order', orderId],
      queryFn: () => prefetchOrder(orderId, session.user.token),
    });
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    missing = status === 404 || status === 400;
  }
  if (missing) notFound();


  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrderDetailsClient orderId={orderId} />
    </HydrationBoundary>
  );
}
