# TypeScript Strict Mode Guidelines - Zero `any` Policy

**Project**: Category Page Implementation  
**Enforcement**: 🔴 CRITICAL - Code reviews will reject any `any` types  
**Date**: November 2, 2025

---

## 🚫 Zero Tolerance for `any`

### The Rule

**NEVER use `any` type in any circumstance**

```typescript
// ❌ FORBIDDEN - Will be rejected
const data: any = response.data;
const filters: any = req.query;
const pipeline: any[] = [];
const result: any = await fetch();
function processData(input: any): any { }

// ✅ REQUIRED - Proper typing
const data: Product = response.data;
const filters: CategoryFilters = req.query;
const pipeline: PipelineStage[] = [];
const result: ApiResponse<Product[]> = await fetch();
function processData(input: FilterInput): ProcessedData { }
```

---

## ✅ Approved Type Patterns

### 1. Define Explicit Interfaces

```typescript
// Backend Models
interface CategoryWithSubcategories {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  image: string;
  banner: string;
  description?: string;
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
  sku: number;
  name: string;
  slug: string;
  price: number;
  stock: number;
  description_images: Array<{ url: string; cover_image: boolean }>;
  attributes: ProductAttribute[];
  // Computed fields
  averageRating: number;
  reviewCount: number;
  orderCount: number;
  soldQuantity: number;
  popularityScore: number;
  category: {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ProductAttribute {
  name: string;
  children: Array<{
    name: string;
    price?: number;
    stock: number;
    colorCode?: string;
  }>;
}
```

### 2. Use Union Types

```typescript
// For multiple possible types
type CategoryIdFilter = string | mongoose.Types.ObjectId[];
type SortOption = 'popularity' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
type AttributeValue = string | string[];
type FilterValue = string | number | boolean | string[] | number[];

// For aggregation pipeline values
type PipelineValue = 
  | string 
  | number 
  | boolean 
  | Record<string, unknown> 
  | PipelineValue[];
```

### 3. Use Record<K, V> for Dynamic Objects

```typescript
// Instead of any for dynamic keys
interface CategoryFilters {
  minPrice?: number;
  maxPrice?: number;
  subcategory?: string;
  tags?: string[];
  attributes?: Record<string, string | string[]>; // ✅ Better than any
}

// For pipeline stage conditions
const conditions: Array<Record<string, unknown>> = [];

// For query parameters
const queryParams: Record<string, string | string[] | undefined> = {
  page: '1',
  limit: '12',
  minPrice: '10'
};
```

### 4. Use Generics

```typescript
// Generic response wrapper
interface ApiResponse<T> {
  data: T | null;
  message: string;
  code: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

// Generic service method
async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  const response = await fetch(url);
  return response.json() as ApiResponse<T>;
}

// Usage
const products = await fetchData<Product[]>('/api/products');
// products.data is typed as Product[] | null
```

### 5. Use `unknown` for Truly Unknown Data

```typescript
// Use unknown, then validate and narrow
function parseFilters(input: unknown): CategoryFilters {
  // Type guard validation
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid filter input');
  }
  
  const obj = input as Record<string, unknown>;
  
  // Validate each field
  const filters: CategoryFilters = {};
  
  if (typeof obj.minPrice === 'number') {
    filters.minPrice = obj.minPrice;
  }
  
  if (typeof obj.maxPrice === 'number') {
    filters.maxPrice = obj.maxPrice;
  }
  
  // Return properly typed object
  return filters;
}

// ❌ WRONG - Don't use any
function parseFilters(input: any): any {
  return input; // No type safety at all
}
```

### 6. Type Guards for Runtime Checks

```typescript
// Define type guards
function isValidProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj._id === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.price === 'number'
  );
}

function isCategoryIdArray(
  value: string | mongoose.Types.ObjectId[]
): value is mongoose.Types.ObjectId[] {
  return Array.isArray(value);
}

function isVariableReference(
  value: string | mongoose.Types.ObjectId[]
): value is string {
  return typeof value === 'string' && value.startsWith('$$');
}

// Usage
if (isCategoryIdArray(categoryIds)) {
  // TypeScript knows it's an array here
  return categoryIds.map(id => id.toString());
} else {
  // TypeScript knows it's a string here
  return categoryIds;
}
```

