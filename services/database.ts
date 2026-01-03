/**
 * Database service layer using Prisma Client
 * Provides singleton instance for database access
 * Ensures data persistence and connection management
 */

import { PrismaClient } from '@prisma/client'

// Type guard for Prisma errors
function isPrismaError(error: unknown): error is { code?: string | number } {
  return error !== null && typeof error === 'object' && 'code' in error
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Ensure database connection is established
export async function ensureDatabaseConnection(): Promise<boolean> {
  try {
    // Test the connection by running a simple query
    // For SQLite, we'll test by trying to query the clients table
    await prisma.client.findFirst()
    return true
  } catch (error: unknown) {
    console.error('Database connection error:', error)
    // Log more details for debugging
    if (isPrismaError(error)) {
      console.error('Prisma error code:', error.code)
    }
    if (error instanceof Error) {
      console.error('Error message:', error.message)
    }
    return false
  }
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export default prisma

