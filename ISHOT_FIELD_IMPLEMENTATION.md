# isHot Field Implementation - Complete Guide

## Overview

Added a new `isHot` boolean field to the Sales model that controls the display of "Hot Sale" marketing elements on the storefront:
- **Hot Sale Marquee Banner** - Black scrolling banner with lightning icons
- **Sold/Available Progress Section** - Shows sale progress with a red progress bar

Additionally, these elements are automatically hidden when a sale is sold out (total boughtCount >= total maxBuys).

---

## Changes Summary

### 1. **Backend - Database Model** ✅

**File**: `old-main-server/src/models/Sales.ts`

**Change**: Added `isHot` field to Sales schema

```typescript
isHot: {
  type: Boolean,
  default: false,
},
```

**Location**: After `isActive` field

**Impact**: 
- New sales will have `isHot: false` by default
- Existing sales will need migration (see Migration section)
- Field is automatically included in all API responses via MongoDB aggregation

---

### 2. **Storefront - Type Definitions** ✅

**File**: `storefront/src/types/product.ts`

**Change**: Added `isHot` to ProductSale interface

```typescript
export interface ProductSale {
  _id: string;
  product: string;
  title?: string;
  isActive: boolean;
  isHot: boolean;  // ← NEW
  type: 'Flash' | 'Limited' | 'Normal';
  campaign?: string;
  startDate?: string;
  endDate?: string;
  variants: SaleVariant[];
}
```

---

### 3. **Storefront - Utility Functions** ✅

**File**: `storefront/src/utils/calculateSale.ts`

**New Functions Added**:

#### `isSaleSoldOut(sale)`
Checks if total boughtCount >= total maxBuys

```typescript
const soldOut = isSaleSoldOut(data.sale);
// Returns true if capacity is reached
```

#### `shouldShowSaleMarquee(sale)`
Determines if the "Hot Sale" marquee should be displayed

**Conditions**:
- `sale.isActive` must be `true`
- `sale.isHot` must be `true`
- Sale must NOT be sold out

```typescript
const showMarquee = shouldShowSaleMarquee(data.sale);
// Only shows if isActive && isHot && !soldOut
```

#### `shouldShowSaleProgress(sale)`
Determines if the sold/available progress bar should be displayed

**Conditions**: Same as marquee (isActive + isHot + not sold out)

```typescript
const showProgress = shouldShowSaleProgress(data.sale);
```

---

### 4. **Storefront - Product Component** ✅

**File**: `storefront/src/components/Product/Product.tsx`

**Changes**:

#### Imports
```typescript
import { 
    calculateBestSale, 
    formatPrice, 
    calculateSoldFromSale,
    calculateAvailableFromSale,
    calculateSaleProgress,
    shouldShowSaleMarquee,    // ← NEW
    shouldShowSaleProgress    // ← NEW
} from '@/utils/calculateSale'
```

#### New useMemo calculations
```typescript
// Check if should show sale marquee (isHot = true and not sold out)
const showSaleMarquee = useMemo(() => {
    return shouldShowSaleMarquee(data.sale);
}, [data.sale]);

// Check if should show sold/available progress (isHot = true and not sold out)
const showSaleProgress = useMemo(() => {
    return shouldShowSaleProgress(data.sale);
}, [data.sale]);
```

#### Conditional Rendering Updates

**Before**:
```typescript
{saleInfo.hasActiveSale && (
    <Marquee>...</Marquee>
)}
```

**After**:
```typescript
{showSaleMarquee && (
    <Marquee>...</Marquee>
)}
```

**Before**:
```typescript
<div className="product-sold sm:pb-4 pb-2">
    <div className="progress">...</div>
</div>
```

**After**:
```typescript
{showSaleProgress && (
    <div className="product-sold sm:pb-4 pb-2">
        <div className="progress">...</div>
    </div>
)}
```

---

