import type { NextApiRequest, NextApiResponse } from 'next'
import { WorkService } from '@/services/work.service'
import { ensureDatabaseConnection } from '@/services/database'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid work ID' })
  }

  if (req.method === 'DELETE') {
    try {
      // Ensure database connection
      const isConnected = await ensureDatabaseConnection()
      if (!isConnected) {
        return res.status(503).json({ 
          error: 'Database connection failed. Please try again.',
          retryable: true
        })
      }

      // Check if work exists and get its status
      const work = await WorkService.findById(id)
      if (!work) {
        return res.status(404).json({ error: 'Work not found' })
      }

      // Only allow deletion of Final Completed works
      // Pending or Completed (payment pending) works cannot be deleted
      if (work.status !== 'finalCompleted') {
        return res.status(403).json({ 
          error: 'Only Final Completed works can be deleted. Pending or Completed (payment pending) works cannot be deleted.',
          retryable: false
        })
      }

      // Delete the work from the works table
      // This removes it from the client's active work list only
      await WorkService.delete(id)

      // IMPORTANT: History records are NOT deleted when work is deleted
      // History stores independent snapshot data with no foreign key relationships
      // - History records persist even after work deletion
      // - History records persist even after client deletion
      // - History is a separate, independent data source

      res.status(200).json({ 
        message: 'Work deleted successfully from active work list. History record remains intact.',
        deletedWorkId: id
      })
    } catch (error) {
      console.error('Error deleting work:', error)
      
      res.status(500).json({ 
        error: 'Failed to delete work',
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      })
    }
  } else {
    res.setHeader('Allow', ['DELETE'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

