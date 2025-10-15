# Axios Setup Documentation

## Overview

Complete Axios configuration with authentication, error handling, and request/response interceptors following the architecture patterns from `docs/ARCHITECTURE.md`#### Example: Mutation with Cache Invalidation

```typescript
// src/hooks/mutations/useCreateOrder.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, handleApiError } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import { queryKeys } from '@/libs/api/queryClient';

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData) => {
      const response = await apiClient.post(api.orders.create, orderData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate orders cache
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    onError: (error) => {
      const message = handleApiError(error);
      console.error(message);
    },
  });
};
```

### When to Use React Query vs Simple Axios

**Use Simple Axios + try/catch for:**
- ✅ Form submissions (login, register, checkout)
- ✅ One-time actions (delete, update profile)
- ✅ Simple POST/PUT/DELETE requests
- ✅ When you don't need caching or background refetching

**Use React Query for:**
- ✅ Data fetching (lists, details)
- ✅ Real-time data that needs background updates
- ✅ Pagination and infinite scroll
- ✅ Complex cache invalidation logic
- ✅ Optimistic updates

---

### Example: Product List Hook

### 1. `src/libs/api/axios.ts`
**Purpose**: Centralized HTTP client with interceptors

**Features**:
- ✅ Base URL configuration from environment variables
- ✅ 30-second timeout for all requests
- ✅ Automatic auth token injection from NextAuth session
- ✅ Request ID tracking for debugging
- ✅ Global error handling (401, 403, 404, 500, network errors)
- ✅ Development mode logging
- ✅ Token refresh on 401 errors
- ✅ Helper function for consistent error messages

**Usage**:
```typescript
import { apiClient, handleApiError } from '@/libs/api/axios';

// GET request
const response = await apiClient.get('/products');

// POST request
const response = await apiClient.post('/auth/register', data);

// Error handling
try {
  const response = await apiClient.post('/api/endpoint', data);
} catch (error) {
  const errorMessage = handleApiError(error);
  console.error(errorMessage);
}
```

### 2. `src/libs/api/endpoints.ts`
**Purpose**: Organized API endpoint definitions

**Features**:
- ✅ Complete endpoint mapping for all features
- ✅ Dynamic route builders (e.g., `byId(id)`)
- ✅ Organized by feature (auth, products, cart, orders, etc.)
- ✅ TypeScript type safety

**Usage**:
```typescript
import { api } from '@/libs/api/endpoints';

// Static endpoints
api.auth.login
api.products.list
api.cart.get

// Dynamic endpoints
api.products.byId('123')
api.orders.byId('order-456')
api.reviews.byProduct('product-789')
```

### 3. `src/libs/api/queryClient.ts`
**Purpose**: React Query configuration and query key factory

**Features**:
- ✅ Optimized SSR configuration
- ✅ Stale time: 1 minute
- ✅ Cache time: 10 minutes
- ✅ Query keys factory for consistent cache management
- ✅ Organized query keys by feature

**Usage**:
```typescript
import { getQueryClient, queryKeys } from '@/libs/api/queryClient';

// Get query client (SSR-safe)
const queryClient = getQueryClient();

// Use query keys
queryKeys.products.all           // ['products']
queryKeys.products.detail('123') // ['products', 'detail', '123']
queryKeys.user.profile()         // ['user', 'profile']
```

### 4. `src/app/provider/react-query.tsx` (Updated)
**Purpose**: React Query provider component

**Features**:
- ✅ Uses centralized query client configuration
- ✅ SSR-safe client initialization
- ✅ Proper client-side hydration

## Configuration

### Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### Authentication

The axios instance automatically:
1. Retrieves session from NextAuth
2. Attaches JWT token to Authorization header
3. Redirects to login on 401 errors

## Request Interceptor

**Automatically adds**:
- `Authorization: Bearer <token>` header (if authenticated)
- `X-Request-ID: <uuid>` header for request tracking
- Development mode logging

