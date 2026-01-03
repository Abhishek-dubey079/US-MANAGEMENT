/**
 * Backfill script to migrate existing Final Completed works to History table
 * This script creates history records for all existing finalCompleted works
 * Run this once to migrate existing data to the new History table
 * 
 * Usage: npx ts-node scripts/backfill-history.ts
 */

import { PrismaClient } from '@prisma/client'
import { HistoryService } from '../services/history.service'

const prisma = new PrismaClient()

async function backfillHistory() {
  try {
    console.log('Starting history backfill...')

    // Find all final completed works with client information
    const finalCompletedWorks = await prisma.work.findMany({
      where: {
        status: 'FINAL_COMPLETED',
        completionDate: { not: null },
      },
      include: {
        client: true,
      },
    })

    console.log(`Found ${finalCompletedWorks.length} final completed works`)

    let created = 0
    let skipped = 0

    for (const work of finalCompletedWorks) {
      // Check if history record already exists
      const exists = await HistoryService.existsForWork(work.id)

      if (exists) {
        console.log(`Skipping work ${work.id} - history record already exists`)
        skipped++
        continue
      }

      // Create history record with snapshot data
      // Use completionDate as paymentReceivedDate if available, otherwise use current date
      await HistoryService.create({
        clientName: work.client.name,
        clientPan: work.client.pan,
        workPurpose: work.purpose,
        fees: work.fees,
        completionDate: work.completionDate!,
        paymentReceivedDate: work.completionDate || new Date(), // Use completion date or current date
        originalWorkId: work.id,
        originalClientId: work.client.id,
      })

      created++
      console.log(`Created history record for work ${work.id} (${work.purpose})`)
    }

    console.log(`\nBackfill complete!`)
    console.log(`- Created: ${created} history records`)
    console.log(`- Skipped: ${skipped} (already exist)`)
  } catch (error) {
    console.error('Error during backfill:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the backfill
backfillHistory()
  .then(() => {
    console.log('Backfill completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Backfill failed:', error)
    process.exit(1)
  })

