'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import { ProductListItem, ProductListMeta } from '@/types/product';

/**
 * Hook to fetch new products (sorted by creation date)
 * Returns ProductListItem for efficient list rendering
 * @param page - Page number
 * @param limit - Items per page
 * @returns Query result with new products
 */
export const useNewProducts = (page = 1) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'new', page],
    queryFn: async () => {
      const response = await apiClient.getWithMeta<ProductListItem[]>(api.products.newProducts, {
        params: { page },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return { 
        data: response.data, 
        meta: response.meta || { total: 0, page: 1, limit: 20, pages: 0 }
      };
    },
    placeholderData: { data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch top products of the week (last 7 days)
 * Returns ProductListItem for efficient list rendering
 * @param page - Page number
 * @param limit - Items per page
 * @returns Query result with weekly top products
 */
export const useWeekProducts = (page = 1) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'week', page],
    queryFn: async () => {
      const response = await apiClient.getWithMeta<ProductListItem[]>(api.products.week, {
        params: { page },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      
      return { 
        data: response.data, 
        meta: response.meta || { total: 0, page: 1, limit: 20, pages: 0 }
      };
    },
    placeholderData: { data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch top sold products of all time
 * Returns ProductListItem for efficient list rendering
 * @param page - Page number
 * @param limit - Items per page
 * @returns Query result with top sold products
 */
export const useTopSoldProducts = (page = 1) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'topSold', page],
    queryFn: async () => {
      const response = await apiClient.getWithMeta<ProductListItem[]>(api.products.topSold, {
        params: { page },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      
      return { 
        data: response.data, 
        meta: response.meta || { total: 0, page: 1, limit: 20, pages: 0 }
      };
    },
    placeholderData: { data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } },
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch "Deals of the Day" campaign products
 * Returns ProductListItem for efficient list rendering
 * @param page - Page number
 * @param limit - Items per page (default 20)
 * @returns Query result with deals of the day products
 */
export const useDealsOfTheDay = (page = 1) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'dealsOfTheDay', page],
    queryFn: async () => {
      const response = await apiClient.getWithMeta<ProductListItem[]>(api.products.dealsOfTheDay, {
        params: { page },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }

      return { 
        data: response.data, 
        meta: response.meta || { total: 0, page: 1, limit: 20, pages: 0 }
      };
    },
    placeholderData: { data: [], meta: { total: 0, page: 1, limit: 20, pages: 0 } },
    staleTime: 5 * 60 * 1000, // 5 minutes (shorter cache for time-sensitive deals)
    refetchOnMount: false,
  });
};
