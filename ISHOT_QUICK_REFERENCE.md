# Quick Reference - isHot Field

## What is isHot?

A boolean field on Sales that controls whether to show promotional UI elements on product cards:
- **Hot Sale marquee banner** (black scrolling banner with "HOT SALE X% OFF")
- **Sold/Available progress bar** (red progress bar with sold count)

---

## Display Logic

```
Show marquee & progress IF:
  ✅ sale.isActive === true
  ✅ sale.isHot === true
  ✅ totalBoughtCount < totalMaxBuys (not sold out)

Hide both IF:
  ❌ sale.isActive === false
  ❌ sale.isHot === false
  ❌ totalBoughtCount >= totalMaxBuys (sold out)
```

---

## Setting isHot in Admin

### Create New Sale
1. Go to **Ecommerce > Sales > Create**
2. Fill in sale details
3. Toggle **"Hot Sale"** switch
   - **Enabled** = Show marquee & progress
   - **Disabled** = Normal display (no special UI)
4. Click **Create Sale**

### Edit Existing Sale
1. Go to **Ecommerce > Sales**
2. Find the sale in table (🔥 Hot badge = isHot: true)
3. Click **Edit** icon
4. Toggle **"Hot Sale"** switch
5. Click **Update Sale**

---

## Backend API

### Create Sale
```json
POST /api/sales
{
  "title": "Flash Summer Sale",
  "product": "664fdf8a24fbb2a2c03eabe0",
  "type": "Flash",
  "isActive": true,
  "isHot": true,
  "variants": [...]
}
```

### Update isHot
```json
PATCH /api/sales/:id
{
  "isHot": true
}
```

### Response includes isHot
```json
{
  "_id": "...",
  "title": "Flash Summer Sale",
  "isActive": true,
  "isHot": true,
  "type": "Flash",
  "variants": [...]
}
```

---

## Database Migration

### Run Migration Script
```bash
cd old-main-server
npx ts-node scripts/migrate-isHot.ts
```

### Manual Update (MongoDB Shell)
```javascript
// Set all Flash sales as hot
db.sales.updateMany(
  { type: 'Flash' },
  { $set: { isHot: true } }
)

// Set specific sale as hot
db.sales.updateOne(
  { _id: ObjectId('...') },
  { $set: { isHot: true } }
)

// Check hot sales
db.sales.find({ isHot: true }).count()
```

---

## Utility Functions (Storefront)

### Check if should show marquee
```typescript
import { shouldShowSaleMarquee } from '@/utils/calculateSale';

const showMarquee = shouldShowSaleMarquee(product.sale);
// Returns true only if: isActive + isHot + not sold out
```

### Check if should show progress
```typescript
import { shouldShowSaleProgress } from '@/utils/calculateSale';

const showProgress = shouldShowSaleProgress(product.sale);
// Same logic as marquee
```

### Check if sold out
```typescript
import { isSaleSoldOut } from '@/utils/calculateSale';

const soldOut = isSaleSoldOut(product.sale);
// Returns true if totalBoughtCount >= totalMaxBuys
```

---

## Testing

### Test Cases

| isActive | isHot | Sold Out | Marquee | Progress |
|----------|-------|----------|---------|----------|
| false    | false | false    | ❌      | ❌       |
| false    | true  | false    | ❌      | ❌       |
| true     | false | false    | ❌      | ❌       |
| true     | true  | false    | ✅      | ✅       |
| true     | true  | true     | ❌      | ❌       |

### Manual Test
1. Create a sale with `isHot: true`
2. Go to product page on storefront
3. Verify:
   - Black marquee banner appears
   - "HOT SALE X% OFF" text scrolls
   - Progress bar shows sold/available
4. Set all variants to sold out (boughtCount = maxBuys)
5. Refresh page
6. Verify:
   - Marquee disappears
   - Progress bar disappears

---

## Troubleshooting

### Marquee not showing?
- Check `sale.isActive` = true
- Check `sale.isHot` = true
- Check sale not sold out
- Check browser console for errors

### Progress bar not showing?
- Same conditions as marquee
- Check `variants` array has items
- Check `maxBuys > 0` for at least one variant

### isHot toggle not working in admin?
- Check `create-sale.schema.ts` has isHot field
- Check form component imports Switch
- Check default values include isHot: false

### Database has no isHot field?
- Run migration script: `npx ts-node scripts/migrate-isHot.ts`
- Or manually add: `db.sales.updateMany({}, { $set: { isHot: false } })`

---

## Best Practices

1. **Use isHot sparingly** - Too many "hot" sales reduce effectiveness
2. **Flash sales should be hot** - Time-sensitive sales benefit from prominent display
3. **Monitor performance** - Track conversion rates for hot vs normal sales
4. **Update regularly** - Disable isHot when sale performance drops
5. **Test on mobile** - Verify marquee and progress bar are responsive

---

## Summary

✅ **Field**: `isHot: boolean` on Sales model  
✅ **Default**: `false` (normal display)  
✅ **Purpose**: Control marquee banner and progress bar visibility  
✅ **Auto-hide**: When sale is sold out (boughtCount >= maxBuys)  
✅ **Admin**: Toggle switch in create/edit forms  
✅ **Migration**: Script available to update existing sales  

**Use isHot to highlight your best-performing or time-sensitive sales!** 🔥
