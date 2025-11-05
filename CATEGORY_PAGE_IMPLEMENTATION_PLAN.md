# Category Page Backend Integration - Implementation Plan

**Project**: Connect storefront category page to backend API  
**Date**: November 2, 2025  
**Status**: 🔄 In Progress

---

## 🚀 Quick Reference

### Three Core APIs (All Aggregation Pipeline-Based)

1. **GET `/api/categories/slug/:slug`** → Category info + subcategories + product counts
2. **GET `/api/categories/:slug/filters`** → Available filters (price, attributes, subcategories)
3. **GET `/api/categories/:slug/products`** → Paginated products with smart sorting + filtering

### Aggregation Pipeline Workflow

```
Category.aggregate() → $match → $lookup (subcategories) → $lookup (products) → 
$lookup (reviews) → $lookup (orders) → $addFields (computed) → $sort → $facet → $project
```

### DRY Principle Architecture

```
Reusable Utilities (/services/aggregation/)
├── categoryPipelineUtils.ts  → buildCategoryTreeStages()
├── productPipelineUtils.ts   → lookupReviewStats(), addProductComputedFields()
├── filterPipelineUtils.ts    → buildPriceFilter(), buildAttributeFilter()
└── paginationPipelineUtils.ts → sortByPopularity(), paginationFacet()

Usage in Services
├── Category.getProductsByCategory() → Compose 5-10 utilities into pipeline
├── Product.searchProducts()         → Reuse same utilities
└── Product.getTrendingProducts()    → Reuse same utilities
```

**Result**: Write once, use everywhere. Update once, applies everywhere.

### Performance Targets
- Category by slug: **< 50ms**
- Category filters: **< 100ms**  
- Products query: **< 200ms**

### Key Technologies
- **MongoDB Aggregation Pipelines** (99% of logic)
- **DRY Utilities** (reusable pipeline components)
- **Indexes** (critical for performance)
- **$facet** (parallel processing for pagination)
- **$lookup with sub-pipelines** (efficient joins)
- **allowDiskUse: true** (large dataset support)

---

## Overview

This plan outlines the complete backend integration for the category page, enabling dynamic category browsing with real-time data from the API. The implementation follows the established architecture patterns (Route → Validator → Controller → Service) and maintains all existing UI/UX.

### Aggregation Pipeline Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CATEGORY PAGE DATA FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

1. GET /api/categories/slug/:slug (Category Info)
   ┌──────────────┐
   │ Categories   │──→ $match(slug) ──→ $lookup(subcategories) ──→
   └──────────────┘                            │
                                               ↓
                                    $lookup(products per subcat)
                                               │
                                               ↓
                                      $addFields(productCount)
                                               │
                                               ↓
                                          $project
                                               │
                                               ↓
                          { category, sub_categories[{productCount}] }


2. GET /api/categories/:slug/filters (Available Filters)
   ┌──────────────┐       ┌──────────────┐
   │ Categories   │───┬──→│ Products     │──→ $unwind(attributes)
   └──────────────┘   │   └──────────────┘           │
                      │                               ↓
            $lookup(subcategories)           $group(collect unique)
                      │                               │
                      ↓                               ↓
              Get category tree          { min/max price, attributes,
                      │                    brands, tags, colors }
                      └──────────────────────────┬────────────────────┘
                                                  │
                                                  ↓
                                            $project
                                                  │
                                                  ↓
                      { priceRange, attributes, subcategories, brands }


3. GET /api/categories/:slug/products (Smart Product List)
   ┌──────────────┐
   │ Categories   │──→ $match(slug) ──→ $lookup(subcategories)
   └──────────────┘                            │
                                               ↓
                                    Build allCategoryIds[]
                                               │
                  ┌────────────────────────────┴─────────────────────┐
                  ↓                                                   │
   ┌──────────────────────────────────────────────────────────────┐  │
   │                    MASSIVE $LOOKUP                            │ ←┘
   │  from: 'products'                                             │
   │  pipeline: [                                                  │
   │    $match(category in tree + filters) ────────────────────┐   │
   │    $lookup(reviews) → calc avgRating, count               │   │
   │    $lookup(orders) → calc orderCount, soldQty             │   │
   │    $addFields(popularityScore = rating*10 + orders*2)     │   │
   │    $sort(popularityScore, avgRating, orderCount, date)    │   │
   │    $lookup(category info)                                 │   │
   │    $project(final shape)                                  │   │
   │  ]                                                            │   │
   └───────────────────────────────────────────────────────────────┘   │
                                 │                                      │
                                 ↓                                      │
                          $unwind(products)                             │
                                 │                                      │
                                 ↓                                      │
                       $replaceRoot(flatten)                            │
                                 │                                      │
                                 ↓                                      │
                       ┌─────────────────┐                              │
                       │    $FACET       │                              │
                       ├─────────────────┤                              │
                       │ metadata:       │←─────────────────────────────┘
                       │  - count        │
                       │  - totalPages   │
                       │  - hasNext      │
                       ├─────────────────┤
                       │ products:       │
                       │  - $skip        │
                       │  - $limit       │
                       └─────────────────┘
                                 │
                                 ↓
               { products: [...], pagination: {...} }

┌─────────────────────────────────────────────────────────────────────────┐
│                         KEY OPTIMIZATIONS                                │
├─────────────────────────────────────────────────────────────────────────┤
│ • Indexes: category, status, price, slug, parent                        │
│ • $facet: Parallel processing (pagination + data)                       │
│ • Sub-pipelines: Filter within $lookup (not after)                      │
│ • allowDiskUse: Handle 100MB+ aggregations                              │
│ • Redis Cache: 30min TTL for filters (rarely change)                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Requirements Summary

1. **Get category info by slug** - Fetch category details with populated subcategories
2. **Get category filters** - Retrieve available filters (subcategories, price ranges, attributes)
3. **Get products by category** - Fetch paginated products with filtering and smart sorting
4. **Server-side initial data fetching** - Pre-fetch data in page.tsx
5. **Client-side interactivity** - Handle filters, pagination in CategoryClient.tsx

