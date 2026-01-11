/**
 * API-level authentication utilities
 */

import type { NextApiRequest } from 'next'
import { getSessionFromCookie } from '@/pages/api/auth/session'
import { UserService } from '@/services/user.service'

const ADMIN_USERNAME = 'Kapil1980'

/**
 * Check if the current user is admin
 * Returns null if not authenticated, true if admin, false if normal user
 */
export async function checkIsAdmin(req: NextApiRequest): Promise<boolean | null> {
  try {
    const userId = getSessionFromCookie(req)
    if (!userId) {
      return null // Not authenticated
    }

    const user = await UserService.findById(userId)
    if (!user) {
      return null // User not found
    }

    return user.username === ADMIN_USERNAME
  } catch (error) {
    console.error('Error checking admin status:', error)
    return null
  }
}

/**
 * Require admin access - throws if not admin
 * Use this in API routes that require admin privileges
 */
export async function requireAdmin(req: NextApiRequest): Promise<boolean> {
  const isAdmin = await checkIsAdmin(req)
  
  if (isAdmin === null) {
    throw new Error('Not authenticated')
  }
  
  if (!isAdmin) {
    throw new Error('Admin access required')
  }
  
  return true
}