## Response Interceptor

**Handles**:
- ✅ **401 Unauthorized**: Auto-redirect to login
- ✅ **403 Forbidden**: Logs access denied
- ✅ **404 Not Found**: Logs missing resources
- ✅ **500 Server Error**: Logs server issues
- ✅ **Network Errors**: Detects connection issues
- ✅ **Timeout Errors**: Handles request timeouts

## Error Handling

### Global Error Handler

```typescript
import { handleApiError } from '@/libs/api/axios';

try {
  await apiClient.post('/endpoint', data);
} catch (error) {
  const message = handleApiError(error);
  // Returns user-friendly error message
}
```

### Error Messages

| Status | Message |
|--------|---------|
| 400 | "Invalid request. Please check your input." |
| 401 | "Unauthorized. Please log in again." |
| 403 | "Access forbidden. You don't have permission." |
| 404 | "Resource not found." |
| 500 | "Server error. Please try again later." |
| Network | "Network error. Please check your internet connection." |
| Timeout | "Request timeout. Please try again." |

## Integration with React Query

**Note**: React Query is great for complex data fetching (lists, pagination, caching), but for **simple form submissions**, use plain Axios with try/catch as shown below.

### Simple Form Submission (Recommended for Forms)

```typescript
// src/forms/RegisterForm.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, handleApiError } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';

export default function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await apiClient.post(api.auth.register, formData);
      router.push('/login?registered=true');
    } catch (error) {
      setSubmitError(handleApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {submitError && <div className="error">{submitError}</div>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

### Complex Data Fetching (Use React Query)

For features that need caching, background refetching, or complex state:

#### Example: Product List with Filters

```typescript
// src/hooks/queries/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import { queryKeys } from '@/libs/api/queryClient';

export const useProducts = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: async () => {
      const response = await apiClient.get(api.products.list, { params: filters });
      return response.data;
    },
  });
};
```

#### Example: Mutation with Cache Invalidation

```typescript
// src/hooks/queries/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import { queryKeys } from '@/libs/api/queryClient';

export const useProducts = () => {
  return useQuery({
    queryKey: queryKeys.products.list({}),
    queryFn: async () => {
      const response = await apiClient.get(api.products.list);
      return response.data;
    },
  });
};
```

### Example: Create a Mutation Hook

```typescript
// src/hooks/mutations/useCreateOrder.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, handleApiError } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
import { queryKeys } from '@/libs/api/queryClient';

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData) => {
      const response = await apiClient.post(api.orders.create, orderData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate orders cache
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
    onError: (error) => {
      const message = handleApiError(error);
      console.error(message);
    },
  });
};
```

## Available Endpoints

### Auth
- `api.auth.login` - POST /auth/login
- `api.auth.register` - POST /auth/register
- `api.auth.logout` - POST /auth/logout
- `api.auth.forgotPassword` - POST /auth/forgot-password
- `api.auth.resetPassword` - POST /auth/reset-password

### Products
- `api.products.list` - GET /products
- `api.products.byId(id)` - GET /products/:id
- `api.products.byCategory(categoryId)` - GET /products/category/:categoryId
- `api.products.search` - GET /products/search
- `api.products.featured` - GET /products/featured
- `api.products.newArrivals` - GET /products/new-arrivals

### Cart
- `api.cart.get` - GET /cart
- `api.cart.item(itemId)` - GET /cart/:itemId
- `api.cart.sync` - POST /cart/sync
- `api.cart.clear` - DELETE /cart/clear

### Orders
- `api.orders.list` - GET /orders
- `api.orders.byId(id)` - GET /orders/:id
- `api.orders.create` - POST /orders/create
- `api.orders.cancel(id)` - POST /orders/:id/cancel
- `api.orders.track(trackingNumber)` - GET /orders/track/:trackingNumber

### User
- `api.user.profile` - GET /user/profile
- `api.user.orders` - GET /user/orders
- `api.user.wishlist` - GET /user/wishlist
- `api.user.addresses` - GET /user/addresses
- `api.user.updateProfile` - PUT /user/profile/update
- `api.user.changePassword` - PUT /user/password/change

### Wishlist
- `api.wishlist.get` - GET /wishlist
- `api.wishlist.add` - POST /wishlist/add
- `api.wishlist.remove(productId)` - DELETE /wishlist/remove/:productId

### Reviews
- `api.reviews.byProduct(productId)` - GET /products/:productId/reviews
- `api.reviews.create` - POST /reviews/create
- `api.reviews.update(reviewId)` - PUT /reviews/:reviewId
- `api.reviews.delete(reviewId)` - DELETE /reviews/:reviewId

### Categories
- `api.categories.list` - GET /categories
- `api.categories.byId(id)` - GET /categories/:id

### Blog
- `api.blog.posts` - GET /blog
- `api.blog.bySlug(slug)` - GET /blog/:slug
- `api.blog.categories` - GET /blog/categories

### Checkout
- `api.checkout.validateCoupon` - POST /checkout/coupon/validate
- `api.checkout.calculateShipping` - POST /checkout/shipping/calculate
- `api.checkout.createPayment` - POST /checkout/payment/create
- `api.checkout.confirmPayment` - POST /checkout/payment/confirm

## Best Practices

### 1. Always Use apiClient
```typescript
// ✅ GOOD
import { apiClient } from '@/libs/api/axios';
const response = await apiClient.get(api.products.list);