---

## 📋 Implementation Checklist

### Phase 1: Backend API Development

#### 1.1 Category Service Extensions
- [ ] Create `getCategoryBySlug` method using aggregation pipeline
- [ ] Stage 1: Match by slug
- [ ] Stage 2: Lookup subcategories (self-join)
- [ ] Stage 3: Lookup product counts per subcategory
  - [ ] Use sub-pipeline with $group to count products
  - [ ] Match only active products
- [ ] Stage 4: Merge product counts into subcategory objects
  - [ ] Use $map with $filter to match counts to subcategories
  - [ ] Default to 0 if no products found
- [ ] Stage 5: Project final shape with all category info
- [ ] Add error handling for non-existent slugs (empty aggregation result)

#### 1.2 Category Filters API
- [ ] Create `getCategoryFilters` service method using aggregation pipeline
- [ ] Stage 1-3: Get category tree
  - [ ] Match category by slug
  - [ ] Lookup subcategories
  - [ ] Build allCategoryIds array
- [ ] Stage 4-5: Aggregate filter data from products
  - [ ] Lookup products in category tree
  - [ ] Unwind attributes for aggregation
  - [ ] Group to collect: minPrice, maxPrice, unique attributes, brands, tags
  - [ ] Use $reduce to reshape attribute groups
  - [ ] Filter null values from collections
- [ ] Stage 6: Format subcategories with metadata
- [ ] Stage 7: Project final filter object
  - [ ] priceRange: { min, max }
  - [ ] attributes: [{ name, values: [{ value, colorCode }] }]
  - [ ] subcategories: [{ _id, name, slug, image }]
  - [ ] brands: string[]
  - [ ] tags: string[]
- [ ] Optimize with indexes on attributes and price fields

#### 1.3 Products by Category API
- [ ] Create `getProductsByCategory` service method using full aggregation pipeline
- [ ] Stage 1-3: Get category and subcategory IDs
  - [ ] Match category by slug
  - [ ] Lookup subcategories
  - [ ] Build allCategoryIds array
- [ ] Stage 4: Massive lookup with sub-pipeline
  - [ ] Match products in category tree + status filter
  - [ ] Apply price range filter using $expr
  - [ ] Lookup reviews with aggregation (avg rating, count)
  - [ ] Lookup orders with aggregation (order count, sold quantity)
  - [ ] Calculate popularityScore (weighted: rating*10 + orders*2 + reviews*1)
  - [ ] Apply attribute filters using dynamic $expr conditions
  - [ ] Sort by popularityScore, averageRating, orderCount, createdAt
  - [ ] Lookup category info for product details
  - [ ] Project final product shape with computed fields
- [ ] Stage 5-6: Unwind and flatten products
- [ ] Stage 7: Facet for pagination + metadata in parallel
  - [ ] metadata branch: count, page info, totalPages
  - [ ] products branch: skip + limit
- [ ] Stage 8: Format final response with pagination object
- [ ] Implement filter variations:
  - [ ] Subcategory filter (via category tree)
  - [ ] Price range filter (min/max)
  - [ ] Attribute filters (dynamic object matching)
  - [ ] Brand filter (if applicable)
  - [ ] Sale/on-sale filter (future enhancement)
- [ ] Add index recommendations for optimal performance
- [ ] Add allowDiskUse for large aggregations
- [ ] Ensure zero duplicate products (guaranteed by single pipeline)

#### 1.4 Validators
- [ ] Create category validators in `/validators/CategoryValidator.ts`
  - [ ] `validateCategorySlug` - for slug route param
  - [ ] `validateCategoryFiltersQuery` - for filters endpoint
  - [ ] `validateProductsByCategoryQuery` - for products endpoint with filters

#### 1.5 Controllers
- [ ] Extend CategoryController with:
  - [ ] `getCategoryBySlug` - GET `/api/categories/slug/:slug`
  - [ ] `getCategoryFilters` - GET `/api/categories/:slug/filters`
  - [ ] `getProductsByCategory` - GET `/api/categories/:slug/products`

#### 1.6 Routes
- [ ] Update `/routes/general/categories.ts`:
  - [ ] Add `GET /slug/:slug` route
  - [ ] Add `GET /:slug/filters` route
  - [ ] Add `GET /:slug/products` route with query params

---

### Phase 2: Storefront Integration

#### 2.1 API Client Setup
- [ ] Create `/storefront/src/libs/api/category.ts` with:
  - [ ] `getCategoryBySlug(slug: string)`
  - [ ] `getCategoryFilters(slug: string)`
  - [ ] `getProductsByCategory(slug: string, filters: FilterParams, page: number)`

#### 2.2 TypeScript Types
- [ ] Create `/storefront/src/types/Category.ts`:
  - [ ] `CategoryInfo` interface
  - [ ] `SubCategory` interface
  - [ ] `CategoryFilters` interface
  - [ ] `ProductsResponse` interface

#### 2.3 Server Component (page.tsx)
- [ ] Create `/storefront/src/app/category/[slug]/page.tsx`:
  - [ ] Accept `params.slug` from route
  - [ ] Server-fetch category info
  - [ ] Server-fetch category filters
  - [ ] Server-fetch first page of products
  - [ ] Handle loading states
  - [ ] Handle error states (404, 500)
  - [ ] Pass data to CategoryClient

#### 2.4 Loading State
- [ ] Create `/storefront/src/app/category/[slug]/loading.tsx`:
  - [ ] Skeleton for breadcrumb
  - [ ] Skeleton for subcategory slider
  - [ ] Skeleton for filter sidebar
  - [ ] Skeleton for product grid