### 5. **Admin Dashboard - Schema Validation** ✅

**File**: `oep-web-admin/apps/isomorphic/src/validators/create-sale.schema.ts`

**Change**: Added `isHot` field to Zod schema

```typescript
export const createSalesSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }),
  product: z.string().min(1, { message: 'Product is required.' }),
  isActive: z.boolean().default(true).optional(),
  isHot: z.boolean().default(false).optional(),  // ← NEW
  // ... rest of fields
})
```

---

### 6. **Admin Dashboard - Form UI** ✅

**File**: `oep-web-admin/apps/isomorphic/src/app/shared/ecommerce/sales/components/SaleInfoForm.tsx`

**Changes**:

#### Import Switch component
```typescript
import { Button, Drawer, Input, Select, Text, Loader, Switch } from 'rizzui';
```

#### New isHot toggle control
```typescript
<Controller
  name="isHot"
  control={control}
  render={({ field }) => (
    <div className="mb-3">
      <label className="mb-2 block text-sm font-medium">
        Hot Sale
        <Text className="text-xs font-normal text-gray-500 mt-1">
          Show "Hot Sale" marquee banner and sold/available progress on product cards
        </Text>
      </label>
      <Switch
        checked={field.value}
        onChange={field.onChange}
        label={field.value ? 'Enabled' : 'Disabled'}
      />
    </div>
  )}
/>
```

**Location**: After the "Type" selector field

---

### 7. **Admin Dashboard - Default Values** ✅

**Files**: 
- `oep-web-admin/apps/isomorphic/src/app/shared/ecommerce/sales/create-sales.tsx`
- `oep-web-admin/apps/isomorphic/src/app/shared/ecommerce/sales/edit-sales.tsx`

**Change**: Added `isHot: false` to default values

```typescript
const initialDefaultValues: CreateSalesInput = {
  title: '',
  type: 'Normal',
  product: '',
  campaign: '',
  limit: 0,
  deleted: false,
  isHot: false,  // ← NEW
  startDate: new Date(),
  endDate: new Date(),
  variants: [...]
};
```

---

### 8. **Admin Dashboard - Table Display** ✅

**File**: `oep-web-admin/apps/isomorphic/src/app/shared/ecommerce/sales/columns.tsx`

**Change**: Added "Hot Sale" column to sales table

```typescript
columnHelper.display({
  id: 'isHot',
  size: 80,
  header: 'Hot Sale',
  cell: ({ row }) => (
    <Badge
      variant="flat"
      color={row.original.isHot ? 'danger' : 'secondary'}
      className="font-medium"
    >
      {row.original.isHot ? '🔥 Hot' : 'Normal'}
    </Badge>
  ),
}),
```

**Location**: After the "Status" column

**Display**:
- **🔥 Hot** (red badge) - When `isHot: true`
- **Normal** (gray badge) - When `isHot: false`

---

### 9. **Admin Dashboard - Type Definitions** ✅

**File**: `oep-web-admin/apps/isomorphic/src/types/sales.ts`

**Changes**: Added `isHot` to all sale-related interfaces

```typescript
export interface Sale {
  _id: string;
  title: string;
  type: SaleType;
  isActive: boolean;
  isHot: boolean;  // ← NEW
  // ... rest of fields
}

export interface CreateSaleInput {
  title?: string;
  product: string;
  type?: SaleType;
  isActive?: boolean;
  isHot?: boolean;  // ← NEW
  // ... rest of fields
}

export interface UpdateSaleInput {
  title?: string;
  product?: string;
  type?: SaleType;
  isActive?: boolean;
  isHot?: boolean;  // ← NEW
  // ... rest of fields
}
```

---

## Visual Impact

### Before (isHot = false or sale sold out)

```
┌─────────────────────────────────────────────┐
│                                             │
│            [Product Image]                  │
│                                             │
│                                             │
└─────────────────────────────────────────────┘

Product Name
$99.99
```

