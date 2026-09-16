import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import type { CreateReturnInput, ReturnRequest } from '@/types/return';

const invalidate = (queryClient: ReturnType<typeof useQueryClient>, orderId?: string) => {
  queryClient.invalidateQueries({ queryKey: ['returns'] });
  if (orderId) queryClient.invalidateQueries({ queryKey: ['order', orderId] });
};

/** Files a return request. The backend checks the 7-day window, ownership and quantities. */
export function useRequestReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReturnInput) => {
      const response = await apiClient.post<ReturnRequest>(api.returns.create, input);
      return { message: response.message, data: response.data };
    },
    onSuccess: (_result, variables) => invalidate(queryClient, variables.orderId),
  });
}

/** Withdraws a return request while it is still under review or approved but not yet sent back. */
export function useCancelReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ returnId }: { returnId: string; orderId?: string }) => {
      const response = await apiClient.post<ReturnRequest>(api.returns.cancel(returnId));
      return { message: response.message };
    },
    onSuccess: (_result, variables) => invalidate(queryClient, variables.orderId),
  });
}
