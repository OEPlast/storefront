# Quick Start Guide - Sale System Migration

## Prerequisites

- Node.js installed
- MongoDB running
- Environment variable `MONGO_URI` set in `.env`

## Step-by-Step Instructions

### 1. Navigate to Server Directory
```bash
cd old-main-server
```

### 2. Check Environment Variables
Ensure your `.env` file has:
```env
MONGO_URI=mongodb://localhost:27017/oeplast
# or your production MongoDB connection string
```

### 3. Run the Migration Script
```bash
npx ts-node scripts/migrate-origin-stock.ts
```

### 4. Expected Output

You should see output like this:

```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📊 Found 150 products to update

🔄 Starting migration...
  ✓ Processed 100/150 products...
  ✓ Processed 150/150 products...

📈 Migration Summary:
  ✅ Successfully updated: 150 products
  ❌ Failed: 0 products

🔍 Verifying migration...
  ✅ All products now have originStock set!

📋 Sample of updated products:
  - Product Name 1: stock=45, originStock=100
  - Product Name 2: stock=30, originStock=50
  ...

✨ Origin stock migration completed successfully!

================================================================================
🎯 Step 2: Populating boughtCount for sale variants

📊 Found 75 sales with variants to update

🔄 Starting sales migration...
  ✓ Processed 50/75 sales...
  ✓ Processed 75/75 sales...

📈 Sales Migration Summary:
  ✅ Successfully updated: 75 sales
  ❌ Failed: 0 sales

📋 Sample of updated sales:
  - Flash Sale - Product A: 90/100 bought (90%)
  - Limited Offer - Product B: 25/50 bought (50%)
  - New Deal - Product C: 8/75 bought (10%)
  ...

✨ All migrations completed successfully!

🔌 Disconnected from MongoDB

✅ Script completed
```

### 5. Verify Changes in Database

**Check Products:**
```javascript
// MongoDB Shell
db.products.findOne(
  {}, 
  { name: 1, stock: 1, originStock: 1 }
)
```

**Check Sales:**
```javascript
// MongoDB Shell
db.sales.findOne(
  { variants: { $exists: true } }, 
  { title: 1, variants: 1 }
)

// Should show variants with boughtCount populated:
// {
//   title: "Flash Sale",
//   variants: [
//     { 
//       maxBuys: 100, 
//       boughtCount: 90,  // <-- Now populated!
//       discount: 20,
//       ...
//     }
//   ]
// }
```

### 6. Test Frontend

**Start the storefront:**
```bash
cd ../storefront
npm run dev
```

**Navigate to:** `http://localhost:3009`

**Check:**
- ✅ Product cards show progress bars
- ✅ Sold quantity shows cumulative boughtCount
- ✅ Available quantity shows remaining capacity
- ✅ Progress percentage is accurate (0-100%)

---

## Troubleshooting

### Issue: "Cannot find module 'dotenv'"
```bash
cd old-main-server
npm install dotenv
```

### Issue: "MONGO_URI is not defined"
Create or update `.env` file in `old-main-server`:
```env
MONGO_URI=mongodb://localhost:27017/oeplast
```

### Issue: "No products found to update"
This means all products already have `originStock` set. The script is idempotent and safe to run multiple times.

### Issue: "No sales found to update"
This means either:
- No sales exist in the database, OR
- All sales already have `boughtCount` populated

To re-run and update existing sales, modify the script to force update.

### Issue: Frontend shows 0% for all products
Check that:
1. Migration script ran successfully
2. Sale variants have `maxBuys > 0`
3. Products have active sales with `isActive: true`

---

## Rollback (If Needed)

If you need to rollback changes:

### Rollback boughtCount
```javascript
// MongoDB Shell - Reset all boughtCount to 0
db.sales.updateMany(
  {},
  { $set: { "variants.$[].boughtCount": 0 } }
)
```

### Rollback originStock
```javascript
// MongoDB Shell - Remove originStock field
db.products.updateMany(
  {},
  { $unset: { originStock: "" } }
)
```

### Rollback Frontend
```bash
cd storefront
git checkout src/components/Product/Product.tsx
git checkout src/utils/calculateSale.ts
```

---

## Post-Migration Checklist

- [ ] Migration script completed successfully
- [ ] Verified products have `originStock` set
- [ ] Verified sales have `boughtCount` populated
- [ ] Frontend displays correct sold/available values
- [ ] Progress bars show accurate percentages
- [ ] No console errors in browser
- [ ] Mobile responsive display works
- [ ] Products without sales don't show progress bar

---

## Next Steps

After successful migration:

1. ✅ Monitor frontend for any display issues
2. ✅ Check analytics to see distribution of sale progress
3. ✅ Verify edge cases (products with no sales, sold out items, etc.)
4. ✅ Run on staging environment before production
5. ✅ Create backup of production database before running in production

---

## Support

If you encounter issues:

1. Check the migration script output for error messages
2. Verify MongoDB connection string is correct
3. Check that you have write permissions to the database
4. Review the detailed documentation in `SALE_SYSTEM_CHANGES.md`
5. Check the logic diagrams in `SALE_SYSTEM_LOGIC_DIAGRAM.md`

---

## Safe to Run Multiple Times

The migration script is **idempotent**:
- Won't duplicate originStock updates
- Can re-run if interrupted
- Only processes items that need updating
- No data loss if run multiple times

**Feel free to test it on development/staging before production!**