#### 2.5 Client Component (CategoryClient.tsx)
- [ ] Create `/storefront/src/app/category/[slug]/CategoryClient.tsx`:
  - [ ] Receive initial data from page.tsx
  - [ ] Initialize state with server data
  - [ ] Use existing `useProductFilters` hook
  - [ ] Connect filter handlers to API calls
  - [ ] Handle pagination with API calls
  - [ ] Preserve all existing UI components:
    - [ ] SubCategorySlider (populated with real data)
    - [ ] ShopFilterCanvas structure
    - [ ] FilterSections components
    - [ ] Product grid layout
    - [ ] HandlePagination

#### 2.6 Update Existing Components
- [ ] Update `ShopFilterCanvas.tsx`:
  - [ ] Accept category info prop
  - [ ] Accept subcategories prop (instead of hardcoded SUB_CATEGORIES)
  - [ ] Accept filters prop for dynamic filter options
  - [ ] Keep all existing UI/styling intact
  - [ ] Only extend functionality, no style changes

- [ ] Update `useProductFilters.ts`:
  - [ ] Accept API integration callbacks
  - [ ] Handle loading states
  - [ ] Handle error states
  - [ ] Trigger API calls on filter changes

#### 2.7 Route Migration
- [ ] Update navigation links to use `/category/[slug]` pattern
- [ ] Ensure backward compatibility if needed
- [ ] Test all entry points to category pages

---

### Phase 3: Testing & Validation

#### 3.1 Backend Testing
- [ ] **Aggregation Pipeline Testing**
  - [ ] Run `explain('executionStats')` on all pipelines
  - [ ] Verify index usage (totalDocsExamined ≈ nReturned)
  - [ ] Check executionTimeMillis < 100ms for category queries
  - [ ] Test with MongoDB Compass Aggregation Builder
  - [ ] Validate pipeline stages return expected data shapes
- [ ] **getCategoryBySlug Tests**
  - [ ] Valid slug returns category with subcategories
  - [ ] Invalid slug returns 404
  - [ ] Product counts in subcategories are accurate
  - [ ] Nested subcategories handled correctly (if parent is array)
- [ ] **getCategoryFilters Tests**
  - [ ] Returns correct min/max price from products
  - [ ] Aggregates all unique attribute values
  - [ ] Groups attributes by name correctly
  - [ ] Includes colorCode for color attributes
  - [ ] Filters out null/undefined values
  - [ ] Returns empty arrays for categories with no products
- [ ] **getProductsByCategory Tests**
  - [ ] No filters: returns all products in category tree
  - [ ] Subcategory filter: only products from specific subcategory
  - [ ] Price range filter: min only, max only, both
  - [ ] Attribute filters: single attribute, multiple attributes
  - [ ] Combined filters: all filter types together
  - [ ] Edge case: filters with no matching products
- [ ] **Product Sorting Tests**
  - [ ] Popularity score calculated correctly (rating*10 + orders*2 + reviews*1)
  - [ ] Products with reviews rank higher than without
  - [ ] Products with orders rank higher than new products
  - [ ] Tie-breaking by creation date works
  - [ ] Verify sort order in response
- [ ] **Pagination Tests**
  - [ ] First page (page=1)
  - [ ] Middle page
  - [ ] Last page
  - [ ] Out of range page returns empty array
  - [ ] metadata.total matches actual count
  - [ ] hasNextPage / hasPrevPage flags correct
  - [ ] Skip/limit math is accurate
- [ ] **Performance Tests**
  - [ ] Category with 1000+ products
  - [ ] Category with deep subcategory nesting
  - [ ] Products with many attributes
  - [ ] Multiple concurrent requests
  - [ ] allowDiskUse enabled for large aggregations
- [ ] **Data Integrity Tests**
  - [ ] Zero duplicate products in results
  - [ ] All products have required fields
  - [ ] Computed fields (averageRating, orderCount) accurate
  - [ ] Category info properly populated
  - [ ] Attribute values match product data

#### 3.2 Frontend Testing
- [ ] Test server-side data fetching
- [ ] Test loading states display correctly
- [ ] Test error states (network errors, 404s)
- [ ] Test all filter interactions
- [ ] Test pagination navigation
- [ ] Test subcategory slider functionality
- [ ] Test product grid rendering
- [ ] Test layout column switching
- [ ] Test sidebar open/close
- [ ] Test filter clear all
- [ ] Test URL state persistence (if applicable)

#### 3.3 Integration Testing
- [ ] Test full user flow: landing → filtering → pagination
- [ ] Test category switching
- [ ] Test subcategory navigation
- [ ] Test back button behavior
- [ ] Test deep linking to filtered pages
- [ ] Test concurrent filter changes
- [ ] Test performance under load

#### 3.4 Edge Cases
- [ ] Category with no products
- [ ] Category with no subcategories
- [ ] Products with missing attributes
- [ ] Products with no reviews
- [ ] Products with no orders
- [ ] Very large result sets
- [ ] Network failures
- [ ] Slow API responses

---

## 📐 Technical Specifications

### API Endpoints

#### 1. Get Category by Slug
```
GET /api/categories/slug/:slug
Response: {
  message: string;
  data: {
    _id: string;
    name: string;
    slug: string;
    image: string;
    banner: string;
    description?: string;
    sub_categories: Array<{
      _id: string;
      name: string;
      slug: string;
      image: string;
    }>;
  };
}
```

#### 2. Get Category Filters
```
GET /api/categories/:slug/filters
Response: {
  message: string;
  data: {
    priceRange: { min: number; max: number };
    attributes: Array<{
      name: string;
      values: string[];
    }>;
    subcategories: Array<{
      _id: string;
      name: string;
      slug: string;
      productCount: number;
    }>;
    brands?: string[];
    sizes?: string[];
    colors?: string[];
  };
}
```

#### 3. Get Products by Category
```
GET /api/categories/:slug/products?page=1&limit=12&subcategory=&minPrice=&maxPrice=&attributes=&sort=
Query Params:
  - page: number (default: 1)
  - limit: number (default: 12)
  - subcategory: string (optional)
  - minPrice: number (optional)
  - maxPrice: number (optional)
  - attributes: JSON string (optional) { "Color": "Red", "Size": "M" }
  - sale: boolean (optional)
  - sort: string (optional) "price_asc" | "price_desc" | "newest" | "popular"

Response: {
  message: string;
  data: {
    products: Array<Product>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}
```

