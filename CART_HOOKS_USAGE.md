# Cart Hooks Usage Guide

## Overview

The storefront now has complete React Query hooks for cart operations. These hooks handle API calls, caching, and state synchronization automatically.

## Available Hooks

### Queries (Data Fetching)

#### `useCart()`

Fetches the current user's cart with items, totals, and applied coupons.

```typescript
import { useCart } from '@/hooks/queries/useCart';

function CartPage() {
  const { data: cart, isLoading, error } = useCart();

  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <h2>Cart ({cart.items.length} items)</h2>
      {cart.items.map(item => (
        <CartItem key={item._id} item={item} />
      ))}
      <CartTotals subtotal={cart.subtotal} total={cart.total} />
    </div>
  );
}
```

#### `useValidateCartSales()`

Validates cart pricing and stock before checkout. **Manually triggered** via `refetch()`.

```typescript
import { useValidateCartSales } from '@/hooks/queries/useCart';

function CheckoutButton() {
  const { data, refetch, isLoading } = useValidateCartSales();

  const handleCheckout = async () => {
    const result = await refetch();

    if (!result.data?.valid) {
      // Show validation errors
      console.log('Updated items:', result.data?.updatedItems);
      console.log('Out of stock:', result.data?.outOfStockItems);
      return;
    }

    // Proceed to checkout
    router.push('/checkout');
  };

  return (
    <button onClick={handleCheckout} disabled={isLoading}>
      {isLoading ? 'Validating...' : 'Proceed to Checkout'}
    </button>
  );
}
```

### Mutations (Data Modification)

All mutation hooks return `{ mutate, isPending, isError, error }` and automatically:

- Invalidate cart query cache after success
- Log errors to console
- Allow component-specific success/error handlers via `options`

#### `useAddToCart()`

```typescript
import { useAddToCart } from '@/hooks/mutations/useCart';

function ProductCard({ product }) {
  const addToCart = useAddToCart({
    onSuccess: (cart) => {
      // Optional: custom success handling
      console.log('Added to cart:', cart);
    },
    onError: (error) => {
      // Optional: custom error handling
      alert(`Failed: ${error.message}`);
    }
  });

  const handleAddToCart = () => {
    addToCart.mutate({
      productId: product._id,
      qty: 1,
      attributes: [
        { name: 'Color', value: 'Red' },
        { name: 'Size', value: 'M' }
      ]
    });
  };

  return (
    <button onClick={handleAddToCart} disabled={addToCart.isPending}>
      {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
    </button>
  );
}
```

#### `useUpdateCartItem()`

```typescript
import { useUpdateCartItem } from '@/hooks/mutations/useCart';

function CartItemRow({ item }) {
  const updateItem = useUpdateCartItem();

  const handleQuantityChange = (newQty: number) => {
    updateItem.mutate({
      itemId: item._id,
      data: { qty: newQty }
    });
  };

  return (
    <div>
      <span>{item.productSnapshot.name}</span>
      <input
        type="number"
        value={item.qty}
        onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
        disabled={updateItem.isPending}
      />
    </div>
  );
}
```

#### `useRemoveCartItem()`

```typescript
import { useRemoveCartItem } from '@/hooks/mutations/useCart';

function CartItemRow({ item }) {
  const removeItem = useRemoveCartItem();

  return (
    <button
      onClick={() => removeItem.mutate(item._id)}
      disabled={removeItem.isPending}
    >
      {removeItem.isPending ? 'Removing...' : 'Remove'}
    </button>
  );
}
```

#### `useClearCart()`

```typescript
import { useClearCart } from '@/hooks/mutations/useCart';

function CartPage() {
  const clearCart = useClearCart();

  const handleClear = () => {
    if (confirm('Clear entire cart?')) {
      clearCart.mutate();
    }
  };

  return (
    <button onClick={handleClear} disabled={clearCart.isPending}>
      Clear Cart
    </button>
  );
}
```

#### `useApplyCoupon()` / `useRemoveCoupon()`

```typescript
import { useApplyCoupon, useRemoveCoupon } from '@/hooks/mutations/useCart';

function CouponForm() {
  const [code, setCode] = useState('');
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();

  const handleApply = (e) => {
    e.preventDefault();
    applyCoupon.mutate(code, {
      onSuccess: () => setCode('')
    });
  };

  return (
    <form onSubmit={handleApply}>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Coupon code"
      />
      <button type="submit" disabled={applyCoupon.isPending}>
        Apply
      </button>
    </form>
  );
}
```

## Type Definitions

### Cart Types

```typescript
interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  appliedCoupons: AppliedCoupon[];
  status: 'active' | 'abandoned' | 'converted';
  estimatedShipping: { cost: number; days: number };
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

interface CartItem {
  _id: string;
  product: string; // product ID
  qty: number;
  productSnapshot: {
    name: string;
    price: number;
    sku: string | number;
  };
  selectedAttributes: Array<{ name: string; value: string }>;
  unitPrice: number;
  totalPrice: number;
  sale?: string; // sale ID
  saleVariantIndex?: number;
  appliedDiscount: number;
  discountAmount: number;
  pricingTier?: {
    minQty: number;
    maxQty?: number;
    strategy: string;
    value: number;
    appliedPrice: number;
  };
  addedAt: string;
}

interface CartValidationResult {
  valid: boolean;
  message: string;
  updatedItems?: Array<{
    itemId: string;
    productId: string;
    productName: string;
    reason: 'price_changed' | 'sale_expired' | 'sale_reduced';
    oldPrice: number;
    newPrice: number;
    oldDiscount?: number;
    newDiscount?: number;
  }>;
  outOfStockItems?: Array<{
    itemId: string;
    productId: string;
    productName: string;
    requestedQty: number;
    availableStock: number;
  }>;
  totals?: {
    oldSubtotal: number;
    newSubtotal: number;
    totalDiscount: number;
    total: number;
  };
}
```

## Backend Endpoints

All hooks use these endpoints (defined in `src/libs/api/endpoints.ts`):

```typescript
cart: {
  get: '/cart',                           // GET - fetch cart
  add: '/cart/add',                       // POST - add item
  item: (itemId: string) => `/cart/item/${itemId}`,  // PUT/DELETE - update/remove item
  clear: '/cart/clear',                   // DELETE - clear cart
  validateSales: '/cart/validate-sales',  // GET - validate pricing/stock
  coupon: '/cart/coupon',                 // POST - apply coupon
  removeCoupon: (couponId: string) => `/cart/coupon/${couponId}` // DELETE - remove coupon
}
```

## Best Practices

1. **Use Validation Before Checkout**: Always call `useValidateCartSales().refetch()` before proceeding to payment
2. **Handle Errors Gracefully**: Provide custom `onError` handlers for user-facing operations
3. **Show Loading States**: Use `isPending` to disable buttons during mutations
4. **Optimistic Updates**: For better UX, consider using `onMutate` for instant UI feedback
5. **Cache Invalidation**: Hooks automatically invalidate cart cache - no manual refresh needed

## Next Steps

- **Guest Cart**: Implement localStorage adapter for unauthenticated users
- **Merge on Login**: Sync guest cart with server cart on authentication
- **Variant Selection**: Create helper utility for attribute-based variant resolution
- **Cart Page UI**: Build validation UI showing price changes and OOS items

## Related Files

- Query hooks: `src/hooks/queries/useCart.ts`
- Mutation hooks: `src/hooks/mutations/useCart.ts`
- API endpoints: `src/libs/api/endpoints.ts`
- Axios client: `src/libs/api/axios.ts`
- Backend validation: `old-main-server/src/services/cartService.ts`
