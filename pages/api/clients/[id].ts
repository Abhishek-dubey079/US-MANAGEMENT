import type { NextApiRequest, NextApiResponse } from 'next'
import { ClientService } from '@/services/client.service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (req.method === 'GET') {
    try {
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid client ID' })
      }

      const client = await ClientService.findByIdWithWorks(id)

      if (!client) {
        return res.status(404).json({ error: 'Client not found' })
      }

      res.status(200).json(client)
    } catch (error) {
      console.error('Error fetching client:', error)
      res.status(500).json({ error: 'Failed to fetch client' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}


