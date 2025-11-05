# Add to Cart Implementation - Complete

## Overview

Implemented dual-mode cart system with authentication-aware add-to-cart functionality across the storefront. The system seamlessly handles both authenticated users (server-side cart via API) and guest users (localStorage-based cart).

## Implementation Details

### 1. Product Component (`src/components/Product/Product.tsx`)

#### Changes Made:

- **Added Imports**:

  ```typescript
  import { useSession } from 'next-auth/react';
  import { useAddToCart } from '@/hooks/mutations/useCart';
  import { useGuestCart } from '@/hooks/useGuestCart';
  ```

- **Added Auth Detection**:

  ```typescript
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  ```

- **Initialized Cart Hooks**:

  ```typescript
  const addToServerCart = useAddToCart();
  const { addItem: addToGuestCart } = useGuestCart();
  ```

- **Refactored `handleAddToCart()` Function** (~50 lines):

  ```typescript
  const handleAddToCart = () => {
    if (!productItem) return;

    // Build attributes from active selections
    const attributes: Array<{ name: string; value: string }> = [];
    if (activeColor) {
      attributes.push({ name: 'Color', value: activeColor });
    }
    if (activeSize) {
      attributes.push({ name: 'Size', value: activeSize });
    }

    const productId = productItem._id;
    const qty = activeQuantity || 1;

    if (isAuthenticated) {
      // Server cart path
      addToServerCart.mutate(
        {
          productId,
          qty,
          attributes,
        },
        {
          onSuccess: () => {
            openModalCart();
          },
          onError: (error) => {
            console.error('Failed to add to cart:', error);
            alert('Failed to add item to cart. Please try again.');
          },
        }
      );
    } else {
      // Guest cart path
      try {
        addToGuestCart(
          productId,
          qty,
          attributes,
          {
            name: productItem.name,
            price: productItem.price,
            sku: productItem.sku || productItem._id,
          },
          productItem.price, // unitPrice
          productItem.sale?._id, // sale ID
          undefined // saleVariantIndex
        );
        openModalCart();
      } catch (error) {
        console.error('Failed to add to guest cart:', error);
        alert('Failed to add item to cart. Please try again.');
      }
    }
  };
  ```

### 2. ModalQuickview Component (`src/components/Modal/ModalQuickview.tsx`)

#### Changes Made:

- **Added Imports**:

  ```typescript
  import { useSession } from 'next-auth/react';
  import { useAddToCart } from '@/hooks/mutations/useCart';
  import { useGuestCart } from '@/hooks/useGuestCart';
  ```

- **Added Auth Detection & Cart Hooks** (same pattern as Product.tsx):

  ```typescript
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const addToServerCart = useAddToCart();
  const { addItem: addToGuestCart } = useGuestCart();
  ```

- **Refactored `handleAddToCart()` Function**:

  ```typescript
  const handleAddToCart = () => {
    if (!product) return;

    // Build attributes
    const attributes: Array<{ name: string; value: string }> = [];
    if (activeColor) {
      attributes.push({ name: 'Color', value: activeColor });
    }
    if (activeSize) {
      attributes.push({ name: 'Size', value: activeSize });
    }

    if (isAuthenticated) {
      // Server cart
      addToServerCart.mutate(
        {
          productId: product._id,
          qty: quantity,
          attributes,
        },
        {
          onSuccess: () => {
            openModalCart();
            closeQuickview();
          },
          onError: (error) => {
            console.error('Failed to add to cart:', error);
            alert('Failed to add item to cart. Please try again.');
          },
        }
      );
    } else {
      // Guest cart
      try {
        addToGuestCart(
          product._id,
          quantity,
          attributes,
          {
            name: product.name,
            price: product.price,
            sku: product.sku || product._id,
          },
          product.price,
          product.sale?._id,
          undefined
        );
        openModalCart();
        closeQuickview();
      } catch (error) {
        console.error('Failed to add to guest cart:', error);
        alert('Failed to add item to cart. Please try again.');
      }
    }
  };
  ```

### 3. Unified Cart Count Hook (`src/hooks/useCartCount.ts`)

