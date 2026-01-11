import type { NextApiRequest, NextApiResponse } from 'next'
import { PaymentService } from '@/services/payment.service'
import { ensureDatabaseConnection } from '@/services/database'
import { checkIsAdmin } from '@/utils/auth.api'
import type { CreatePaymentInput, PaymentSummary } from '@/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    // Only admin can create payments
    const isAdmin = await checkIsAdmin(req)
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

    // Extract and validate request body
    const { workId, amount } = req.body

    // Validate workId
    if (!workId) {
      return res.status(400).json({ 
        error: 'Work ID is required',
        field: 'workId'
      })
    }

    if (typeof workId !== 'string' || workId.trim() === '') {
      return res.status(400).json({ 
        error: 'Work ID must be a non-empty string',
        field: 'workId'
      })
    }

    // Validate amount
    if (amount === undefined || amount === null) {
      return res.status(400).json({ 
        error: 'Payment amount is required',
        field: 'amount'
      })
    }

    // Convert amount to number and validate
    const paymentAmount = Number(amount)
    
    if (isNaN(paymentAmount)) {
      return res.status(400).json({ 
        error: 'Payment amount must be a valid number',
        field: 'amount',
        received: amount
      })
    }

    // Validate amount > 0
    if (paymentAmount <= 0) {
      return res.status(400).json({ 
        error: 'Payment amount must be greater than zero',
        field: 'amount',
        received: paymentAmount
      })
    }

    // Validate amount is finite (not Infinity)
    if (!isFinite(paymentAmount)) {
      return res.status(400).json({ 
        error: 'Payment amount must be a finite number',
        field: 'amount',
        received: amount
      })
    }

    // Verify work exists before validation
    const { WorkService } = await import('@/services/work.service')
    const work = await WorkService.findById(workId.trim())
    
    if (!work) {
      return res.status(404).json({ 
        error: `Work with ID "${workId}" not found`,
        workId: workId.trim(),
        retryable: false
      })
    }

    // Validate payment amount and check remaining balance
    const validation = await PaymentService.validatePaymentAmount(workId.trim(), paymentAmount)
    
    if (!validation.valid) {
      return res.status(400).json({ 
        error: validation.error || 'Invalid payment amount',
        field: 'amount',
        amount: paymentAmount,
        remainingAmount: validation.remainingAmount,
        totalFees: work.fees,
        retryable: false
      })
    }

    // Validate amount <= remaining balance (double-check)
    if (paymentAmount > validation.remainingAmount) {
      return res.status(400).json({ 
        error: `Payment amount (${paymentAmount.toFixed(2)}) exceeds remaining balance (${validation.remainingAmount.toFixed(2)})`,
        field: 'amount',
        amount: paymentAmount,
        remainingAmount: validation.remainingAmount,
        totalFees: work.fees,
        retryable: false
      })
    }

    // Create payment record using Prisma
    const payment = await PaymentService.create({
      workId: workId.trim(),
      amount: paymentAmount,
      paymentDate: new Date(),
    })

    // Recalculate payment summary (totalPaid and remainingAmount)
    const summary = await PaymentService.getPaymentSummary(workId.trim())
    
    if (!summary) {
      // This should not happen if work exists, but handle it gracefully
      return res.status(500).json({ 
        error: 'Failed to retrieve payment summary after creating payment. Payment was created successfully.',
        paymentId: payment.id,
        workId: workId.trim(),
        retryable: true
      })
    }

    // Verify calculations
    if (summary.totalPaid < 0 || summary.remainingAmount < 0) {
      console.error('Invalid payment summary calculation:', summary)
      return res.status(500).json({ 
        error: 'Payment calculation error. Please verify payment data.',
        paymentId: payment.id,
        workId: workId.trim(),
        retryable: false
      })
    }

    // Check if work can now be marked as final completed
    const canFinalize = summary.remainingAmount === 0
    
    // Return success response with payment and updated summary
    res.status(201).json({
      payment,
      summary: summary as PaymentSummary,
      canFinalize, // Indicates if work can now be marked as Final Completed
      message: 'Payment added successfully',
    })
  } catch (error) {
    console.error('Error creating payment:', error)
    
    // Handle specific database errors
    if (error instanceof Error) {
      // Handle foreign key constraint (work doesn't exist)
      if (error.message.includes('Foreign key') || 
          error.message.includes('workId') ||
          error.message.includes('Foreign Key Constraint')) {
        return res.status(404).json({ 
          error: 'Work not found. The specified work ID does not exist.',
          retryable: false
        })
      }

      // Handle unique constraint violations
      if (error.message.includes('Unique constraint') || 
          error.message.includes('Unique Constraint')) {
        return res.status(409).json({ 
          error: 'A payment with these details already exists',
          retryable: false
        })
      }

      // Handle database connection errors
      if (error.message.includes('connect') || 
          error.message.includes('Connection') ||
          error.message.includes('timeout')) {
        return res.status(503).json({ 
          error: 'Database connection error. Please try again.',
          retryable: true
        })
      }

      // Handle Prisma validation errors
      if (error.message.includes('prisma') || 
          error.message.includes('Prisma')) {
        return res.status(400).json({ 
          error: 'Invalid payment data. Please check your input.',
          details: error.message,
          retryable: false
        })
      }
    }

    // Generic error response
    res.status(500).json({ 
      error: 'Failed to create payment',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      retryable: true
    })
  }
}