### 7. Proper Null/Undefined Handling

```typescript
// Use optional chaining and nullish coalescing
const productName = product?.name ?? 'Unknown Product';
const price = product?.price ?? 0;

// Explicit null checks in types
interface Product {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string | null; // Explicitly nullable
  tags?: string[]; // Optional (may not exist)
}

// Handle undefined in function parameters
function buildFilter(
  minPrice?: number, // Optional parameter
  maxPrice?: number
): PipelineStage | null { // May return null
  if (minPrice === undefined && maxPrice === undefined) {
    return null; // Explicit null return
  }
  // ...
}
```

### 8. Mongoose-Specific Types

```typescript
import mongoose, { PipelineStage } from 'mongoose';

// Use mongoose types
type ObjectId = mongoose.Types.ObjectId;

// For aggregation pipelines
const pipeline: PipelineStage[] = [
  { $match: { status: 'active' } },
  { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryInfo' } }
];

// For model queries
interface ProductDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  price: number;
}

const Product = mongoose.model<ProductDocument>('Product', productSchema);
```

---

## 🔧 Utility Function Type Signatures

### Aggregation Pipeline Utilities

```typescript
import { PipelineStage } from 'mongoose';
import mongoose from 'mongoose';

// Category utilities
export const buildCategoryTreeStages = (
  categorySlug: string
): PipelineStage[] => { /* ... */ };

export const lookupSubcategoriesWithCounts = (): PipelineStage => { /* ... */ };

// Product utilities
export const lookupReviewStats = (): PipelineStage => { /* ... */ };

export const lookupOrderStats = (): PipelineStage => { /* ... */ };

export const addProductComputedFields = (): PipelineStage => { /* ... */ };

export const lookupCategoryInfo = (): PipelineStage => { /* ... */ };

export const projectProductFields = (): PipelineStage => { /* ... */ };

// Filter utilities
export const buildPriceFilter = (
  minPrice?: number,
  maxPrice?: number
): PipelineStage | null => { /* ... */ };

export const buildAttributeFilter = (
  attributeFilters?: Record<string, string | string[]>
): PipelineStage | null => { /* ... */ };

export const buildCategoryFilter = (
  categoryIds: string | mongoose.Types.ObjectId[]
): PipelineStage => { /* ... */ };

export const buildTagsFilter = (
  tags?: string[]
): PipelineStage | null => { /* ... */ };

// Pagination utilities
export const sortByPopularity = (): PipelineStage => { /* ... */ };

export const sortByPrice = (
  ascending: boolean = true
): PipelineStage => { /* ... */ };

export const sortByNewest = (): PipelineStage => { /* ... */ };

export const paginationFacet = (
  page: number,
  limit: number
): PipelineStage => { /* ... */ };

export const formatPaginationResponse = (): PipelineStage => { /* ... */ };
```

### Service Methods

```typescript
import { CustomResponseTypeWithMeta } from '@/types';

interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface CategoryFilters {
  minPrice?: number;
  maxPrice?: number;
  attributes?: Record<string, string | string[]>;
  subcategory?: string;
  tags?: string[];
}

interface ProductsResponse {
  data: ProductWithStats[];
  pagination: PaginationMetadata;
}

// Service method signatures
export const getCategoryBySlug = async (
  slug: string
): Promise<CustomResponseTypeWithMeta<CategoryWithSubcategories>> => { /* ... */ };

export const getCategoryFilters = async (
  slug: string
): Promise<CustomResponseTypeWithMeta<CategoryFiltersResponse>> => { /* ... */ };

export const getProductsByCategory = async (
  slug: string,
  filters: CategoryFilters,
  page: number = 1,
  limit: number = 12
): Promise<CustomResponseTypeWithMeta<ProductsResponse>> => { /* ... */ };
```

