'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import api from '@/libs/api/endpoints';
import {
  Product,
  ProductDetail,
  ProductListItem,
  SearchProduct,
  AutocompleteProduct,
  ProductListMeta,
  ProductListParams,
  SearchProductParams,
  CategoryBySlugParams,
  CategoryBySlugMeta,
  TopCategory,
} from '@/types/product';

/**
 * Hook to fetch all products with filters and pagination
 * Returns lightweight ProductListItem for efficient list rendering
 * @param params - Filter and pagination parameters
 * @returns Query result with products list and metadata
 */
export const useProducts = (params?: ProductListParams) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'list', params],
    queryFn: async () => {
      const response = await apiClient.get<ProductListItem[]>(api.products.list, {
        params,
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      // Backend returns { data, meta } structure
      return response as unknown as { data: ProductListItem[]; meta: ProductListMeta };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch a single product by ID with full details
 * Returns ProductDetail (full product data) for product detail page
 * Shared query key with prefetch/preload for cache reuse in Quick View
 * @param id - Product ID
 * @param options - Additional query options (e.g., retry for Quick View)
 * @returns Query result with product details
 */
export const useProductById = (id: string, options?: { retry?: number }) => {
  return useQuery<ProductDetail>({
    queryKey: ['products', 'byId', id],
    queryFn: async () => {
      const response = await apiClient.get<ProductDetail>(api.products.byId(id));
      if (!response.data) {
        throw new Error('Product not found');
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: options?.retry ?? 3, // Default 3 retries, can override
  });
};

/**
 * Prefetch a product by ID (background fetch, no component subscription)
 * Useful for hover/focus prefetching before Quick View opens
 * Shares query key with useProductById for instant cache hit
 * @param queryClient - React Query client instance
 * @param id - Product ID to prefetch
 */
export const prefetchProductById = async (queryClient: any, id: string): Promise<void> => {
  await queryClient.prefetchQuery({
    queryKey: ['products', 'byId', id],
    queryFn: async () => {
      const response = await apiClient.get<ProductDetail>(api.products.byId(id));
      if (!response.data) {
        throw new Error('Product not found');
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to preload a product by ID on Quick View trigger
 * Fetches with retry:0 for instant modal UX, shares cache with useProductById
 * @param id - Product ID to preload
 * @returns Query result optimized for Quick View (fail fast, no retries)
 */
export const usePreloadProductById = (id: string) => {
  return useQuery<ProductDetail>({
    queryKey: ['products', 'byId', id],
    queryFn: async () => {
      const response = await apiClient.get<ProductDetail>(api.products.byId(id));
      if (!response.data) {
        throw new Error('Product not found');
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 0, // Quick View: fail fast for better UX
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Hook to fetch a single product by slug with full details
 * Returns ProductDetail (full product data) for product detail page
 * @param slug - Product slug
 * @returns Query result with product details
 */
export const useProductBySlug = (slug: string) => {
  return useQuery<ProductDetail>({
    queryKey: ['products', 'bySlug', slug],
    queryFn: async () => {
      const response = await apiClient.get<ProductDetail>(api.products.bySlug(slug));
      if (!response.data) {
        throw new Error('Product not found');
      }
      return response.data;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to search products with filters
 * Returns SearchProduct (minimal: name, slug, cover image) for fast search results
 * @param params - Search query and filter parameters
 * @returns Query result with search results and metadata
 */
export const useSearchProducts = (params: SearchProductParams) => {
  return useQuery<{ data: SearchProduct[]; meta: ProductListMeta }>({
    queryKey: ['products', 'search', params],
    queryFn: async () => {
      const response = await apiClient.get<SearchProduct[]>(api.products.search, {
        params,
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return response as unknown as { data: SearchProduct[]; meta: ProductListMeta };
    },
    enabled: !!params.q && params.q.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Hook to fetch products by category slug
 * @param params - Category slug and filter parameters
 * @returns Query result with products in category
 */
/**
 * Hook to fetch products by category slug with multi-level sorting support.
 *
 * **Features**:
 * - Automatically includes subcategory products if the category has subcategories
 * - Multi-level sorting: combine multiple sort criteria in priority order
 * - Default sort: ['alphabetical', 'newest'] - A-Z first, then by newest
 *
 * **Sort Options** (can be combined in array):
 * - `alphabetical`: A-Z by product name
 * - `newest`: Recently added products first
 * - `price_asc`: Lowest to highest price
 * - `price_desc`: Highest to lowest price
 * - `popular`: Trending products (last 30 days order count)
 * - `order_frequency`: Most ordered products (completed orders count)
 * - `stock`: By inventory quantity (backend may be commented)
 * - `rating`: By review ratings (backend may be commented, requires Review model)
 *
 * **Multi-Sort Logic**:
 * - Array order determines priority: `['price_asc', 'popular', 'alphabetical']`
 * - If two products have same price, sorted by popularity
 * - If same price AND popularity, sorted alphabetically
 *
 * @param params - Category slug, pagination, and array of sort options
 * @returns Query result with products, meta includes hasSubcategories boolean
 *
 * @example
 * // Default: alphabetical then newest
 * const { data } = useProductsByCategorySlug({ slug: 'electronics' });
 *
 * @example
 * // Price first, then most ordered, then alphabetical
 * const { data } = useProductsByCategorySlug({
 *   slug: 'fashion',
 *   sort: ['price_asc', 'order_frequency', 'alphabetical'],
 *   page: 1,
 *   limit: 20
 * });
 *
 * @example
 * // Trending products sorted by price
 * const { data } = useProductsByCategorySlug({
 *   slug: 'gadgets',
 *   sort: ['popular', 'price_asc']
 * });
 *
 * @example
 * // Check if category has subcategories
 * const { data } = useProductsByCategorySlug({ slug: 'clothing' });
 * if (data?.meta.hasSubcategories) {
 *   console.log('Products include subcategories');
 * }
 */
export const useProductsByCategorySlug = (params: CategoryBySlugParams) => {
  return useQuery<{ data: ProductListItem[]; meta: CategoryBySlugMeta }>({
    queryKey: ['products', 'byCategorySlug', params],
    queryFn: async () => {
      const { slug, sort, attributes, specs, ...queryParams } = params;

      // Convert sort array to comma-separated string for URL
      const sortParam = sort && sort.length > 0 ? sort.join(',') : undefined;

      // Convert attributes/specs maps to backend-friendly "key:value|value2" strings
      // Example: { Color: ['Red','Blue'], Size: ['M','L'] } -> ["Color:Red|Blue","Size:M|L"]
      const serializeMap = (map?: Record<string, string[]>): string[] | undefined => {
        if (!map) return undefined;
        const entries = Object.entries(map);
        if (!entries.length) return undefined;
        return entries.map(([k, vals]) => `${k}:${vals.join('|')}`);
      };

      const attributeParams = serializeMap(attributes);
      const specParams = serializeMap(specs);

      const response = await apiClient.getWithMeta<ProductListItem[],CategoryBySlugMeta>(api.products.byCategorySlug(slug), {
        params: {
          ...queryParams,
          ...(sortParam && { sort: sortParam }),
          ...(attributeParams && { attributes: attributeParams }),
          ...(specParams && { specs: specParams }),
        },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }

      return { data: response.data || [], meta: response.meta || { limit: 20, page: 1, pages: 0, total: 0, hasSubcategories: false, slug: '' } };

    },
    enabled: !!params.slug,
    staleTime: 3 * 60 * 1000, // 3 minutes - categories change less frequently
  });
};

/**
 * Hook to fetch products of the week (last 7 days top sellers)
 * Returns ProductListItem for efficient list rendering
 * @param page - Page number
 * @param limit - Items per page
 * @returns Query result with week's top products
 */
export const useWeekProducts = (page = 1, limit = 10) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'week', page, limit],
    queryFn: async () => {
      const response = await apiClient.get<ProductListItem[]>(api.products.week, {
        params: { page, limit },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return response as unknown as { data: ProductListItem[]; meta: ProductListMeta };
    },
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
export const useTopSoldProducts = (page = 1, limit = 10) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'topSold', page, limit],
    queryFn: async () => {
      const response = await apiClient.get<ProductListItem[]>(api.products.topSold, {
        params: { page, limit },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return response as unknown as { data: ProductListItem[]; meta: ProductListMeta };
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch hot sales products (last 30 days)
 * Returns ProductListItem for efficient list rendering
 * @param page - Page number
 * @param limit - Items per page
 * @returns Query result with hot sales products
 */
export const useHotSalesProducts = (page = 1, limit = 10) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'hotSales', page, limit],
    queryFn: async () => {
      const response = await apiClient.get<ProductListItem[]>(api.products.hotSales, {
        params: { page, limit },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return response as unknown as { data: ProductListItem[]; meta: ProductListMeta };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch top categories by purchase volume
 * @param limit - Maximum number of categories (max: 10, default: 10)
 * @returns Query result with top categories
 */
export const useTopCategories = (limit = 10) => {
  return useQuery<TopCategory[]>({
    queryKey: ['products', 'topCategories', limit],
    queryFn: async () => {
      const response = await apiClient.get<TopCategory[]>(api.products.topCategories, {
        params: { limit },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return response.data;
    },
    staleTime: 20 * 60 * 1000, // 20 minutes
    refetchOnMount: false,
  });
};

/**
 * Hook to fetch personalized product recommendations for a user
 * Returns ProductListItem for efficient list rendering
 * @param userId - User ID (optional)
 * @param page - Page number
 * @param limit - Items per page
 * @returns Query result with recommended products
 */
export const useProductRecommendations = (userId?: string, page = 1, limit = 10) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'recommendations', userId, page, limit],
    queryFn: async () => {
      const response = await apiClient.get<ProductListItem[]>(api.products.recommendations, {
        params: { userId, page, limit },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return response as unknown as { data: ProductListItem[]; meta: ProductListMeta };
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch product recommendations based on a specific product
 * Returns ProductListItem for efficient list rendering
 * @param productId - Product ID to base recommendations on
 * @param page - Page number
 * @param limit - Items per page
 * @returns Query result with related products
 */
export const useRecommendationsByProduct = (productId: string, page = 1, limit = 20) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'recommendationsByProduct', productId, page, limit],
    queryFn: async () => {
      const response = await apiClient.get<ProductListItem[]>(
        api.products.recommendationsByProduct(productId),
        {
          params: { page, limit },
        }
      );
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return response as unknown as { data: ProductListItem[]; meta: ProductListMeta };
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch newly added products (sorted by creation date)
 * Returns ProductListItem for efficient list rendering
 * @param page - Page number
 * @param limit - Items per page
 * @returns Query result with new products
 */
export const useNewProducts = (page = 1, limit = 20) => {
  return useQuery<{ data: ProductListItem[]; meta: ProductListMeta }>({
    queryKey: ['products', 'new', page, limit],
    queryFn: async () => {
      const response = await apiClient.get<ProductListItem[]>(api.products.newProducts, {
        params: { page, limit },
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return response as unknown as { data: ProductListItem[]; meta: ProductListMeta };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
  });
};

/**
 * Hook for search autocomplete suggestions (non-cached, cancellable)
 * Returns AutocompleteProduct[] for richer display (optional image/category)
 * @param query - Search query string (min 2 characters)
 * @param limit - Maximum number of suggestions
 */
export const useProductSearchAutocomplete = (query: string, limit = 10) => {
  return useQuery<AutocompleteProduct[]>({
    queryKey: ['products', 'autocomplete', query, limit],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<AutocompleteProduct[]>(api.products.autocomplete, {
        params: { q: query, limit },
        signal,
      });
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      return response.data;
    },
    enabled: !!query && query.trim().length >= 2,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
