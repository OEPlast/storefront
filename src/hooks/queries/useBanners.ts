'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import { ApiBanner, BannerCategory, GroupedBanners } from '@/types/banner';



/**
 * Client-side fetch function for all banners
 * Used by React Query on the client
 */
async function fetchAllBannersClient(): Promise<ApiBanner[]> {
  const response = await apiClient.get<ApiBanner[]>(api.banners.list);
  if (!response.data) {
    throw new Error('No data returned from server');
  }
  return response.data;
}

/**
 * Client-side fetch function for banners by category
 * Used by React Query on the client
 */
async function fetchBannersByCategoryClient(category: BannerCategory): Promise<ApiBanner[]> {
  const response = await apiClient.get<ApiBanner[]>(api.banners.byCategory(category));
  if (!response.data) {
    throw new Error('No data returned from server');
  }
  return response.data;
}

/**
 * Client-side fetch function for grouped banners
 * Used by React Query on the client
 */
async function fetchGroupedBannersClient(): Promise<GroupedBanners> {
  const response = await apiClient.get<GroupedBanners>(api.banners.grouped);
  if (!response.data) {
    throw new Error('No data returned from server');
  }
  return response.data;
}

/**
 * React Query hook to fetch all active banners
 * Returns all banners sorted by position
 * @returns Query result with all active banners
 */
export const useAllBanners = () => {
  return useQuery<ApiBanner[]>({
    queryKey: ['banners', 'all'],
    queryFn: fetchAllBannersClient,
    staleTime: 5 * 60 * 1000, // 5 minutes - banners don't change often
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

/**
 * React Query hook to fetch banners by category
 * Returns banners for a specific category (A, B, C, D, or E)
 * @param category - Banner category to filter by
 * @returns Query result with banners for the specified category
 */
export const useBannersByCategory = (category: BannerCategory) => {
  return useQuery<ApiBanner[]>({
    queryKey: ['banners', 'category', category],
    queryFn: () => fetchBannersByCategoryClient(category),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!category, // Only run if category is provided
  });
};

/**
 * React Query hook to fetch banners grouped by category
 * Returns an object with categories as keys and banner arrays as values
 * @returns Query result with banners grouped by category (A, B, C, D, E)
 */
export const useGroupedBanners = (allow: boolean) => {
  return useQuery<GroupedBanners>({
    queryKey: ['banners', 'grouped'],
    queryFn: fetchGroupedBannersClient,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
        placeholderData: { A: [], B: [], C: [], D: [], E: [] },
    refetchOnWindowFocus: false,
    enabled: allow
  });
};
