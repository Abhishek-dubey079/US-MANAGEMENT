import type { NextApiRequest, NextApiResponse } from 'next'
import { WorkService } from '@/services/work.service'
import { HistoryService } from '@/services/history.service'
import { PaymentService } from '@/services/payment.service'
import { checkIsAdmin } from '@/utils/auth.api'

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
    // Only admin can update work status
    const isAdmin = await checkIsAdmin(req)
    if (isAdmin !== true) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid work ID' })
    }

    const { status } = req.body

    if (!status || !['pending', 'completed', 'finalCompleted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: pending, completed, or finalCompleted' })
    }

    // Get current work to verify it exists
    const currentWork = await WorkService.findById(id)
    if (!currentWork) {
      return res.status(404).json({ error: 'Work not found' })
    }

    // Payment-based status rules:
    // - completed = work completed but payment pending (Payment Pending status)
    // - finalCompleted = work completed and full payment received (ONLY allowed when remainingAmount === 0)
    //   remainingAmount is calculated from actual payments, not from paymentReceived flag
    
    // Prepare update data (removed paymentReceived dependency - now based on payment calculations)
    const updateData: { status?: string; completionDate?: Date } = {}

    // When marking work as 'completed', set completionDate if not already set
    if (status === 'completed' && !currentWork.completionDate) {
      // Set completion date when work is first marked as completed
      updateData.completionDate = new Date()
    }

    // Validate final completion - ONLY allow when remainingAmount === 0
    // remainingAmount is recalculated from actual payments
    if (status === 'finalCompleted') {
      // Recalculate remainingAmount from actual payments
      const paymentSummary = await PaymentService.getPaymentSummary(id)
      
      if (!paymentSummary) {
        return res.status(500).json({ 
          error: 'Failed to retrieve payment information',
          retryable: true
        })
      }

      // Final completion ONLY allowed if remainingAmount === 0 (all payments received)
      if (paymentSummary.remainingAmount !== 0) {
        return res.status(400).json({ 
          error: `Cannot mark work as Final Completed. Payment pending: ${paymentSummary.remainingAmount.toFixed(2)} remaining out of ${paymentSummary.totalFees.toFixed(2)} total fees.`,
          remainingAmount: paymentSummary.remainingAmount,
          totalFees: paymentSummary.totalFees,
          totalPaid: paymentSummary.totalPaid,
          retryable: false
        })
      }

      // Ensure completionDate is set when finalizing
      if (!currentWork.completionDate) {
        updateData.completionDate = new Date()
      }
    }

    // Set status (will be converted to Prisma format in WorkService.update)
    updateData.status = status
    
    const updatedWork = await WorkService.update(id, updateData as any)

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
            // Fetch payment summary to include payment details in history snapshot
            const paymentSummary = await PaymentService.getPaymentSummary(id)
            
            // Prepare payment details array from payments
            const paymentDetails = paymentSummary?.payments.map((payment) => ({
              amount: payment.amount,
              paymentDate: payment.paymentDate instanceof Date 
                ? payment.paymentDate 
                : new Date(payment.paymentDate),
            })) || []
            
            // Create history record with snapshot data including payment details
            // paymentReceivedDate is set to current date (when work became finalCompleted)
            await HistoryService.create({
              clientName: workWithClient.client.name,
              clientPan: workWithClient.client.pan,
              workPurpose: workWithClient.purpose,
              fees: workWithClient.fees,
              totalPaid: paymentSummary?.totalPaid || workWithClient.fees,
              paymentDetails: paymentDetails.length > 0 ? paymentDetails : undefined,
              completionDate: workWithClient.completionDate || new Date(),
              paymentReceivedDate: new Date(), // Date when payment was received (when work became finalCompleted)
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


