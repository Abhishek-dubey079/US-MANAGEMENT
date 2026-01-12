import type { NextApiRequest, NextApiResponse } from 'next'
import { checkIsAdmin } from '@/utils/auth.api'
import { getSessionFromCookie } from '@/pages/api/auth/session'
import { UserService } from '@/services/user.service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
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

      // Ensure database connection
      const { ensureDatabaseConnection, default: prisma } = await import('@/services/database')
      const isConnected = await ensureDatabaseConnection()
      
      if (!isConnected) {
        // Try to get more details about the error
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

      // Fetch clients:
      // - Admin: all clients
      // - Non-admin: only clients where userId = logged-in user
      const { mapClient, mapWork } = await import('@/utils/mappers')
      const clientsPrisma = await prisma.client.findMany({
        where: isAdmin === true 
          ? undefined  // Admin sees all clients
          : { userId }, // Non-admin sees only their clients
        orderBy: {
          createdAt: 'desc',
        },
      })

      const clients = clientsPrisma.map(mapClient)
      
      // Fetch works for each client (also filtered by userId for non-admin users)
      const clientsWithWorks = await Promise.all(
        clients.map(async (client) => {
          const worksPrisma = await prisma.work.findMany({
            where: {
              clientId: client.id,
              ...(isAdmin !== true ? { userId } : {}), // Non-admin: only their works
            },
            orderBy: {
              createdAt: 'desc',
            },
          })
          const works = worksPrisma.map(mapWork)
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

