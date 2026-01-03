/**
 * Mapper functions to convert Prisma models to TypeScript types
 */

import type { Client, Work } from '@/types'
import type { Client as PrismaClient, Work as PrismaWork } from '@prisma/client'
import { fromPrismaStatus } from './status.utils'

/**
 * Convert Prisma Client to TypeScript Client
 */
export function mapClient(client: PrismaClient): Client {
  return {
    id: client.id,
    name: client.name,
    pan: client.pan,
    aadhaar: client.aadhaar,
    address: client.address,
    phone: client.phone,
    createdAt: client.createdAt,
  }
}

/**
 * Convert Prisma Work to TypeScript Work
 */
export function mapWork(work: PrismaWork): Work {
  return {
    id: work.id,
    clientId: work.clientId,
    purpose: work.purpose,
    fees: work.fees,
    completionDate: work.completionDate,
    status: fromPrismaStatus(work.status),
    paymentReceived: work.paymentReceived,
    createdAt: work.createdAt,
    updatedAt: work.updatedAt,
  }
}


