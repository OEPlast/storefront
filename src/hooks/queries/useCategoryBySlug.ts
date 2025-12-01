'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';

export interface CategorySubcategory {
  _id: string;
  name: string;
  slug: string;
  image: string;
}

export interface CategoryDetail {
  _id: string;
  name: string;
  slug: string;
  image: string;
  description?: string;
  banner?: string;
  sub_categories: CategorySubcategory[];
}

/**
 * Hook to fetch a single category by slug with subcategories
 * Returns category name, slug, image, banner, and subcategories
 * @param slug - Category slug
 * @returns Query result with category details
 */
export const useCategoryBySlug = (slug: string | undefined) => {
  return useQuery<CategoryDetail>({
    queryKey: ['category', 'bySlug', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Category slug is required');
      const response = await apiClient.get<CategoryDetail>(api.categories.bySlug(slug));
      if (!response.data) {
        throw new Error('Category not found');
      }
      return response.data;
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
