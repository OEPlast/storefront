# Guest Cart Implementation

## Overview

The guest cart adapter enables full cart functionality for unauthenticated users using localStorage. It mirrors the server cart structure and automatically syncs across browser tabs.

## Files Created

- **`src/libs/guestCart.ts`** - Core utilities for localStorage cart management
- **`src/hooks/useGuestCart.ts`** - Reactive React hooks for cart state

## Key Features

✅ **24-hour TTL** - Auto-purges expired items (same as server cart)  
✅ **Tab Synchronization** - Changes sync across browser tabs via storage events  
✅ **Identical Item Detection** - Sums quantities for matching product+attributes  
✅ **Type Safety** - Full TypeScript support with `GuestCartItem` type  
✅ **Reactive State** - Hooks trigger re-renders on cart changes

## Quick Start

### Basic Usage - Full Cart Hook

```typescript
'use client';

import { useGuestCart } from '@/hooks/useGuestCart';

function CartPage() {
  const {
    items,
    itemCount,
    hasItems,
    addItem,
    removeItem,
    updateItem,
    getTotals
  } = useGuestCart();

  const totals = getTotals();

  return (
    <div>
      <h2>Guest Cart ({itemCount} items)</h2>
      {items.map(item => (
        <div key={item._id}>
          <span>{item.productSnapshot.name}</span>
          <span>Qty: {item.qty}</span>
          <button onClick={() => removeItem(item._id)}>Remove</button>
        </div>
      ))}
      <p>Subtotal: ${totals.subtotal.toFixed(2)}</p>
    </div>
  );
}
```

### Adding Items to Cart

```typescript
import { useGuestCart } from '@/hooks/useGuestCart';

function ProductCard({ product }) {
  const { addItem } = useGuestCart();

  const handleAddToCart = () => {
    addItem(
      product._id,                    // productId
      1,                              // qty
      [                               // attributes
        { name: 'Color', value: 'Red' },
        { name: 'Size', value: 'M' }
      ],
      {                               // productSnapshot
        name: product.name,
        price: product.price,
        sku: product.sku
      },
      product.price,                  // unitPrice
      product.activeSaleId,           // sale (optional)
      0                               // saleVariantIndex (optional)
    );
  };

  return <button onClick={handleAddToCart}>Add to Cart</button>;
}
```

### Cart Count Badge (Lightweight)

```typescript
import { useGuestCartCount } from '@/hooks/useGuestCart';

function CartBadge() {
  const { count } = useGuestCartCount();

  if (count === 0) return null;

  return (
    <div className="cart-badge">
      <ShoppingCart />
      <span>{count}</span>
    </div>
  );
}
```

### Check if Guest Cart Exists

```typescript
import { useHasGuestCart } from '@/hooks/useGuestCart';

function LoginPrompt() {
  const { hasCart } = useHasGuestCart();

  if (!hasCart) return null;

  return (
    <div className="alert">
      You have {hasCart ? 'items in your cart' : 'no items'}.
      Login to save your cart!
    </div>
  );
}
```

## Utility Functions (Direct Access)

For non-reactive scenarios or server-side logic:

```typescript
import {
  getGuestCart,
  addToGuestCart,
  updateGuestCartItem,
  removeFromGuestCart,
  clearGuestCart,
  getGuestCartItemCount,
  getGuestCartTotals,
  hasGuestCart,
} from '@/libs/guestCart';

// Example: Get cart without React
const cart = getGuestCart();
console.log('Guest cart:', cart);

// Example: Add item without hook
const item = addToGuestCart(
  'product123',
  2,
  [{ name: 'Size', value: 'L' }],
  { name: 'T-Shirt', price: 29.99, sku: 'TSH-001' },
  29.99
);
```

## Data Structure

### GuestCartItem

```typescript
interface GuestCartItem {
  _id: string; // Local ID (e.g., "local_1699123456789_abc123")
  product: string; // Product ID
  qty: number; // Quantity
  selectedAttributes: Array<{
    // Selected variant attributes
    name: string;
    value: string;
  }>;
  productSnapshot: {
    // Product info at time of add
    name: string;
    price: number;
    sku: string | number;
  };
  unitPrice: number; // Price per item
  totalPrice: number; // unitPrice * qty
  sale?: string; // Sale ID (if in sale)
  saleVariantIndex?: number; // Which sale variant matched
  addedAt: string; // ISO timestamp (for TTL)
}
```

