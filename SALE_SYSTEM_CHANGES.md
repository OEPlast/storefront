# Sale System Changes - Migration to maxBuys/boughtCount Logic

## Overview

The product sold/available calculation has been updated to use the sale system's `maxBuys` and `boughtCount` fields instead of `originStock`. This provides a more accurate representation of sale capacity and progress.

## Changes Summary

### 1. **Migration Script Updated** (`old-main-server/scripts/migrate-origin-stock.ts`)

The migration script now performs two operations:

#### Step 1: Set originStock for all products
- Updates all products to have `originStock = current stock`
- This field is kept for backend/admin purposes

#### Step 2: Populate boughtCount for sale variants
- Updates all active sales with realistic boughtCount values
- Distribution:
  - **10% of sales**: 90% of maxBuys (high-selling products)
  - **40% of sales**: 50% of maxBuys (moderate selling)
  - **50% of sales**: 10% of maxBuys (new/slow-selling)

**Run the migration:**
```bash
cd old-main-server
npx ts-node scripts/migrate-origin-stock.ts
```

**Expected Output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Found X products to update

🔄 Starting migration...
  ✓ Processed X/X products...

📈 Migration Summary:
  ✅ Successfully updated: X products
  ❌ Failed: 0 products

================================================================================
🎯 Step 2: Populating boughtCount for sale variants

📊 Found Y sales with variants to update

🔄 Starting sales migration...
  ✓ Processed Y/Y sales...

📈 Sales Migration Summary:
  ✅ Successfully updated: Y sales
  ❌ Failed: 0 sales

📋 Sample of updated sales:
  - Sale Name: 45/100 bought (45%)
  - Sale Name: 90/100 bought (90%)
  ...

✨ All migrations completed successfully!
```

---

### 2. **Utility Functions Added** (`storefront/src/utils/calculateSale.ts`)

Added four new utility functions for sale calculations:

#### `calculateTotalCapacity(sale)`
- Calculates sum of all `maxBuys` across variants
- Returns total capacity for the sale

#### `calculateAvailableFromSale(sale)`
- Calculates sum of `(maxBuys - boughtCount)` for all variants
- Returns total available quantity across all variants

#### `calculateSaleProgress(sale)`
- Calculates percentage: `(totalBoughtCount / totalMaxBuys) * 100`
- Returns progress percentage (0-100)

#### Existing Functions
- `calculateSoldFromSale(sale)` - Still used, sums all boughtCount values
- `calculateBestSale(sale, price)` - Still used for discount calculation
- `formatPrice(price)` - Still used for price formatting

**Example Usage:**
```typescript
const sale = {
  variants: [
    { maxBuys: 100, boughtCount: 45 },
    { maxBuys: 50, boughtCount: 30 },
    { maxBuys: 75, boughtCount: 15 }
  ]
};

calculateSoldFromSale(sale);        // 90 (45 + 30 + 15)
calculateTotalCapacity(sale);       // 225 (100 + 50 + 75)
calculateAvailableFromSale(sale);   // 135 (55 + 20 + 60)
calculateSaleProgress(sale);        // 40 (90 / 225 * 100)
```

---

### 3. **Product Component Updated** (`storefront/src/components/Product/Product.tsx`)

Changed the sold/available calculation logic:

#### Before (originStock-based):
```typescript
const soldQuantity = calculateSoldFromSale(data.sale);
const availableStock = data.stock || 0;
const percentSold = Math.floor((soldQuantity / data.originStock) * 100);
```

#### After (maxBuys/boughtCount-based):
```typescript
const soldQuantity = calculateSoldFromSale(data.sale);           // Sum of boughtCount
const availableStock = calculateAvailableFromSale(data.sale);    // Sum of (maxBuys - boughtCount)
const percentSold = calculateSaleProgress(data.sale);            // (sold / totalMaxBuys) * 100
```

**Key Changes:**
- **Sold**: Still uses sum of `boughtCount` from all variants
- **Available**: Now calculated as sum of `(maxBuys - boughtCount)` instead of current stock
- **Progress**: Now based on sale capacity (maxBuys) instead of originStock

---

## Visual Impact

### Product Card Display

The product card's sold/available section now reflects sale capacity:

```
Progress Bar: [████████░░] 80%

