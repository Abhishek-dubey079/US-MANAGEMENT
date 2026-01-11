# Payment Migration Guide

This guide explains how to safely migrate existing work data to support partial payments.

## Overview

The migration adds a new `Payment` model to track individual payments for each work. Existing works with `paymentReceived = true` will be migrated to have a single Payment record equal to the total fees.

## Migration Steps

### Step 1: Run Prisma Migration

First, create and apply the database migration:

```bash
npx prisma migrate dev --name add_payment_model
```

This will:
- Create the `payments` table in your database
- Add the relationship between `Work` and `Payment`
- Generate the updated Prisma Client

### Step 2: Run Data Migration Script

After the schema migration, run the data migration script:

```bash
# Option 1: Using npm script (requires tsx)
npm run migrate-payments

# Option 2: Using tsx directly
npx tsx scripts/migrate-payments.ts

# Option 3: Using ts-node (if installed)
npx ts-node scripts/migrate-payments.ts
```

**Note:** If you don't have `tsx` installed, install it first:
```bash
npm install --save-dev tsx
```

### Step 3: Verify Migration

The script will output a summary showing:
- Number of works migrated
- Number of payment records created
- Any errors or warnings

## What the Migration Does

### For Works with `paymentReceived = true`:
- Creates a single `Payment` record
- Sets `amount` = `work.fees` (full payment)
- Sets `paymentDate` = `work.completionDate` (if available) or `work.createdAt`

### For Works with `paymentReceived = false`:
- No action taken
- These works will have zero payments initially
- You can add partial payments later as needed

## Safety Features

The migration script includes several safety features:

1. **Idempotent**: Can be run multiple times safely
   - Checks for existing payments before creating new ones
   - Skips works that already have payment records

2. **Validation**:
   - Validates that fees > 0 before creating payments
   - Skips invalid records with warnings

3. **Transaction Safety**:
   - Uses database transactions for data integrity
   - Processes in batches to avoid memory issues

4. **Error Handling**:
   - Continues processing even if individual records fail
   - Reports all errors at the end
   - Does not modify existing data (only creates new records)

5. **Data Preservation**:
   - Does NOT delete or modify existing Work records
   - Does NOT modify Client or History data
   - Only creates new Payment records

## Verification Checklist

After running the migration, verify:

- [ ] All works with `paymentReceived = true` have at least one Payment record
- [ ] Payment amounts match the work fees
- [ ] Payment dates are set correctly
- [ ] No duplicate payments were created
- [ ] All existing Client, Work, and History data is intact

## Rollback

If you need to rollback the migration:

1. **Remove Payment records** (if needed):
   ```sql
   DELETE FROM payments;
   ```

2. **Drop the payments table** (if needed):
   ```sql
   DROP TABLE payments;
   ```

3. **Revert Prisma schema** and run:
   ```bash
   npx prisma migrate reset
   ```

**⚠️ Warning:** Only rollback if absolutely necessary. The migration is designed to be safe and non-destructive.

## Troubleshooting

### Error: "Cannot find module 'tsx'"
**Solution:** Install tsx: `npm install --save-dev tsx`

### Error: "Table 'payments' does not exist"
**Solution:** Run the Prisma migration first: `npx prisma migrate dev --name add_payment_model`

### Error: "Duplicate payment records"
**Solution:** The script checks for existing payments, but if duplicates exist, you can manually remove them:
```sql
-- Find duplicate payments
SELECT workId, COUNT(*) as count 
FROM payments 
GROUP BY workId 
HAVING COUNT(*) > 1;

-- Remove duplicates (keep the oldest one)
DELETE FROM payments 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM payments 
  GROUP BY workId
);
```

### Works with paymentReceived=true but no payments
**Solution:** Check the work records:
- Verify fees > 0
- Re-run the migration script (it will skip existing payments)
- Manually create payments if needed

## Support

If you encounter issues:
1. Check the migration script output for detailed error messages
2. Verify your database connection
3. Ensure Prisma Client is generated: `npx prisma generate`
4. Check that the migration was applied: `npx prisma migrate status`

