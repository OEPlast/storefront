import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import type { OrderType } from '@/types/order';

interface CancelOrderResponse {
  success: boolean;
  message: string;
  order: OrderType;
  stockReversals: Array<{
    productId: string;
    productName: string;
    quantityReversed: number;
    newStock: number;
  }>;
  salesReversals: Array<{
    productId: string;
    productName: string;
    salesDeducted: number;
    totalSales: number;
  }>;
}

interface CancelOrderParams {
  orderId: string;
  reason?: string;
}

/**
 * Mutation hook for cancelling an order
 * Handles stock reversal and sales deduction on order cancellation
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: CancelOrderParams): Promise<CancelOrderResponse> => {
      const response = await apiClient.post<CancelOrderResponse>(api.orders.cancel(orderId), {
        reason,
      });
      return response.data;
    },
    onSuccess: (data, { orderId }) => {
      // Invalidate order queries to reflect updated status and stock
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-statistics'] });

      // Invalidate product queries to reflect stock reversal
      data.stockReversals.forEach((reversal) => {
        queryClient.invalidateQueries({ queryKey: ['product', reversal.productId] });
      });

      // Invalidate product lists that might show updated stock
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['top-sold'] });
      queryClient.invalidateQueries({ queryKey: ['new-products'] });
    },
    onError: (error) => {
      console.error('Order cancellation failed:', error);
    },
  });
}

/**
 * Mutation hook for handling payment failure
 * Automatically reverses stock and deducts sales when payment fails
 */
export function useHandlePaymentFailure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string): Promise<CancelOrderResponse> => {
      const response = await apiClient.post<CancelOrderResponse>(
        `/myOrder/orders/${orderId}/payment-failed`
      );
      return response.data;
    },
    onSuccess: (data, orderId) => {
      // Invalidate order queries
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-statistics'] });

      // Invalidate product queries to reflect stock reversal
      data.stockReversals.forEach((reversal) => {
        queryClient.invalidateQueries({ queryKey: ['product', reversal.productId] });
      });

      // Invalidate product lists
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['top-sold'] });
    },
    onError: (error) => {
      console.error('Payment failure handling failed:', error);
    },
  });
}
