/**
 * Product types for the storefront
 */

export interface ProductAttribute {
  name: string;
  value: string;
}

export interface ProductSpecification {
  key: string;
  value: string;
}

export interface ProductCategory {
  _id: string;
  name: string;
  slug: string;
  image: string;
}

export interface ProductDimension {
  key: 'length' | 'breadth' | 'height' | 'volume' | 'width' | 'weight';
  value: string;
}

export interface ProductDescriptionImage {
  url: string;
  cover_image: boolean;
}

export interface ProductPricingTier {
  minQty: number;
  maxQty?: number;
  strategy: 'fixedPrice' | 'percentOff' | 'amountOff';
  value: number;
}

export interface ProductPackSize {
  label: string;
  quantity: number;
  price?: number;
  stock?: number;
  enableAttributes: boolean;
}

export interface ProductVariantChild {
  name: string;
  price?: number;
  stock: number;
  colorCode?: string;
  pricingTiers?: ProductPricingTier[];
}

export interface ProductVariant {
  name: string;
  children: ProductVariantChild[];
}

export interface ProductShipping {
  addedCost: number;
  increaseCostBy: number;
  addedDays: number;
}

export interface SaleVariant {
  attributeName?: string | null;
  attributeValue?: string | null;
  discount: number;
  amountOff: number;
  maxBuys: number;
  boughtCount: number;
}

export interface ProductSale {
  _id: string;
  product: string;
  title?: string;
  isActive: boolean;
  isHot: boolean;
  type: 'Flash' | 'Limited' | 'Normal';
  campaign?: string;
  startDate?: string;
  endDate?: string;
  variants: SaleVariant[];
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  sku?: string | number;
  brand?: string;
  stock?: number;
  lowStockThreshold?: number;
  description?: string;
  tags?: string[];
  attributes?: ProductVariant[]; // Updated to match backend structure
  specifications?: ProductSpecification[];
  category?: ProductCategory;
  description_images?: ProductDescriptionImage[]; // Updated to match backend
  dimension?: ProductDimension[];
  pricingTiers?: ProductPricingTier[];
  packSizes?: ProductPackSize[]; // NEW: Pack sizes for bulk/wholesale products
  shipping?: ProductShipping;
  rating?: number;
  status?: 'active' | 'inactive' | 'archived';
  sale?: ProductSale | null; // NEW: Sale information
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Product type used for product listing pages (catalogs, category lists).
 * Lightweight subset of the full product used for faster list rendering.
 */
export interface ProductListItem {
  _id: string;
  name: string;
  slug: string;
  price: number;
  images: ProductDescriptionImage[]; // Array of product images
  category: ProductCategory;
  sku: string | number;
  stock: number;
  originStock: number; // Initial stock value, used to calculate sold quantity from sales
  rating?: number;
  sale: ProductSale | null;
  attributes?: ProductVariant[]; // Product variants/attributes
  packSizes?: ProductPackSize[]; // Pack sizes for bulk/wholesale products
}

/**
 * Product type used for a single product page (full detail view).
 * Alias to the main `Product` interface so existing code can keep using `Product`.
 */
export type ProductDetail = Product;

/**
 * Minimal product representation used for search results (fast list of matches).
 * Contains only the fields needed: name, slug and a cover image.
 */
export interface SearchProduct {
  _id?: string;
  name: string;
  slug: string;
  image?: string; // cover image url
}

/**
 * Very small autocomplete suggestion payload. Contains the minimum data
 * (name) to power autosuggest UI. Add `slug` if you need to navigate on select.
 */
export interface AutocompleteSuggestion {
  name: string;
  slug?: string;
}

export interface ProductListMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  search?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price' | 'name' | 'createdAt' | 'rating' | 'sales';
  sortOrder?: 'asc' | 'desc';
  availability?: 'in-stock' | 'out-of-stock' | 'low-stock';
  specKey?: string;
  specValue?: string;
}

export interface SearchProductParams {
  q: string;
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  sortBy?: 'price' | 'name' | 'createdAt' | 'rating' | 'sales';
  sortOrder?: 'asc' | 'desc';
  specKey?: string;
  specValue?: string;
}

export type SortOption = 'alphabetical' | 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'stock' | 'order_frequency' | 'rating';

export interface CategoryBySlugParams {
  slug: string;
  page?: number;
  limit?: number;
  /**
   * Array of sort options to apply in priority order.
   * Default: ['alphabetical', 'newest']
   * 
   * @example ['price_asc', 'popular', 'alphabetical']
   * @example ['order_frequency', 'newest']
   */
  sort?: SortOption[];
}

export interface CategoryBySlugMeta extends ProductListMeta {
  slug: string;
  hasSubcategories: boolean;
}

export interface TopCategory {
  _id: string;
  name: string;
  slug: string;
  image: string;
  totalSold?: number;
  productCount?: number;
}

export interface AutocompleteProduct {
  _id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  category?: {
    name: string;
    slug: string;
  };
}