Created new hook to provide unified cart count for header badges:

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useCart } from '@/hooks/queries/useCart';
import { useGuestCartCount } from './useGuestCart';

export const useCartCount = () => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  // Server cart for authenticated users
  const { data: serverCart } = useCart();

  // Guest cart for unauthenticated users
  const { count: guestCount } = useGuestCartCount();

  // Return appropriate count based on auth state
  const count = isAuthenticated ? (serverCart?.items?.length ?? 0) : guestCount;

  return {
    count,
    isAuthenticated,
  };
};
```

**Usage in Headers**:

```typescript
import { useCartCount } from '@/hooks/useCartCount';

const { count } = useCartCount();

// In JSX:
<span className="quantity cart-quantity">{count}</span>
```

## Architecture Patterns

### 1. Auth-Aware Cart Operations

**Pattern**: Detect authentication state → Branch to appropriate cart implementation

```typescript
const { data: session } = useSession();
const isAuthenticated = !!session?.user;

if (isAuthenticated) {
  // Use server cart (React Query mutation)
  addToServerCart.mutate({ productId, qty, attributes }, { onSuccess, onError });
} else {
  // Use guest cart (localStorage utility)
  addToGuestCart(productId, qty, attributes, productSnapshot, unitPrice, saleId);
}
```

### 2. Attribute Mapping

**UI State → API Format**:

```typescript
// UI state
const [activeColor, setActiveColor] = useState<string>('');
const [activeSize, setActiveSize] = useState<string>('');

// Convert to API format
const attributes: Array<{ name: string; value: string }> = [];
if (activeColor) attributes.push({ name: 'Color', value: activeColor });
if (activeSize) attributes.push({ name: 'Size', value: activeSize });
```

### 3. Product Snapshot for Guest Cart

Guest cart requires product snapshot (server fetches from DB):

```typescript
const productSnapshot = {
  name: product.name,
  price: product.price,
  sku: product.sku || product._id,
};
```

### 4. Error Handling Strategy

- **Server cart**: Callback-based via React Query mutation options
- **Guest cart**: Try/catch for synchronous localStorage operations

```typescript
// Server
addToServerCart.mutate(data, {
  onSuccess: () => { /* ... */ },
  onError: (error) => { /* ... */ },
});

// Guest
try {
  addToGuestCart(...);
  openModalCart();
} catch (error) {
  console.error(...);
  alert(...);
}
```

## User Flows

### Authenticated User Flow:

1. User clicks "Add to Cart"
2. `handleAddToCart()` detects `isAuthenticated === true`
3. Builds attributes array from UI state
4. Calls `addToServerCart.mutate()` with productId, qty, attributes
5. Server API validates product, checks stock, calculates pricing
6. On success: cart updated on server, modal cart opens
7. On error: error logged, user alerted

### Guest User Flow:

1. User clicks "Add to Cart"
2. `handleAddToCart()` detects `isAuthenticated === false`
3. Builds attributes array from UI state
4. Calls `addToGuestCart()` with product data + productSnapshot
5. Item added to localStorage (`oep-cart-1` key)
6. Modal cart opens immediately
7. Guest cart persists across page refreshes

### Login with Guest Cart:

1. Guest user adds items to localStorage cart
2. User logs in via NextAuth
3. `useMergeGuestCart` hook watches session status
4. When `status === 'authenticated'`, hook triggers
5. Reads guest cart from localStorage
6. Iterates each item, calls `addToCart.mutateAsync()`
7. Server merges items into user's cart
8. Clears guest cart from localStorage
9. User sees combined cart

## Benefits

### 1. **Seamless UX**:

- No cart loss when guest logs in
- Immediate feedback (modal cart opens)
- Works offline for guest users (localStorage)

### 2. **Type-Safe**:

- All data structures properly typed
- No `any` types
- Compile-time errors for mismatches

### 3. **Maintainable**:

- DRY principle - single source of truth for cart logic
- Consistent patterns across components
- Easy to test both auth states

### 4. **Scalable**:

- Server cart handles complex pricing, sales, coupons
- Guest cart lightweight and fast
- Auto-merge prevents data loss

## Testing Checklist

- [ ] **Product Component**:
  - [ ] Add item as authenticated user → verify server cart updated
  - [ ] Add item as guest → verify localStorage updated
  - [ ] Test with color selection
  - [ ] Test with size selection
  - [ ] Test with both color and size
  - [ ] Test quantity changes

- [ ] **Quick View Modal**:
  - [ ] Same tests as Product component
  - [ ] Verify modal closes after add

- [ ] **Cart Count Badge**:
  - [ ] Shows server cart count when authenticated
  - [ ] Shows guest cart count when not authenticated
  - [ ] Updates immediately after adding item
  - [ ] Syncs across browser tabs (storage event)

- [ ] **Merge on Login**:
  - [ ] Add items as guest
  - [ ] Log in
  - [ ] Verify items appear in server cart
  - [ ] Verify localStorage cleared

- [ ] **Error Scenarios**:
  - [ ] Out of stock product
  - [ ] Invalid product ID
  - [ ] Network error (server cart)
  - [ ] localStorage quota exceeded (guest cart)

## Next Steps

### 1. Update Header Cart Badges (Task 11)

Replace all instances of `cartState.cartArray.length` with `useCartCount()` hook:

**Files to update**:

- `src/components/Header/Menu/MenuOne.tsx`
- `src/components/Header/Menu/MenuTwo.tsx`
- `src/components/Header/Menu/MenuFour.tsx`
- `src/components/Header/Menu/MenuEight.tsx`
- ... (all Menu components)

**Pattern**:

```typescript
// Old
const { cartState } = useCart();
<span className="cart-quantity">{cartState.cartArray.length}</span>

