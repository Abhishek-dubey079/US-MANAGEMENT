import type { NextApiRequest, NextApiResponse } from 'next'
import { clearSessionCookie } from './session'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    // Clear session cookie
    clearSessionCookie(res)

    res.status(200).json({
      message: 'Logout successful',
    })
  } catch (error) {
    console.error('Error during logout:', error)
    res.status(500).json({ 
      error: 'Failed to logout',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