**No marquee banner, no progress bar**

---

### After (isHot = true and not sold out)

```
┌─────────────────────────────────────────────┐
│                                             │
│            [Product Image]                  │
│                                             │
│ HOT SALE 19% OFF 🔥 HOT SALE 19% OFF 🔥   │ ← Marquee
└─────────────────────────────────────────────┘

[████████░░] 80%                              ← Progress bar
Sold: 80        Available: 20

Product Name
$80.99 ~~$99.99~~ -19%
```

**Marquee + progress bar shown**

---

## Logic Flow

```
Product Component Render
         │
         ▼
┌────────────────────────────────────────┐
│ Check sale conditions:                  │
│  1. Is sale.isActive?                  │
│  2. Is sale.isHot?                     │
│  3. Is totalBought < totalMaxBuys?     │
└────────────────────────────────────────┘
         │
         ▼
    All conditions met?
         │
    ┌────┴────┐
   YES       NO
    │         │
    ▼         ▼
Show     Hide both
both     elements
elements
```

### Conditions Breakdown

| Condition | Marquee | Progress | Reason |
|-----------|---------|----------|--------|
| `isActive: false` | ❌ | ❌ | Sale inactive |
| `isHot: false` | ❌ | ❌ | Not marked as hot |
| `isActive: true, isHot: false` | ❌ | ❌ | Not hot |
| `isActive: true, isHot: true, soldOut: true` | ❌ | ❌ | Sold out |
| `isActive: true, isHot: true, soldOut: false` | ✅ | ✅ | All good! |

---

## Database Migration

### Option 1: Set all existing sales to isHot: false (safe default)

```javascript
// MongoDB Shell or migration script
db.sales.updateMany(
  { isHot: { $exists: false } },
  { $set: { isHot: false } }
)
```

### Option 2: Set active sales to isHot: true (aggressive marketing)

```javascript
db.sales.updateMany(
  { 
    isActive: true,
    deleted: { $ne: true },
    isHot: { $exists: false }
  },
  { $set: { isHot: true } }
)
```

### Option 3: Set based on sale type (Flash = hot, others = normal)

```javascript
// Mark Flash sales as hot
db.sales.updateMany(
  { 
    type: 'Flash',
    isActive: true,
    isHot: { $exists: false }
  },
  { $set: { isHot: true } }
)

// Mark other types as normal
db.sales.updateMany(
  { 
    type: { $in: ['Limited', 'Normal'] },
    isHot: { $exists: false }
  },
  { $set: { isHot: false } }
)
```

### Recommended Migration Script

**File**: `old-main-server/scripts/migrate-isHot.ts`

```typescript
import mongoose from 'mongoose';
import Sales from '../src/models/Sales';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/oeplast';

async function migrateIsHot() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Count sales without isHot field
    const salesNeedingUpdate = await Sales.countDocuments({
      isHot: { $exists: false }
    });

    console.log(`📊 Found ${salesNeedingUpdate} sales to update\n`);

    if (salesNeedingUpdate === 0) {
      console.log('✨ All sales already have isHot field!');
      return;
    }

    // Strategy: Flash sales = hot, others = normal
    const flashResult = await Sales.updateMany(
      { 
        type: 'Flash',
        isHot: { $exists: false }
      },
      { $set: { isHot: true } }
    );

    const otherResult = await Sales.updateMany(
      { 
        type: { $in: ['Limited', 'Normal'] },
        isHot: { $exists: false }
      },
      { $set: { isHot: false } }
    );

    console.log('📈 Migration Summary:');
    console.log(`  ✅ Flash sales marked as hot: ${flashResult.modifiedCount}`);
    console.log(`  ✅ Other sales marked as normal: ${otherResult.modifiedCount}`);

    // Verify
    const remaining = await Sales.countDocuments({
      isHot: { $exists: false }
    });

    if (remaining === 0) {
      console.log('\n✅ All sales now have isHot field!');
    } else {
      console.log(`\n⚠️  Warning: ${remaining} sales still missing isHot`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
if (require.main === module) {
  migrateIsHot()
    .then(() => {
      console.log('\n✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export default migrateIsHot;
```