### Controller Methods

```typescript
import { Request, Response } from 'express';

interface TypedRequestParams<P = {}> extends Request {
  params: P;
}

interface TypedRequestQuery<Q = {}> extends Request {
  query: Q;
}

interface CategoryParamsRequest extends TypedRequestParams<{ slug: string }> {}

interface ProductsQueryRequest extends TypedRequestQuery<{
  page?: string;
  limit?: string;
  minPrice?: string;
  maxPrice?: string;
  subcategory?: string;
  attributes?: string; // JSON string
}> {}

// Controller signatures
export const getCategoryBySlug = async (
  req: CategoryParamsRequest,
  res: Response
): Promise<Response> => { /* ... */ };

export const getProductsByCategory = async (
  req: CategoryParamsRequest & ProductsQueryRequest,
  res: Response
): Promise<Response> => { /* ... */ };
```

---

## 📋 Code Review Checklist

Before submitting code, verify:

- [ ] **Zero `any` types** - Search for `: any` in files
- [ ] **All function parameters typed** - No implicit any
- [ ] **All return types explicit** - No inferred any
- [ ] **All interfaces defined** - No missing type definitions
- [ ] **Proper null handling** - Use `?` or `| null` explicitly
- [ ] **Type guards used** - For union type narrowing
- [ ] **Generic types used** - For reusable functions
- [ ] **Mongoose types imported** - Use `mongoose.Types.ObjectId`
- [ ] **Record<K, V> for dynamic objects** - Not plain `object`
- [ ] **Unknown instead of any** - Then validate and narrow
- [ ] **TypeScript compiles with strict mode** - No errors
- [ ] **No @ts-ignore or @ts-expect-error** - Fix issues properly

---

## 🛠️ tsconfig.json Required Settings

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

---

## 🚨 Common Violations & Fixes

### Violation 1: Using `any` in function parameters

```typescript
// ❌ WRONG
function processFilters(filters: any) {
  return filters.minPrice;
}

// ✅ CORRECT
interface FilterParams {
  minPrice?: number;
  maxPrice?: number;
}

function processFilters(filters: FilterParams): number | undefined {
  return filters.minPrice;
}
```

### Violation 2: Using `any` for dynamic objects

```typescript
// ❌ WRONG
const attributes: any = {};
attributes.color = 'red';

// ✅ CORRECT
const attributes: Record<string, string> = {};
attributes.color = 'red';
```

### Violation 3: Using `any` for arrays

```typescript
// ❌ WRONG
const conditions: any[] = [];

// ✅ CORRECT
const conditions: Array<Record<string, unknown>> = [];
// OR
interface Condition {
  field: string;
  operator: string;
  value: unknown;
}
const conditions: Condition[] = [];
```

### Violation 4: Using `any` for API responses

```typescript
// ❌ WRONG
const data: any = await fetch('/api/products').then(r => r.json());

// ✅ CORRECT
interface ApiResponse {
  data: Product[];
  message: string;
}

const response: ApiResponse = await fetch('/api/products').then(r => r.json());
const data = response.data;
```

### Violation 5: Implicit `any` from lack of types

```typescript
// ❌ WRONG - Implicit any
function map(arr, fn) { // arr: any, fn: any
  return arr.map(fn);
}

// ✅ CORRECT - Explicit generics
function map<T, R>(arr: T[], fn: (item: T) => R): R[] {
  return arr.map(fn);
}
```

---

## 📚 Additional Resources

- [TypeScript Handbook - Strict Mode](https://www.typescriptlang.org/docs/handbook/2/strict-mode.html)
- [Mongoose TypeScript Support](https://mongoosejs.com/docs/typescript.html)
- [Express TypeScript Guide](https://expressjs.com/en/advanced/developing-template-engines.html)
- [Type Guards and Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

---

**Enforcement Level**: 🔴 CRITICAL  
**Code Review Policy**: Any code with `any` types will be **immediately rejected**  
**Last Updated**: November 2, 2025
