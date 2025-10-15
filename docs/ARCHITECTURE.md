# Storefront Architecture Document

**Version:** 1.0  
**Last Updated:** October 12, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Principles](#architecture-principles)
4. [Directory Structure](#directory-structure)
5. [Core Layers](#core-layers)
6. [Data Flow](#data-flow)
7. [Component Patterns](#component-patterns)
8. [Integration Examples](#integration-examples)
9. [Best Practices](#best-practices)
10. [Migration Guide](#migration-guide)

---

## Overview

This document outlines the architectural design for the OEPlast storefront application. The architecture follows a **layered approach** with clear separation of concerns, leveraging modern React patterns and state management solutions.

### Key Objectives

- **Type Safety**: End-to-end type safety with TypeScript and Zod
- **Performance**: Optimized data fetching with React Query and Next.js SSR
- **Maintainability**: Clear separation between server and client state
- **Developer Experience**: Reusable components, HOCs, and utilities
- **Scalability**: Modular architecture that grows with the application

---

## Technology Stack

### Core Technologies

| Technology                | Purpose           | Scope                        |
| ------------------------- | ----------------- | ---------------------------- |
| **Next.js 15**            | Framework         | SSR, Routing, App Router     |
| **React 19**              | UI Library        | Component composition        |
| **TypeScript**            | Type Safety       | All application code         |
| **Zod**                   | Schema Validation | Forms, API responses         |
| **Axios**                 | HTTP Client       | API calls, interceptors      |
| **@tanstack/react-query** | Server State      | Data fetching, caching, sync |
| **Zustand**               | Client State      | UI state, cart, modals       |
| **@tanstack/react-form**  | Form Management   | Form state, validation       |
| **TailwindCSS**           | Styling           | UI components                |

### State Management Philosophy

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION STATE                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  SERVER STATE (React Query)                              │
│  ├─ Products, Categories, Orders                         │
│  ├─ User Profile, Wishlist                               │
│  ├─ Reviews, Inventory                                   │
│  └─ Any data from backend APIs                           │
│                                                          │
│  CLIENT STATE (Zustand)                                  │
│  ├─ Cart (local-first, synced to server)                │
│  ├─ Modal states (cart, search, compare, wishlist)      │
│  ├─ UI filters (sort, price range, categories)          │
│  ├─ Temporary UI state (loading, errors)                │
│  └─ User preferences (theme, language)                  │
│                                                          │
│  FORM STATE (React Form + Zod)                          │
│  ├─ Login, Registration                                  │
│  ├─ Checkout, Shipping                                   │
│  ├─ Product Reviews                                      │
│  └─ Any user input forms                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### 1. Separation of Concerns

- **Server State**: Managed by React Query (products, user data, orders)
- **Client State**: Managed by Zustand (UI state, cart, filters)
- **Form State**: Managed by React Form with Zod validation
- **API Layer**: Centralized Axios instance with interceptors

### 2. Data Flow Direction

```
Server (Next.js) → Prefetch with React Query
         ↓
Client Hydration
         ↓
Client Components ← React Query (server data)
         ↓            ↓
User Actions → Zustand (UI state) + React Form (input)
         ↓
Mutations (React Query) → API (Axios) → Backend
         ↓
Cache Updates (optimistic/invalidation)
```

### 3. Type Safety

```typescript
// API Response → Zod Schema → TypeScript Type → React Component

Backend Response
    ↓
Zod Schema (runtime validation)
    ↓
TypeScript Type (compile-time safety)
    ↓
React Component Props
```

### 4. Code Organization

- **Colocation**: Keep related code together (components, hooks, types, schemas)
- **Reusability**: Extract common patterns into HOCs, hooks, and utilities
- **DRY Principle**: Single source of truth for schemas, types, and API routes
- **Modularity**: Each feature is self-contained with clear interfaces

---

## Directory Structure

```
storefront/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Home page (server component)
│   │   ├── GlobalProvider.tsx        # Global providers wrapper (existing)
│   │   │
│   │   ├── (shop)/                   # Route group for shop pages
│   │   │   ├── product/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Server: prefetch product data
│   │   │   │       └── ProductClient.tsx  # Client: interactive UI
│   │   │   ├── shop/
│   │   │   │   ├── page.tsx          # Server: prefetch products
│   │   │   │   └── ShopClient.tsx    # Client: filters, sorting, etc.
│   │   │   ├── cart/
│   │   │   │   ├── page.tsx          # Server component
│   │   │   │   └── CartClient.tsx    # Client: cart interactions
│   │   │   ├── checkout/
│   │   │   │   ├── page.tsx          # Server component
│   │   │   │   └── CheckoutClient.tsx # Client: checkout form
│   │   │   └── wishlist/
│   │   │       ├── page.tsx          # Server component
│   │   │       └── WishlistClient.tsx # Client: wishlist UI
│   │   │
│   │   ├── (account)/                # Route group for user pages
│   │   │   ├── login/
│   │   │   │   ├── page.tsx          # Server component
│   │   │   │   └── LoginClient.tsx   # Client: login form
│   │   │   ├── register/
│   │   │   │   ├── page.tsx
│   │   │   │   └── RegisterClient.tsx
│   │   │   └── my-account/
│   │   │       ├── page.tsx          # Server: prefetch user data
│   │   │       └── MyAccountClient.tsx # Client: account management
│   │   │
│   │   ├── (content)/                # Route group for content pages
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx          # Server: prefetch blog posts
│   │   │   │   ├── BlogClient.tsx    # Client: blog list
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx      # Server: prefetch post
│   │   │   │       └── BlogPostClient.tsx
│   │   │   └── pages/
│   │   │       └── [slug]/
│   │   │           ├── page.tsx      # Server: prefetch page data
│   │   │           └── PageClient.tsx
│   │   │
│   │   └── api/                      # API routes (if needed)
│   │
│   ├── providers/                    # Provider components
│   │   ├── ReactQueryProvider.tsx    # React Query setup
│   │   └── index.tsx                 # Provider composition
│   │
│   ├── components/                   # UI Components
│   │   ├── common/                   # Shared components
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   └── Modal/
│   │   ├── features/                 # Feature-specific components
│   │   │   ├── Product/
│   │   │   ├── Cart/
│   │   │   └── Checkout/
│   │   └── layouts/                  # Layout components
│   │
│   ├── libs/                         # Core libraries & configs
│   │   ├── api/                      # API layer
│   │   │   ├── axios.ts              # Axios instance & interceptors
│   │   │   ├── endpoints.ts          # API endpoints (extended apiRoutes)
│   │   │   └── queryClient.ts        # React Query client config
│   │   ├── schemas/                  # Zod schemas
│   │   │   ├── auth.schema.ts
│   │   │   ├── product.schema.ts
│   │   │   └── order.schema.ts
│   │   └── apiRoutes.ts              # API route definitions
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── queries/                  # React Query hooks
│   │   │   ├── useProducts.ts
│   │   │   ├── useUser.ts
│   │   │   └── useOrders.ts
│   │   ├── mutations/                # React Query mutation hooks
│   │   │   ├── useLogin.ts
│   │   │   ├── useCreateOrder.ts
│   │   │   └── useUpdateCart.ts
│   │   └── common/                   # General hooks
│   │       ├── useDebounce.ts
│   │       └── useMediaQuery.ts
│   │
│   ├── store/                        # Zustand stores
│   │   ├── cartStore.ts              # Cart state
│   │   ├── modalStore.ts             # Modal states
│   │   ├── filterStore.ts            # Product filters
│   │   └── uiStore.ts                # General UI state
│   │
│   ├── forms/                        # Form components & configs
│   │   ├── LoginForm.tsx
│   │   ├── CheckoutForm.tsx
│   │   └── ReviewForm.tsx
│   │
│   ├── hocs/                         # Higher-Order Components
│   │   ├── withAuth.tsx              # Authentication guard
│   │   ├── withErrorBoundary.tsx     # Error handling
│   │   ├── withLogging.tsx           # Analytics/logging
│   │   └── withFeatureFlag.tsx       # Feature toggles
│   │
│   ├── types/                        # TypeScript types
│   │   ├── api.types.ts              # API response types
│   │   ├── models.types.ts           # Domain models
│   │   └── common.types.ts           # Shared types
│   │
│   └── utils/                        # Utility functions
│       ├── format.ts
│       ├── validation.ts
│       └── constants.ts
│
├── docs/
│   ├── ARCHITECTURE.md               # This file
│   └── API.md                        # API documentation
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Core Layers

### 1. API Layer (Axios + API Routes)

**Purpose**: Centralized HTTP client with authentication, error handling, and request/response transformation.

#### File: `src/libs/api/axios.ts`

```typescript
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { getSession } from "next-auth/react";

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const session = await getSession();

    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }

    // Add request ID for tracking
    config.headers["X-Request-ID"] = crypto.randomUUID();

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Trigger session refresh
        const session = await getSession();
        if (session?.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error("Network error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

#### File: `src/libs/api/endpoints.ts`

```typescript
import { buildPrefixedRoutes } from "../apiRoutes";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL as string;

// Extended API routes
const API_ROUTES = {
  // Auth
  login: "/auth/login",
  providerLogin: "/auth/login/provider",
  register: "/auth/register",
  logout: "/auth/logout",
  refreshToken: "/auth/refresh",

  // Products
  products: "/products",
  productById: (id: string) => `/products/${id}`,
  productsByCategory: (categoryId: string) => `/products/category/${categoryId}`,

  // Cart
  cart: "/cart",
  cartItem: (itemId: string) => `/cart/${itemId}`,
  cartSync: "/cart/sync",

  // Orders
  orders: "/orders",
  orderById: (id: string) => `/orders/${id}`,
  createOrder: "/orders/create",

  // User
  userProfile: "/user/profile",
  userOrders: "/user/orders",
  userWishlist: "/user/wishlist",

  // Reviews
  productReviews: (productId: string) => `/products/${productId}/reviews`,
  createReview: "/reviews/create",

  // Categories
  categories: "/categories",
  categoryById: (id: string) => `/categories/${id}`,
} as const;

export const endpoints = buildPrefixedRoutes(BASE_URL);

// Helper to build dynamic routes
export const api = {
  ...endpoints,
  products: {
    list: `${BASE_URL}${API_ROUTES.products}`,
    byId: (id: string) => `${BASE_URL}${API_ROUTES.productById(id)}`,
    byCategory: (categoryId: string) => `${BASE_URL}${API_ROUTES.productsByCategory(categoryId)}`,
  },
  cart: {
    get: `${BASE_URL}${API_ROUTES.cart}`,
    item: (itemId: string) => `${BASE_URL}${API_ROUTES.cartItem(itemId)}`,
    sync: `${BASE_URL}${API_ROUTES.cartSync}`,
  },
  orders: {
    list: `${BASE_URL}${API_ROUTES.orders}`,
    byId: (id: string) => `${BASE_URL}${API_ROUTES.orderById(id)}`,
    create: `${BASE_URL}${API_ROUTES.createOrder}`,
  },
  reviews: {
    byProduct: (productId: string) => `${BASE_URL}${API_ROUTES.productReviews(productId)}`,
    create: `${BASE_URL}${API_ROUTES.createReview}`,
  },
};

export default api;
```

---

### 2. Schema Layer (Zod)

**Purpose**: Runtime validation and TypeScript type inference for forms and API responses.

#### File: `src/libs/schemas/product.schema.ts`

```typescript
import { z } from "zod";

// Product schema
export const productSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  discountPrice: z.number().positive().optional(),
  category: z.string(),
  images: z.array(z.string().url()),
  inStock: z.boolean(),
  quantity: z.number().int().nonnegative(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Infer TypeScript type from schema
export type Product = z.infer<typeof productSchema>;

// Array of products
export const productsSchema = z.array(productSchema);
export type Products = z.infer<typeof productsSchema>;

// Product filter schema (for search/filter)
export const productFilterSchema = z.object({
  categoryId: z.string().optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().positive().optional(),
  inStock: z.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["price_asc", "price_desc", "name", "newest", "rating"]).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type ProductFilter = z.infer<typeof productFilterSchema>;

// Product response from API
export const productResponseSchema = z.object({
  success: z.boolean(),
  data: productSchema,
  message: z.string().optional(),
});

export const productsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    products: productsSchema,
    total: z.number(),
    page: z.number(),
    totalPages: z.number(),
  }),
  message: z.string().optional(),
});
```

#### File: `src/libs/schemas/cart.schema.ts`

```typescript
import { z } from "zod";

export const cartItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  selectedSize: z.string().optional(),
  selectedColor: z.string().optional(),
  image: z.string().url(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  total: z.number().nonnegative(),
});

export type Cart = z.infer<typeof cartSchema>;

// Add to cart schema (for form validation)
export const addToCartSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  selectedSize: z.string().optional(),
  selectedColor: z.string().optional(),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
```

#### File: `src/libs/schemas/auth.schema.ts`

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().url().optional(),
  role: z.enum(["user", "admin"]),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;
```

---

### 3. React Query Layer

**Purpose**: Server state management, caching, and synchronization.

#### File: `src/libs/api/queryClient.ts`

```typescript
import { isServer, QueryClient, DefaultOptions } from "@tanstack/react-query";

const queryConfig: DefaultOptions = {
  queries: {
    // With SSR, we usually want to set some default staleTime
    // above 0 to avoid refetching immediately on the client
    staleTime: 60 * 1000, // 1 minute
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
  },
  mutations: {
    retry: 0,
  },
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: queryConfig,
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

// Query keys factory
export const queryKeys = {
  // Products
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (filters: Record<string, any>) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },

  // Cart
  cart: {
    all: ["cart"] as const,
    detail: () => [...queryKeys.cart.all, "detail"] as const,
  },

  // Orders
  orders: {
    all: ["orders"] as const,
    lists: () => [...queryKeys.orders.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.orders.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.orders.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
  },

  // User
  user: {
    all: ["user"] as const,
    profile: () => [...queryKeys.user.all, "profile"] as const,
    wishlist: () => [...queryKeys.user.all, "wishlist"] as const,
  },

  // Categories
  categories: {
    all: ["categories"] as const,
    lists: () => [...queryKeys.categories.all, "list"] as const,
    detail: (id: string) => [...queryKeys.categories.all, "detail", id] as const,
  },
};
```

#### File: `src/hooks/queries/useProducts.ts`

```typescript
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import { queryKeys } from "@/libs/api/queryClient";
import { productsResponseSchema, productResponseSchema, Products, Product, ProductFilter } from "@/libs/schemas/product.schema";

// Fetch all products with filters
export const useProducts = (filters?: ProductFilter): UseQueryResult<Products, Error> => {
  return useQuery({
    queryKey: queryKeys.products.list(filters ?? {}),
    queryFn: async () => {
      const response = await apiClient.get(api.products.list, {
        params: filters,
      });

      // Validate response with Zod
      const validated = productsResponseSchema.parse(response.data);
      return validated.data.products;
    },
    enabled: true,
  });
};

// Fetch single product by ID
export const useProduct = (productId: string): UseQueryResult<Product, Error> => {
  return useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: async () => {
      const response = await apiClient.get(api.products.byId(productId));

      // Validate response with Zod
      const validated = productResponseSchema.parse(response.data);
      return validated.data;
    },
    enabled: !!productId,
  });
};

// Fetch products by category
export const useProductsByCategory = (categoryId: string): UseQueryResult<Products, Error> => {
  return useQuery({
    queryKey: queryKeys.products.list({ categoryId }),
    queryFn: async () => {
      const response = await apiClient.get(api.products.byCategory(categoryId));
      const validated = productsResponseSchema.parse(response.data);
      return validated.data.products;
    },
    enabled: !!categoryId,
  });
};
```

#### File: `src/hooks/mutations/useCreateOrder.ts`

```typescript
import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { apiClient } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import { queryKeys } from "@/libs/api/queryClient";
import { orderSchema, createOrderSchema, Order, CreateOrderInput } from "@/libs/schemas/order.schema";
import { useCartStore } from "@/store/cartStore";

export const useCreateOrder = (): UseMutationResult<Order, Error, CreateOrderInput> => {
  const queryClient = useQueryClient();
  const clearCart = useCartStore((state) => state.clearCart);

  return useMutation({
    mutationFn: async (orderData: CreateOrderInput) => {
      // Validate input with Zod
      const validatedInput = createOrderSchema.parse(orderData);

      const response = await apiClient.post(api.orders.create, validatedInput);

      // Validate response
      const validated = orderSchema.parse(response.data.data);
      return validated;
    },
    onSuccess: (data) => {
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });

      // Clear cart after successful order
      clearCart();

      // Optionally set the new order in cache
      queryClient.setQueryData(queryKeys.orders.detail(data.id), data);
    },
    onError: (error) => {
      console.error("Failed to create order:", error);
    },
  });
};
```

#### File: `src/providers/ReactQueryProvider.tsx`

```typescript
"use client";

// Since QueryClientProvider relies on useContext under the hood,
// we have to put 'use client' on top
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/libs/api/queryClient";

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

#### File: `src/providers/index.tsx`

```typescript
"use client";

import ReactQueryProvider from "./ReactQueryProvider";
import { ReactNode } from "react";

/**
 * Compose all providers here
 * This can be used alongside or integrated with existing GlobalProvider
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <ReactQueryProvider>{children}</ReactQueryProvider>;
}
```

#### Integration with Existing GlobalProvider

You can integrate this with your existing `app/GlobalProvider.tsx`:

```typescript
// app/GlobalProvider.tsx
"use client";

import React, { useState } from "react";
import { CartProvider } from "@/context/CartContext"; // Existing context
import { WishlistProvider } from "@/context/WishlistContext"; // Existing context
// ... other existing contexts
import ReactQueryProvider from "@/providers/ReactQueryProvider";

export default function GlobalProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactQueryProvider>
      {/* Existing Context Providers - Keep these until migration is complete */}
      <CartProvider>
        <WishlistProvider>
          {/* Add other existing providers here */}
          {children}
        </WishlistProvider>
      </CartProvider>
    </ReactQueryProvider>
  );
}
```

**Migration Note**: The existing Context providers (CartContext, WishlistContext, etc.) will remain functional. As you migrate features to Zustand, you can gradually remove the old context providers.

---

### 4. Zustand Layer

**Purpose**: Fast, lightweight client-side state for UI and local-first data.

#### File: `src/store/cartStore.ts`

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem, AddToCartInput } from "@/libs/schemas/cart.schema";

interface CartStore {
  items: CartItem[];

  // Actions
  addItem: (input: AddToCartInput, productData: Partial<CartItem>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateOptions: (productId: string, size?: string, color?: string) => void;
  clearCart: () => void;

  // Computed
  itemCount: () => number;
  subtotal: () => number;
  getItem: (productId: string) => CartItem | undefined;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (input, productData) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.productId === input.productId);

          if (existingItem) {
            // Update quantity if item exists
            return {
              items: state.items.map((item) =>
                item.productId === input.productId ? { ...item, quantity: item.quantity + input.quantity } : item
              ),
            };
          }

          // Add new item
          const newItem: CartItem = {
            productId: input.productId,
            quantity: input.quantity,
            selectedSize: input.selectedSize,
            selectedColor: input.selectedColor,
            name: productData.name || "",
            price: productData.price || 0,
            image: productData.image || "",
          };

          return { items: [...state.items, newItem] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items: state.items.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
        }));
      },

      updateOptions: (productId, size, color) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  selectedSize: size ?? item.selectedSize,
                  selectedColor: color ?? item.selectedColor,
                }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      // Computed values
      itemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      subtotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getItem: (productId) => {
        return get().items.find((item) => item.productId === productId);
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

#### File: `src/store/modalStore.ts`

```typescript
import { create } from "zustand";

interface ModalStore {
  // Modal states
  isCartModalOpen: boolean;
  isSearchModalOpen: boolean;
  isCompareModalOpen: boolean;
  isWishlistModalOpen: boolean;
  isQuickviewModalOpen: boolean;

  // Quick view data
  quickviewProductId: string | null;

  // Actions
  openCartModal: () => void;
  closeCartModal: () => void;
  toggleCartModal: () => void;

  openSearchModal: () => void;
  closeSearchModal: () => void;
  toggleSearchModal: () => void;

  openCompareModal: () => void;
  closeCompareModal: () => void;

  openWishlistModal: () => void;
  closeWishlistModal: () => void;

  openQuickview: (productId: string) => void;
  closeQuickview: () => void;

  closeAllModals: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isCartModalOpen: false,
  isSearchModalOpen: false,
  isCompareModalOpen: false,
  isWishlistModalOpen: false,
  isQuickviewModalOpen: false,
  quickviewProductId: null,

  openCartModal: () => set({ isCartModalOpen: true }),
  closeCartModal: () => set({ isCartModalOpen: false }),
  toggleCartModal: () => set((state) => ({ isCartModalOpen: !state.isCartModalOpen })),

  openSearchModal: () => set({ isSearchModalOpen: true }),
  closeSearchModal: () => set({ isSearchModalOpen: false }),
  toggleSearchModal: () => set((state) => ({ isSearchModalOpen: !state.isSearchModalOpen })),

  openCompareModal: () => set({ isCompareModalOpen: true }),
  closeCompareModal: () => set({ isCompareModalOpen: false }),

  openWishlistModal: () => set({ isWishlistModalOpen: true }),
  closeWishlistModal: () => set({ isWishlistModalOpen: false }),

  openQuickview: (productId) =>
    set({
      isQuickviewModalOpen: true,
      quickviewProductId: productId,
    }),
  closeQuickview: () =>
    set({
      isQuickviewModalOpen: false,
      quickviewProductId: null,
    }),

  closeAllModals: () =>
    set({
      isCartModalOpen: false,
      isSearchModalOpen: false,
      isCompareModalOpen: false,
      isWishlistModalOpen: false,
      isQuickviewModalOpen: false,
      quickviewProductId: null,
    }),
}));
```

#### File: `src/store/filterStore.ts`

```typescript
import { create } from "zustand";
import { ProductFilter } from "@/libs/schemas/product.schema";

interface FilterStore extends ProductFilter {
  // Actions
  setCategory: (categoryId?: string) => void;
  setPriceRange: (min?: number, max?: number) => void;
  setInStock: (inStock?: boolean) => void;
  setSearch: (search?: string) => void;
  setSortBy: (sortBy?: ProductFilter["sortBy"]) => void;
  setPage: (page: number) => void;
  resetFilters: () => void;
}

const initialState: ProductFilter = {
  categoryId: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  inStock: undefined,
  search: undefined,
  sortBy: undefined,
  page: 1,
  limit: 20,
};

export const useFilterStore = create<FilterStore>((set) => ({
  ...initialState,

  setCategory: (categoryId) => set({ categoryId, page: 1 }),

  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice, page: 1 }),

  setInStock: (inStock) => set({ inStock, page: 1 }),

  setSearch: (search) => set({ search, page: 1 }),

  setSortBy: (sortBy) => set({ sortBy, page: 1 }),

  setPage: (page) => set({ page }),

  resetFilters: () => set(initialState),
}));
```

---

### 5. Form Layer (React Form + Zod)

**Purpose**: Declarative form management with validation.

#### File: `src/forms/LoginForm.tsx`

```typescript
"use client";

import { useForm } from "@tanstack/react-form";
import { loginSchema, LoginInput } from "@/libs/schemas/auth.schema";
import { useLogin } from "@/hooks/mutations/useLogin";

export default function LoginForm() {
  const { mutate: login, isPending, error } = useLogin();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    } as LoginInput,
    onSubmit: async ({ value }) => {
      // Validate entire form with Zod
      const validated = loginSchema.parse(value);
      login(validated);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4">
      {/* Email Field */}
      <form.Field
        name="email"
        validators={{
          onChange: loginSchema.shape.email, // Zod schema works directly (Standard Schema)
        }}
        children={(field) => (
          <div>
            <label htmlFor={field.name} className="block text-sm font-medium">
              Email
            </label>
            <input
              id={field.name}
              name={field.name}
              type="email"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
            {field.state.meta.errors && <p className="mt-1 text-sm text-red-600">{field.state.meta.errors.join(", ")}</p>}
          </div>
        )}
      />

      {/* Password Field */}
      <form.Field
        name="password"
        validators={{
          onChange: loginSchema.shape.password,
        }}
        children={(field) => (
          <div>
            <label htmlFor={field.name} className="block text-sm font-medium">
              Password
            </label>
            <input
              id={field.name}
              name={field.name}
              type="password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
            {field.state.meta.errors && <p className="mt-1 text-sm text-red-600">{field.state.meta.errors.join(", ")}</p>}
          </div>
        )}
      />

      {/* Remember Me */}
      <form.Field
        name="rememberMe"
        children={(field) => (
          <div className="flex items-center">
            <input
              id={field.name}
              name={field.name}
              type="checkbox"
              checked={field.state.value}
              onChange={(e) => field.handleChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor={field.name} className="ml-2 block text-sm">
              Remember me
            </label>
          </div>
        )}
      />

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error.message}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
        {isPending ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
```

---

### 6. HOC Layer

**Purpose**: Reusable cross-cutting concerns like authentication, logging, and error handling.

#### File: `src/hocs/withAuth.tsx`

```typescript
"use client";

import { ComponentType, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface WithAuthOptions {
  redirectTo?: string;
  requiredRole?: "user" | "admin";
}

export function withAuth<P extends object>(Component: ComponentType<P>, options: WithAuthOptions = {}) {
  return function AuthenticatedComponent(props: P) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { redirectTo = "/login", requiredRole } = options;

    useEffect(() => {
      if (status === "loading") return;

      // Not authenticated
      if (!session) {
        router.push(redirectTo);
        return;
      }

      // Check role if required
      if (requiredRole && session.user?.role !== requiredRole) {
        router.push("/unauthorized");
      }
    }, [session, status, router]);

    // Show loading state
    if (status === "loading") {
      return (
        <div className="flex h-screen items-center justify-center">
          <p>Loading...</p>
        </div>
      );
    }

    // Not authenticated
    if (!session) {
      return null;
    }

    // Wrong role
    if (requiredRole && session.user?.role !== requiredRole) {
      return null;
    }

    return <Component {...props} />;
  };
}

// Usage example:
// const ProtectedPage = withAuth(MyPage, { requiredRole: 'admin' });
```

#### File: `src/hocs/withErrorBoundary.tsx`

```typescript
"use client";

import { Component, ComponentType, ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const DefaultErrorFallback = ({ error, resetError }: ErrorFallbackProps) => (
  <div className="flex min-h-screen flex-col items-center justify-center">
    <h2 className="mb-4 text-2xl font-bold text-red-600">Something went wrong</h2>
    <p className="mb-4 text-gray-600">{error.message}</p>
    <button onClick={resetError} className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
      Try again
    </button>
  </div>
);

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  ErrorFallback: ComponentType<ErrorFallbackProps> = DefaultErrorFallback
) {
  return class extends Component<P, ErrorBoundaryState> {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
      console.error("Error caught by boundary:", error, errorInfo);
      // Send to error tracking service (e.g., Sentry)
    }

    resetError = () => {
      this.setState({ hasError: false, error: undefined });
    };

    render() {
      if (this.state.hasError && this.state.error) {
        return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
      }

      return <Component {...this.props} />;
    }
  };
}
```

---

## Data Flow

### Server-Side Prefetch → Client Hydration Pattern

This is the standard pattern for all e-commerce routes in the application.

#### Pattern: Shop Page (Product Listing)

```typescript
// app/(shop)/shop/page.tsx (Server Component)
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/libs/api/queryClient";
import { apiClient } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import { productsResponseSchema } from "@/libs/schemas/product.schema";
import { queryKeys } from "@/libs/api/queryClient";
import ShopClient from "./ShopClient";

export default async function ShopPage() {
  const queryClient = getQueryClient();

  // Prefetch initial products on server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.products.list({}),
    queryFn: async () => {
      const response = await apiClient.get(api.products.list);
      const validated = productsResponseSchema.parse(response.data);
      return validated.data.products;
    },
  });

  // Optionally prefetch categories
  await queryClient.prefetchQuery({
    queryKey: queryKeys.categories.lists(),
    queryFn: async () => {
      const response = await apiClient.get(api.categories.list);
      return response.data;
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ShopClient />
    </HydrationBoundary>
  );
}
```

```typescript
// app/(shop)/shop/ShopClient.tsx (Client Component)
"use client";

import { useProducts } from "@/hooks/queries/useProducts";
import { useFilterStore } from "@/store/filterStore";
import ProductCard from "@/components/features/Product/ProductCard";
import FilterSidebar from "@/components/features/Shop/FilterSidebar";
import ProductGrid from "@/components/features/Shop/ProductGrid";

export default function ShopClient() {
  const filters = useFilterStore();
  const { data: products, isLoading, error } = useProducts(filters);

  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-12 gap-6">
        {/* Filters - Client-side interactive */}
        <aside className="col-span-3">
          <FilterSidebar />
        </aside>

        {/* Product Grid */}
        <main className="col-span-9">{isLoading ? <ProductGridSkeleton /> : <ProductGrid products={products} />}</main>
      </div>
    </div>
  );
}
```

#### Pattern: Product Detail Page

```typescript
// app/(shop)/product/[id]/page.tsx (Server Component)
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/libs/api/queryClient";
import { apiClient } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import { productResponseSchema } from "@/libs/schemas/product.schema";
import { queryKeys } from "@/libs/api/queryClient";
import ProductClient from "./ProductClient";

interface ProductPageProps {
  params: { id: string };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = params;
  const queryClient = getQueryClient();

  // Prefetch product details
  await queryClient.prefetchQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(api.products.byId(id));
      const validated = productResponseSchema.parse(response.data);
      return validated.data;
    },
  });

  // Prefetch reviews
  await queryClient.prefetchQuery({
    queryKey: queryKeys.reviews.byProduct(id),
    queryFn: async () => {
      const response = await apiClient.get(api.reviews.byProduct(id));
      return response.data;
    },
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductClient productId={id} />
    </HydrationBoundary>
  );
}

// Generate static params for popular products (optional)
export async function generateStaticParams() {
  // Fetch popular product IDs
  const products = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/popular`).then((res) => res.json());

  return products.map((product: any) => ({
    id: product.id,
  }));
}
```

```typescript
// app/(shop)/product/[id]/ProductClient.tsx (Client Component)
"use client";

import { useProduct } from "@/hooks/queries/useProducts";
import { useCartStore } from "@/store/cartStore";
import { useModalStore } from "@/store/modalStore";
import ProductImages from "@/components/features/Product/ProductImages";
import ProductInfo from "@/components/features/Product/ProductInfo";
import ProductReviews from "@/components/features/Product/ProductReviews";
import ReviewForm from "@/forms/ReviewForm";

interface ProductClientProps {
  productId: string;
}

export default function ProductClient({ productId }: ProductClientProps) {
  // React Query: Server data (already prefetched)
  const { data: product, isLoading, error } = useProduct(productId);

  // Zustand: Client state
  const addItem = useCartStore((state) => state.addItem);
  const openCartModal = useModalStore((state) => state.openCartModal);

  if (isLoading) return <ProductSkeleton />;
  if (error) return <div>Error loading product</div>;
  if (!product) return <div>Product not found</div>;

  const handleAddToCart = (options: { size?: string; color?: string }) => {
    addItem(
      {
        productId: product.id,
        quantity: 1,
        selectedSize: options.size,
        selectedColor: options.color,
      },
      {
        name: product.name,
        price: product.price,
        image: product.images[0],
      }
    );
    openCartModal();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-2 gap-8">
        <ProductImages images={product.images} />
        <ProductInfo product={product} onAddToCart={handleAddToCart} />
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <ProductReviews productId={product.id} />
        <ReviewForm productId={product.id} />
      </div>
    </div>
  );
}
```

#### Pattern: Cart Page

```typescript
// app/(shop)/cart/page.tsx (Server Component)
import CartClient from "./CartClient";

export default function CartPage() {
  // Cart is client-side only (Zustand + localStorage)
  // No server prefetch needed
  return <CartClient />;
}
```

```typescript
// app/(shop)/cart/CartClient.tsx (Client Component)
"use client";

import { useCartStore } from "@/store/cartStore";
import CartItem from "@/components/features/Cart/CartItem";
import CartSummary from "@/components/features/Cart/CartSummary";
import { useSyncCart } from "@/hooks/mutations/useSyncCart";

export default function CartClient() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const subtotal = useCartStore((state) => state.subtotal);
  const { mutate: syncCart } = useSyncCart();

  // Sync cart on mount (if user is logged in)
  useEffect(() => {
    syncCart();
  }, [syncCart]);

  if (items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="col-span-2 space-y-4">
          {items.map((item) => (
            <CartItem
              key={item.productId}
              item={item}
              onUpdateQuantity={(qty) => updateQuantity(item.productId, qty)}
              onRemove={() => removeItem(item.productId)}
            />
          ))}
        </div>

        {/* Cart Summary */}
        <div className="col-span-1">
          <CartSummary subtotal={subtotal()} />
        </div>
      </div>
    </div>
  );
}
```

#### Pattern: Checkout Page

```typescript
// app/(shop)/checkout/page.tsx (Server Component)
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  // Server-side auth check
  const session = await auth();

  if (!session) {
    redirect("/login?callbackUrl=/checkout");
  }

  return <CheckoutClient />;
}
```

```typescript
// app/(shop)/checkout/CheckoutClient.tsx (Client Component)
"use client";

