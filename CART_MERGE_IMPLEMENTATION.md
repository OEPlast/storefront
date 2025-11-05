# Guest Cart Merge Implementation

## Overview

Automatic guest cart merging has been implemented to seamlessly sync localStorage cart items to the server when a user logs in.

## Files Created/Modified

1. **`src/hooks/useMergeGuestCart.ts`** - Hook that watches session and triggers merge
2. **`src/components/CartSyncManager.tsx`** - Component wrapper for merge hook
3. **`src/app/GlobalProvider.tsx`** - Updated to include CartSyncManager

## How It Works

### Automatic Merge Flow

```
User Journey:
1. Guest adds items to cart → Stored in localStorage ('oep-cart-1')
2. Guest clicks "Login" → Authenticates
3. Session becomes available → useMergeGuestCart detects session
4. Auto-merge triggered → Each guest item sent to POST /cart/add
5. Server cart updated → Backend sums quantities for identical items
6. Guest cart cleared → localStorage 'oep-cart-1' removed
7. Cart queries refreshed → UI shows merged server cart
```

### Implementation Details

**Cart Sync Manager** is placed in GlobalProvider between `ReactQueryProvider` and `ServerQueries`:

```tsx
<SessionProvider>
  <ReactQueryProvider>
    <CartSyncManager>
      {' '}
      {/* ← Merge happens here */}
      <ServerQueries>
        <CartProvider>{/* Rest of app */}</CartProvider>
      </ServerQueries>
    </CartSyncManager>
  </ReactQueryProvider>
</SessionProvider>
```

**Why this placement?**

- **After SessionProvider**: Needs access to session state
- **After ReactQueryProvider**: Uses React Query mutations
- **Before CartProvider**: Ensures merge completes before legacy cart context loads

## Key Features

✅ **Automatic Detection** - Triggers on session arrival, no manual calls needed  
✅ **Quantity Summing** - Server automatically sums quantities for identical items  
✅ **Error Handling** - Failed items logged, successful items still merged  
✅ **One-time Execution** - Merge only happens once per login session  
✅ **Non-blocking** - Merge runs in background, doesn't block UI  
✅ **Clean Logging** - Console logs for debugging merge process

## Usage

### In Application (Already Integrated)

No additional setup needed! The merge happens automatically when:

1. User has items in guest cart (localStorage 'oep-cart-1')
2. User logs in (session becomes available)
3. Merge completes within ~500ms

### Manual Trigger (Advanced)

If you need to manually trigger merge (e.g., in a specific component):

```typescript
import { useMergeGuestCart } from '@/hooks/useMergeGuestCart';

function CustomComponent() {
  const { isMerging, mergeError } = useMergeGuestCart();

  // Hook automatically merges on session arrival
  // You can use the state for UI feedback

  if (isMerging) {
    return <div>Syncing your cart...</div>;
  }

  if (mergeError) {
    return <div className="error">{mergeError}</div>;
  }

  return <div>Cart is synced!</div>;
}
```

## Merge Logic Details

### Item Merging Strategy

Each guest cart item is sent to the server individually:

```typescript
// Guest cart item
{
  product: 'prod_123',
  qty: 2,
  selectedAttributes: [{ name: 'Color', value: 'Red' }]
}

// Sent to server as
POST /cart/add
{
  productId: 'prod_123',
  qty: 2,
  attributes: [{ name: 'Color', value: 'Red' }]
}
```

**Backend behavior:**

- If identical item exists in server cart → Quantities are summed
- If item doesn't exist → New item added
- If item fails (e.g., out of stock) → Error logged, other items continue

### Error Handling

```typescript
const { isMerging, mergeError, clearError } = useMergeGuestCart();

// Errors are auto-cleared after 5 seconds
// Or manually clear:
clearError();
```

**Error scenarios:**

- Network failure → Merge retries on next login
- Product deleted → Item skipped, logged to console
- Out of stock → Item skipped, logged to console
- Partial success → Some items merged, error shown for failed items

## Example Scenarios

### Scenario 1: Simple Merge