### Product Sorting Algorithm

**Priority Order:**
1. **Average Rating** (desc) - Products with higher average rating appear first
2. **Order Count** (desc) - More frequently ordered products rank higher
3. **Creation Date** (desc) - Newer products break ties

**Implementation:**
```typescript
// Aggregation pipeline sort stage
{
  $sort: {
    averageRating: -1,    // Highest rating first
    orderCount: -1,        // Most ordered first
    createdAt: -1          // Newest first
  }
}
```

### Database Queries

#### 1. Get Category by Slug - Aggregation Pipeline
```typescript
[
  // Stage 1: Match by slug
  {
    $match: { slug: categorySlug }
  },
  
  // Stage 2: Lookup subcategories
  {
    $lookup: {
      from: 'categories',
      localField: '_id',
      foreignField: 'parent',
      as: 'sub_categories'
    }
  },
  
  // Stage 3: Lookup product count for each subcategory
  {
    $lookup: {
      from: 'products',
      let: { subCategoryIds: '$sub_categories._id' },
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
  },
  
  // Stage 4: Merge product counts into subcategories
  {
    $addFields: {
      sub_categories: {
        $map: {
          input: '$sub_categories',
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
  },
  
  // Stage 5: Project final shape
  {
    $project: {
      _id: 1,
      name: 1,
      slug: 1,
      image: 1,
      banner: 1,
      description: 1,
      sub_categories: 1,
      createdAt: 1,
      updatedAt: 1
    }
  }
]
```

#### 2. Get Category Filters - Aggregation Pipeline
```typescript
[
  // Stage 1: Match category by slug
  {
    $match: { slug: categorySlug }
  },
  
  // Stage 2: Lookup subcategories
  {
    $lookup: {
      from: 'categories',
      localField: '_id',
      foreignField: 'parent',
      as: 'subcategories'
    }
  },
  
  // Stage 3: Get all category IDs (main + subs)
  {
    $addFields: {
      allCategoryIds: {
        $concatArrays: [
          ['$_id'],
          '$subcategories._id'
        ]
      }
    }
  },
  
  // Stage 4: Lookup products in category tree
  {
    $lookup: {
      from: 'products',
      let: { categoryIds: '$allCategoryIds' },
      pipeline: [
        {
          $match: {
            $expr: { $in: ['$category', '$$categoryIds'] },
            status: 'active'
          }
        },
        // Unwind attributes for aggregation
        {
          $unwind: {
            path: '$attributes',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$attributes.children',
            preserveNullAndEmptyArrays: true
          }
        },
        // Group to collect unique values
        {
          $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            attributes: {
              $addToSet: {
                name: '$attributes.name',
                value: '$attributes.children.name',
                colorCode: '$attributes.children.colorCode'
              }
            },
            brands: { $addToSet: '$brand' },
            tags: { $addToSet: '$tags' }
          }
        },
        // Reshape attributes
        {
          $project: {
            minPrice: 1,
            maxPrice: 1,
            attributes: {
              $reduce: {
                input: '$attributes',
                initialValue: [],
                in: {
                  $concatArrays: [
                    '$$value',
                    {
                      $cond: [
                        { $in: ['$$this.name', '$$value.name'] },
                        [],
                        [{
                          name: '$$this.name',
                          values: []
                        }]
                      ]
                    }
                  ]
                }
              }
            },
            brands: {
              $filter: {
                input: '$brands',
                cond: { $ne: ['$$this', null] }
              }
            },
            tags: {
              $reduce: {
                input: '$tags',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] }
              }
            }
          }
        }
      ],
      as: 'filterData'
    }
  },
  
  // Stage 5: Aggregate attribute values per name
  {
    $lookup: {
      from: 'products',
      let: { categoryIds: '$allCategoryIds' },
      pipeline: [
        {
          $match: {
            $expr: { $in: ['$category', '$$categoryIds'] },
            status: 'active'
          }
        },
        { $unwind: '$attributes' },
        { $unwind: '$attributes.children' },
        {
          $group: {
            _id: '$attributes.name',
            values: {
              $addToSet: {
                value: '$attributes.children.name',
                colorCode: '$attributes.children.colorCode'
              }
            }
          }
        },
        {
          $project: {
            name: '$_id',
            values: 1,
            _id: 0
          }
        }
      ],
      as: 'attributeGroups'
    }
  },
  
  // Stage 6: Format subcategories with product counts
  {
    $addFields: {
      subcategoriesFormatted: {
        $map: {
          input: '$subcategories',
          as: 'sub',
          in: {
            _id: '$$sub._id',
            name: '$$sub.name',
            slug: '$$sub.slug',
            image: '$$sub.image'
          }
        }
      }
    }
  },
  
  // Stage 7: Final projection
  {
    $project: {
      priceRange: {
        min: { $arrayElemAt: ['$filterData.minPrice', 0] },
        max: { $arrayElemAt: ['$filterData.maxPrice', 0] }
      },
      attributes: '$attributeGroups',
      subcategories: '$subcategoriesFormatted',
      brands: {
        $ifNull: [
          { $arrayElemAt: ['$filterData.brands', 0] },
          []
        ]
      },
      tags: {
        $ifNull: [
          { $arrayElemAt: ['$filterData.tags', 0] },
          []
        ]
      }
    }
  }
]
```