import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import CheckoutForm from "@/forms/CheckoutForm";
import OrderSummary from "@/components/features/Checkout/OrderSummary";

export default function CheckoutClient() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push("/cart");
    }
  }, [items, router]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="col-span-2">
          <CheckoutForm />
        </div>

        {/* Order Summary */}
        <div className="col-span-1">
          <OrderSummary items={items} subtotal={subtotal()} />
        </div>
      </div>
    </div>
  );
}
```

---

## Component Patterns

### Server vs Client Component Strategy

**Rule of Thumb**: Use server components by default, extract client interactivity into separate client components.

#### When to Use Server Components (`page.tsx`)

- ✅ Data fetching (prefetching with React Query)
- ✅ Authentication checks
- ✅ SEO metadata generation
- ✅ Reading environment variables
- ✅ Direct database queries (if applicable)
- ✅ Static rendering for better performance

#### When to Use Client Components (`*Client.tsx`)

- ✅ Interactive UI (clicks, hovers, forms)
- ✅ Using React hooks (useState, useEffect, etc.)
- ✅ Zustand stores
- ✅ React Query hooks (useQuery, useMutation)
- ✅ Browser APIs (localStorage, window, etc.)
- ✅ Event listeners
- ✅ Modal interactions

#### File Naming Convention

```
route-folder/
├── page.tsx              # Server Component (prefetch data, auth checks)
└── RouteNameClient.tsx   # Client Component (interactive UI)
```

**Examples**:

- `app/(shop)/shop/page.tsx` + `ShopClient.tsx`
- `app/(shop)/product/[id]/page.tsx` + `ProductClient.tsx`
- `app/(account)/login/page.tsx` + `LoginClient.tsx`
- `app/(content)/blog/page.tsx` + `BlogClient.tsx`

### Component Composition Pattern

```typescript
// Server Component (page.tsx)
// - Fetches data
// - Passes to client component as props (if needed)
export default async function Page() {
  const data = await fetchData();
  return <ClientComponent initialData={data} />;
}

