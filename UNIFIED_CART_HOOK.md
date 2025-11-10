# Unified Cart Hook - Complete Guide

## Overview

The **unified cart hook** (`useCart`) automatically switches between guest cart (localStorage) and server cart (API) based on authentication state. This provides a **single, consistent API** for all cart operations.

## Migration from Old Hooks

### Before (Multiple Hooks)

```typescript
// Old: Context API cart
import { useCart } from '@/context/CartContext';

// Old: Guest cart
import { useGuestCart } from '@/hooks/useGuestCart';

// Old: Server cart (React Query)
import { useCart } from '@/hooks/queries/useCart';
```

### After (Unified Hook)

```typescript
// New: Single unified hook
import { useCart } from '@/hooks/useCart';
```

All old hooks are now **deprecated** but kept for backward compatibility.

---

## Basic Usage

### Get Cart Data

```typescript
'use client';

import { useCart } from '@/hooks/useCart';

export default function CartPage() {
  const {
    items,           // Cart items array
    subtotal,        // Cart subtotal
    total,           // Cart total (with discounts)
    itemCount,       // Total number of items
    hasItems,        // Boolean: cart has items
    isGuest,         // Boolean: using guest cart
    isLoading,       // Boolean: loading state
    error,           // Error object (if any)
  } = useCart();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Cart ({itemCount} items)</h2>
      <p>Subtotal: ${subtotal.toFixed(2)}</p>
      <p>Total: ${total.toFixed(2)}</p>
      {isGuest && <p>⚠️ Sign in to save your cart</p>}

      {items.map(item => (
        <div key={item._id}>
          <h3>{item.productSnapshot.name}</h3>
          <p>Qty: {item.qty} × ${item.unitPrice.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Cart Operations

### Add to Cart

```typescript
'use client';

import { useCart } from '@/hooks/useCart';

