/**
 * Authentication utilities for client-side session management
 */

export interface SessionUser {
  id: string
  name: string
  username: string
  createdAt: string
}

/**
 * Check if user is authenticated by verifying session
 */
export async function checkAuth(): Promise<SessionUser | null> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include', // Include cookies
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user || null
  } catch (error) {
    console.error('Error checking authentication:', error)
    return null
  }
}

/**
 * Logout user by clearing session
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.error('Error during logout:', error)
  }
}

