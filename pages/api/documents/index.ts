import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionFromCookie } from '@/pages/api/auth/session'
import { UserService } from '@/services/user.service'
import { ensureDatabaseConnection } from '@/services/database'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    // Get logged-in user from session
    const userId = getSessionFromCookie(req)
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'Authentication required. Please log in.',
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

    const { clientId } = req.query

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({ error: 'Invalid client ID. clientId query parameter is required.' })
    }

    // Verify client exists
    const prisma = (await import('@/services/database')).default
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }

    // Fetch documents for client, ordered by uploadedAt DESC
    const documents = await prisma.clientDocument.findMany({
      where: {
        clientId: clientId,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    })

    // Convert dates to ISO strings for JSON serialization
    return res.status(200).json({
      documents: documents.map((doc) => ({
        id: doc.id,
        clientId: doc.clientId,
        filename: doc.filename,
        url: doc.url,
        size: doc.size,
        uploadedAt: doc.uploadedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch documents. Please try again.',
    })
  }
}

