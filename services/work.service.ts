/**
 * Work service - handles all work-related database operations
 */

import prisma from './database'
import type { Work, CreateWorkInput, UpdateWorkInput, WorkWithClient } from '@/types'
import { toPrismaStatus } from '@/utils/status.utils'
import { mapWork } from '@/utils/mappers'

export class WorkService {
  /**
   * Create a new work entry
   */
  static async create(data: CreateWorkInput): Promise<Work> {
    const work = await prisma.work.create({
      data: {
        clientId: data.clientId,
        purpose: data.purpose,
        fees: data.fees || 0,
        completionDate: data.completionDate || null,
        status: data.status ? toPrismaStatus(data.status) : 'PENDING',
        paymentReceived: data.paymentReceived ?? false,
      },
    })
    return mapWork(work)
  }

  /**
   * Get all works
   */
  static async findAll(): Promise<Work[]> {
    const works = await prisma.work.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
    return works.map(mapWork)
  }

  /**
   * Get all works for a specific client
   */
  static async findByClientId(clientId: string): Promise<Work[]> {
    const works = await prisma.work.findMany({
      where: { clientId },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return works.map(mapWork)
  }

  /**
   * Get a work by ID
   */
  static async findById(id: string): Promise<Work | null> {
    const work = await prisma.work.findUnique({
      where: { id },
    })
    return work ? mapWork(work) : null
  }

  /**
   * Get a work with its client information
   */
  static async findByIdWithClient(id: string): Promise<WorkWithClient | null> {
    const work = await prisma.work.findUnique({
      where: { id },
      include: {
        client: true,
      },
    })
    if (!work) return null
    
    return {
      ...mapWork(work),
      client: {
        id: work.client.id,
        name: work.client.name,
        pan: work.client.pan,
        aadhaar: work.client.aadhaar,
        address: work.client.address,
        phone: work.client.phone,
        createdAt: work.client.createdAt,
      },
    }
  }

  /**
   * Update a work entry
   */
  static async update(id: string, data: UpdateWorkInput & { status?: string; completionDate?: Date }): Promise<Work> {
    const updateData: any = {}
    
    if (data.purpose !== undefined) updateData.purpose = data.purpose
    if (data.fees !== undefined) updateData.fees = data.fees
    if (data.completionDate !== undefined) updateData.completionDate = data.completionDate
    if (data.status !== undefined) {
      // Handle both WorkStatus enum and raw string status
      updateData.status = typeof data.status === 'string' && data.status !== 'pending' && data.status !== 'completed' && data.status !== 'finalCompleted'
        ? data.status // Already in database format (PENDING, COMPLETED, FINAL_COMPLETED)
        : toPrismaStatus(data.status as any)
    }
    if (data.paymentReceived !== undefined) updateData.paymentReceived = data.paymentReceived

    const work = await prisma.work.update({
      where: { id },
      data: updateData,
    })
    return mapWork(work)
  }

  /**
   * Delete a work entry
   * 
   * IMPORTANT: This only deletes the work from the works table (removes from client's active work list)
   * History records are NOT affected - they are stored independently with no foreign key relationships
   * History records persist even after work deletion
   */
  static async delete(id: string): Promise<Work> {
    const work = await prisma.work.delete({
      where: { id },
    })
    return mapWork(work)
  }

  /**
   * Get works filtered by status
   * Converts TypeScript status enum to Prisma enum format
   * Returns works ordered by creation date (newest first)
   */
  static async findByStatus(status: 'pending' | 'completed' | 'finalCompleted'): Promise<Work[]> {
    const works = await prisma.work.findMany({
      where: { status: toPrismaStatus(status) },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return works.map(mapWork)
  }

  /**
   * Get all Final Completed works with client information
   * Returns works ordered by completion date (most recent first)
   * Used for History section
   */
  static async findFinalCompletedWithClients(): Promise<WorkWithClient[]> {
    const works = await prisma.work.findMany({
      where: { 
        status: 'FINAL_COMPLETED',
        completionDate: { not: null }, // Only works with completion date
      },
      include: {
        client: true,
      },
      orderBy: {
        completionDate: 'desc', // Most recent completion date first
      },
    })
    
    return works.map((work) => ({
      ...mapWork(work),
      client: {
        id: work.client.id,
        name: work.client.name,
        pan: work.client.pan,
        aadhaar: work.client.aadhaar,
        address: work.client.address,
        phone: work.client.phone,
        createdAt: work.client.createdAt,
      },
    }))
  }
}

