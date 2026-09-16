import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

export interface EmailPreferences {
  /** Marketing email (new arrivals, offers). Order and account emails are always sent. */
  marketing: boolean;
  subscribedAt?: string | null;
  unsubscribedAt?: string | null;
}

const QUERY_KEY = ['emailPreferences'];

export const useEmailPreferences = () =>
  useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => (await apiClient.get<EmailPreferences>(api.user.emailPreferences)).data!,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useUpdateEmailPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (marketing: boolean) =>
      (await apiClient.put<EmailPreferences>(api.user.emailPreferences, { marketing })).data!,
    // PUT answers with just { marketing }; refetch for the updated timestamps.
    onSuccess: (data) => {
      queryClient.setQueryData<EmailPreferences>(QUERY_KEY, (old) => ({ ...old, ...data }));
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
};