### GuestCart

```typescript
interface GuestCart {
  items: GuestCartItem[];
  lastUpdated: string; // ISO timestamp
}
```

## Automatic Features

### 1. TTL Enforcement (24 Hours)

Items older than 24 hours are automatically removed when:

- Reading cart via `getGuestCart()`
- Any hook accesses the cart
- Any mutation occurs

```typescript
// User adds item on Nov 1, 2025 10:00 AM
addToGuestCart(...);

// User returns on Nov 2, 2025 11:00 AM (25 hours later)
const cart = getGuestCart();
// Cart is empty - item was auto-purged
```

### 2. Quantity Summing

Adding an identical item (same product + attributes) increments quantity:

```typescript
// First add
addToGuestCart('prod1', 2, [{ name: 'Color', value: 'Red' }], ...);
// Cart: [{ product: 'prod1', qty: 2, ... }]

// Second add (same product + attributes)
addToGuestCart('prod1', 3, [{ name: 'Color', value: 'Red' }], ...);
// Cart: [{ product: 'prod1', qty: 5, ... }] - quantities summed!

// Different attributes = separate item
addToGuestCart('prod1', 1, [{ name: 'Color', value: 'Blue' }], ...);
// Cart: [
//   { product: 'prod1', qty: 5, selectedAttributes: [{ name: 'Color', value: 'Red' }] },
//   { product: 'prod1', qty: 1, selectedAttributes: [{ name: 'Color', value: 'Blue' }] }
// ]
```

### 3. Cross-Tab Sync

Changes in one tab automatically reflect in others:

```typescript
// Tab 1: User adds item
const { addItem } = useGuestCart();
addItem(...);

// Tab 2: Cart automatically updates
const { items } = useGuestCart();
// items now includes the new item (no refresh needed!)
```

## localStorage Key

- **Key**: `oep-cart-1`
- **Format**: JSON string
- **Max Size**: ~5-10 MB (browser-dependent, typically supports hundreds of items)

## Error Handling

All functions gracefully handle errors:

```typescript
try {
  const cart = getGuestCart();
} catch (error) {
  // Returns empty cart on error
  console.error('Cart error:', error);
  // cart = { items: [], lastUpdated: "..." }
}
```

## Migration to Server Cart

When user logs in, use the merge utility (next step):

```typescript
import { getGuestCart, clearGuestCart } from '@/libs/guestCart';
import { useAddToCart } from '@/hooks/mutations/useCart';

function mergeGuestCart() {
  const guestCart = getGuestCart();
  const addToCart = useAddToCart();

  // Migrate each item
  guestCart.items.forEach((item) => {
    addToCart.mutate({
      productId: item.product,
      qty: item.qty,
      attributes: item.selectedAttributes,
    });
  });

  // Clear guest cart after migration
  clearGuestCart();
}
```

## Performance Notes

- **Hooks**: Re-render only when cart changes
- **Storage Events**: Debounced to prevent excessive updates
- **TTL Check**: O(n) filter operation (fast for typical cart sizes)
- **Identical Check**: Attribute comparison is optimized with sorting

## Next Steps

1. **Merge on Login** - Implement automatic guest cart migration (next task)
2. **Add to Cart Wiring** - Wire Product/Quick View components to use guest cart when unauthenticated
3. **Cart Icon** - Update header cart count to use `useGuestCartCount()` for guests
4. **Persistent Pricing** - Consider re-fetching product prices on cart load (prices may have changed)

## Testing

```typescript
// Manual testing in browser console
import { addToGuestCart, getGuestCart } from '@/libs/guestCart';

// Add test item
addToGuestCart(
  'test123',
  2,
  [{ name: 'Size', value: 'M' }],
  { name: 'Test Product', price: 50, sku: 'TEST-001' },
  50
);

// Check storage
console.log(localStorage.getItem('oep-cart-1'));

// Verify cart
console.log(getGuestCart());
```
