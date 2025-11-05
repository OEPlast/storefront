'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import type { CategoryFiltersResponse } from '@/types/product';

/**
 * Fetch dynamic filters for new products
 * Returns filters based on all active new products:
 * - priceRange: { min, max }
 * - attributes: list of attribute names with available values and counts
 * - specifications: list of specification keys with values and counts
 * - tags: popular tags with counts
 * - packSizes: available pack size labels with counts
 */
export const useNewProductsFilters = () => {
  return useQuery<CategoryFiltersResponse>({
    queryKey: ['products', 'new', 'filters'],
    queryFn: async () => {
      const response = await apiClient.get<CategoryFiltersResponse>(
        api.products.newProductsFilters
      );
      if (!response.data) {
        throw new Error('No filters returned from server');
      }
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Fetch dynamic filters for week products (products sold in last 7 days)
 */
export const useWeekProductsFilters = () => {
  return useQuery<CategoryFiltersResponse>({
    queryKey: ['products', 'week', 'filters'],
    queryFn: async () => {
      const response = await apiClient.get<CategoryFiltersResponse>(
        api.products.weekProductsFilters
      );
      if (!response.data) {
        throw new Error('No filters returned from server');
      }
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Fetch dynamic filters for top sold products
 */
export const useTopSoldProductsFilters = () => {
  return useQuery<CategoryFiltersResponse>({
    queryKey: ['products', 'topSold', 'filters'],
    queryFn: async () => {
      const response = await apiClient.get<CategoryFiltersResponse>(
        api.products.topSoldProductsFilters
      );
      if (!response.data) {
        throw new Error('No filters returned from server');
      }
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
