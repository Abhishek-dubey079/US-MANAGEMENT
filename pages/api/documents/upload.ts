import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionFromCookie } from '@/pages/api/auth/session'
import { UserService } from '@/services/user.service'
import { ensureDatabaseConnection } from '@/services/database'
import { put } from '@vercel/blob'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

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

    // All logged-in users can upload documents (no admin check needed)

    // Ensure database connection
    const isConnected = await ensureDatabaseConnection()
    if (!isConnected) {
      return res.status(503).json({ 
        error: 'Database connection failed. Please try again.',
        retryable: true
      })
    }

    // Parse multipart/form-data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)

    // Validate clientId
    const clientId = Array.isArray(fields.clientId) ? fields.clientId[0] : fields.clientId
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({ error: 'Client ID is required' })
    }

    // Validate file
    const file = Array.isArray(files.file) ? files.file[0] : files.file
    if (!file) {
      return res.status(400).json({ error: 'File is required' })
    }

    // Verify client exists
    const prisma = (await import('@/services/database')).default
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return res.status(404).json({ error: 'Client not found' })
    }

    // Read file buffer
    const fileBuffer = fs.readFileSync(file.filepath)
    const fileName = file.originalFilename || file.newFilename
    const fileSize = file.size || fileBuffer.length

    // Upload to Vercel Blob
    const blob = await put(fileName, fileBuffer, {
      access: 'public',
      addRandomSuffix: true,
    })

    // Save metadata to database
    const document = await prisma.clientDocument.create({
      data: {
        clientId: clientId,
        filename: fileName,
        blobUrl: blob.url,
        size: fileSize,
      },
    })

    // Clean up temporary file
    fs.unlinkSync(file.filepath)

    return res.status(201).json({
      document: {
        id: document.id,
        clientId: document.clientId,
        filename: document.filename,
        blobUrl: document.blobUrl,
        size: document.size,
        uploadedAt: document.uploadedAt.toISOString(),
      },
      message: 'Document uploaded successfully',
    })
  } catch (error) {
    console.error('Error uploading document:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) {
        return res.status(400).json({ error: 'File size exceeds 10MB limit' })
      }
    }

    return res.status(500).json({ 
      error: 'Failed to upload document. Please try again.',
    })
  }
}

