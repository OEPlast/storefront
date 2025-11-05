# DRY Principle - Reusable Aggregation Pipeline Components

**Purpose**: Create reusable, testable, and maintainable aggregation pipeline utilities  
**Location**: `/old-main-server/src/services/aggregation/`  
**Status**: 📋 Implementation Required

---

## Overview

This document outlines the DRY (Don't Repeat Yourself) approach for aggregation pipelines. By extracting common pipeline stages into reusable utilities, we ensure consistency, maintainability, and testability across all MongoDB aggregation queries.

---

## Directory Structure

```
/old-main-server/src/services/aggregation/
├── index.ts                      # Export all utilities
├── categoryPipelineUtils.ts      # Category-specific stages
├── productPipelineUtils.ts       # Product enrichment stages
├── filterPipelineUtils.ts        # Dynamic filter builders
├── paginationPipelineUtils.ts    # Pagination & sorting
└── __tests__/                    # Unit tests for each utility
    ├── categoryPipelineUtils.test.ts
    ├── productPipelineUtils.test.ts
    ├── filterPipelineUtils.test.ts
    └── paginationPipelineUtils.test.ts
```

---

## 1. Category Pipeline Utilities

### File: `categoryPipelineUtils.ts`

```typescript
import { PipelineStage } from 'mongoose';

/**
 * Reusable stage: Get category and all subcategory IDs
 * 
 * Used by:
 * - getCategoryBySlug
 * - getCategoryFilters
 * - getProductsByCategory
 * 
 * @param categorySlug - The category slug to match
 * @returns Array of pipeline stages
 */
export const buildCategoryTreeStages = (categorySlug: string): PipelineStage[] => [
  {
    $match: { slug: categorySlug }
  },
  {
    $lookup: {
      from: 'categories',
      localField: '_id',
      foreignField: 'parent',
      as: 'subcategories'
    }
  },
  {
    $addFields: {
      allCategoryIds: {
        $concatArrays: [
          ['$_id'],
          '$subcategories._id'
        ]
      }
    }
  }
];

/**
 * Reusable stage: Lookup subcategories with product counts
 * 
 * Joins with products collection to count active products in each subcategory
 * 
 * Used by:
 * - getCategoryBySlug (display product counts in subcategory cards)
 * 
 * @returns Pipeline stage object
 */
export const lookupSubcategoriesWithCounts = (): PipelineStage => ({
  $lookup: {
    from: 'products',
    let: { subCategoryIds: '$subcategories._id' },
    pipeline: [
      {
        $match: {
          $expr: { $in: ['$category', '$$subCategoryIds'] },
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ],
    as: 'subcategoryProductCounts'
  }
});

/**
 * Merge product counts into subcategory objects
 * 
 * Maps counts from subcategoryProductCounts array to each subcategory
 * 
 * @returns Pipeline stage object
 */
export const mergeSubcategoryProductCounts = (): PipelineStage => ({
  $addFields: {
    sub_categories: {
      $map: {
        input: '$subcategories',
        as: 'subcat',
        in: {
          _id: '$$subcat._id',
          name: '$$subcat.name',
          slug: '$$subcat.slug',
          image: '$$subcat.image',
          productCount: {
            $ifNull: [
              {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: '$subcategoryProductCounts',
                          cond: { $eq: ['$$this._id', '$$subcat._id'] }
                        }
                      },
                      as: 'count',
                      in: '$$count.count'
                    }
                  },
                  0
                ]
              },
              0
            ]
          }
        }
      }
    }
  }
});
```

---

## 2. Product Pipeline Utilities

### File: `productPipelineUtils.ts`

```typescript
import { PipelineStage } from 'mongoose';

/**
 * Lookup reviews and calculate rating statistics
 * 
 * Calculates:
 * - Average rating
 * - Review count
 * 
 * Only includes approved reviews
 * 
 * Used by:
 * - getProductsByCategory
 * - getProductDetails
 * - getTrendingProducts
 * - getRelatedProducts
 * - searchProducts
 * 
 * @returns Pipeline stage object
 */
export const lookupReviewStats = (): PipelineStage => ({
  $lookup: {
    from: 'reviews',
    let: { productId: '$_id' },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ['$product', '$$productId'] },
          isApproved: true
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ],
    as: 'reviewStats'
  }
});

/**
 * Lookup orders and calculate order statistics
 * 
 * Calculates:
 * - Total order count (how many orders contain this product)
 * - Total quantity sold
 * 
 * Only includes Processing and Completed orders
 * 
 * Used by:
 * - getProductsByCategory
 * - getProductDetails
 * - getTrendingProducts
 * - getBestSellers
 * 
 * @returns Pipeline stage object
 */
export const lookupOrderStats = (): PipelineStage => ({
  $lookup: {
    from: 'orders',
    let: { productId: '$_id' },
    pipeline: [
      { $unwind: '$products' },
      {
        $match: {
          $expr: { $eq: ['$products.product', '$$productId'] },
          status: { $in: ['Processing', 'Completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$products.qty' }
        }
      }
    ],
    as: 'orderStats'
  }
});

/**
 * Add computed fields for product statistics
 * 
 * Adds:
 * - averageRating: Avg rating from reviews (default: 0)
 * - reviewCount: Number of reviews (default: 0)
 * - orderCount: Number of orders containing product (default: 0)
 * - soldQuantity: Total quantity sold (default: 0)
 * - popularityScore: Weighted score for sorting (rating*10 + orders*2 + reviews*1)
 * 
 * Used by:
 * - getProductsByCategory
 * - searchProducts
 * - getTrendingProducts
 * 
 * @returns Pipeline stage object
 */
export const addProductComputedFields = (): PipelineStage => ({
  $addFields: {
    averageRating: {
      $ifNull: [
        { $arrayElemAt: ['$reviewStats.avgRating', 0] },
        0
      ]
    },
    reviewCount: {
      $ifNull: [
        { $arrayElemAt: ['$reviewStats.count', 0] },
        0
      ]
    },
    orderCount: {
      $ifNull: [
        { $arrayElemAt: ['$orderStats.totalOrders', 0] },
        0
      ]
    },
    soldQuantity: {
      $ifNull: [
        { $arrayElemAt: ['$orderStats.totalQuantity', 0] },
        0
      ]
    },
    popularityScore: {
      $add: [
        {
          $multiply: [
            { $ifNull: [{ $arrayElemAt: ['$reviewStats.avgRating', 0] }, 0] },
            10 // Weight: Rating has highest impact
          ]
        },
        {
          $multiply: [
            { $ifNull: [{ $arrayElemAt: ['$orderStats.totalOrders', 0] }, 0] },
            2 // Weight: Orders have medium impact
          ]
        },
        {
          $ifNull: [
            { $arrayElemAt: ['$reviewStats.count', 0] },
            0
          ] // Weight: Review count has lowest impact
        }
      ]
    }
  }
});

/**
 * Lookup category information for products
 * 
 * Enriches product with category details (name, slug)
 * 
 * Used by:
 * - getProductsByCategory
 * - searchProducts
 * - getRelatedProducts
 * 
 * @returns Pipeline stage object
 */
export const lookupCategoryInfo = (): PipelineStage => ({
  $lookup: {
    from: 'categories',
    localField: 'category',
    foreignField: '_id',
    as: 'categoryInfo'
  }
});

/**
 * Project standard product fields
 * 
 * Returns consistent product shape across all queries
 * Includes all display fields + computed statistics
 * 
 * Used by:
 * - getProductsByCategory
 * - searchProducts
 * - getTrendingProducts
 * - getRelatedProducts
 * 
 * @returns Pipeline stage object
 */
export const projectProductFields = (): PipelineStage => ({
  $project: {
    _id: 1,
    sku: 1,
    name: 1,
    slug: 1,
    description: 1,
    price: 1,
    stock: 1,
    lowStockThreshold: 1,
    status: 1,
    description_images: 1,
    attributes: 1,
    specifications: 1,
    dimension: 1,
    tags: 1,
    packSizes: 1,
    pricingTiers: 1,
    category: {
      _id: { $arrayElemAt: ['$categoryInfo._id', 0] },
      name: { $arrayElemAt: ['$categoryInfo.name', 0] },
      slug: { $arrayElemAt: ['$categoryInfo.slug', 0] }
    },
    // Computed fields
    averageRating: 1,
    reviewCount: 1,
    orderCount: 1,
    soldQuantity: 1,
    popularityScore: 1,
    // Timestamps
    createdAt: 1,
    updatedAt: 1
  }
});
```

---

## 3. Filter Pipeline Utilities

### File: `filterPipelineUtils.ts`

```typescript
import { PipelineStage } from 'mongoose';
import mongoose from 'mongoose';

/**
 * Build price range filter stage
 * 
 * Creates dynamic $match stage for price filtering
 * Returns null if no price filter specified
 * 
 * Used by:
 * - getProductsByCategory
 * - searchProducts
 * 
 * @param minPrice - Minimum price (optional)
 * @param maxPrice - Maximum price (optional)
 * @returns Pipeline stage object or null
 */
export const buildPriceFilter = (
  minPrice?: number,
  maxPrice?: number
): PipelineStage | null => {
  const conditions: Array<Record<string, unknown>> = [];
  
  if (minPrice != null && !isNaN(minPrice)) {
    conditions.push({ $gte: ['$price', minPrice] });
  }
  
  if (maxPrice != null && !isNaN(maxPrice)) {
    conditions.push({ $lte: ['$price', maxPrice] });
  }
  
  if (conditions.length === 0) {
    return null;
  }
  
  return {
    $match: {
      $expr: {
        $and: conditions
      }
    }
  };
};

/**
 * Build attribute filter stage
 * 
 * Creates dynamic $match stage for attribute filtering
 * Supports multiple attributes (AND logic)
 * Each attribute uses OR logic for values
 * 
 * Example: { "Color": "Red", "Size": "M" }
 * Means: Product must have (Color=Red) AND (Size=M)
 * 
 * Used by:
 * - getProductsByCategory
 * - searchProducts
 * 
 * @param attributeFilters - Object with attribute name -> value mapping
 * @returns Pipeline stage object or null
 */
export const buildAttributeFilter = (
  attributeFilters?: Record<string, string | string[]>
): PipelineStage | null => {
  if (!attributeFilters || Object.keys(attributeFilters).length === 0) {
    return null;
  }
  
  return {
    $match: {
      $expr: {
        $allElementsTrue: {
          $map: {
            input: { $objectToArray: attributeFilters },
            as: 'filter',
            in: {
              $anyElementTrue: {
                $map: {
                  input: '$attributes',
                  as: 'attr',
                  in: {
                    $and: [
                      { $eq: ['$$attr.name', '$$filter.k'] },
                      {
                        $cond: [
                          { $isArray: '$$filter.v' },
                          { $in: ['$$attr.children.name', '$$filter.v'] },
                          { $in: ['$$filter.v', '$$attr.children.name'] }
                        ]
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    }
  };
};

/**
 * Build category filter stage
 * 
 * Matches products in main category OR any subcategories
 * Also filters by active status
 * 
 * Used by:
 * - getProductsByCategory (in $lookup sub-pipeline)
 * 
 * @param categoryIds - Variable reference string (e.g., '$$categoryIds') or mongoose ObjectId array
 * @returns Pipeline stage object
 */
export const buildCategoryFilter = (
  categoryIds: string | mongoose.Types.ObjectId[]
): PipelineStage => {
  const categoryFilter = typeof categoryIds === 'string' 
    ? categoryIds 
    : categoryIds;
    
  return {
    $match: {
      $expr: {
        $and: [
          { $in: ['$category', categoryFilter] },
          { $eq: ['$status', 'active'] }
        ]
      }
    }
  };
};

/**
 * Build tags filter stage
 * 
 * Matches products that have at least one of the specified tags
 * 
 * Used by:
 * - searchProducts
 * - getProductsByTag
 * 
 * @param tags - Array of tag strings
 * @returns Pipeline stage object or null
 */
export const buildTagsFilter = (tags?: string[]): PipelineStage | null => {
  if (!tags || tags.length === 0) {
    return null;
  }
  
  return {
    $match: {
      tags: { $in: tags }
    }
  };
};
```

---

## 4. Pagination & Sorting Utilities

### File: `paginationPipelineUtils.ts`

```typescript
import { PipelineStage } from 'mongoose';

/**
 * Sort by popularity algorithm
 * 
 * Sort priority:
 * 1. popularityScore (desc) - Weighted score (rating*10 + orders*2 + reviews*1)
 * 2. averageRating (desc) - Average review rating
 * 3. orderCount (desc) - Number of orders
 * 4. createdAt (desc) - Newest first
 * 
 * Used by:
 * - getProductsByCategory
 * - getTrendingProducts
 * 
 * @returns Pipeline stage object
 */
export const sortByPopularity = (): PipelineStage => ({
  $sort: {
    popularityScore: -1,
    averageRating: -1,
    orderCount: -1,
    createdAt: -1
  }
});

/**
 * Sort by price (low to high or high to low)
 * 
 * Used by:
 * - getProductsByCategory (when user selects price sort)
 * - searchProducts
 * 
 * @param ascending - true for low to high, false for high to low
 * @returns Pipeline stage object
 */
export const sortByPrice = (ascending: boolean = true): PipelineStage => ({
  $sort: {
    price: ascending ? 1 : -1,
    name: 1 // Secondary sort by name for consistency
  }
});

/**
 * Sort by newest first
 * 
 * Used by:
 * - getProductsByCategory (when user selects "newest")
 * - getNewArrivals
 * 
 * @returns Pipeline stage object
 */
export const sortByNewest = (): PipelineStage => ({
  $sort: {
    createdAt: -1,
    _id: -1 // Ensure consistent ordering
  }
});

/**
 * Pagination facet
 * 
 * Splits aggregation into two parallel branches:
 * 1. metadata: Calculate total count, pages, navigation flags
 * 2. data: Get actual paginated data
 * 
 * Used by:
 * - getProductsByCategory
 * - searchProducts
 * - getAllProducts (admin)
 * - Any paginated query
 * 
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 * @returns Pipeline stage object
 */
export const paginationFacet = (
  page: number,
  limit: number
): PipelineStage => ({
  $facet: {
    metadata: [
      { $count: 'total' },
      {
        $addFields: {
          page,
          limit,
          totalPages: { $ceil: { $divide: ['$total', limit] } },
          hasNextPage: {
            $lt: [
              page,
              { $ceil: { $divide: ['$total', limit] } }
            ]
          },
          hasPrevPage: { $gt: [page, 1] }
        }
      }
    ],
    data: [
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ]
  }
});

/**
 * Format pagination response
 * 
 * Shapes the final response with data and pagination metadata
 * 
 * Used by:
 * - All queries using paginationFacet
 * 
 * @returns Pipeline stage object
 */
export const formatPaginationResponse = (): PipelineStage => ({
  $project: {
    data: 1,
    pagination: {
      $ifNull: [
        { $arrayElemAt: ['$metadata', 0] },
        {
          total: 0,
          page: 1,
          limit: 12,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      ]
    }
  }
});
```

---

## 5. Index File

### File: `index.ts`

```typescript
// Category utilities
export {
  buildCategoryTreeStages,
  lookupSubcategoriesWithCounts,
  mergeSubcategoryProductCounts
} from './categoryPipelineUtils';

// Product utilities
export {
  lookupReviewStats,
  lookupOrderStats,
  addProductComputedFields,
  lookupCategoryInfo,
  projectProductFields
} from './productPipelineUtils';

// Filter utilities
export {
  buildPriceFilter,
  buildAttributeFilter,
  buildCategoryFilter,
  buildTagsFilter
} from './filterPipelineUtils';

// Pagination utilities
export {
  sortByPopularity,
  sortByPrice,
  sortByNewest,
  paginationFacet,
  formatPaginationResponse
} from './paginationPipelineUtils';
```

---

## 6. Usage Examples

### Example 1: Get Products by Category (Full DRY Approach)

```typescript
// src/services/Category.ts
import { PipelineStage } from 'mongoose';
import Category from '@/models/Category';
import * as Pipeline from './aggregation';

interface FilterParams {
  minPrice?: number;
  maxPrice?: number;
  attributes?: Record<string, string>;
  subcategory?: string;
}

const getProductsByCategory = async (
  categorySlug: string,
  filters: FilterParams,
  page: number = 1,
  limit: number = 12
) => {
  try {
    const pipeline: PipelineStage[] = [
      // Get category tree
      ...Pipeline.buildCategoryTreeStages(categorySlug),
      
      // Lookup products with all enrichments
      {
        $lookup: {
          from: 'products',
          let: { categoryIds: '$allCategoryIds' },
          pipeline: [
            // Apply filters
            Pipeline.buildCategoryFilter('$$categoryIds'),
            Pipeline.buildPriceFilter(filters.minPrice, filters.maxPrice),
            
            // Enrich with stats
            Pipeline.lookupReviewStats(),
            Pipeline.lookupOrderStats(),
            Pipeline.addProductComputedFields(),
            
            // Apply attribute filter
            Pipeline.buildAttributeFilter(filters.attributes),
            
            // Sort and project
            Pipeline.sortByPopularity(),
            Pipeline.lookupCategoryInfo(),
            Pipeline.projectProductFields()
          ].filter(Boolean), // Remove null stages
          as: 'products'
        }
      },
      
      // Flatten products
      { $unwind: '$products' },
      { $replaceRoot: { newRoot: '$products' } },
      
      // Paginate
      Pipeline.paginationFacet(page, limit),
      Pipeline.formatPaginationResponse()
    ];

    const result = await Category.aggregate(pipeline)
      .allowDiskUse(true)
      .exec();
    
    return {
      data: result[0]?.data || [],
      pagination: result[0]?.pagination || {},
      code: 200,
      message: 'Products fetched successfully'
    };
  } catch (error) {
    console.error('Get products by category error:', error);
    return {
      data: null,
      code: 500,
      message: 'Failed to fetch products'
    };
  }
};
```

### Example 2: Search Products (Reuse Same Utilities)

```typescript
// src/services/Product.ts
import * as Pipeline from './aggregation';

const searchProducts = async (
  searchQuery: string,
  filters: FilterParams,
  page: number = 1,
  limit: number = 12
) => {
  const pipeline: PipelineStage[] = [
    // Text search
    {
      $match: {
        $text: { $search: searchQuery },
        status: 'active'
      }
    },
    
    // Apply same filters as category
    Pipeline.buildPriceFilter(filters.minPrice, filters.maxPrice),
    Pipeline.buildAttributeFilter(filters.attributes),
    
    // Enrich with same stats
    Pipeline.lookupReviewStats(),
    Pipeline.lookupOrderStats(),
    Pipeline.addProductComputedFields(),
    
    // Sort and project
    Pipeline.sortByPopularity(),
    Pipeline.lookupCategoryInfo(),
    Pipeline.projectProductFields(),
    
    // Paginate
    Pipeline.paginationFacet(page, limit),
    Pipeline.formatPaginationResponse()
  ].filter(Boolean);

  const result = await Product.aggregate(pipeline).allowDiskUse(true);
  return result[0] || { data: [], pagination: {} };
};
```

### Example 3: Get Trending Products (Minimal Code)

```typescript
// src/services/Product.ts
import * as Pipeline from './aggregation';

const getTrendingProducts = async (limit: number = 10) => {
  const pipeline: PipelineStage[] = [
    { $match: { status: 'active' } },
    
    // Reuse enrichment utilities
    Pipeline.lookupReviewStats(),
    Pipeline.lookupOrderStats(),
    Pipeline.addProductComputedFields(),
    
    // Sort by popularity
    Pipeline.sortByPopularity(),
    
    // Limit results
    { $limit: limit },
    
    // Project fields
    Pipeline.lookupCategoryInfo(),
    Pipeline.projectProductFields()
  ];

  const result = await Product.aggregate(pipeline).allowDiskUse(true);
  return result;
};
```

---

## Benefits Summary

### ✅ Reusability
- Same utilities used across 5+ different queries
- Category, search, trending, related, new arrivals all share code

### ✅ Consistency
- Same enrichment logic = same computed fields everywhere
- Same sorting algorithm across all product lists
- Predictable response shapes

### ✅ Maintainability
- Update popularityScore formula once, applies everywhere
- Fix bug in review stats lookup, fixed in all queries
- Easy to add new computed fields globally

### ✅ Testability
- Test each utility in isolation
- Mock pipeline stages independently
- Verify output shapes with TypeScript

### ✅ Readability
- Pipeline composition is declarative
- Clear intent: `sortByPopularity()` vs inline sort stage
- Self-documenting code with JSDoc

### ✅ Type Safety
- Shared TypeScript types across all utilities
- Catch errors at compile time
- IntelliSense support in IDE

---

## Implementation Checklist

- [ ] Create `/src/services/aggregation/` directory
- [ ] Implement `categoryPipelineUtils.ts` (3 functions)
- [ ] Implement `productPipelineUtils.ts` (5 functions)
- [ ] Implement `filterPipelineUtils.ts` (4 functions)
- [ ] Implement `paginationPipelineUtils.ts` (5 functions)
- [ ] Create `index.ts` barrel export
- [ ] Add JSDoc comments to all functions
- [ ] Create unit tests for each utility
- [ ] Update `Category.ts` service to use utilities
- [ ] Update `Product.ts` service to use utilities (if exists)
- [ ] Document usage patterns in each service
- [ ] Add TypeScript types for all parameters
- [ ] Test with actual MongoDB data

---

## TypeScript Strict Mode Enforcement

### NO `any` Types Policy

**All utility functions MUST use proper TypeScript types:**

```typescript
// ❌ FORBIDDEN - Will be rejected in code review
export const buildFilter = (data: any): any => {
  return { $match: data };
};

// ✅ REQUIRED - Proper typing
export const buildFilter = (
  data: Record<string, unknown>
): PipelineStage => {
  return { $match: data };
};
```

### Required Type Imports

```typescript
import { PipelineStage } from 'mongoose';
import mongoose from 'mongoose';

// Use mongoose types for ObjectIds
type CategoryId = mongoose.Types.ObjectId;
type CategoryIdArray = mongoose.Types.ObjectId[];
type CategoryIdVariable = string; // For aggregation variables like '$$categoryIds'
```

### Proper Type Definitions for All Parameters

```typescript
// Define explicit types for complex parameters
interface AttributeFilters {
  [attributeName: string]: string | string[];
}

interface PriceRange {
  min?: number;
  max?: number;
}

interface SortOptions {
  field: 'popularity' | 'price' | 'newest' | 'rating';
  order: 'asc' | 'desc';
}

// Use in function signatures
export const buildComplexFilter = (
  priceRange: PriceRange,
  attributes: AttributeFilters,
  sortOptions: SortOptions
): PipelineStage[] => {
  // Implementation with full type safety
};
```

### Type Guards for Runtime Validation

```typescript
// Use type guards when dealing with union types
function isVariableReference(
  value: string | mongoose.Types.ObjectId[]
): value is string {
  return typeof value === 'string' && value.startsWith('$$');
}

export const buildCategoryFilter = (
  categoryIds: string | mongoose.Types.ObjectId[]
): PipelineStage => {
  const categoryValue = isVariableReference(categoryIds)
    ? categoryIds // Use as aggregation variable
    : categoryIds; // Use as array
    
  return { $match: { /* ... */ } };
};
```

### Unknown vs Any

```typescript
// Use 'unknown' for truly unknown data, then validate
function parseFilterInput(input: unknown): CategoryFilters {
  // Validate and narrow the type
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid filter input');
  }
  
  // Safe to cast after validation
  return input as CategoryFilters;
}

// ❌ NEVER use 'any'
function parseFilterInput(input: any): any {
  return input; // Type safety completely lost
}
```

### tsconfig.json Requirements

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## Testing Strategy

### Unit Tests
Test each utility function in isolation:

```typescript
// __tests__/productPipelineUtils.test.ts
import { addProductComputedFields } from '../productPipelineUtils';

describe('addProductComputedFields', () => {
  it('should add popularityScore field', () => {
    const stage = addProductComputedFields();
    expect(stage).toHaveProperty('$addFields.popularityScore');
  });
  
  it('should handle missing reviewStats', () => {
    // Test that $ifNull defaults to 0
  });
});
```

### Integration Tests
Test pipeline composition:

```typescript
// __tests__/integration/categoryPipeline.test.ts
import * as Pipeline from '../aggregation';

describe('Category Products Pipeline', () => {
  it('should compose full pipeline without errors', async () => {
    const pipeline = [
      ...Pipeline.buildCategoryTreeStages('test-slug'),
      Pipeline.lookupReviewStats(),
      // ... etc
    ];
    
    const result = await Category.aggregate(pipeline);
    expect(result).toBeDefined();
  });
});
```

---

## Performance Notes

- All utilities return lightweight pipeline stage objects
- No heavy computation until pipeline executes
- Utilities are pure functions (no side effects)
- Can be called repeatedly without performance impact
- Pipeline composition is done at JavaScript level (fast)

---

**Last Updated**: November 2, 2025  
**Status**: ✅ Ready for Implementation
