import type { NextApiRequest, NextApiResponse } from 'next'
import { WorkService } from '@/services/work.service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid work ID' })
    }

    const { status } = req.body

    if (!status || !['pending', 'completed', 'finalCompleted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: pending, completed, or finalCompleted' })
    }

    // Update status and paymentReceived based on new meaning:
    // - completed = work completed but payment not received (paymentReceived: false)
    // - finalCompleted = work completed and payment received (paymentReceived: true)
    const paymentReceived = status === 'finalCompleted'
    
    const updatedWork = await WorkService.update(id, { 
      status,
      paymentReceived 
    })

    res.status(200).json(updatedWork)
  } catch (error) {
    console.error('Error updating work status:', error)
    res.status(500).json({ 
      error: 'Failed to update work status',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}