#### 3. Get Products by Category - Full Aggregation Pipeline
```typescript
[
  // Stage 1: Match category by slug to get IDs
  {
    $match: { slug: categorySlug }
  },
  
  // Stage 2: Lookup subcategories
  {
    $lookup: {
      from: 'categories',
      localField: '_id',
      foreignField: 'parent',
      as: 'subcategories'
    }
  },
  
  // Stage 3: Build category ID array
  {
    $addFields: {
      allCategoryIds: {
        $concatArrays: [
          ['$_id'],
          '$subcategories._id'
        ]
      }
    }
  },
  
  // Stage 4: Lookup products with all enrichments in one go
  {
    $lookup: {
      from: 'products',
      let: { 
        categoryIds: '$allCategoryIds',
        subcategoryFilter: subcategorySlug, // from query params
        minPriceFilter: minPrice,
        maxPriceFilter: maxPrice,
        attributeFilters: attributeFilters,
        saleFilter: onlyOnSale
      },
      pipeline: [
        // Match base category filter
        {
          $match: {
            $expr: {
              $and: [
                { $in: ['$category', '$$categoryIds'] },
                { $eq: ['$status', 'active'] }
              ]
            }
          }
        },
        
        // Apply price filter
        {
          $match: {
            $expr: {
              $and: [
                {
                  $cond: [
                    { $ne: ['$$minPriceFilter', null] },
                    { $gte: ['$price', '$$minPriceFilter'] },
                    true
                  ]
                },
                {
                  $cond: [
                    { $ne: ['$$maxPriceFilter', null] },
                    { $lte: ['$price', '$$maxPriceFilter'] },
                    true
                  ]
                }
              ]
            }
          }
        },
        
        // Lookup reviews and calculate stats
        {
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
                  count: { $sum: 1 },
                  ratings: { $push: '$rating' }
                }
              }
            ],
            as: 'reviewStats'
          }
        },
        
        // Lookup orders and calculate order metrics
        {
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
        },
        
        // Add computed fields for sorting
        {
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
            // Calculate popularity score (weighted)
            popularityScore: {
              $add: [
                {
                  $multiply: [
                    { $ifNull: [{ $arrayElemAt: ['$reviewStats.avgRating', 0] }, 0] },
                    10 // Weight: rating * 10
                  ]
                },
                {
                  $multiply: [
                    { $ifNull: [{ $arrayElemAt: ['$orderStats.totalOrders', 0] }, 0] },
                    2 // Weight: orders * 2
                  ]
                },
                {
                  $multiply: [
                    { $ifNull: [{ $arrayElemAt: ['$reviewStats.count', 0] }, 0] },
                    1 // Weight: reviews * 1
                  ]
                }
              ]
            }
          }
        },
        
        // Apply attribute filters using $expr
        {
          $match: {
            $expr: {
              $cond: [
                { $eq: ['$$attributeFilters', null] },
                true,
                {
                  $allElementsTrue: {
                    $map: {
                      input: { $objectToArray: '$$attributeFilters' },
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
                                  $in: [
                                    '$$filter.v',
                                    '$$attr.children.name'
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
              ]
            }
          }
        },
        
        // Sort by priority algorithm
        {
          $sort: {
            popularityScore: -1,
            averageRating: -1,
            orderCount: -1,
            createdAt: -1
          }
        },
        
        // Lookup category for product details
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        
        // Clean up and project fields
        {
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
            createdAt: 1,
            updatedAt: 1
          }
        }
      ],
      as: 'products'
    }
  },
  
  // Stage 5: Unwind products for faceting
  {
    $unwind: '$products'
  },
  
  // Stage 6: Replace root with product (flatten)
  {
    $replaceRoot: { newRoot: '$products' }
  },
  
  // Stage 7: Facet for pagination and total count
  {
    $facet: {
      metadata: [
        { $count: 'total' },
        {
          $addFields: {
            page: page,
            limit: limit,
            totalPages: { $ceil: { $divide: ['$total', limit] } }
          }
        }
      ],
      products: [
        { $skip: (page - 1) * limit },
        { $limit: limit }
      ]
    }
  },
  
  // Stage 8: Format final response
  {
    $project: {
      products: 1,
      pagination: {
        $mergeObjects: [
          { $arrayElemAt: ['$metadata', 0] },
          {
            hasNextPage: {
              $lt: [
                page,
                { $arrayElemAt: ['$metadata.totalPages', 0] }
              ]
            },
            hasPrevPage: { $gt: [page, 1] }
          }
        ]
      }
    }
  }
]
```

---

## 🎯 Execution Strategy

### Day 1: Aggregation Pipeline Design & Testing
**Focus**: Build and test aggregation pipelines in MongoDB Compass first
1. **Design Category by Slug pipeline** (MongoDB Compass)
   - Test each stage incrementally
   - Verify subcategory lookup and product counts
   - Export to TypeScript code
2. **Design Category Filters pipeline** (MongoDB Compass)
   - Test attribute aggregation logic
   - Verify price range calculation
   - Test with various category structures
3. **Design Products by Category pipeline** (MongoDB Compass)
   - Build review/order lookup stages
   - Test popularity score calculation
   - Test filter conditions with $expr
   - Verify sorting and pagination
4. **Create database indexes** (see optimization section)
5. **Run explain analysis** on all pipelines

### Day 2: Backend Implementation (DRY Approach)
**Focus**: Create reusable utilities first, then services
1. **Create aggregation utilities directory structure**
   - Create `/src/services/aggregation/` directory
   - Create placeholder files for all utilities
2. **Implement DRY pipeline utilities** (see `DRY_AGGREGATION_PIPELINE_UTILS.md`)
   - Implement `categoryPipelineUtils.ts` (3 functions)
   - Implement `productPipelineUtils.ts` (5 functions)
   - Implement `filterPipelineUtils.ts` (4 functions)
   - Implement `paginationPipelineUtils.ts` (5 functions)
   - Create `index.ts` barrel export
   - Add JSDoc comments to all functions
3. **Implement validators**
   - Create `CategoryValidator.ts` with all validators
4. **Implement Category service using utilities**
   - `getCategoryBySlug` - uses `buildCategoryTreeStages` + `lookupSubcategoriesWithCounts`
   - `getCategoryFilters` - uses category tree + product aggregation utilities
   - `getProductsByCategory` - composes all utilities together
   - Add `allowDiskUse(true)` and `maxTimeMS: 5000`
