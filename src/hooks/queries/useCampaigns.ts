'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import type {
  Campaign,
  CampaignProductsResponse,
  CampaignProductsMeta,
  CampaignProductsParams,
} from '@/types/campaign';

/**
 * Hook to fetch campaign products with filters
 * Uses product service endpoint (ProductService.getProductsByCampaignSlug)
 * Supports filtering, sorting, and pagination
 *
 * @param params - Campaign slug and filter/pagination parameters
 * @returns Query result with campaign, products, and meta
 */
export const useCampaignBySlug = (params: CampaignProductsParams) => {
  return useQuery<{ data: CampaignProductsResponse; meta: CampaignProductsMeta }>({
    queryKey: ['campaigns', 'products', params],
    queryFn: async () => {
      const { slug, attributes, ...queryParams } = params;

      // Convert attributes map to backend-friendly "key:value|value2" strings
      const serializeMap = (map?: Record<string, string[]>): string[] | undefined => {
        if (!map) return undefined;
        const entries = Object.entries(map);
        if (!entries.length) return undefined;
        return entries.map(([k, vals]) => `${k}:${vals.join('|')}`);
      };

      const attributeParams = serializeMap(attributes);

      // Now calls product service endpoint instead of campaign service
      const response = await apiClient.getWithMeta<CampaignProductsResponse, CampaignProductsMeta>(
        api.products.byCampaignSlug(slug),
        {
          params: {
            ...queryParams,
            ...(attributeParams && { attributes: attributeParams }),
          },
        }
      );

      if (!response.data) {
        throw new Error('No data returned from server');
      }

      return {
        data: response.data,
        meta: response.meta || { page: 1, limit: 12, total: 0, pages: 0 },
      };
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!params.slug,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};

/**
 * Hook to fetch campaign metadata only (without products)
 * Uses campaign service endpoint (CampaignService.getActiveCampaignBySlug)
 * Useful for banner/header display
 *
 * @param slug - Campaign slug
 * @returns Query result with campaign details
 */
export const useCampaignInfo = (slug: string) => {
  return useQuery<Campaign>({
    queryKey: ['campaigns', 'info', slug],
    queryFn: async () => {
      const response = await apiClient.get<Campaign>(api.campaigns.info(slug));

      if (!response.data) {
        throw new Error('Campaign not found');
      }

      return response.data;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
