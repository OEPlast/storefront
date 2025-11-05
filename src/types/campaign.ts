/**
 * Campaign types for the storefront
 */

import { ProductListItem, ProductSale } from './product';

export interface Campaign {
  _id: string;
  slug: string;
  image: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'draft';
  products: string[]; // Product IDs
  sales: string[]; // Sale IDs
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDetail extends Omit<Campaign, 'products' | 'sales'> {
  products: ProductListItem[]; // Populated products
  sales: ProductSale[]; // Populated sales
}

export interface CampaignProductsResponse {
  campaign: Campaign;
  products: ProductListItem[];
}

export interface CampaignFilters {
  priceRange: { min: number; max: number };
  attributes: Array<{
    name: string;
    values: Array<{ value: string; count: number; colorCode?: string }>;
  }>;
  specifications: Array<{
    key: string;
    values: Array<{ value: string; count: number }>;
  }>;
  tags: Array<{ value: string; count: number }>;
  packSizes: Array<{ label: string; count: number }>;
}

export interface CampaignProductsMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CampaignProductsParams {
  slug: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  attributes?: Record<string, string[]>;
  sort?: string | string[]; // Can be single sort option or array for multi-sort
  inStock?: boolean;
  packSize?: string;
}