**Run it**:
```bash
cd old-main-server
npx ts-node scripts/migrate-isHot.ts
```

---

## Testing Checklist

### Backend
- [ ] Sales model includes `isHot` field
- [ ] API responses include `isHot` in sale objects
- [ ] Create sale with `isHot: true` works
- [ ] Update sale's `isHot` field works
- [ ] Migration script runs successfully

### Admin Dashboard
- [ ] Sales table shows "Hot Sale" column
- [ ] Create sale form has isHot toggle
- [ ] Edit sale form loads isHot value correctly
- [ ] isHot toggle works (switches on/off)
- [ ] Form validation passes with isHot field
- [ ] Creating sale with isHot: true works
- [ ] Updating isHot field works

### Storefront
- [ ] Products with `isHot: true` show marquee banner
- [ ] Products with `isHot: true` show progress bar
- [ ] Products with `isHot: false` hide both elements
- [ ] Sold-out sales hide both elements (even if isHot: true)
- [ ] Progress bar shows correct percentage
- [ ] Marquee animates smoothly
- [ ] Mobile responsive display works

### Edge Cases
- [ ] Sale with no variants (should hide elements)
- [ ] Sale with maxBuys = 0 (unlimited, show elements)
- [ ] Sale just reached sold-out status (should hide)
- [ ] isActive: false hides elements regardless of isHot
- [ ] Inactive sale with isHot: true doesn't show elements

---

## API Impact

### Backend API Responses

All sale objects now include the `isHot` field:

```json
{
  "_id": "664fdf8a24fbb2a2c03eabe0",
  "title": "Summer Flash Sale",
  "product": "...",
  "isActive": true,
  "isHot": true,
  "type": "Flash",
  "variants": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### No Breaking Changes

- Existing API endpoints work without modification
- MongoDB aggregation automatically includes new field
- Frontend gracefully handles missing `isHot` (treats as false)

---

## Rollback Plan

If you need to revert:

### 1. Revert Backend Model
```bash
cd old-main-server
git checkout src/models/Sales.ts
```

### 2. Revert Frontend Types
```bash
cd storefront
git checkout src/types/product.ts
git checkout src/utils/calculateSale.ts
git checkout src/components/Product/Product.tsx
```

### 3. Revert Admin Dashboard
```bash
cd oep-web-admin
git checkout apps/isomorphic/src/validators/create-sale.schema.ts
git checkout apps/isomorphic/src/app/shared/ecommerce/sales/
git checkout apps/isomorphic/src/types/sales.ts
```

### 4. Remove Field from Database (optional)
```javascript
db.sales.updateMany({}, { $unset: { isHot: "" } })
```

---

## Future Enhancements

1. **Automatic isHot based on performance**
   - Set isHot: true if sale reaches 50% sold in first 24 hours

2. **Hot Sale Analytics**
   - Track conversion rates for hot vs normal sales
   - Dashboard showing hot sales performance

3. **Dynamic marquee messages**
   - Custom message per sale instead of generic "Hot Sale"
   - Support for multiple languages

4. **Scheduled isHot toggling**
   - Auto-enable isHot during peak hours
   - Auto-disable after sale reaches certain threshold

---

## Summary

✅ **Backend**: Added `isHot` field to Sales model  
✅ **Storefront**: Conditional marquee and progress display  
✅ **Admin**: isHot toggle in forms, column in table  
✅ **Logic**: Auto-hide when sold out  
✅ **Types**: Updated across all projects  
✅ **Migration**: Script ready to run  

**Result**: Sales can now be marked as "hot" to show prominent marketing elements, with automatic handling of sold-out states!
