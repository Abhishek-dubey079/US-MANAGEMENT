import type { NextApiRequest, NextApiResponse } from 'next'
import { HistoryService } from '@/services/history.service'
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
    // Ensure database connection
    const isConnected = await ensureDatabaseConnection()
    if (!isConnected) {
      return res.status(503).json({ 
        error: 'Database connection failed. Please try again.',
        retryable: true
      })
    }

    // Fetch all history records from independent History table
    // History stores snapshot data and persists even if Client/Work is deleted
    // Returns data formatted as WorkWithClient for UI compatibility
    const history = await HistoryService.findAllAsWorkWithClient()

    res.status(200).json(history)
  } catch (error) {
    console.error('Error fetching history:', error)
    res.status(500).json({ 
      error: 'Failed to fetch history',
      details: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    })
  }
}

