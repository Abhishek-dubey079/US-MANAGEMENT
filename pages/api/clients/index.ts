import type { NextApiRequest, NextApiResponse } from 'next'
import { ClientService } from '@/services/client.service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Ensure database connection
      const { ensureDatabaseConnection } = await import('@/services/database')
      const isConnected = await ensureDatabaseConnection()
      
      if (!isConnected) {
        // Try to get more details about the error
        const { prisma } = await import('@/services/database')
        try {
          await prisma.$queryRaw`SELECT 1`
        } catch (dbError: unknown) {
          console.error('Database connection test failed:', dbError)
          const errorMessage = dbError instanceof Error ? dbError.message : 'Please run: npx prisma migrate dev --name init'
          return res.status(503).json({ 
            error: 'Database not initialized',
            details: errorMessage,
            hint: 'Make sure DATABASE_URL in .env points to your PostgreSQL database.'
          })
        }
        return res.status(503).json({ 
          error: 'Database not initialized',
          details: 'Please run: npx prisma migrate dev --name init'
        })
      }

      // Fetch clients with their works for keyword search
      const clients = await ClientService.findAll()
      
      // Fetch works for each client
      const { WorkService } = await import('@/services/work.service')
      const clientsWithWorks = await Promise.all(
        clients.map(async (client) => {
          const works = await WorkService.findByClientId(client.id)
          return { ...client, works }
        })
      )
      
      res.status(200).json(clientsWithWorks)
    } catch (error) {
      console.error('Error fetching clients:', error)
      
      // Provide more helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('P1001') || error.message.includes('Can\'t reach database')) {
          return res.status(503).json({ 
            error: 'Database not initialized',
            details: 'Please run: npx prisma migrate dev --name init'
          })
        }
        if (error.message.includes('P2027') || error.message.includes('table')) {
          return res.status(503).json({ 
            error: 'Database tables not created',
            details: 'Please run: npx prisma migrate dev --name init'
          })
        }
      }
      
      res.status(500).json({ 
        error: 'Failed to fetch clients',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

