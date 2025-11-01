# Pack Sizes Integration Guide - Storefront

## Overview

The `PackSizeSelector` component allows customers to choose how they want to purchase a product (e.g., Single, Bag of 10, Carton of 50). It automatically handles pricing calculations, stock management, and attribute availability control.

## Component Location

```
storefront/src/components/Product/PackSizeSelector.tsx
```

## Integration Example

### Step 1: Import the Component

```tsx
import PackSizeSelector from '@/components/Product/PackSizeSelector';
import { ProductPackSize } from '@/types/product';
```

### Step 2: Add State for Pack Selection

```tsx
const [selectedPack, setSelectedPack] = useState<ProductPackSize | null>(null);
const [effectivePrice, setEffectivePrice] = useState<number>(productMain.price);
const [effectiveStock, setEffectiveStock] = useState<number>(productMain.stock);
const [canSelectAttributes, setCanSelectAttributes] = useState<boolean>(true);
```

### Step 3: Add Pack Change Handler

```tsx
const handlePackChange = (
  pack: ProductPackSize | null,
  price: number,
  stock: number
) => {
  setSelectedPack(pack);
  setEffectivePrice(price);
  setEffectiveStock(stock);
  setCanSelectAttributes(pack?.enableAttributes ?? true);
  
  // Reset attribute selections if pack doesn't allow attributes
  if (pack && !pack.enableAttributes) {
    setActiveColor('');
    setActiveSize('');
  }
};
```

### Step 4: Add PackSizeSelector to Render (Before Color/Size Selection)

```tsx
<div className="list-action mt-6">
  {/* Pack Size Selector - NEW */}
  {productMain.packSizes && productMain.packSizes.length > 0 && (
    <div className="choose-pack-size mb-6">
      <PackSizeSelector
        packSizes={productMain.packSizes}
        basePrice={productMain.price}
        baseStock={productMain.stock}
        onPackChange={handlePackChange}
      />
    </div>
  )}

  {/* Color Selection - Conditional on canSelectAttributes */}
  {canSelectAttributes && productMain.variation && productMain.variation.length > 0 && (
    <div className="choose-color">
      <div className="text-title">Colors: <span className='text-title color'>{activeColor}</span></div>
      <div className="list-color flex items-center gap-2 flex-wrap mt-3">
        {/* Color selection UI */}
      </div>
    </div>
  )}

  {/* Size Selection - Conditional on canSelectAttributes */}
  {canSelectAttributes && productMain.sizes && productMain.sizes.length > 0 && (
    <div className="choose-size mt-5">
      <div className="text-title">Size: <span className='text-title size'>{activeSize}</span></div>
      <div className="list-size flex items-center gap-2 flex-wrap mt-3">
        {/* Size selection UI */}
      </div>
    </div>
  )}

  {/* Quantity and Add to Cart */}
  <div className="text-title mt-5">Quantity:</div>
  {/* Rest of the code... */}
</div>
```

### Step 5: Update Price Display to Use effectivePrice

Replace `productMain.price` with `effectivePrice`:

```tsx
<div className="product-price heading5">${effectivePrice.toFixed(2)}</div>
```

### Step 6: Update Add to Cart to Include Pack Info

```tsx
const handleAddToCart = () => {
  const cartItem = {
    ...productMain,
    price: effectivePrice, // Use effective price
    selectedPack: selectedPack, // Include selected pack
    // Only include attributes if pack allows them
    ...(canSelectAttributes && {
      selectedColor: activeColor,
      selectedSize: activeSize,
    }),
  };

  if (!cartState.cartArray.find(item => item.id === productMain.id)) {
    addToCart(cartItem);
  } else {
    updateCart(productMain.id, productMain.quantityPurchase, activeSize, activeColor, selectedPack);
  }
  openModalCart();
};
```

## Complete Integration Example

Here's a minimal example showing all changes together:

