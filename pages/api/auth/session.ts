import type { NextApiRequest, NextApiResponse } from 'next'
import { UserService } from '@/services/user.service'
import { serialize } from 'cookie'

export const SESSION_COOKIE_NAME = 'auth_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/**
 * Get session from cookie
 * Works with both NextApiRequest (API routes) and GetServerSidePropsContext (SSR)
 */
export function getSessionFromCookie(req: { cookies?: { [key: string]: string } | Partial<{ [key: string]: string }> }): string | null {
  if (!req.cookies) {
    return null
  }
  const value = req.cookies[SESSION_COOKIE_NAME]
  return typeof value === 'string' ? value : null
}

/**
 * Set session cookie
 */
export function setSessionCookie(res: NextApiResponse, userId: string): void {
  const cookie = serialize(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  res.setHeader('Set-Cookie', cookie)
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(res: NextApiResponse): void {
  const cookie = serialize(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  res.setHeader('Set-Cookie', cookie)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Get current session
    try {
      const userId = getSessionFromCookie(req)

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' })
      }

      // Verify user exists
      const user = await UserService.findById(userId)

      if (!user) {
        // User doesn't exist, clear invalid session
        clearSessionCookie(res)
        return res.status(401).json({ error: 'Invalid session' })
      }

      // Return user data
      res.status(200).json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          createdAt: user.createdAt.toISOString(),
        },
      })
    } catch (error) {
      console.error('Error verifying session:', error)
      res.status(500).json({ error: 'Failed to verify session' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

// Helper functions are already exported above
