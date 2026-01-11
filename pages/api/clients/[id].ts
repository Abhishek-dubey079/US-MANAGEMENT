import type { NextApiRequest, NextApiResponse } from 'next'
import { ClientService } from '@/services/client.service'
import { ensureDatabaseConnection } from '@/services/database'
import type { UpdateClientInput } from '@/types'
import { checkIsAdmin } from '@/utils/auth.api'
import { getSessionFromCookie } from '@/pages/api/auth/session'
import { UserService } from '@/services/user.service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid client ID' })
  }

  // Get logged-in user from session
  const userId = getSessionFromCookie(req)
  
  if (!userId) {
    return res.status(401).json({ 
      error: 'Authentication required. Please log in.',
      retryable: false
    })
  }

  // Verify user exists
  const user = await UserService.findById(userId)
  if (!user) {
    return res.status(401).json({ 
      error: 'Invalid session. Please log in again.',
      retryable: false
    })
  }

  // Check if user is admin
  const isAdmin = await checkIsAdmin(req)

  if (req.method === 'GET') {
    try {
      // Fetch client (admin: any client, non-admin: only if belongs to user)
      const { default: prisma } = await import('@/services/database')
      const { mapClient, mapWork } = await import('@/utils/mappers')
      
      const clientPrisma = await prisma.client.findUnique({
        where: { id },
        include: {
          works: {
            where: isAdmin === true 
              ? undefined  // Admin sees all works for this client
              : { userId }, // Non-admin sees only their works for this client
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })

      if (!clientPrisma) {
        return res.status(404).json({ error: 'Client not found' })
      }

      // Non-admin users can only access their own clients
      if (isAdmin !== true && clientPrisma.userId !== userId) {
        return res.status(404).json({ error: 'Client not found' })
      }

      // Map Prisma models to TypeScript types
      const client = {
        ...mapClient(clientPrisma),
        works: clientPrisma.works.map(mapWork),
      }

      res.status(200).json(client)
    } catch (error) {
      console.error('Error fetching client:', error)
      res.status(500).json({ 
        error: 'Failed to fetch client',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } else if (req.method === 'PATCH') {
    try {
      // Only admin can update clients
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

      const updateData: UpdateClientInput = req.body

      // Validate required fields
      if (updateData.name !== undefined && !updateData.name.trim()) {
        return res.status(400).json({ error: 'Client name cannot be empty' })
      }

      await ClientService.update(id, updateData)

      // Return full client with works for data persistence and backward compatibility
      // This ensures works are preserved and available after refresh
      const clientWithWorks = await ClientService.findByIdWithWorks(id)
      
      if (!clientWithWorks) {
        return res.status(404).json({ error: 'Client not found after update' })
      }

      res.status(200).json(clientWithWorks)
    } catch (error) {
      console.error('Error updating client:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('Unique constraint') || error.message.includes('UNIQUE constraint')) {
          return res.status(409).json({ 
            error: 'A client with this PAN number already exists',
            retryable: false
          })
        }
      }

      res.status(500).json({ 
        error: 'Failed to update client',
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      // Only admin can delete clients
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

      // Check if client exists
      const existingClient = await ClientService.findById(id)
      if (!existingClient) {
        return res.status(404).json({ error: 'Client not found' })
      }

      // Delete client (cascade delete will automatically remove all associated works)
      // This removes:
      // - Client record from clients table
      // - All active works (pending, completed, finalCompleted) from works table
      // This ensures no orphan work records remain in the database
      await ClientService.delete(id)

      // IMPORTANT: History records are NOT deleted when client is deleted
      // History stores independent snapshot data with no foreign key relationships
      // - History records persist even after client deletion
      // - History records persist even after work deletion
      // - History is a separate, independent data source
      // - History contains snapshot data that continues to exist independently

      res.status(200).json({ 
        message: 'Client and all associated active works deleted successfully. History records remain intact.',
        deletedClientId: id
      })
    } catch (error) {
      console.error('Error deleting client:', error)
      
      res.status(500).json({ 
        error: 'Failed to delete client',
        details: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      })
    }
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}