```tsx
'use client'

import React, { useState } from 'react'
import PackSizeSelector from '@/components/Product/PackSizeSelector';
import { ProductPackSize } from '@/types/product';

const ProductDetail = ({ productMain }) => {
  // Existing state
  const [activeColor, setActiveColor] = useState<string>('')
  const [activeSize, setActiveSize] = useState<string>('')

  // NEW: Pack size state
  const [selectedPack, setSelectedPack] = useState<ProductPackSize | null>(null);
  const [effectivePrice, setEffectivePrice] = useState<number>(productMain.price);
  const [effectiveStock, setEffectiveStock] = useState<number>(productMain.stock);
  const [canSelectAttributes, setCanSelectAttributes] = useState<boolean>(true);

  // NEW: Pack change handler
  const handlePackChange = (
    pack: ProductPackSize | null,
    price: number,
    stock: number
  ) => {
    setSelectedPack(pack);
    setEffectivePrice(price);
    setEffectiveStock(stock);
    setCanSelectAttributes(pack?.enableAttributes ?? true);
    
    // Reset attributes if pack doesn't allow them
    if (pack && !pack.enableAttributes) {
      setActiveColor('');
      setActiveSize('');
    }
  };

  return (
    <div className="product-detail">
      {/* Product info... */}
      
      {/* UPDATED: Price display */}
      <div className="product-price heading5">${effectivePrice.toFixed(2)}</div>

      <div className="list-action mt-6">
        {/* NEW: Pack Size Selector */}
        {productMain.packSizes && productMain.packSizes.length > 0 && (
          <div className="choose-pack-size mb-6">
            <PackSizeSelector
              packSizes={productMain.packSizes}
              basePrice={productMain.price}
              baseStock={productMain.stock}
              onPackChange={handlePackChange}
            />
          </div>
        )}

        {/* UPDATED: Conditional color selection */}
        {canSelectAttributes && productMain.variation && (
          <div className="choose-color">
            {/* Color UI */}
          </div>
        )}

        {/* UPDATED: Conditional size selection */}
        {canSelectAttributes && productMain.sizes && (
          <div className="choose-size mt-5">
            {/* Size UI */}
          </div>
        )}

        {/* Quantity & Add to Cart */}
      </div>
    </div>
  );
};

export default ProductDetail;
```

## Key Features

### 1. **Automatic Price Calculation**
- Uses custom pack price if provided
- Falls back to: `basePrice × pack.quantity`

### 2. **Stock Management**
- Uses custom pack stock if provided
- Falls back to base product stock
- Shows "Out of Stock" badge when stock is 0

### 3. **Attribute Control**
- `enableAttributes: true` → Shows color/size selectors
- `enableAttributes: false` → Hides selectors (pre-packaged items)

### 4. **Visual Feedback**
- Savings badge for discounted packs
- Low stock warnings
- Selected state indicator
- Unit price comparison

## Testing Checklist

- [ ] Pack selector appears when `packSizes` array exists
- [ ] No pack selector when `packSizes` is undefined/empty
- [ ] First pack auto-selected on mount
- [ ] Effective price updates when pack changes
- [ ] Effective stock updates when pack changes
- [ ] Color/size selectors hidden when `enableAttributes: false`
- [ ] Color/size selectors shown when `enableAttributes: true`
- [ ] Savings percentage calculated correctly
- [ ] Out of stock packs are disabled
- [ ] Unit price displayed for comparison
- [ ] Add to cart includes selected pack info

## Backend Data Example

Products with pack sizes from the API:

```json
{
  "_id": "product123",
  "name": "10L Plastic Keg",
  "price": 500,
  "stock": 1000,
  "packSizes": [
    {
      "label": "Single",
      "quantity": 1,
      "enableAttributes": true
    },
    {
      "label": "Bag of 10",
      "quantity": 10,
      "price": 4500,
      "stock": 50,
      "enableAttributes": false
    },
    {
      "label": "Carton of 50",
      "quantity": 50,
      "price": 20000,
      "stock": 10,
      "enableAttributes": false
    }
  ],
  "attributes": [
    { "name": "Color", "children": ["Red", "Blue"] }
  ]
}
```

## Files Modified

1. **Created**: `storefront/src/components/Product/PackSizeSelector.tsx`
2. **Updated**: `storefront/src/types/product.ts` (added ProductPackSize interface)
3. **To Update**: Product detail pages (Default.tsx, etc.)

## Notes

- Pack sizes are **optional** - products without them work as before
- Pack selector automatically handles all calculations
- Component is fully self-contained and reusable
- TypeScript types ensure type safety across the app