// Client Component (*Client.tsx)
// - Receives props from server
// - Adds interactivity
// - Uses client-side state
("use client");
export default function ClientComponent({ initialData }) {
  const [state, setState] = useState(initialData);
  return <div>...</div>;
}
```

---

## Integration Examples

### Example 1: Product Detail Page (1-to-Many)

**Scenario**: Product detail page that uses React Query for product data, Zustand for cart, and React Form for review submission.

**Note**: This example is now covered in the "Data Flow" section above with the complete server/client pattern. See "Pattern: Product Detail Page" for the full implementation.

### Example 2: Cart Sync (Zustand + React Query)

**Scenario**: Cart stored locally in Zustand, synced to server with React Query mutation.

```typescript
// hooks/mutations/useSyncCart.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/libs/api/axios";
import { api } from "@/libs/api/endpoints";
import { useCartStore } from "@/store/cartStore";
import { queryKeys } from "@/libs/api/queryClient";

export const useSyncCart = () => {
  const queryClient = useQueryClient();
  const items = useCartStore((state) => state.items);

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(api.cart.sync, { items });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
};

// Usage in component
function CartSyncButton() {
  const { mutate: syncCart, isPending } = useSyncCart();

  return (
    <button onClick={() => syncCart()} disabled={isPending}>
      {isPending ? "Syncing..." : "Sync Cart"}
    </button>
  );
}
```

### Example 3: Checkout Flow (All Technologies)

```typescript
// forms/CheckoutForm.tsx
"use client";