5. **Create controllers**
   - Wire up all three endpoints with proper error handling
6. **Update routes**
   - Add new endpoints to categories.ts
7. **Test with Postman/Thunder Client**
   - Verify utilities compose correctly
   - Test all filter combinations

### Day 3: Backend Testing & Optimization
**Focus**: Validate performance and correctness
1. Test all endpoints with various inputs
2. Run `explain('executionStats')` in production
3. Verify index usage (check totalDocsExamined)
4. Load test with large datasets (1000+ products)
5. Test edge cases (no products, no subcategories)
6. Optimize slow stages if needed
7. Add Redis caching for filters endpoint
8. Document API endpoints

### Day 4: Frontend Setup & Server Component
**Focus**: Create API client and server-side data fetching
1. Create `/storefront/src/libs/api/category.ts`
   - `getCategoryBySlug(slug: string)`
   - `getCategoryFilters(slug: string)`
   - `getProductsByCategory(slug, filters, page)`
2. Create TypeScript types in `/types/Category.ts`
3. Create `/app/category/[slug]/loading.tsx`
4. Create `/app/category/[slug]/page.tsx`
   - Server-fetch all initial data
   - Handle errors (404, 500)
   - Pass to CategoryClient
5. Test server-side rendering

### Day 5: Frontend Client Component & Integration
**Focus**: Connect UI to backend without changing styles
1. Create `CategoryClient.tsx`
   - Accept initial data from server
   - Initialize state with API data
2. Update `ShopFilterCanvas.tsx`
   - Accept dynamic subcategories prop
   - Accept dynamic filters prop
   - Replace hardcoded SUB_CATEGORIES
   - Keep all existing UI intact
3. Update `useProductFilters.ts`
   - Add API call integration
   - Handle loading/error states
4. Test all filter interactions
5. Test pagination
6. End-to-end testing
7. Mobile responsiveness check

### Day 6: Polish & Deployment
**Focus**: Final testing and optimization
1. Performance testing under load
2. Error boundary testing
3. Network failure scenarios
4. Cache invalidation testing
5. SEO optimization (meta tags)
6. Documentation updates
7. Deploy to staging
8. Final production deployment

---

## 🚨 Critical Constraints

### DO NOT:
- ❌ Change any existing UI styles or CSS classes
- ❌ Remove or modify existing component structure
- ❌ Change the layout or visual design
- ❌ Modify filter UI appearance
- ❌ Change pagination UI

### DO:
- ✅ Extend functionality while preserving UI
- ✅ Add loading states
- ✅ Add error handling
- ✅ Replace hardcoded data with API data
- ✅ Maintain all existing interactions
- ✅ Follow Route → Validator → Controller → Service pattern
- ✅ Add proper TypeScript types
- ✅ Implement proper error boundaries

---

## 📊 Success Criteria

- [ ] Category pages load with real backend data
- [ ] Subcategory slider displays actual subcategories
- [ ] All filters work with backend filtering
- [ ] Product sorting follows specified algorithm
- [ ] Pagination works correctly
- [ ] No duplicate products appear
- [ ] Loading states display appropriately
- [ ] Error states handled gracefully
- [ ] Performance is acceptable (< 2s page load)
- [ ] All existing UI/UX preserved
- [ ] Mobile responsive behavior maintained
- [ ] No console errors
- [ ] TypeScript compilation succeeds with no errors

---

## � Aggregation Pipeline Optimization

### Performance Strategies

#### 1. Index Recommendations
```typescript
// Products collection
db.products.createIndex({ category: 1, status: 1 });
db.products.createIndex({ slug: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ createdAt: -1 });
db.products.createIndex({ status: 1, category: 1, price: 1 }); // Compound for filters
db.products.createIndex({ 'attributes.name': 1, 'attributes.children.name': 1 }); // For attribute filtering

// Categories collection
db.categories.createIndex({ slug: 1 }, { unique: true });
db.categories.createIndex({ parent: 1 });

// Reviews collection
db.reviews.createIndex({ product: 1, isApproved: 1 });
db.reviews.createIndex({ product: 1, rating: 1 });

// Orders collection
db.orders.createIndex({ 'products.product': 1, status: 1 });
db.orders.createIndex({ status: 1 });
```

#### 2. Pipeline Optimization Techniques

**Early Filtering**: Apply `$match` stages as early as possible to reduce documents in pipeline
```typescript
// ✅ GOOD: Filter early
{ $match: { status: 'active', category: categoryId } }
{ $lookup: { ... } }

// ❌ BAD: Filter late
{ $lookup: { ... } }
{ $match: { status: 'active', category: categoryId } }
```

**Projection Optimization**: Only project needed fields
```typescript
{
  $project: {
    // Only include fields needed for response
    _id: 1,
    name: 1,
    price: 1,
    // Exclude heavy fields like full description if not needed
  }
}
```

**Lookup with Pipeline**: Use sub-pipelines in `$lookup` to filter joined data
```typescript
{
  $lookup: {
    from: 'reviews',
    let: { productId: '$_id' },
    pipeline: [
      { $match: { $expr: { $eq: ['$product', '$$productId'] }, isApproved: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } }
    ],
    as: 'reviewStats'
  }
}
```

**Facet for Parallel Processing**: Use `$facet` for pagination and metadata in single pass
```typescript
{
  $facet: {
    metadata: [{ $count: 'total' }],
    products: [{ $skip: offset }, { $limit: limit }]
  }
}
```

#### 3. Caching Strategy

**Redis Caching Layers**:
```typescript
// Cache Layer 1: Category filters (30 minutes TTL)
const cacheKey = `category:filters:${categorySlug}`;
// Filters change infrequently, safe to cache

// Cache Layer 2: Product list (5 minutes TTL)
const cacheKey = `category:products:${categorySlug}:${JSON.stringify(filters)}:page${page}`;
// Products change more frequently, shorter TTL

// Cache Layer 3: Category info (1 hour TTL)
const cacheKey = `category:info:${categorySlug}`;
// Category data rarely changes
```

