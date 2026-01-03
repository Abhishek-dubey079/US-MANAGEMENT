import type { NextApiRequest, NextApiResponse } from 'next'
import { WorkService } from '@/services/work.service'
import { HistoryService } from '@/services/history.service'

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

    // Create history record when work becomes finalCompleted
    // History stores snapshot data independently from Work/Client
    // History record is created only once (duplicate prevention via unique constraint)
    if (status === 'finalCompleted' && updatedWork.completionDate) {
      // Check if history record already exists to prevent duplicates
      const historyExists = await HistoryService.existsForWork(id)
      
      if (!historyExists) {
        // Get work with client information to create snapshot
        const workWithClient = await WorkService.findByIdWithClient(id)
        
        if (workWithClient) {
          try {
            // Create history record with snapshot data
            // paymentReceivedDate is set to current date (when work becomes finalCompleted)
            await HistoryService.create({
              clientName: workWithClient.client.name,
              clientPan: workWithClient.client.pan,
              workPurpose: workWithClient.purpose,
              fees: workWithClient.fees,
              completionDate: workWithClient.completionDate || new Date(),
              paymentReceivedDate: new Date(), // Date when payment was received (now)
              originalWorkId: id,
              originalClientId: workWithClient.client.id,
            })
          } catch (error: unknown) {
            // Log duplicate attempt but don't fail the work status update
            // This can happen in race conditions, but unique constraint prevents actual duplicates
            if (error instanceof Error && error.message?.includes('already exists')) {
              console.warn(`History record already exists for work ${id}, skipping creation`)
            } else {
              // Re-throw other errors
              throw error
            }
          }
        }
      }
    }

    res.status(200).json(updatedWork)
  } catch (error) {
    console.error('Error updating work status:', error)
    res.status(500).json({ 
      error: 'Failed to update work status',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}


