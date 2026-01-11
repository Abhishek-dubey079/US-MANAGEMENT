import type { NextApiRequest, NextApiResponse } from 'next'
import { UserService } from '@/services/user.service'
import { getSessionFromCookie, clearSessionCookie } from './session'
import { validatePasswordStrength } from '@/utils/validation'

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

    // Get authenticated user from session
    const userId = getSessionFromCookie(req)
    if (!userId) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        retryable: false
      })
    }

    // Verify user exists
    const user = await UserService.findById(userId)
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid session',
        retryable: false
      })
    }

    const { currentPassword, newPassword } = req.body

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      })
    }

    // Validate new password strength (strong password requirements)
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: passwordValidation.error || 'Password does not meet strength requirements' 
      })
    }

    // Get user with password to verify current password
    const userWithPassword = await UserService.findByUsername(user.username)
    if (!userWithPassword) {
      return res.status(401).json({ 
        error: 'User not found',
        retryable: false
      })
    }

    // Verify current password is correct (uses secure bcrypt comparison)
    const bcrypt = await import('bcryptjs')
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password)
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        error: 'Current password is incorrect',
        retryable: false
      })
    }

    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        error: 'New password must be different from current password' 
      })
    }

    // Update password (will be hashed in the service)
    await UserService.updatePassword(userId, newPassword)

    // Clear session to force re-login after password change
    clearSessionCookie(res)

    res.status(200).json({
      message: 'Password changed successfully. Please log in again with your new password.',
      requiresReLogin: true,
    })
  } catch (error) {
    console.error('Error changing password:', error)
    
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
      error: 'Failed to change password',
      details: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    })
  }
}

