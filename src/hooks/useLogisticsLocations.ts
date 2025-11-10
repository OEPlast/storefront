'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, handleApiError } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

export type LogisticsCity = {
  name: string;
};

export type LogisticsLGA = {
  name: string;
};

export type LogisticsState = {
  name: string;
  cities: LogisticsCity[];
  lgas: LogisticsLGA[];
};

export type LogisticsCountryData = {
  countryCode: string;
  countryName: string;
  states: LogisticsState[];
};

export type LogisticsCountry = {
  countryCode: string;
  countryName: string;
};

export type LogisticsLocationConfig = {
  name: string;
  price?: number;
  etaDays?: number;
};

export type LogisticsStateConfig = {
  name: string;
  fallbackPrice?: number;
  fallbackEtaDays?: number;
  cities: LogisticsLocationConfig[];
  lgas: LogisticsLocationConfig[];
};

export type LogisticsConfigRecord = {
  countryCode: string;
  countryName: string;
  states: LogisticsStateConfig[];
};

/**
 * Fetch logistics location hierarchy for a specific country
 * Returns: Country → States → LGAs & Cities (for building address forms)
 *
 * @param country - Country name (e.g., "Nigeria")
 * @param enabled - Whether to fetch immediately (default: true)
 *
 * @example
 * const { data, isLoading, error } = useLogisticsLocations('Nigeria');
 *
 * // Use in address form
 * {data?.states.map(state => (
 *   <option key={state.name} value={state.name}>{state.name}</option>
 * ))}
 */
export function useLogisticsLocations(country: string, enabled: boolean = true) {
  return useQuery<LogisticsCountryData, Error>({
    queryKey: ['logistics', 'locations', country],
    queryFn: async () => {
      if (!country) {
        throw new Error('Country name is required');
      }

      const response = await apiClient.get<LogisticsCountryData>(
        api.logistics.locationsByCountry(country)
      );

      if (!response.data) {
        throw new Error('No location data returned');
      }

      return response.data;
    },
    enabled: enabled && !!country,
    staleTime: 1000 * 60 * 60, // 1 hour - location data doesn't change often
    retry: 2,
  });
}

/**
 * Fetch all available countries from logistics configuration
 */
export function useLogisticsCountries() {
  return useQuery<LogisticsCountry[], Error>({
    queryKey: ['logistics', 'countries'],
    queryFn: async () => {
      const response = await apiClient.get<LogisticsCountry[]>(api.logistics.countries);

      if (!response.data) {
        throw new Error('No countries data returned');
      }

      return response.data;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - country list rarely changes
    retry: 2,
  });
}

export function useAllShippingConfig() {
  return useQuery<LogisticsConfigRecord[], Error>({
    queryKey: ['logistics', 'configs', 'all'],
    queryFn: async () => {
      const response = await apiClient.get<LogisticsConfigRecord[]>(api.logistics.allConfigs);

      if (!response.data) {
        throw new Error('No logistics configurations returned');
      }

      return response.data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes - configs change rarely but revalidate twice an hour
    retry: 1,
  });
}
