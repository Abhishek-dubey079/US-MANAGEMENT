/**
 * Server-side authentication utilities for getServerSideProps
 */

import type { GetServerSidePropsContext } from 'next'
import { UserService } from '@/services/user.service'
import { getSessionFromCookie } from '@/pages/api/auth/session'

export interface AuthenticatedUser {
  id: string
  name: string
  username: string
  createdAt: string
}

/**
 * Check authentication and return user or redirect to login
 * Use this in getServerSideProps for protected pages
 */
export async function requireAuth(
  context: GetServerSidePropsContext
): Promise<{ props: { user: AuthenticatedUser } } | { redirect: { destination: string; permanent: boolean } }> {
  try {
    // Get session from cookie
    const userId = getSessionFromCookie(context.req)

    if (!userId) {
      // Not authenticated - redirect to login
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      }
    }

    // Verify user exists
    const user = await UserService.findById(userId)

    if (!user) {
      // User doesn't exist - redirect to login
      return {
        redirect: {
          destination: '/login',
          permanent: false,
        },
      }
    }

    // User is authenticated - return user data inside props
    return {
      props: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          createdAt: user.createdAt.toISOString(),
        },
      },
    }
  } catch (error) {
    console.error('Error checking authentication:', error)
    // On error, redirect to login
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    }
  }
}

