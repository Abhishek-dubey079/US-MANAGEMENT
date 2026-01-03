/**
 * Utility functions for converting between TypeScript WorkStatus and database string values
 * Status values are stored as strings in the database
 */

import { WorkStatus } from '@/types'

/**
 * Convert TypeScript WorkStatus to database string format
 */
export function toPrismaStatus(status: WorkStatus): string {
  const mapping: Record<WorkStatus, string> = {
    pending: 'PENDING',
    completed: 'COMPLETED',
    finalCompleted: 'FINAL_COMPLETED',
  }
  return mapping[status]
}

/**
 * Convert database string status to TypeScript WorkStatus
 */
export function fromPrismaStatus(status: string): WorkStatus {
  const mapping: Record<string, WorkStatus> = {
    'PENDING': 'pending',
    'COMPLETED': 'completed',
    'FINAL_COMPLETED': 'finalCompleted',
  }
  return mapping[status] || 'pending' // Default to pending if unknown
}


