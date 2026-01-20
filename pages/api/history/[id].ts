import type { NextApiRequest, NextApiResponse } from 'next'
import { HistoryService } from '@/services/history.service'
import { ensureDatabaseConnection } from '@/services/database'
import { checkIsAdmin } from '@/utils/auth.api'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid history ID' })
  }

  // Check if user is admin
  const isAdmin = await checkIsAdmin(req)

  if (req.method === 'DELETE') {
    try {
      // Only admin can delete history
      if (isAdmin !== true) {
        return res.status(403).json({ error: 'Admin access required' })
      }

      // Ensure database connection
      const isConnected = await ensureDatabaseConnection()
      if (!isConnected) {
        return res.status(503).json({ 
          error: 'Database connection failed. Please try again.',
          retryable: true
        })
      }

      // Delete history record
      // History records are independent - deleting them doesn't affect Client or Work
      await HistoryService.delete(id)

      res.status(200).json({ 
        message: 'History record deleted successfully',
        deletedHistoryId: id
      })
    } catch (error) {
      console.error('Error deleting history record:', error)
      
      res.status(500).json({ 
        error: 'Failed to delete history record',
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      })
    }
  } else {
    res.setHeader('Allow', ['DELETE'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}




