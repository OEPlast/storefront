'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import type { CampaignFilters } from '@/types/campaign';

/**
 * Fetch dynamic filters for a given campaign slug
 * Returns filters based on all products in the campaign:
 * - priceRange: { min, max }
 * - attributes: list of attribute names with available values and counts
 * - specifications: list of specification keys with values and counts
 * - tags: popular tags with counts
 * - packSizes: available pack size labels with counts
 */
export const useCampaignFilters = (slug: string | undefined) => {
  return useQuery<CampaignFilters>({
    queryKey: ['campaigns', 'filters', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Campaign slug is required');
      const response = await apiClient.get<CampaignFilters>(api.campaigns.filtersBySlug(slug));
      if (!response.data) {
        throw new Error('No filters returned from server');
      }
      return response.data;
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
