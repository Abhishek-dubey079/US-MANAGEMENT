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
  const { id: clientId } = req.query

  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'Invalid client ID' })
  }

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

  // Ensure database connection
  const isConnected = await ensureDatabaseConnection()
  if (!isConnected) {
    return res.status(503).json({ 
      error: 'Database connection failed. Please try again.',
      retryable: true
    })
  }

  const prisma = (await import('@/services/database')).default

  // Verify client exists
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  })

  if (!client) {
    return res.status(404).json({ error: 'Client not found' })
  }

  if (req.method === 'POST') {
    // UPLOAD DOCUMENT
    try {
      // Parse multipart/form-data
      const form = formidable({
        maxFileSize: 10 * 1024 * 1024, // 10MB
        keepExtensions: true,
      })

      const [, files] = await form.parse(req)

      // Validate file
      const file = Array.isArray(files.file) ? files.file[0] : files.file
      if (!file) {
        return res.status(400).json({ error: 'File is required' })
      }

      // Read file buffer
      const fileBuffer = fs.readFileSync(file.filepath)
      const fileName = file.originalFilename || file.newFilename
      const fileSize = file.size || fileBuffer.length
      const contentType = file.mimetype || 'application/octet-stream'

      // Step 1: Upload to Vercel Blob
      let blobUrl: string
      try {
        const blob = await put(fileName, fileBuffer, {
          access: 'public',
          addRandomSuffix: true,
        })
        blobUrl = blob.url
      } catch (uploadError) {
        console.error('Error uploading to Vercel Blob:', uploadError)
        // Clean up temporary file before returning error
        try {
          fs.unlinkSync(file.filepath)
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        return res.status(500).json({ 
          error: 'Failed to upload file to storage. Please try again.',
        })
      }

      // Step 2: Save to database AFTER successful blob upload
      let document
      try {
        document = await prisma.clientDocument.create({
          data: {
            clientId: clientId,
            name: fileName,
            url: blobUrl,
            contentType: contentType,
            size: fileSize,
          },
        })
        console.log('Document saved successfully:', document.id)
      } catch (databaseError) {
        console.error('Error saving to database:', databaseError)
        
        // Log detailed error for debugging
        if (databaseError instanceof Error) {
          console.error('Database error message:', databaseError.message)
          console.error('Database error stack:', databaseError.stack)
        }
        
        // Try to delete the blob since DB save failed
        try {
          const { del } = await import('@vercel/blob')
          await del(blobUrl)
          console.log('Blob deleted after DB failure')
        } catch (deleteError) {
          console.error('Error deleting blob after DB failure:', deleteError)
          // Log but don't fail - blob will be orphaned but that's acceptable
        }

        // Clean up temporary file
        try {
          fs.unlinkSync(file.filepath)
        } catch (cleanupError) {
          // Ignore cleanup errors
        }

        return res.status(500).json({ 
          error: 'Failed to save document record. Please try again.',
          details: databaseError instanceof Error ? databaseError.message : 'Unknown database error',
        })
      }

      // Clean up temporary file
      try {
        fs.unlinkSync(file.filepath)
      } catch (cleanupError) {
        // Ignore cleanup errors - file may already be deleted
      }

      // Only return success if both upload AND DB save succeeded
      console.log('Upload completed successfully, returning response')
      return res.status(201).json({
        success: true,
        document: {
          id: document.id,
          name: document.name,
          url: document.url,
          size: document.size,
        },
      })
    } catch (error) {
      console.error('Unexpected error in upload handler:', error)
      
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
        
        if (error.message.includes('maxFileSize')) {
          return res.status(400).json({ error: 'File size exceeds 10MB limit' })
        }
      }

      return res.status(500).json({ 
        error: 'Failed to upload document. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  } else if (req.method === 'GET') {
    // LIST DOCUMENTS
    try {
      // Fetch documents for client, ordered by createdAt DESC
      const documents = await prisma.clientDocument.findMany({
        where: {
          clientId: clientId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return res.status(200).json({
        documents: documents.map((doc) => ({
          id: doc.id,
          name: doc.name,
          url: doc.url,
          contentType: doc.contentType,
          size: doc.size,
          createdAt: doc.createdAt.toISOString(),
        })),
      })
    } catch (error) {
      console.error('Error fetching documents:', error)
      return res.status(500).json({ 
        error: 'Failed to fetch documents. Please try again.',
      })
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