// New
import { useCartCount } from '@/hooks/useCartCount';
const { count } = useCartCount();
<span className="cart-quantity">{count}</span>
```

### 2. Add Loading States (Task 12)

Use `addToServerCart.isPending` to improve UX:

```typescript
<button
  onClick={handleAddToCart}
  disabled={addToServerCart.isPending}
  className={addToServerCart.isPending ? 'opacity-50 cursor-not-allowed' : ''}
>
  {addToServerCart.isPending ? (
    <>
      <Spinner className="mr-2" />
      Adding...
    </>
  ) : (
    'Add to Cart'
  )}
</button>
```

### 3. Create Variant Selection Utility (Task 13)

Build `useVariantSelection` hook with:

- Auto-selection logic (first value for non-required attributes)
- Required attribute validation (color, size)
- Unit price resolution using `resolveBestVariant` pattern
- Return: `{ selectedAttributes, unitPrice, variant }`

### 4. Testing (Task 14)

- Manual testing of all user flows
- Cross-browser testing (Chrome, Safari, Firefox)
- Mobile testing (responsive design)
- Accessibility testing (keyboard navigation, screen readers)

## Files Modified

1. **storefront/src/components/Product/Product.tsx**
   - Added auth detection and cart hooks
   - Refactored `handleAddToCart()` with dual-mode logic

2. **storefront/src/components/Modal/ModalQuickview.tsx**
   - Added auth detection and cart hooks
   - Refactored `handleAddToCart()` with dual-mode logic

3. **storefront/src/hooks/useCartCount.ts** (NEW)
   - Created unified cart count hook
   - Supports both server and guest cart counts

## Related Documentation

- **Cart Merge**: `CART_MERGE_IMPLEMENTATION.md`
- **Cart Hooks**: `src/hooks/queries/useCart.ts`, `src/hooks/mutations/useCart.ts`
- **Guest Cart**: `src/libs/guestCart.ts`, `src/hooks/useGuestCart.ts`
- **Architecture**: `docs/ARCHITECTURE.md`

## Status

✅ **Tasks 8 & 9 Complete**: Add to Cart wiring for both authenticated and guest users  
✅ **Task 10 Complete**: Unified cart count hook  
⏳ **Task 11 Pending**: Update header cart badges  
⏳ **Task 12 Pending**: Add loading states  
⏳ **Task 13 Pending**: Variant selection utility  
⏳ **Task 14 Pending**: Testing

**Overall Progress**: 10/14 tasks complete (71%)
