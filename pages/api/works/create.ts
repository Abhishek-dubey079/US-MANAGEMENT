import type { NextApiRequest, NextApiResponse } from 'next'
import { ensureDatabaseConnection } from '@/services/database'
import type { CreateWorkInput } from '@/types'
import { getSessionFromCookie } from '@/pages/api/auth/session'
import { UserService } from '@/services/user.service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    // Get logged-in user from session
    const userId = getSessionFromCookie(req)
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required. Please log in to create works.',
        retryable: false
      })
    }

    // Verify user exists
    const user = await UserService.findById(userId)
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid session. Please log in again.',
        retryable: false
      })
    }

    // Ensure database connection
    const isConnected = await ensureDatabaseConnection()
    if (!isConnected) {
      return res.status(503).json({ 
        error: 'Database connection failed. Please try again.',
        retryable: true
      })
    }

    const { clientId, purpose, fees, completionDate }: CreateWorkInput = req.body

    // Validate required fields
    if (!clientId || !purpose || purpose.trim() === '') {
      return res.status(400).json({ 
        error: 'Client ID and purpose are required' 
      })
    }

    // Verify client exists and belongs to the logged-in user (prevent cross-user access)
    // Access Prisma directly to get userId field (not included in mapped Client type yet)
    const prisma = (await import('@/services/database')).default
    const clientPrisma = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        userId: true,
      },
    })
    
    if (!clientPrisma) {
      return res.status(404).json({ 
        error: 'Client not found',
        retryable: false
      })
    }

    // Prevent cross-user access: ensure client belongs to the logged-in user
    // If client.userId is null (existing data), we allow creating work but link it to logged-in user
    // If client.userId exists, it must match the logged-in user
    if (clientPrisma.userId !== null && clientPrisma.userId !== userId) {
      return res.status(403).json({ 
        error: 'Access denied. You can only create works for your own clients.',
        retryable: false
      })
    }

    // Determine userId for the work:
    // - Use client's userId if it exists (same as logged-in user after validation)
    // - Otherwise use logged-in user's userId (for clients with null userId from existing data)
    const workUserId = clientPrisma.userId || userId

    // Create work with default status 'pending' and paymentReceived: false
    // Work's userId is set to match the client's userId (same as logged-in user)
    // This ensures work is linked to the client's userId and prevents cross-user access
    const workData: CreateWorkInput = {
      clientId,
      purpose: purpose.trim(),
      fees: fees || 0,
      completionDate: completionDate || undefined,
      status: 'pending', // Always start as pending
      paymentReceived: false, // Always start with payment not received
    }

    // Create work and link it to the client's userId
    // Use Prisma directly to set userId during creation
    const { toPrismaStatus } = await import('@/utils/status.utils')
    const { mapWork } = await import('@/utils/mappers')
    
    const createdWorkPrisma = await prisma.work.create({
      data: {
        userId: workUserId, // Link work to client's userId (matches client ownership)
        clientId: workData.clientId,
        purpose: workData.purpose,
        fees: workData.fees || 0,
        completionDate: workData.completionDate || null,
        status: workData.status ? toPrismaStatus(workData.status) : 'PENDING',
        paymentReceived: workData.paymentReceived ?? false,
      },
    })
    
    // Convert Prisma model to TypeScript type
    const createdWork = mapWork(createdWorkPrisma)

    res.status(201).json({
      work: createdWork,
      message: 'Work added successfully',
    })
  } catch (error) {
    console.error('Error creating work:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Foreign key') || error.message.includes('clientId')) {
        return res.status(404).json({ 
          error: 'Client not found',
          retryable: false
        })
      }
    }

    res.status(500).json({ 
      error: 'Failed to create work',
      details: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    })
  }
}

