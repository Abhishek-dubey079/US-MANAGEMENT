import type { NextApiRequest, NextApiResponse } from 'next'
import { UserService } from '@/services/user.service'
import { setSessionCookie } from './session'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    // Verify database connection before processing
    const { ensureDatabaseConnection } = await import('@/services/database')
    const isConnected = await ensureDatabaseConnection()
    if (!isConnected) {
      return res.status(503).json({ 
        error: 'Database connection failed. Please try again.',
        retryable: true
      })
    }

    // Ensure default admin user exists (runs only on login requests)
    // Check if admin user exists, create if not - runs once per server instance
    const ADMIN_USERNAME = 'Kapil1980'
    const existingAdmin = await UserService.findByUsername(ADMIN_USERNAME)
    if (!existingAdmin) {
      // Admin user doesn't exist - create it
      // Password will be hashed with bcrypt in UserService.create
      try {
        await UserService.create({
          name: 'Kapil Dev Dubey',
          username: ADMIN_USERNAME,
          password: 'As@221101', // Will be hashed before storage
        })
        console.log('Default admin user created')
      } catch (error) {
        // Handle unique constraint (user created by another request)
        if (error instanceof Error && 
            (error.message.includes('Unique constraint') || 
             error.message.includes('UNIQUE constraint'))) {
          // User was created by another process - this is fine
        } else {
          console.error('Error creating admin user:', error)
        }
      }
    }

    const { username, password } = req.body

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      })
    }

    // Verify credentials (uses secure bcrypt comparison)
    const user = await UserService.verifyCredentials(username, password)

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid username or password',
        retryable: false
      })
    }

    // Create authenticated session by setting cookie
    setSessionCookie(res, user.id)

    // Return user without password
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        createdAt: user.createdAt.toISOString(),
      },
      message: 'Login successful',
    })
  } catch (error) {
    console.error('Error during login:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('database')) {
        return res.status(503).json({ 
          error: 'Database error. Please try again.',
          retryable: true,
          details: error.message
        })
      }
    }

    res.status(500).json({ 
      error: 'Failed to authenticate user',
      details: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    })
  }
}

