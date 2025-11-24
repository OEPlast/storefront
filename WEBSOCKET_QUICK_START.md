# WebSocket Integration Quick Start

## Installation Complete ✅

The WebSocket system is fully implemented and ready to use. This guide shows how to integrate it into your storefront components.

## Prerequisites

- **socket.io-client** is installed in storefront
- **websocket-gateway** is running on port 3003
- **event-bus** is configured to notify gateway
- **NEXT_PUBLIC_WEBSOCKET_URL** is set in `.env.local`

## Basic Usage

### 1. Product Detail Page

**File:** `src/app/product-detail/[slug]/ProductDetailClient.tsx`

```typescript
'use client';

import { useProductSocket } from '@/hooks/useProductSocket';

export default function ProductDetailClient({ product }: { product: ProductType }) {
  // Subscribe to this product's updates
  const { isConnected } = useProductSocket({
    productIds: [product._id],
    debounceMs: 1000,
  });

  return (
    <div>
      {/* Optional: Show live indicator */}
      {isConnected && (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
          Live Updates
        </span>
      )}

      {/* Your existing product detail UI */}
      {/* Data will automatically update via TanStack Query */}
    </div>
  );
}
```

### 2. Product List/Grid Page

**File:** `src/app/shop/ShopClient.tsx`

```typescript
'use client';

import { useProductSocket } from '@/hooks/useProductSocket';

export default function ShopClient({ initialProducts }: { initialProducts: ProductType[] }) {
  const productIds = initialProducts.map(p => p._id);

  // Subscribe to all visible products
  useProductSocket({
    productIds,
    debounceMs: 1500, // Longer debounce for lists
  });

  return (
    <div className="product-grid">
      {initialProducts.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
```

### 3. Cart Context

**File:** `src/context/CartContext.tsx`

```typescript
'use client';

import { useProductSocket } from '@/hooks/useProductSocket';

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { cartState } = useCart();

  // Extract product IDs from cart
  const cartProductIds = cartState.cartArray.map(item => item._id);

  // Subscribe to all cart products
  useProductSocket({
    productIds: cartProductIds,
    debounceMs: 500, // Quick updates for cart
    onUpdate: (update) => {
      // Optional: Show toast notification
      console.log('Cart product updated:', update.productId);
    },
  });

  return <>{children}</>;
};
```

### 4. Wishlist Context

**File:** `src/context/WishlistContext.tsx`

```typescript
'use client';

import { useProductSocket } from '@/hooks/useProductSocket';

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const { wishlistState } = useWishlist();

  // Extract product IDs from wishlist
  const wishlistProductIds = wishlistState.wishlistArray.map(item => item._id);

  // Subscribe to all wishlist products
  useProductSocket({
    productIds: wishlistProductIds,
    debounceMs: 1000,
  });

  return <>{children}</>;
};
```

## Advanced Usage

### Conditional Subscription (Only When In View)

```typescript
'use client';

import { useProductSocket } from '@/hooks/useProductSocket';
import { useInView } from 'react-intersection-observer';

export default function ProductCard({ product }: { product: ProductType }) {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Only subscribe when product is visible
  useProductSocket({
    productIds: inView ? [product._id] : [],
    enabled: inView,
    debounceMs: 1000,
  });

  return (
    <div ref={ref} className="product-card">
      {/* Product card UI */}
    </div>
  );
}
```

### Custom Update Handler

```typescript
'use client';

import { useProductSocket } from '@/hooks/useProductSocket';
import { toast } from 'react-hot-toast';

export default function ProductDetail({ product }: { product: ProductType }) {
  useProductSocket({
    productIds: [product._id],
    onUpdate: (update) => {
      // Check for low stock
      const inventoryEvents = update.events.filter(e => e.type === 'inventory_update');
      inventoryEvents.forEach(event => {
        const data = event.data as InventoryUpdateData;
        if (data.currentStock < 10) {
          toast.warning(`Only ${data.currentStock} items left!`);
        }
      });
    },
  });

  return <div>{/* ... */}</div>;
}
```

### Connection Status Indicator

```typescript
'use client';

import { useProductSocket } from '@/hooks/useProductSocket';
import { useState } from 'react';

export default function ProductPage({ product }: { product: ProductType }) {
  const [statusMessage, setStatusMessage] = useState('');

  const { status, isConnected } = useProductSocket({
    productIds: [product._id],
    onStatusChange: (newStatus) => {
      setStatusMessage({
        connecting: 'Connecting to live updates...',
        connected: 'Connected',
        disconnected: 'Disconnected',
        error: 'Connection error',
      }[newStatus]);
    },
  });

  return (
    <div>
      {/* Status indicator */}
      <div className="mb-4">
        <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
          {statusMessage}
        </span>
      </div>

      {/* Product content */}
    </div>
  );
}
```

## Hook API Reference

