import type { NextApiRequest, NextApiResponse } from 'next'
import { PaymentService } from '@/services/payment.service'
import { ensureDatabaseConnection } from '@/services/database'
import { checkIsAdmin } from '@/utils/auth.api'
import type { PaymentSummary } from '@/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const { workId } = req.query

  if (!workId || typeof workId !== 'string') {
    return res.status(400).json({ error: 'Invalid work ID' })
  }

  try {
    // Check if user is admin
    const isAdmin = await checkIsAdmin(req)
    
    // Non-admin users see empty data
    if (isAdmin !== true) {
      return res.status(200).json({
        workId,
        totalFees: 0,
        totalPaid: 0,
        remainingAmount: 0,
        payments: [],
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

    // Get payment summary for the work
    const summary = await PaymentService.getPaymentSummary(workId)

    if (!summary) {
      return res.status(404).json({ 
        error: 'Work not found',
        retryable: false
      })
    }

    res.status(200).json(summary as PaymentSummary)
  } catch (error) {
    console.error('Error fetching payment summary:', error)
    res.status(500).json({ 
      error: 'Failed to fetch payment summary',
      details: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    })
  }
}

