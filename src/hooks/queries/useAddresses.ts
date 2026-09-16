import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import { Address, AddressesResponse } from '@/types/user';

// Fetch all user addresses
const fetchAddresses = async (): Promise<Address[]> => {
  const response = await apiClient.get<AddressesResponse>(api.user.addresses);

  if (!response.data) {
    throw new Error('Failed to fetch addresses');
  }

  return response.data;
};

// Hook for fetching user addresses
export const useAddresses = (
  options: { enabled?: boolean } = {}
): UseQueryResult<Address[], Error> => {
  return useQuery({
    queryKey: ['user', 'addresses'],
    queryFn: fetchAddresses,
    // Saved addresses only exist for a signed-in account. Checkout passes `enabled: false` for
    // guests so it doesn't fire a request that can only come back 401.
    enabled: options.enabled ?? true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
};

export default useAddresses;