### `useProductSocket(options)`

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `productIds` | `string[]` | `[]` | Array of product IDs to subscribe to |
| `autoReconnect` | `boolean` | `true` | Enable automatic reconnection |
| `debounceMs` | `number` | `1000` | Debounce time before triggering query invalidation |
| `enabled` | `boolean` | `true` | Enable/disable the WebSocket connection |
| `onUpdate` | `function` | - | Callback when product updates are received |
| `onStatusChange` | `function` | - | Callback when connection status changes |

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `status` | `SocketStatus` | Current connection status: `'connecting'` \| `'connected'` \| `'disconnected'` \| `'error'` |
| `isConnected` | `boolean` | Whether the socket is connected |
| `subscribeToProduct` | `function` | Manually subscribe to a product |
| `unsubscribeFromProduct` | `function` | Manually unsubscribe from a product |
| `requestSync` | `function` | Request sync for reconnection recovery |
| `socket` | `Socket \| null` | Raw Socket.IO instance (advanced usage) |

## Integration Checklist

### Required Files

- [x] `src/types/websocket.ts` - Type definitions
- [x] `src/hooks/useProductSocket.ts` - React hook
- [x] `package.json` - socket.io-client@4.7.2 installed

### Environment Variables

Add to `storefront/.env.local`:

```env
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3003
```

### Components to Update

Choose based on your needs:

- [ ] **Product Detail Page** - Real-time stock/price updates
- [ ] **Product List/Shop** - Bulk product updates
- [ ] **Cart Context** - Cart item updates
- [ ] **Wishlist Context** - Wishlist item updates
- [ ] **Search Results** - Search result updates
- [ ] **Related Products** - Related product updates

## Testing

### 1. Start All Services

```bash
# Terminal 1: WebSocket Gateway
cd websocket-gateway && npm run dev

# Terminal 2: Event Bus
cd event-bus && npm run dev

# Terminal 3: Main Server
cd old-main-server && npm run dev

# Terminal 4: Storefront
cd storefront && npm run dev
```

### 2. Test Connection

1. Open product detail page: `http://localhost:3009/product-detail/[slug]`
2. Open browser console
3. Look for log messages:
   ```
   [WebSocket] Connected
   [WebSocket] Subscribed to product: <productId>
   ```

### 3. Trigger Update

Complete an order via Paystack or use admin panel to update product. You should see:

```
[WebSocket] Received batched update for product: <productId>
```

Then observe the product data update without page refresh.

### 4. Test Reconnection

1. Stop websocket-gateway service
2. Wait for disconnect message
3. Restart websocket-gateway
4. Should auto-reconnect and resubscribe

## Performance Tips

### Debounce Times

- **Product Detail:** 1000ms (default)
- **Cart:** 500ms (faster updates)
- **Product Lists:** 1500ms (slower, less critical)
- **Search Results:** 2000ms (least critical)

### Subscription Management

- Only subscribe to **visible products** (use Intersection Observer)
- Unsubscribe when **component unmounts**
- Use **conditional enabled** prop for conditional subscriptions

### Query Keys

The hook automatically invalidates these query keys:

```typescript
['product', productId]  // Single product
['products']            // Product lists
```

Make sure your TanStack Query hooks use these keys:

```typescript
// Good ✅
useQuery({ queryKey: ['product', productId], ... });
useQuery({ queryKey: ['products', filters], ... });

// Bad ❌
useQuery({ queryKey: ['getProduct', productId], ... });
```

## Common Issues

### No Updates Received

1. **Check WebSocket connection:**
   - Look for `[WebSocket] Connected` in console
   - Verify `NEXT_PUBLIC_WEBSOCKET_URL` is correct

2. **Check subscription:**
   - Look for `[WebSocket] Subscribed to product: <id>` in console
   - Verify `productIds` array is not empty

3. **Check query keys:**
   - Ensure TanStack Query uses matching keys
   - Try manual invalidation: `queryClient.invalidateQueries({ queryKey: ['product', id] })`

### Connection Keeps Disconnecting

1. Check CORS configuration in `websocket-gateway/src/index.ts`
2. Verify `FRONTEND_URL` in gateway `.env`
3. Check for network issues or proxy interference

### Updates Too Slow/Fast

1. Adjust `debounceMs` in `useProductSocket` options
2. Check `BATCH_WINDOW_MS` in gateway `.env`
3. Consider using different debounce times for different components

## Next Steps

1. **Add to Product Detail Page** - Start here for immediate value
2. **Add to Cart Context** - Keep cart items in sync
3. **Add to Product Lists** - Bulk updates for shop pages
4. **Monitor Performance** - Check `/health` endpoint
5. **Add UI Indicators** - Show users live connection status

## Support

For issues or questions:

1. Check `WEBSOCKET_IMPLEMENTATION.md` for detailed documentation
2. Review console logs for connection/subscription messages
3. Test `/health` endpoint: `curl http://localhost:3003/health`
4. Verify all services are running on correct ports

---

**Remember:** The WebSocket hook works seamlessly with TanStack Query - you don't need to manually refetch data. Just use the hook and your queries will automatically update! 🚀