export default function ProductCard({ product }) {
  const { addItem, isAddingItem } = useCart();

  const handleAddToCart = () => {
    addItem({
      productId: product._id,
      qty: 1,
      attributes: [
        { name: 'Color', value: 'Red' },
        { name: 'Size', value: 'L' }
      ],
      productSnapshot: {
        name: product.name,
        price: product.price,
        sku: product.sku,
        image: product.images[0],
      },
      unitPrice: product.price,
      sale: product.activeSale?._id,
      saleVariantIndex: 0,
    });
  };

  return (
    <button onClick={handleAddToCart} disabled={isAddingItem}>
      {isAddingItem ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

### Update Item Quantity

```typescript
'use client';

import { useCart } from '@/hooks/useCart';

export default function CartItemRow({ item }) {
  const { updateItem, isUpdatingItem } = useCart();

  const handleQuantityChange = (newQty: number) => {
    updateItem(item._id, { qty: newQty });
  };

  return (
    <div>
      <input
        type="number"
        value={item.qty}
        onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
        disabled={isUpdatingItem}
      />
    </div>
  );
}
```

### Remove Item

```typescript
'use client';

import { useCart } from '@/hooks/useCart';

export default function CartItemRow({ item }) {
  const { removeItem, isRemovingItem } = useCart();

  return (
    <button
      onClick={() => removeItem(item._id)}
      disabled={isRemovingItem}
    >
      {isRemovingItem ? 'Removing...' : 'Remove'}
    </button>
  );
}
```

### Clear Cart

```typescript
'use client';

import { useCart } from '@/hooks/useCart';

export default function CartPage() {
  const { clearCart, isClearingCart, hasItems } = useCart();

  const handleClear = () => {
    if (confirm('Clear entire cart?')) {
      clearCart();
    }
  };

  if (!hasItems) return <p>Cart is empty</p>;

  return (
    <button onClick={handleClear} disabled={isClearingCart}>
      {isClearingCart ? 'Clearing...' : 'Clear Cart'}
    </button>
  );
}
```

---

## Cart Count Badge

For header cart badges, use the optimized `useCartCount` hook:

```typescript
'use client';

import { useCartCount } from '@/hooks/useCart';

export default function CartBadge() {
  const { count, isLoading } = useCartCount();

  if (isLoading) return <span>...</span>;

  return (
    <div className="cart-badge">
      <CartIcon />
      {count > 0 && <span className="badge">{count}</span>}
    </div>
  );
}
```

---

## Complete API Reference

### Hook Return Values

```typescript
const cart = useCart();
```

#### Data Properties

| Property    | Type          | Description                                  |
| ----------- | ------------- | -------------------------------------------- |
| `cart`      | `UnifiedCart` | Complete cart object                         |
| `items`     | `CartItem[]`  | Array of cart items                          |
| `subtotal`  | `number`      | Cart subtotal before discounts               |
| `total`     | `number`      | Cart total after discounts                   |
| `itemCount` | `number`      | Total quantity of all items                  |
| `hasItems`  | `boolean`     | True if cart has items                       |
| `isGuest`   | `boolean`     | True if using guest cart (not authenticated) |

#### Loading & Error States

| Property    | Type            | Description                                          |
| ----------- | --------------- | ---------------------------------------------------- |
| `isLoading` | `boolean`       | True while fetching server cart (authenticated only) |
| `error`     | `Error \| null` | Error object if cart fetch failed                    |

#### Cart Operations

| Method          | Parameters                                  | Description                |
| --------------- | ------------------------------------------- | -------------------------- |
| `addItem()`     | `AddToCartInput`                            | Add item to cart           |
| `updateItem()`  | `itemId: string, data: UpdateCartItemInput` | Update item qty/attributes |
| `removeItem()`  | `itemId: string`                            | Remove item from cart      |
| `clearCart()`   | `void`                                      | Clear entire cart          |
| `refreshCart()` | `void`                                      | Manually refresh cart data |

#### Operation States

| Property         | Type      | Description              |
| ---------------- | --------- | ------------------------ |
| `isAddingItem`   | `boolean` | True while adding item   |
| `isUpdatingItem` | `boolean` | True while updating item |
| `isRemovingItem` | `boolean` | True while removing item |
| `isClearingCart` | `boolean` | True while clearing cart |

---

## Type Definitions

### AddToCartInput

```typescript
interface AddToCartInput {
  productId: string;
  qty: number;
  attributes: Array<{ name: string; value: string }>;
  productSnapshot: {
    name: string;
    price: number;
    sku: string | number;
    image?: string;
  };
  unitPrice: number;
  sale?: string; // Sale ID (optional)
  saleVariantIndex?: number; // Sale variant index (optional)
}
```

### UpdateCartItemInput

```typescript
interface UpdateCartItemInput {
  qty?: number;
  selectedAttributes?: Array<{ name: string; value: string }>;
}
```

### CartItem

```typescript
interface CartItem {
  _id: string;
  product: string; // Product ID
  qty: number;
  productSnapshot: {
    name: string;
    price: number;
    sku: string | number;
    image?: string;
  };
  selectedAttributes: Array<{
    name: string;
    value: string;
  }>;
  unitPrice: number;
  totalPrice: number;
  sale?: string;
  saleVariantIndex?: number;
  appliedDiscount?: number;
  discountAmount?: number;
  addedAt: string; // ISO timestamp
}
```

### UnifiedCart

```typescript
interface UnifiedCart {
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  itemCount: number;
  hasItems: boolean;
  isGuest: boolean;
}
```

---

## How It Works

### Guest Users (Unauthenticated)

- Cart stored in **localStorage** (key: `oep-cart-1`)
- Automatic sync across browser tabs
- 24-hour TTL (expired items auto-purged)
- No server API calls

### Authenticated Users

- Cart stored on **server** via API
- Fetched with React Query (30s stale time)
- Supports coupons, discounts, advanced features
- Automatic cache invalidation on mutations

### Automatic Switching

The hook **automatically detects** authentication state via `useSession()` from NextAuth:

```typescript
const { data: session, status } = useSession();
const isAuthenticated = status === 'authenticated' && !!session;

// Automatically uses server cart if authenticated, guest cart otherwise
```

---

## Advanced Usage

### Access Raw Query/Mutation Objects

```typescript
const {
  serverCartQuery, // React Query object (authenticated only)
  addToCartMutation, // useMutation object
  updateCartItemMutation, // useMutation object
  removeCartItemMutation, // useMutation object
  clearCartMutation, // useMutation object
} = useCart();

// Example: Custom error handling
if (addToCartMutation.isError) {
  console.error('Add to cart failed:', addToCartMutation.error);
}
```

### Manual Cache Invalidation

```typescript
const { refreshCart } = useCart();

// Force refresh cart from server/localStorage
refreshCart();
```

### Conditional Rendering Based on Auth

```typescript
const { isGuest, items } = useCart();

return (
  <div>
    {isGuest ? (
      <div className="alert">
        <p>⚠️ Your cart is stored locally</p>
        <button onClick={handleLogin}>Sign in to save</button>
      </div>
    ) : (
      <div className="alert">
        <p>✓ Your cart is synced to your account</p>
      </div>
    )}

    {/* Cart items */}
    {items.map(item => ...)}
  </div>
);
```

---

## Migration Checklist

When migrating from old hooks to `useCart`:

- [ ] Replace `import { useCart } from '@/context/CartContext'` → `import { useCart } from '@/hooks/useCart'`
- [ ] Replace `import { useGuestCart } from '@/hooks/useGuestCart'` → `import { useCart } from '@/hooks/useCart'`
- [ ] Replace `import { useCart } from '@/hooks/queries/useCart'` → `import { useCart } from '@/hooks/useCart'`
- [ ] Update property names:
  - `cartState.cartArray` → `items`
  - `cart.items` → `items`
  - `addToCart()` → `addItem()`
  - `removeFromCart()` → `removeItem()`
  - `updateCart()` → `updateItem()`
- [ ] Remove manual auth checks (hook handles automatically)
- [ ] Update item property names to match `CartItem` interface
- [ ] Test with both guest and authenticated users

---

## Benefits

✅ **Single API** - One hook for all cart operations  
✅ **Auto-switching** - Seamless guest ↔ authenticated transition  
✅ **Type-safe** - Full TypeScript support  
✅ **Optimized** - Separate `useCartCount()` for badges  
✅ **Real-time sync** - Guest cart syncs across tabs  
✅ **Server-first** - Authenticated users get server cart features  
✅ **Backward compatible** - Old hooks still work (deprecated)

---

## Support

For questions or issues, check:

- This documentation
- Old hook implementations (for migration reference)
- Type definitions in `/hooks/useCart.ts`
