import type { NextApiRequest, NextApiResponse } from 'next'
import type { CreateClientInput, CreateWorkInput } from '@/types'

interface CreateClientWithWorksRequest {
  client: CreateClientInput
  works: CreateWorkInput[]
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    // Verify database connection before processing
    const { ensureDatabaseConnection } = await import('@/services/database')
    const isConnected = await ensureDatabaseConnection()
    if (!isConnected) {
      return res.status(503).json({ 
        error: 'Database connection failed. Please try again.',
        retryable: true
      })
    }

    const { client, works }: CreateClientWithWorksRequest = req.body

    // Validate required fields
    if (!client || !client.name) {
      return res.status(400).json({ error: 'Client name is required' })
    }

    /**
     * Use database transaction to ensure atomicity
     * If any work creation fails, entire operation is rolled back
     * This prevents orphaned clients without works
     */
    const prisma = (await import('@/services/database')).default
    const { toPrismaStatus } = await import('@/utils/status.utils')
    
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Create client record
      const createdClient = await tx.client.create({
        data: {
          name: client.name,
          pan: client.pan || null,
          aadhaar: client.aadhaar || null,
          address: client.address || null,
          phone: client.phone || null,
        },
      })

      // Step 2: Create all associated works in the same transaction
      const createdWorks = []
      if (works && works.length > 0) {
        for (const work of works) {
          const createdWork = await tx.work.create({
            data: {
              clientId: createdClient.id,
              purpose: work.purpose,
              fees: work.fees || 0,
              completionDate: work.completionDate || null,
              status: work.status ? toPrismaStatus(work.status) : 'PENDING',
              paymentReceived: work.paymentReceived ?? false,
            },
          })
          // Convert Prisma enum to TypeScript type
          const { mapWork } = await import('@/utils/mappers')
          createdWorks.push(mapWork(createdWork))
        }
      }

      // Convert Prisma model to TypeScript type
      const { mapClient } = await import('@/utils/mappers')
      return { client: mapClient(createdClient), works: createdWorks }
    })

    // Return created client with works
    res.status(201).json({
      client: result.client,
      works: result.works,
      message: 'Client and works saved successfully',
    })
  } catch (error) {
    console.error('Error creating client with works:', error)
    
    // Handle unique constraint violations (e.g., duplicate PAN)
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint') || error.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ 
          error: 'A client with this PAN number already exists',
          retryable: false
        })
      }
      
      if (error.message.includes('database')) {
        return res.status(503).json({ 
          error: 'Database error. Please try again.',
          retryable: true,
          details: error.message
        })
      }
    }

    res.status(500).json({ 
      error: 'Failed to save client and works',
      details: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    })
  }
}

