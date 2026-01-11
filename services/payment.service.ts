/**
 * Payment service - handles all payment-related database operations
 */

import prisma from './database'
import type { Payment, CreatePaymentInput } from '@/types'

export interface PaymentSummary {
  workId: string
  totalFees: number
  totalPaid: number
  remainingAmount: number
  payments: Payment[]
}

export class PaymentService {
  /**
   * Create a new payment entry
   */
  static async create(data: CreatePaymentInput): Promise<Payment> {
    const payment = await prisma.payment.create({
      data: {
        workId: data.workId,
        amount: data.amount,
        paymentDate: data.paymentDate || new Date(),
      },
    })
    
    return {
      id: payment.id,
      workId: payment.workId,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      createdAt: payment.createdAt,
    }
  }

  /**
   * Get all payments for a specific work
   */
  static async findByWorkId(workId: string): Promise<Payment[]> {
    const payments = await prisma.payment.findMany({
      where: { workId },
      orderBy: {
        paymentDate: 'desc',
      },
    })
    
    return payments.map((payment) => ({
      id: payment.id,
      workId: payment.workId,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      createdAt: payment.createdAt,
    }))
  }

  /**
   * Calculate total paid amount for a work
   */
  static async getTotalPaid(workId: string): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: { workId },
      _sum: {
        amount: true,
      },
    })
    
    return result._sum.amount || 0
  }

  /**
   * Get payment summary for a work
   */
  static async getPaymentSummary(workId: string): Promise<PaymentSummary | null> {
    // Get work to get total fees
    const work = await prisma.work.findUnique({
      where: { id: workId },
      select: {
        id: true,
        fees: true,
      },
    })

    if (!work) {
      return null
    }

    // Get all payments for this work
    const payments = await this.findByWorkId(workId)
    
    // Calculate totals
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const remainingAmount = Math.max(0, work.fees - totalPaid)

    return {
      workId: work.id,
      totalFees: work.fees,
      totalPaid,
      remainingAmount,
      payments,
    }
  }

  /**
   * Check if a payment amount is valid (not exceeding remaining amount)
   */
  static async validatePaymentAmount(workId: string, amount: number): Promise<{ valid: boolean; remainingAmount: number; error?: string }> {
    const summary = await this.getPaymentSummary(workId)
    
    if (!summary) {
      return {
        valid: false,
        remainingAmount: 0,
        error: 'Work not found',
      }
    }

    if (amount <= 0) {
      return {
        valid: false,
        remainingAmount: summary.remainingAmount,
        error: 'Payment amount must be greater than zero',
      }
    }

    if (amount > summary.remainingAmount) {
      return {
        valid: false,
        remainingAmount: summary.remainingAmount,
        error: `Payment amount (${amount}) exceeds remaining amount (${summary.remainingAmount})`,
      }
    }

    return {
      valid: true,
      remainingAmount: summary.remainingAmount,
    }
  }
}