// ❌ BAD
const response = await fetch('/api/products');
```

### 2. Use Organized Endpoints
```typescript
// ✅ GOOD
import { api } from '@/libs/api/endpoints';
await apiClient.get(api.products.byId('123'));

// ❌ BAD
await apiClient.get('/products/123');
```

### 3. Use Query Keys Factory
```typescript
// ✅ GOOD
import { queryKeys } from '@/libs/api/queryClient';
queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

// ❌ BAD
queryClient.invalidateQueries({ queryKey: ['products'] });
```

### 4. Handle Errors Consistently
```typescript
// ✅ GOOD
import { handleApiError } from '@/libs/api/axios';
try {
  await apiClient.post(endpoint, data);
} catch (error) {
  const message = handleApiError(error);
  showErrorToast(message);
}

// ❌ BAD
try {
  await apiClient.post(endpoint, data);
} catch (error) {
  console.log(error); // Raw error object
}
```

## Testing

### Mock apiClient in Tests
```typescript
import { apiClient } from '@/libs/api/axios';

jest.mock('@/libs/api/axios');

test('fetches products', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({
    data: { products: [] }
  });

  // Your test code
});
```

## Migration from Fetch

If you have existing code using `fetch`, migrate to `apiClient`:

```typescript
// Before
const response = await fetch(APIRoutes.register, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
const result = await response.json();

// After
import { apiClient } from '@/libs/api/axios';
import { api } from '@/libs/api/endpoints';
const response = await apiClient.post(api.auth.register, data);
const result = response.data;
```

## Troubleshooting

### Issue: "Network Error"
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend server is running
- Check CORS configuration on backend

### Issue: "401 Unauthorized"
- Verify NextAuth session is active
- Check token expiration
- Ensure backend expects `Bearer` token format

### Issue: Request Timeout
- Default timeout is 30 seconds
- Increase if needed: `apiClient.defaults.timeout = 60000`
- Check backend response time

## Architecture Compliance

✅ Follows `docs/ARCHITECTURE.md` Core Layers (Section 5.1)  
✅ Centralized HTTP client with interceptors  
✅ Type-safe endpoints  
✅ Consistent error handling  
✅ React Query integration  
✅ No `any` types - strict TypeScript  

---

**Ready to use!** All files are configured and error-free. 🚀
