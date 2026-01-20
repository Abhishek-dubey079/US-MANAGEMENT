import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdmin } from '@/utils/auth.api'
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
    // Require admin access
    await requireAdmin(req)

    // Ensure database connection
    const isConnected = await ensureDatabaseConnection()
    if (!isConnected) {
      return res.status(503).json({ 
        error: 'Database connection failed. Please try again.',
        retryable: true
      })
    }

    const { documentId } = req.body

    if (!documentId || typeof documentId !== 'string') {
      return res.status(400).json({ error: 'Document ID is required' })
    }

    const prisma = (await import('@/services/database')).default

    // Find document
    const document = await prisma.clientDocument.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return res.status(404).json({ error: 'Document not found' })
    }

    // Delete file from Vercel Blob
    try {
      await del(document.fileUrl)
    } catch (blobError) {
      console.error('Error deleting file from Vercel Blob:', blobError)
      // Continue with database deletion even if blob deletion fails
      // This prevents orphaned database records
    }

    // Delete record from database
    await prisma.clientDocument.delete({
      where: { id: documentId },
    })

    return res.status(200).json({
      message: 'Document deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting document:', error)

    if (error instanceof Error) {
      if (error.message === 'Not authenticated') {
        return res.status(401).json({ 
          error: 'Authentication required. Please log in.',
          retryable: false
        })
      }
      if (error.message === 'Admin access required') {
        return res.status(403).json({ 
          error: 'Admin access required to delete documents',
          retryable: false
        })
      }
    }

    return res.status(500).json({ 
      error: 'Failed to delete document. Please try again.',
    })
  }
}