#### 4. Query Explain Analysis
```typescript
// Run explain on aggregation to analyze performance
db.products.explain('executionStats').aggregate([...pipeline]);

// Key metrics to monitor:
// - executionTimeMillis: Should be < 100ms for category queries
// - totalDocsExamined: Should be close to nReturned (indicates index usage)
// - nReturned: Actual documents returned
```

#### 5. Aggregation Pipeline Size Limits
- MongoDB has 16MB document size limit
- Use `allowDiskUse: true` for large aggregations
- Implement cursor-based pagination for very large result sets

```typescript
const cursor = Product.aggregate(pipeline).allowDiskUse(true).cursor();
```

#### 6. Materialized Views (Future Enhancement)
For frequently accessed aggregations, consider pre-computing:
```typescript
// Create a productStats collection with pre-aggregated data
// Updated via change streams or periodic jobs
{
  _id: productId,
  averageRating: 4.5,
  reviewCount: 120,
  orderCount: 350,
  soldQuantity: 1200,
  popularityScore: 95.5,
  lastUpdated: ISODate('2025-11-02')
}
```

#### 7. Aggregation Pipeline Debugging

**Development Tools**:
```typescript
// Add pipeline stage logging
const logPipelineStage = (stageName: string, data: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n[${stageName}]`, JSON.stringify(data, null, 2));
  }
};

// Incremental pipeline testing
const testPipeline = async (stages: PipelineStage[]) => {
  for (let i = 1; i <= stages.length; i++) {
    const partial = stages.slice(0, i);
    const result = await Product.aggregate(partial).limit(1);
    console.log(`After stage ${i}:`, result);
  }
};
```

**MongoDB Compass Aggregation Builder**:
- Visual pipeline construction
- Stage-by-stage result preview
- Performance metrics per stage
- Export to code (Node.js, Python, etc.)

**Monitoring Queries**:
```typescript
// Check slow queries in MongoDB logs
db.setProfilingLevel(1, { slowms: 100 });

// View slow operations
db.system.profile.find({ millis: { $gt: 100 } }).sort({ ts: -1 }).limit(10);

// Check index usage
db.products.aggregate([...], { explain: true });
```

#### 8. Error Handling in Aggregation Pipelines

```typescript
try {
  const result = await Product.aggregate(pipeline)
    .allowDiskUse(true)
    .option({ maxTimeMS: 5000 }); // Timeout after 5 seconds
  
  return {
    data: result,
    code: 200,
    message: 'Success'
  };
} catch (error) {
  if (error.name === 'ExceededTimeLimit') {
    return {
      data: null,
      code: 504,
      message: 'Query timeout - try narrowing your filters'
    };
  }
  
  if (error.code === 16389) { // Aggregation pipeline size limit
    return {
      data: null,
      code: 400,
      message: 'Result set too large - try adding filters'
    };
  }
  
  // Log unexpected errors
  console.error('Aggregation error:', error);
  return {
    data: null,
    code: 500,
    message: 'Internal server error'
  };
}
```

---

## �🔄 Progress Tracking

**Current Phase**: Planning Complete ✅  
**Next Phase**: Backend Foundation  
**Blocked By**: None  
**Blockers**: None

---

## 💎 TypeScript Best Practices

### NO `any` Types - Ever!

**❌ NEVER**:
```typescript
const conditions: any[] = [];
const categoryIds: any = '$$categoryIds';
const filters: any = req.body;
```

**✅ ALWAYS**:
```typescript
const conditions: Array<Record<string, unknown>> = [];
const categoryIds: string | mongoose.Types.ObjectId[] = '$$categoryIds';
const filters: FilterParams = req.body;

interface FilterParams {
  minPrice?: number;
  maxPrice?: number;
  attributes?: Record<string, string | string[]>;
  subcategory?: string;
}
```

### Proper Type Definitions

```typescript
// Define clear interfaces for all data structures
interface CategoryWithSubcategories {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  image: string;
  banner: string;
  sub_categories: SubCategory[];
}

interface SubCategory {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  image: string;
  productCount: number;
}

interface ProductWithStats {
  _id: mongoose.Types.ObjectId;
  name: string;
  price: number;
  averageRating: number;
  reviewCount: number;
  orderCount: number;
  popularityScore: number;
  // ... other fields
}

// Use in function signatures
export const getCategoryBySlug = async (
  slug: string
): Promise<CustomResponseTypeWithMeta<CategoryWithSubcategories>> => {
  // Implementation
};
```

### Union Types for Flexibility

```typescript
// Use union types instead of any
type CategoryIdFilter = string | mongoose.Types.ObjectId[];
type SortOption = 'popularity' | 'price_asc' | 'price_desc' | 'newest';
type AttributeValue = string | string[];
```

### Type Guards

```typescript
// Use type guards for runtime checks
function isCategoryIdArray(
  value: string | mongoose.Types.ObjectId[]
): value is mongoose.Types.ObjectId[] {
  return Array.isArray(value);
}

