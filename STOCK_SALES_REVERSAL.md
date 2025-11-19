# Stock Reversal and Sales Deduction Implementation

## Overview

This implementation adds comprehensive stock reversal and sales deduction/reversal functionality when orders are cancelled or payments fail.

## Components Created

### 1. Order Mutations Hook (`src/hooks/mutations/useOrderMutations.ts`)

Two mutation hooks for handling order lifecycle:

#### `useCancelOrder()`
- **Purpose**: Cancel an order with stock and sales reversal
- **API Endpoint**: `POST /myOrder/orders/${orderId}/cancel`
- **Request Body**: 
  ```typescript
  {
    reason?: string; // Optional cancellation reason
  }
  ```
- **Response**:
  ```typescript
  {
    success: boolean;
    message: string;
    order: OrderType;
    stockReversals: Array<{
      productId: string;
      productName: string;
      quantityReversed: number;
      newStock: number;
    }>;
    salesReversals: Array<{
      productId: string;
      productName: string;
      salesDeducted: number;
      totalSales: number;
    }>;
  }
  ```

#### `useHandlePaymentFailure()`
- **Purpose**: Handle payment failures with automatic stock/sales reversal
- **API Endpoint**: `POST /myOrder/orders/${orderId}/payment-failed`
- **Response**: Same structure as cancel order
- **Automatic Invalidation**: Refreshes all related product and order queries

### 2. Cancel Order Button Component (`src/components/Order/CancelOrderButton.tsx`)

User-facing component for order cancellation with:

- **Confirmation Modal**: Uses existing `ConfirmModal` component (no `window.confirm`)
- **Stock Reversal Details**: Shows what will be reversed
- **Sales Impact**: Explains sales deduction
- **Optional Reason**: Textarea for cancellation reason
- **Loading State**: Disabled button with spinner during cancellation
- **Success/Error Callbacks**: Customizable handlers

**Features**:
- ✅ Uses ConfirmModal (follows project guidelines - no browser dialogs)
- ✅ Clear explanation of what happens on cancel
- ✅ Loading states with visual feedback
- ✅ Automatic query invalidation for real-time updates
- ✅ Optional cancellation reason tracking

### 3. Integration in Order Detail Page

Updated `src/app/my-account/orders/[orderId]/Client.tsx`:
- Cancel button appears for orders with status: `Pending` or `Processing`
- Hidden for `Completed`, `Cancelled`, or `Failed` orders
- Positioned next to order status badge
- Triggers page refresh on successful cancellation

## Backend Requirements

The backend must implement these endpoints:

### 1. Cancel Order Endpoint
```
POST /myOrder/orders/:orderId/cancel
```

**Expected Backend Logic**:
1. Validate order exists and belongs to user
2. Check order status is cancellable (Pending/Processing)
3. For each product in order:
   - Reverse stock: `product.stock += orderProduct.qty`
   - Deduct sales: `product.sold -= orderProduct.qty`
4. Update order status to "Cancelled"
5. Process refund if payment was made
6. Return stock and sales reversal details

### 2. Payment Failure Endpoint
```
POST /myOrder/orders/:orderId/payment-failed
```

**Expected Backend Logic**:
1. Update order status to "Failed"
2. Reverse stock for all products
3. Deduct sales count
4. Log payment failure reason
5. Return reversal details

## Query Invalidation Strategy

When an order is cancelled or payment fails, the following queries are automatically invalidated:

### Order Queries
- `['order', orderId]` - Specific order details
- `['orders']` - User's order list
- `['order-statistics']` - Order statistics

### Product Queries
- `['product', productId]` - Each affected product
- `['products']` - Product listings
- `['top-sold']` - Top sold products (sales count changed)
- `['new-products']` - New product listings

This ensures the UI immediately reflects:
- ✅ Updated order status
- ✅ Reversed stock levels (products back in stock)
- ✅ Adjusted sales counts
- ✅ Updated top-sold rankings

## Usage Examples

### In Order Detail Page
```tsx
import CancelOrderButton from '@/components/Order/CancelOrderButton';

<CancelOrderButton
  orderId={order._id}
  orderNumber={order.orderNumber}
  onSuccess={() => {
    // Refresh page or show success message
    router.refresh();
  }}
  onError={(error) => {
    console.error('Cancel failed:', error);
    // Show error toast
  }}
/>
```

### Programmatic Cancellation
```tsx
import { useCancelOrder } from '@/hooks/mutations/useOrderMutations';

const cancelOrder = useCancelOrder();

const handleCancel = async () => {
  const result = await cancelOrder.mutateAsync({
    orderId: 'order123',
    reason: 'Customer changed mind',
  });
  
  console.log('Stock reversals:', result.stockReversals);
  console.log('Sales deductions:', result.salesReversals);
};
```

### Payment Failure Handling
```tsx
import { useHandlePaymentFailure } from '@/hooks/mutations/useOrderMutations';

const handleFailure = useHandlePaymentFailure();

const onPaymentFailed = async (orderId: string) => {
  const result = await handleFailure.mutateAsync(orderId);
  // Stock and sales automatically reversed
};
```

## Data Consistency

### Stock Reversal Formula
```
newStock = currentStock + orderedQuantity
```

### Sales Deduction Formula
```
newSales = currentSales - orderedQuantity
```

### Validation Rules
- Order must exist and belong to user
- Order status must be Pending or Processing
- Stock reversal cannot make stock negative
- Sales deduction cannot make sales count negative

## Error Handling

All mutations include:
- Try-catch blocks
- Console error logging
- Optional error callbacks
- Query invalidation even on partial success
- User-friendly error messages

## UI/UX Benefits

1. **No Browser Dialogs**: Uses custom ConfirmModal component
2. **Clear Messaging**: Users understand the impact of cancellation
3. **Real-time Updates**: Query invalidation ensures UI stays fresh
4. **Loading States**: Visual feedback during async operations
5. **Accessibility**: Proper ARIA attributes via ConfirmModal
6. **Optional Tracking**: Cancellation reasons for analytics

## Testing Checklist

- [ ] Cancel order successfully updates stock
- [ ] Sales count decreases correctly
- [ ] Order status changes to "Cancelled"
- [ ] UI refreshes after cancellation
- [ ] Payment failure triggers stock reversal
- [ ] Multiple products in order all reversed
- [ ] Cancelled orders cannot be cancelled again
- [ ] Completed orders cannot be cancelled
- [ ] Error handling works for failed requests
- [ ] Query invalidation updates all related data

## Future Enhancements

1. **Partial Cancellation**: Cancel individual items, not full order
2. **Cancellation Window**: Time limit for cancellations (e.g., 1 hour)
3. **Refund Tracking**: Link to refund status/progress
4. **Analytics**: Track cancellation reasons
5. **Email Notifications**: Send cancellation confirmation
6. **Inventory Alerts**: Notify if stock reaches reorder point after reversal