import { useForm } from "@tanstack/react-form";
import { checkoutSchema, CheckoutInput } from "@/libs/schemas/checkout.schema";
import { useCreateOrder } from "@/hooks/mutations/useCreateOrder";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";

export default function CheckoutForm() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.subtotal);
  const { mutate: createOrder, isPending } = useCreateOrder();

  const form = useForm({
    defaultValues: {
      shippingAddress: {
        fullName: "",
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      },
      paymentMethod: "credit_card",
      items,
      total: subtotal(),
    } as CheckoutInput,
    onSubmit: async ({ value }) => {
      const validated = checkoutSchema.parse(value);

      createOrder(validated, {
        onSuccess: (order) => {
          router.push(`/order-confirmation/${order.id}`);
        },
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}>
      {/* Shipping fields */}
      <form.Field name="shippingAddress.fullName" /* ... */ />
      <form.Field name="shippingAddress.street" /* ... */ />

      {/* Payment fields */}
      <form.Field name="paymentMethod" /* ... */ />

      <button type="submit" disabled={isPending}>
        {isPending ? "Processing..." : "Place Order"}
      </button>
    </form>
  );
}
```

### Example 4: Search with Filters (Zustand + React Query)

```typescript
// components/features/Shop/ProductSearch.tsx
"use client";

import { useProducts } from "@/hooks/queries/useProducts";
import { useFilterStore } from "@/store/filterStore";
import { useDebouncedValue } from "@/hooks/common/useDebounce";

export default function ProductSearch() {
  const filters = useFilterStore();
  const setSearch = useFilterStore((state) => state.setSearch);
  const setSortBy = useFilterStore((state) => state.setSortBy);
  const setPriceRange = useFilterStore((state) => state.setPriceRange);

  // Debounce search input
  const debouncedSearch = useDebouncedValue(filters.search, 500);

  // Fetch products with filters
  const { data: products, isLoading } = useProducts({
    ...filters,
    search: debouncedSearch,
  });

  return (
    <div>
      {/* Search Input */}
      <input type="text" placeholder="Search products..." value={filters.search ?? ""} onChange={(e) => setSearch(e.target.value)} />

      {/* Sort Dropdown */}
      <select value={filters.sortBy ?? ""} onChange={(e) => setSortBy(e.target.value as any)}>
        <option value="">Default</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="rating">Highest Rated</option>
      </select>

      {/* Price Range */}
      <div>
        <input
          type="number"
          placeholder="Min price"
          value={filters.minPrice ?? ""}
          onChange={(e) => setPriceRange(Number(e.target.value), filters.maxPrice)}
        />
        <input
          type="number"
          placeholder="Max price"
          value={filters.maxPrice ?? ""}
          onChange={(e) => setPriceRange(filters.minPrice, Number(e.target.value))}
        />
      </div>

      {/* Results */}
      <div className="mt-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {products?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Best Practices

### 1. Schema-First Development

Always define Zod schemas before implementing features:

```typescript
// 1. Define schema
export const productSchema = z.object({
  /* ... */
});

// 2. Infer TypeScript type
export type Product = z.infer<typeof productSchema>;

// 3. Use in API responses
const validated = productSchema.parse(apiResponse);

// 4. Use in forms (Zod 3.24+ supports Standard Schema natively)
const form = useForm({
  defaultValues: {
    /* ... */
  },
  onSubmit: async ({ value }) => {
    const validated = productSchema.parse(value);
  },
});

// 5. Field-level validation
<form.Field
  name="email"
  validators={{
    onChange: productSchema.shape.email, // Direct Zod schema usage
  }}
/>;
```

### 2. Query Key Management

Use the query keys factory for consistency:

```typescript
// ✅ Good
queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

// ❌ Bad
queryClient.invalidateQueries({ queryKey: ["products"] });
```

### 3. Optimistic Updates

```typescript
export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      /* ... */
    },
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.all });

      // Snapshot previous value
      const previous = queryClient.getQueryData(queryKeys.cart.detail());

      // Optimistically update
      queryClient.setQueryData(queryKeys.cart.detail(), (old) => ({
        ...old,
        items: old.items.map((item) => (item.id === newData.id ? { ...item, ...newData } : item)),
      }));

      return { previous };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKeys.cart.detail(), context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all });
    },
  });
};
```

### 4. Error Handling

```typescript
// Global error handler in axios interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    } else if (error.response?.status === 500) {
      // Show generic error
    }
    return Promise.reject(error);
  }
);

// Component-level error handling
function ProductList() {
  const { data, error, isError } = useProducts();

  if (isError) {
    return <ErrorDisplay error={error} />;
  }

  // ...
}
```

### 5. Loading States

```typescript
function ProductDetail({ id }: { id: string }) {
  const { data: product, isLoading, isFetching } = useProduct(id);

  if (isLoading) {
    return <ProductSkeleton />;
  }

  return (
    <div>
      {isFetching && <RefreshIndicator />}
      <ProductContent product={product} />
    </div>
  );
}
```

### 6. Component Size Guidelines

**Rule**: Keep components between **50-350 lines**. If a component exceeds 350 lines, abstract long sections into separate components.

```typescript
// ❌ BAD: 500+ line component
export default function ProductPageClient({ productId }: Props) {
  // 100+ lines of hooks and state
  const [selectedVariant, setSelectedVariant] = useState();
  const [quantity, setQuantity] = useState(1);
  // ... many more hooks

  // 400+ lines of JSX
  return (
    <div>
      {/* 100 lines of image gallery */}
      {/* 150 lines of product info */}
      {/* 100 lines of reviews */}
      {/* 50 lines of related products */}
    </div>
  );
}

// ✅ GOOD: Abstracted into focused components
export default function ProductPageClient({ productId }: Props) {
  const { data: product } = useProduct(productId);
  const { addItem } = useCartStore();

  if (!product) return null;

  return (
    <div className="container mx-auto">
      <ProductImageGallery images={product.images} />
      <ProductInfo product={product} onAddToCart={(variant, quantity) => addItem({ ...variant, quantity })} />
      <ProductReviews productId={productId} />
      <RelatedProducts categoryId={product.categoryId} />
    </div>
  );
}

// Each extracted component is 50-200 lines
// components/features/Product/ProductImageGallery.tsx (120 lines)
// components/features/Product/ProductInfo.tsx (180 lines)
// components/features/Product/ProductReviews.tsx (150 lines)
// components/features/Product/RelatedProducts.tsx (100 lines)
```

**Abstraction Triggers**:

- Component exceeds 350 lines → **MUST** abstract
- Child JSX block exceeds 50 lines → **SHOULD** extract to component
- Logic repeated 2+ times → **MUST** extract to utility/hook
- Nested conditionals 3+ levels → **SHOULD** extract to component

### 7. DRY Principle (Don't Repeat Yourself)

#### Extract Repeated Patterns

```typescript
// ❌ BAD: Repeated UI pattern
function ProductCard1() {
  return <div className="rounded-lg border p-4 shadow-sm hover:shadow-md">{/* content */}</div>;
}

function ProductCard2() {
  return <div className="rounded-lg border p-4 shadow-sm hover:shadow-md">{/* different content */}</div>;
}

// ✅ GOOD: Reusable Card component
function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-lg border p-4 shadow-sm hover:shadow-md ${className}`}>{children}</div>;
}

function ProductCard1() {
  return <Card>{/* content */}</Card>;
}

function ProductCard2() {
  return <Card>{/* different content */}</Card>;
}
```

#### Share Business Logic

```typescript
// ❌ BAD: Duplicated calculation logic
const subtotal1 = cart1.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
const subtotal2 = cart2.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

// ✅ GOOD: Reusable utility function
import { calculateSubtotal } from "@/utils/cart";
const subtotal1 = calculateSubtotal(cart1.items);
const subtotal2 = calculateSubtotal(cart2.items);

// utils/cart.ts
export function calculateSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

#### Centralize Constants

```typescript
// ❌ BAD: Magic numbers scattered across codebase
if (cart.items.length > 20) {
  /* ... */
}
fetch("/api/products?limit=20");
const maxItems = 20;

// ✅ GOOD: Centralized constants
import { LIMITS, API_DEFAULTS } from "@/utils/constants";

if (cart.items.length > LIMITS.MAX_CART_ITEMS) {
  /* ... */
}
fetch(`/api/products?limit=${API_DEFAULTS.PAGE_SIZE}`);

// utils/constants.ts
export const LIMITS = {
  MAX_CART_ITEMS: 20,
  MAX_WISHLIST_ITEMS: 50,
  MAX_COMPARE_ITEMS: 4,
} as const;

export const API_DEFAULTS = {
  PAGE_SIZE: 20,
  TIMEOUT: 10000,
  RETRY_COUNT: 3,
} as const;
```

#### Reusable Hooks Pattern

```typescript
// ❌ BAD: Repeated debounce logic
function SearchBar1() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
}

function SearchBar2() {
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(term), 300);
    return () => clearTimeout(timer);
  }, [term]);
}

// ✅ GOOD: Reusable hook
import { useDebounce } from "@/hooks/common/useDebounce";

function SearchBar1() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
}

function SearchBar2() {
  const [term, setTerm] = useState("");
  const debouncedTerm = useDebounce(term, 300);
}

// hooks/common/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**DRY Checklist**:

- [ ] Code/pattern used 2+ times? → Extract to component/utility/hook
- [ ] Hardcoded values? → Move to constants file
- [ ] Complex calculation? → Extract to utility function
- [ ] API call pattern repeated? → Create custom hook
- [ ] UI pattern repeated? → Create reusable component with props/variants

---

## Migration Guide

### Important: Gradual Migration Strategy

**Do NOT remove existing Context providers immediately**. The architecture supports running both old Context API and new Zustand stores side-by-side during migration.

```typescript
// app/GlobalProvider.tsx - During Migration
"use client";

import ReactQueryProvider from "@/providers/ReactQueryProvider";
import { CartProvider } from "@/context/CartContext"; // Keep existing
import { WishlistProvider } from "@/context/WishlistContext"; // Keep existing

export default function GlobalProvider({ children }) {
  return (
    <ReactQueryProvider>
      {/* Keep existing contexts until fully migrated */}
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
    </ReactQueryProvider>
  );
}
```

### From Context API to Zustand

```typescript
// Before (Context API) - Keep this working
const CartContext = createContext();
const [cartArray, dispatch] = useReducer(cartReducer, []);

// After (Zustand) - Create new store alongside
const useCartStore = create((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
}));

// Migrate components one at a time:
// Old component (still works)
const { cartState, addToCart } = useCart(); // Context API

// New component (uses Zustand)
const { items, addItem } = useCartStore(); // Zustand
```

### From Local State to React Query

```typescript
// Before
const [products, setProducts] = useState([]);
useEffect(() => {
  fetch("/api/products")
    .then((res) => res.json())
    .then(setProducts);
}, []);

// After
const { data: products } = useProducts();
```

### From Manual Forms to React Form

```typescript
// Before
const [email, setEmail] = useState("");
const [errors, setErrors] = useState({});

const handleSubmit = () => {
  if (!email.includes("@")) {
    setErrors({ email: "Invalid email" });
  }
};

// After (Zod 3.24+ Standard Schema support)
const form = useForm({
  defaultValues: { email: "" },
  onSubmit: async ({ value }) => {
    const validated = loginSchema.parse(value);
  },
});

// Field-level validation
<form.Field
  name="email"
  validators={{
    onChange: loginSchema.shape.email, // Direct Zod schema
  }}
/>;
```

---

## Appendix

### Recommended Package Versions

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.62.15",
    "@tanstack/react-form": "^0.39.2",
    "zustand": "^5.0.3",
    "zod": "^3.24.1",
    "axios": "^1.7.9"
  }
}
```

### Useful Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [React Form Docs](https://tanstack.com/form/latest)
- [Zod Docs](https://zod.dev)
- [Axios Docs](https://axios-http.com)

---

**End of Architecture Document**