// Usage
if (isCategoryIdArray(categoryIds)) {
  // TypeScript knows it's an array here
  return categoryIds.map(id => id.toString());
}
```

### Strict Null Checks

```typescript
// Handle null/undefined explicitly
interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Use proper defaults
const metadata: PaginationMetadata = result[0]?.pagination ?? {
  total: 0,
  page: 1,
  limit: 12,
  totalPages: 0,
  hasNextPage: false,
  hasPrevPage: false
};
```

---

## 🎓 Aggregation Pipeline Best Practices

### ✅ DO's

1. **Use MongoDB Compass for pipeline development**
   - Visual stage-by-stage testing
   - Real-time result preview
   - Performance metrics
   - Export to code when ready

2. **Filter early with $match**
   - Place $match stages as early as possible
   - Reduce documents before expensive operations
   - Use indexes effectively

3. **Leverage $facet for parallel operations**
   - Calculate pagination metadata and fetch data in one pass
   - Reduce round trips to database

4. **Use $lookup sub-pipelines**
   - Filter joined data within the lookup
   - Calculate aggregations in sub-pipeline
   - More efficient than post-lookup filtering

5. **Project only needed fields**
   - Reduce memory usage
   - Faster network transfer
   - Cleaner response data

6. **Add proper indexes**
   - Index all fields used in $match
   - Compound indexes for multi-field filters
   - Monitor index usage with explain()

7. **Use $expr for dynamic filtering**
   - Enables complex conditional logic
   - Allows variable comparisons
   - Great for optional filters

8. **Enable allowDiskUse for large aggregations**
   - Prevents memory limit errors
   - Essential for 100MB+ operations
   - Minimal performance impact

### ❌ DON'Ts

1. **Don't use $lookup without a pipeline**
   - Brings back ALL related documents
   - Wastes memory and CPU
   - Use sub-pipeline to filter

2. **Don't skip indexes**
   - Aggregations become EXTREMELY slow
   - Always check explain() results
   - Create indexes before deployment

3. **Don't ignore memory limits**
   - 16MB document size limit
   - 100MB aggregation memory limit (without allowDiskUse)
   - Monitor pipeline memory usage

4. **Don't over-complicate pipelines**
   - Break complex logic into stages
   - Use descriptive stage names in $addFields
   - Comment complex expressions

5. **Don't forget null/undefined handling**
   - Use $ifNull for safety
   - Use preserveNullAndEmptyArrays in $unwind
   - Test with incomplete data

6. **Don't hardcode values**
   - Use variables for dynamic filters
   - Parameterize query conditions
   - Make pipelines reusable

7. **Don't skip testing edge cases**
   - Empty result sets
   - Missing fields in documents
   - Extremely large result sets

8. **Don't ignore performance monitoring**
   - Set up slow query logging
   - Monitor executionTimeMillis
   - Profile aggregations in production

### 🔧 Common Pitfalls & Solutions

| Pitfall | Solution |
|---------|----------|
| "Exceeded memory limit" error | Add `allowDiskUse: true` |
| Slow query (>1s) | Check indexes with explain(), add $match early |
| Duplicate products | Use $group with _id or ensure single pipeline path |
| Missing fields in output | Check $project stages, verify field names |
| Incorrect count after filters | Use $facet with separate count branch |
| $lookup returns empty array | Check field types match (ObjectId vs String) |
| Attribute filters not working | Use $expr with proper $in and $map logic |
| Sort not working | Ensure sort fields exist after $addFields |

### 📊 Performance Benchmarks

**Target Performance** (for category page):
- Category by slug: < 50ms
- Category filters: < 100ms
- Products query (12 items): < 200ms
- Products query with filters: < 300ms

**Red Flags**:
- Any query > 1 second
- totalDocsExamined >> nReturned (poor index usage)
- Memory usage > 50MB for simple queries

---

## 📝 Notes

- Category model has `parent` field as array but typically only one parent
- Products should include all necessary fields for display (name, price, images, etc.)
- **CRITICAL**: Test all aggregation pipelines in MongoDB Compass before coding
- **CRITICAL**: Run explain('executionStats') on all production pipelines
- **CRITICAL**: Follow DRY principle - Create reusable pipeline utilities (see `DRY_AGGREGATION_PIPELINE_UTILS.md`)
- Monitor aggregation pipeline performance on large datasets with profiling
- Database indexes are REQUIRED for acceptable performance (see optimization section)
- Consider Redis caching for category filters (30min TTL, infrequently changing data)
- Use materialized views for complex aggregations accessed very frequently
- Set maxTimeMS to prevent runaway queries from blocking server
- All pipeline utilities must be in `/old-main-server/src/services/aggregation/` for reusability

---

## 🔗 Related Files

### Backend
- `/old-main-server/src/models/Category.ts`
- `/old-main-server/src/models/Product.ts`
- `/old-main-server/src/models/Review.ts`
- `/old-main-server/src/models/Order.ts`
- `/old-main-server/src/services/Category.ts`
- `/old-main-server/src/services/aggregation/` (DRY utilities - NEW)
- `/old-main-server/src/controller/categoryController.ts`
- `/old-main-server/src/routes/general/categories.ts`
- `/old-main-server/src/validators/CategoryValidator.ts` (NEW)

### Frontend
- `/storefront/src/app/category/[slug]/page.tsx` (NEW - Server Component)
- `/storefront/src/app/category/[slug]/loading.tsx` (NEW)
- `/storefront/src/app/category/[slug]/CategoryClient.tsx` (NEW)
- `/storefront/src/app/category/page.tsx` (LEGACY)
- `/storefront/src/components/Shop/ShopFilterCanvas.tsx` (UPDATE)
- `/storefront/src/components/Shop/SubCategorySlider.tsx`
- `/storefront/src/hooks/useProductFilters.ts` (UPDATE)
- `/storefront/src/libs/api/category.ts` (NEW)
- `/storefront/src/types/Category.ts` (NEW)

### Documentation
- `/storefront/CATEGORY_PAGE_IMPLEMENTATION_PLAN.md` (This file - Master plan)
- `/storefront/DRY_AGGREGATION_PIPELINE_UTILS.md` (DRY utilities reference)
- `/storefront/TYPESCRIPT_STRICT_GUIDELINES.md` (Zero `any` policy - CRITICAL)

---

**Last Updated**: November 2, 2025  
**Plan Status**: ✅ Ready for Implementation (DRY-Enhanced + TypeScript Strict)  
**TypeScript Policy**: 🔴 ZERO `any` TYPES - Code review will reject violations  
**Next Step**: Day 1 - Aggregation Pipeline Design & Testing in MongoDB Compass
