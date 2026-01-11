/**
 * Migration script to safely migrate existing payment data
 * 
 * This script handles the migration from paymentReceived boolean to Payment records:
 * - Works with paymentReceived = true → Create one Payment record with amount = fees
 * - Works with paymentReceived = false → No payments (zero payments initially)
 * 
 * Run this script AFTER running: npx prisma migrate dev --name add_payment_model
 * 
 * Usage:
 *   npx ts-node scripts/migrate-payments.ts
 *   OR
 *   npm run migrate-payments
 */

import prisma from '../services/database'

async function migratePayments() {
  console.log('🚀 Starting payment migration...')
  console.log('')

  // Verify database connection
  try {
    await prisma.$connect()
    console.log('✅ Database connection established')
    console.log('')
  } catch (error) {
    console.error('❌ Failed to connect to database:', error)
    console.error('')
    console.error('Please ensure:')
    console.error('  1. DATABASE_URL is set in your .env file')
    console.error('  2. Database is running and accessible')
    console.error('  3. Prisma Client is generated: npx prisma generate')
    console.error('')
    process.exit(1)
  }

  try {
    // Step 1: Count existing works
    const totalWorks = await prisma.work.count()
    const paidWorks = await prisma.work.count({
      where: { paymentReceived: true }
    })
    const unpaidWorks = totalWorks - paidWorks

    console.log(`📊 Current data status:`)
    console.log(`   - Total works: ${totalWorks}`)
    console.log(`   - Works with paymentReceived=true: ${paidWorks}`)
    console.log(`   - Works with paymentReceived=false: ${unpaidWorks}`)
    console.log('')

    // Step 2: Check if payments table exists and has data
    const existingPayments = await prisma.payment.count()
    if (existingPayments > 0) {
      console.log(`⚠️  WARNING: Found ${existingPayments} existing payment records.`)
      console.log(`   This migration may create duplicate payments.`)
      console.log(`   Please verify your data before proceeding.`)
      console.log('')
      
      // Ask for confirmation (in production, you might want to add a flag)
      console.log('   Continuing with migration...')
      console.log('')
    }

    // Step 3: Find all works with paymentReceived = true
    const worksToMigrate = await prisma.work.findMany({
      where: {
        paymentReceived: true,
      },
      select: {
        id: true,
        fees: true,
        completionDate: true,
        createdAt: true,
      },
    })

    console.log(`📝 Found ${worksToMigrate.length} works to migrate`)
    console.log('')

    if (worksToMigrate.length === 0) {
      console.log('✅ No works to migrate. Migration complete!')
      return
    }

    // Step 4: Create Payment records in a transaction
    let migratedCount = 0
    let skippedCount = 0
    let errorCount = 0

    console.log('🔄 Creating payment records...')
    console.log('')

    // Process in batches to avoid memory issues
    const batchSize = 100
    for (let i = 0; i < worksToMigrate.length; i += batchSize) {
      const batch = worksToMigrate.slice(i, i + batchSize)
      
      await prisma.$transaction(
        async (tx) => {
          for (const work of batch) {
            try {
              // Check if payment already exists for this work
              const existingPayment = await tx.payment.findFirst({
                where: { workId: work.id },
              })

              if (existingPayment) {
                console.log(`   ⏭️  Skipped work ${work.id}: Payment already exists`)
                skippedCount++
                continue
              }

              // Validate fees amount
              if (work.fees <= 0) {
                console.log(`   ⚠️  Skipped work ${work.id}: Fees is ${work.fees} (must be > 0)`)
                skippedCount++
                continue
              }

              // Determine payment date
              // Use completionDate if available, otherwise use createdAt
              const paymentDate = work.completionDate || work.createdAt

              // Create payment record
              await tx.payment.create({
                data: {
                  workId: work.id,
                  amount: work.fees,
                  paymentDate: paymentDate,
                },
              })

              migratedCount++
              if (migratedCount % 10 === 0) {
                process.stdout.write(`   Progress: ${migratedCount}/${worksToMigrate.length}...\r`)
              }
            } catch (error) {
              console.error(`   ❌ Error migrating work ${work.id}:`, error)
              errorCount++
            }
          }
        },
        {
          timeout: 30000, // 30 second timeout
        }
      )
    }

    console.log('')
    console.log('')

    // Step 5: Verify migration
    const finalPaymentCount = await prisma.payment.count()
    const worksWithPayments = await prisma.work.findMany({
      where: {
        paymentReceived: true,
        payments: {
          some: {},
        },
      },
      select: {
        id: true,
      },
    })

    console.log('📊 Migration Summary:')
    console.log(`   ✅ Successfully migrated: ${migratedCount} works`)
    console.log(`   ⏭️  Skipped: ${skippedCount} works`)
    console.log(`   ❌ Errors: ${errorCount} works`)
    console.log(`   📦 Total payment records: ${finalPaymentCount}`)
    console.log(`   ✅ Works with payments: ${worksWithPayments.length}`)
    console.log('')

    // Step 6: Validation
    if (migratedCount + skippedCount + errorCount !== worksToMigrate.length) {
      console.log('⚠️  WARNING: Migration count mismatch!')
      console.log(`   Expected: ${worksToMigrate.length}, Got: ${migratedCount + skippedCount + errorCount}`)
    }

    if (errorCount > 0) {
      console.log('⚠️  WARNING: Some works failed to migrate. Please review the errors above.')
    }

    // Verify data integrity
    const worksWithoutPayments = await prisma.work.findMany({
      where: {
        paymentReceived: true,
        payments: {
          none: {},
        },
      },
      select: {
        id: true,
        fees: true,
      },
    })

    if (worksWithoutPayments.length > 0) {
      console.log('')
      console.log('⚠️  WARNING: Found works with paymentReceived=true but no payments:')
      worksWithoutPayments.forEach((work) => {
        console.log(`   - Work ID: ${work.id}, Fees: ${work.fees}`)
      })
    }

    console.log('')
    console.log('✅ Migration completed!')
    console.log('')
    console.log('📋 Next steps:')
    console.log('   1. Verify the payment records in the database')
    console.log('   2. Test the application to ensure everything works correctly')
    console.log('   3. Consider backing up your database')
    console.log('')
  } catch (error) {
    console.error('')
    console.error('❌ Migration failed with error:')
    console.error(error)
    console.error('')
    console.error('⚠️  IMPORTANT: Your existing data is safe.')
    console.error('   This error only affects the creation of Payment records.')
    console.error('   You can re-run this script after fixing the issue.')
    console.error('')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migratePayments()
  .then(() => {
    console.log('✨ Migration script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })

