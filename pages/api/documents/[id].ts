import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionFromCookie } from '@/pages/api/auth/session'
import { UserService } from '@/services/user.service'
import { checkIsAdmin } from '@/utils/auth.api'
import { ensureDatabaseConnection } from '@/services/database'
import { del } from '@vercel/blob'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE'])
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

    // Check if user is admin
    const isAdmin = await checkIsAdmin(req)

    // Ensure database connection
    const isConnected = await ensureDatabaseConnection()
    if (!isConnected) {
      return res.status(503).json({ 
        error: 'Database connection failed. Please try again.',
        retryable: true
      })
    }

    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Document ID is required' })
    }

    const prisma = (await import('@/services/database')).default

    // Find document with client information
    const document = await prisma.clientDocument.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    })

    if (!document) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Permission check:
    // - Admin can delete any document
    // - Non-admin can delete only documents for their own clients
    if (isAdmin !== true && document.client.userId !== userId) {
      return res.status(403).json({ 
        error: 'You can only delete documents for your own clients.',
        retryable: false
      })
    }

    // Delete file from Vercel Blob
    try {
      await del(document.blobUrl)
    } catch (blobError) {
      console.error('Error deleting file from Vercel Blob:', blobError)
      // Continue with database deletion even if blob deletion fails
      // This prevents orphaned database records
    }

    // Delete record from database
    await prisma.clientDocument.delete({
      where: { id },
    })

    return res.status(200).json({
      message: 'Document deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting document:', error)

    return res.status(500).json({ 
      error: 'Failed to delete document. Please try again.',
    })
  }
}