```
Guest Cart:
  - Product A (Red, Size M) × 2

User logs in →

Server Cart:
  - Product A (Red, Size M) × 2

localStorage 'oep-cart-1' cleared ✓
```

### Scenario 2: Quantity Summing

```
Guest Cart:
  - Product A (Red) × 3

Server Cart (before login):
  - Product A (Red) × 2

User logs in →

Server Cart (after merge):
  - Product A (Red) × 5  ← 3 + 2 = 5

localStorage cleared ✓
```

### Scenario 3: Different Variants

```
Guest Cart:
  - Product A (Red, M) × 1
  - Product A (Blue, L) × 2

Server Cart (before login):
  - Product A (Red, M) × 3

User logs in →

Server Cart (after merge):
  - Product A (Red, M) × 4   ← 1 + 3 = 4
  - Product A (Blue, L) × 2  ← New item

localStorage cleared ✓
```

### Scenario 4: Partial Failure

```
Guest Cart:
  - Product A × 2 (available)
  - Product B × 1 (deleted)
  - Product C × 3 (available)

User logs in →

Console logs:
  ✓ Product A merged
  ✗ Product B failed (product not found)
  ✓ Product C merged

Server Cart:
  - Product A × 2
  - Product C × 3

mergeError: "Some items could not be added (1 failed)"
localStorage cleared ✓
```

## Console Output

During merge, you'll see:

```
Merging 3 guest cart items to server...
🔄 Syncing guest cart to server...
Cart merge complete: 3 items merged, 0 errors
```

On error:

```
Failed to merge item prod_xyz: Error: Product not found
❌ Cart merge error: Some items could not be added (1 failed)
```

## Testing

### Manual Test

1. **As Guest:**

```typescript
import { addToGuestCart } from '@/libs/guestCart';

// Add test items
addToGuestCart(
  'prod_123',
  2,
  [{ name: 'Color', value: 'Red' }],
  { name: 'Test Product', price: 50, sku: 'TEST-001' },
  50
);
```

2. **Login:**
   - Navigate to login page
   - Enter credentials
   - Login successful

3. **Verify:**
   - Check console for merge logs
   - Check localStorage - should be empty
   - Check server cart - should contain merged items

### Automated Test Flow

```typescript
// 1. Add items as guest
const guestCart = getGuestCart();
expect(guestCart.items.length).toBe(2);

// 2. Trigger login
await signIn('credentials', { email, password });

// 3. Wait for merge
await waitFor(() => {
  expect(localStorage.getItem('oep-cart-1')).toBeNull();
});

// 4. Verify server cart
const { data: serverCart } = await useCart();
expect(serverCart.items.length).toBe(2);
```

## Performance Considerations

- **Merge Duration**: ~100-500ms for typical cart sizes (1-10 items)
- **Network Requests**: One POST request per guest cart item (sequential)
- **Server Load**: Minimal - uses existing `/cart/add` endpoint
- **UI Blocking**: None - merge happens in background

## Troubleshooting

### Merge Not Triggering

**Check:**

1. Session is authenticated: `console.log(session?.user)`
2. Guest cart has items: `console.log(getGuestCart())`
3. CartSyncManager is in GlobalProvider
4. React Query is initialized

### Items Not Appearing

**Check:**

1. Console for error logs
2. Network tab for failed requests
3. Server cart endpoint response
4. Product availability (deleted products won't merge)

### Merge Happens Multiple Times

**Cause:** Multiple session state changes  
**Fix:** Hook includes `isMerging` guard to prevent duplicate merges

## Next Steps

1. **Add to Cart Wiring** - Wire Product/Quick View components to use cart hooks
2. **Visual Feedback** - Show toast notification on successful merge
3. **Merge Prompt** - Optionally show modal: "We found X items in your cart. Add them now?"
4. **Error Recovery** - Provide UI to retry failed items

## Related Files

- Guest cart utilities: `src/libs/guestCart.ts`
- Guest cart hooks: `src/hooks/useGuestCart.ts`
- Cart mutations: `src/hooks/mutations/useCart.ts`
- Cart queries: `src/hooks/queries/useCart.ts`
