import type { NextApiRequest, NextApiResponse } from 'next'
import { UserService } from '@/services/user.service'

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

    const { name, username, password } = req.body

    // Validate required fields
    if (!name || !username || !password) {
      return res.status(400).json({ 
        error: 'Name, username, and password are required' 
      })
    }

    // Validate username format (basic validation)
    if (username.length < 3) {
      return res.status(400).json({ 
        error: 'Username must be at least 3 characters long' 
      })
    }

    // Validate password strength (basic validation)
    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      })
    }

    // Check if username already exists
    const usernameExists = await UserService.usernameExists(username)
    if (usernameExists) {
      return res.status(409).json({ 
        error: 'Username already exists',
        retryable: false
      })
    }

    // Create user (password will be hashed in the service)
    const user = await UserService.create({
      name,
      username,
      password,
    })

    // Return user without password
    res.status(201).json({
      user,
      message: 'User registered successfully',
    })
  } catch (error) {
    console.error('Error registering user:', error)
    
    // Handle unique constraint violations
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint') || error.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ 
          error: 'Username already exists',
          retryable: false
        })
      }
      
      if (error.message.includes('database')) {
        return res.status(503).json({ 
          error: 'Database error. Please try again.',
          retryable: true,
          details: error.message
        })
      }
    }

    res.status(500).json({ 
      error: 'Failed to register user',
      details: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    })
  }
}