Sold: 80        (sum of all variant.boughtCount)
Available: 20   (sum of all variant.maxBuys - variant.boughtCount)
```

**Example with Multiple Variants:**

Sale with 3 variants:
- Variant 1: maxBuys=100, boughtCount=90 → 10 available
- Variant 2: maxBuys=50, boughtCount=45 → 5 available
- Variant 3: maxBuys=75, boughtCount=60 → 15 available

Display will show:
- **Sold**: 195 (90 + 45 + 60)
- **Available**: 30 (10 + 5 + 15)
- **Progress**: 86% (195 / 225 * 100)

---

## Backend Considerations

### originStock Still Maintained

The `originStock` field is **still kept** in the backend and admin for:
- Historical tracking of initial inventory
- Admin analytics and reporting
- Potential future features (restock calculations, etc.)

### No Changes to Admin

The admin client (`oep-web-admin`) continues to work with `originStock` as before:
- Product creation sets `originStock = stock`
- Product updates can modify `originStock` when stock changes
- All admin operations remain unchanged

---

## Testing the Changes

### 1. Run the Migration Script
```bash
cd old-main-server
npx ts-node scripts/migrate-origin-stock.ts
```

### 2. Verify Database
```javascript
// Check products have originStock
db.products.findOne({}, { name: 1, stock: 1, originStock: 1 })

// Check sales have boughtCount
db.sales.findOne({ variants: { $exists: true } }, { title: 1, variants: 1 })
```

### 3. Test Frontend Display
1. Navigate to product listing pages
2. Verify progress bars show correct percentages
3. Check sold/available numbers match sale variants
4. Confirm products with multiple variants sum correctly

### 4. Test Edge Cases
- Products with no sales (should show 0% progress)
- Sales with maxBuys = 0 (should show 0% progress)
- Sales where all variants are sold out (should show 100%)

---

## Rollback Plan

If issues arise, you can revert to originStock-based calculations:

### Revert Product.tsx
```typescript
// Change back to:
const availableStock = data.stock || 0;
const percentSold = useMemo(() => {
    if (!data.originStock || data.originStock === 0) return 0;
    return Math.floor((soldQuantity / data.originStock) * 100);
}, [soldQuantity, data.originStock]);
```

### Remove New Imports
```typescript
// Remove these from imports:
calculateAvailableFromSale,
calculateSaleProgress
```

---

## Benefits of New System

1. **More Accurate**: Reflects actual sale capacity instead of total inventory
2. **Better UX**: Shows progress towards sale goals
3. **Multi-Variant Support**: Correctly aggregates across all sale variants
4. **Independent**: Sales progress independent of overall stock levels
5. **Marketing**: Can set aggressive maxBuys for high-demand items

---

## Important Notes

- ✅ originStock is **kept** in backend (no removal)
- ✅ Admin operations unchanged
- ✅ Only frontend display logic changed
- ✅ Migration script is **idempotent** (safe to run multiple times)
- ✅ All existing utilities still work (`calculateSoldFromSale`, `formatPrice`, etc.)

---

## Next Steps

1. ✅ Run migration script on development database
2. ✅ Test frontend display with migrated data
3. ✅ Verify edge cases (no sales, zero maxBuys, etc.)
4. ✅ Run migration script on staging database
5. ✅ Deploy frontend changes
6. ✅ Run migration script on production database
7. ✅ Monitor for issues

---

## Questions?

- **Q: What if a product has no sale?**
  - A: Display will show 0% progress, 0 sold, 0 available (gracefully handled)

- **Q: What if maxBuys is 0?**
  - A: Display will show 0% progress (division by zero is handled)

- **Q: What about products not on sale?**
  - A: They won't show the progress bar (only products with active sales show it)

- **Q: Can we still use originStock for other purposes?**
  - A: Yes! It's still in the database and available for admin analytics

- **Q: Is the migration script safe to run multiple times?**
  - A: Yes, it only updates products/sales that need updating
