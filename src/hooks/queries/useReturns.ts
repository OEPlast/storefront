import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import type { ReturnRequest } from '@/types/return';

interface ReturnsMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

async function fetchReturns(params: { page?: number; limit?: number; orderId?: string; status?: string }) {
  const response = await apiClient.getWithMeta<ReturnRequest[], ReturnsMeta>(api.returns.list, { params });
  return { returns: (response.data as ReturnRequest[]) ?? [], meta: response.meta };
}

/** The signed-in customer's return requests, newest first. */
export function useMyReturns(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['returns', 'mine', page, limit],
    queryFn: () => fetchReturns({ page, limit }),
    staleTime: 60 * 1000,
  });
}

/** Return requests raised against one order. */
export function useOrderReturns(orderId: string | undefined) {
  return useQuery({
    queryKey: ['returns', 'order', orderId],
    queryFn: () => fetchReturns({ orderId, limit: 20 }),
    enabled: !!orderId,
    staleTime: 60 * 1000,
  });
}
