import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import { IShipment } from '@/types/shipment';

// Base function to fetch shipment by tracking number
const fetchTrackShipment = async (trackingNumber: string): Promise<IShipment> => {
  const response = await apiClient.get<IShipment>(api.logistics.trackByNumber(trackingNumber));

  if (!response.data) {
    throw new Error('Shipment not found');
  }

  return response.data;
};

// Hook for fetching shipment by tracking number
export const useTrackShipment = (trackingNumber: string): UseQueryResult<IShipment, Error> => {
  return useQuery({
    queryKey: ['shipment', trackingNumber],
    queryFn: () => fetchTrackShipment(trackingNumber),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!trackingNumber && trackingNumber.length >= 3, // Only run query if tracking number exists and is valid
    retry: 0,
  });
};

export default useTrackShipment;
