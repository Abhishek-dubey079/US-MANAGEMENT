import type { NextApiRequest, NextApiResponse } from 'next'
import { WorkService } from '@/services/work.service'
import { ensureDatabaseConnection } from '@/services/database'
import type { CreateWorkInput } from '@/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  try {
    // Ensure database connection
    const isConnected = await ensureDatabaseConnection()
    if (!isConnected) {
      return res.status(503).json({ 
        error: 'Database connection failed. Please try again.',
        retryable: true
      })
    }

    const { clientId, purpose, fees, completionDate }: CreateWorkInput = req.body

    // Validate required fields
    if (!clientId || !purpose || purpose.trim() === '') {
      return res.status(400).json({ 
        error: 'Client ID and purpose are required' 
      })
    }

    // Create work with default status 'pending' and paymentReceived: false
    const workData: CreateWorkInput = {
      clientId,
      purpose: purpose.trim(),
      fees: fees || 0,
      completionDate: completionDate || undefined,
      status: 'pending', // Always start as pending
      paymentReceived: false, // Always start with payment not received
    }

    const createdWork = await WorkService.create(workData)

    res.status(201).json({
      work: createdWork,
      message: 'Work added successfully',
    })
  } catch (error) {
    console.error('Error creating work:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Foreign key') || error.message.includes('clientId')) {
        return res.status(404).json({ 
          error: 'Client not found',
          retryable: false
        })
      }
    }

    res.status(500).json({ 
      error: 'Failed to create work',
      details: error instanceof Error ? error.message : 'Unknown error',
      retryable: true
    })
  }
}

