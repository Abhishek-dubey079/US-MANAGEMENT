# Migration Scripts

This directory contains database migration scripts for safely updating existing data.

## Payment Migration

### Quick Start

1. **Install dependencies** (if not already installed):
   ```bash
   npm install --save-dev tsx
   ```

2. **Run Prisma migration**:
   ```bash
   npx prisma migrate dev --name add_payment_model
   ```

3. **Run data migration**:
   ```bash
   npm run migrate-payments
   ```

### Files

- `migrate-payments.ts` - Main migration script
- `MIGRATION_GUIDE.md` - Detailed migration guide with troubleshooting

### What It Does

The payment migration script:
- Finds all works with `paymentReceived = true`
- Creates a Payment record for each with `amount = fees`
- Leaves works with `paymentReceived = false` with zero payments
- Preserves all existing Client, Work, and History data

### Safety Features

- ✅ Idempotent (safe to run multiple times)
- ✅ Transaction-based (all-or-nothing for batches)
- ✅ Validates data before creating records
- ✅ Skips existing payments (no duplicates)
- ✅ Detailed logging and error reporting
- ✅ Does not modify existing data

For detailed information, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

