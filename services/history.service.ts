/**
 * History service - manages history records (snapshot data)
 * History records are independent and persist even if Client or Work is deleted
 */

import prisma from './database'
import type { WorkWithClient } from '@/types'

// Type guard for Prisma unique constraint errors
function isPrismaUniqueConstraintError(error: unknown): error is { code: string; meta?: { target?: unknown[] } } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === 'P2002'
  )
}

export interface HistoryRecord {
  id: string
  clientName: string
  clientPan: string | null
  workPurpose: string
  fees: number
  completionDate: Date
  paymentReceivedDate: Date
  paymentReceived: boolean
  originalWorkId: string | null
  originalClientId: string | null
  createdAt: Date
}

export interface CreateHistoryInput {
  clientName: string
  clientPan: string | null
  workPurpose: string
  fees: number
  completionDate: Date
  paymentReceivedDate: Date
  originalWorkId?: string | null
  originalClientId?: string | null
}

export class HistoryService {
  /**
   * Create a history record from a final completed work
   * Stores snapshot data that persists even if work/client is deleted
   * 
   * Duplicate Prevention:
   * - Uses unique constraint on originalWorkId to prevent duplicates
   * - Checks if history exists before creating (additional safety)
   * - Throws error if duplicate is attempted
   */
  static async create(data: CreateHistoryInput): Promise<HistoryRecord> {
    // Additional safety check: verify no history exists for this work
    if (data.originalWorkId) {
      const exists = await this.existsForWork(data.originalWorkId)
      if (exists) {
        throw new Error(`History record already exists for work ${data.originalWorkId}`)
      }
    }

    try {
      const history = await prisma.history.create({
        data: {
          clientName: data.clientName,
          clientPan: data.clientPan,
          workPurpose: data.workPurpose,
          fees: data.fees,
          completionDate: data.completionDate,
          paymentReceivedDate: data.paymentReceivedDate,
          paymentReceived: true, // History records always have payment received
          originalWorkId: data.originalWorkId || null,
          originalClientId: data.originalClientId || null,
        },
      })

      return {
        id: history.id,
        clientName: history.clientName,
        clientPan: history.clientPan,
        workPurpose: history.workPurpose,
        fees: history.fees,
        completionDate: history.completionDate,
        paymentReceivedDate: history.paymentReceivedDate,
        paymentReceived: history.paymentReceived,
        originalWorkId: history.originalWorkId,
        originalClientId: history.originalClientId,
        createdAt: history.createdAt,
      }
    } catch (error: unknown) {
      // Handle unique constraint violation (duplicate prevention)
      if (isPrismaUniqueConstraintError(error) && Array.isArray(error.meta?.target) && error.meta.target.includes('originalWorkId')) {
        throw new Error(`History record already exists for work ${data.originalWorkId}`)
      }
      throw error
    }
  }

  /**
   * Get all history records
   * Returns records ordered by completion date (most recent first)
   */
  static async findAll(): Promise<HistoryRecord[]> {
    const records = await prisma.history.findMany({
      orderBy: {
        completionDate: 'desc',
      },
    })

    return records.map((record) => ({
      id: record.id,
      clientName: record.clientName,
      clientPan: record.clientPan,
      workPurpose: record.workPurpose,
      fees: record.fees,
      completionDate: record.completionDate,
      paymentReceivedDate: record.paymentReceivedDate,
      paymentReceived: record.paymentReceived,
      originalWorkId: record.originalWorkId,
      originalClientId: record.originalClientId,
      createdAt: record.createdAt,
    }))
  }

  /**
   * Get history records formatted as WorkWithClient for UI compatibility
   * This allows the UI to work without changes while using independent history data
   */
  static async findAllAsWorkWithClient(): Promise<WorkWithClient[]> {
    const records = await this.findAll()

    return records.map((record) => ({
      id: record.id,
      clientId: record.originalClientId || '',
      purpose: record.workPurpose,
      fees: record.fees,
      completionDate: record.completionDate,
      status: 'finalCompleted' as const,
      paymentReceived: true,
      createdAt: record.createdAt,
      updatedAt: record.createdAt,
      client: {
        id: record.originalClientId || '',
        name: record.clientName,
        pan: record.clientPan,
        aadhaar: null,
        address: null,
        phone: null,
        createdAt: record.createdAt,
      },
    }))
  }

  /**
   * Delete a history record by ID
   */
  static async delete(id: string): Promise<HistoryRecord> {
    const record = await prisma.history.delete({
      where: { id },
    })

    return {
      id: record.id,
      clientName: record.clientName,
      clientPan: record.clientPan,
      workPurpose: record.workPurpose,
      fees: record.fees,
      completionDate: record.completionDate,
      paymentReceivedDate: record.paymentReceivedDate,
      paymentReceived: record.paymentReceived,
      originalWorkId: record.originalWorkId,
      originalClientId: record.originalClientId,
      createdAt: record.createdAt,
    }
  }

  /**
   * Check if a history record exists for a given work ID
   * Prevents duplicate history records
   */
  static async existsForWork(workId: string): Promise<boolean> {
    const count = await prisma.history.count({
      where: {
        originalWorkId: workId,
      },
    })
    return count > 0
  }
}

