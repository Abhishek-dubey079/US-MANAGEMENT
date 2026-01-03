import type { NextApiRequest, NextApiResponse } from 'next'
import { ClientService } from '@/services/client.service'
import { ensureDatabaseConnection } from '@/services/database'
import type { UpdateClientInput } from '@/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid client ID' })
  }

  if (req.method === 'GET') {
    try {
      const client = await ClientService.findByIdWithWorks(id)

      if (!client) {
        return res.status(404).json({ error: 'Client not found' })
      }

      res.status(200).json(client)
    } catch (error) {
      console.error('Error fetching client:', error)
      res.status(500).json({ error: 'Failed to fetch client' })
    }
  } else if (req.method === 'PATCH') {
    try {
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

      const updatedClient = await ClientService.update(id, updateData)

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
  } else {
    res.setHeader('Allow', ['GET', 'PATCH'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}


