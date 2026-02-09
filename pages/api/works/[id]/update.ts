import type { NextApiRequest, NextApiResponse } from 'next'
import { WorkService } from '@/services/work.service'
import { checkIsAdmin } from '@/utils/auth.api'
import { ensureDatabaseConnection } from '@/services/database'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query

    if (req.method !== 'PATCH') {
        res.setHeader('Allow', ['PATCH'])
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
    }

    try {
        // Only admin can update work details
        const isAdmin = await checkIsAdmin(req)
        if (isAdmin !== true) {
            return res.status(403).json({ error: 'Admin access required' })
        }

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid work ID' })
        }

        const { purpose, fees, completionDate } = req.body

        // Ensure database connection
        const isConnected = await ensureDatabaseConnection()
        if (!isConnected) {
            return res.status(503).json({
                error: 'Database connection failed. Please try again.',
                retryable: true
            })
        }

        // Get current work to verify it exists
        const currentWork = await WorkService.findById(id)
        if (!currentWork) {
            return res.status(404).json({ error: 'Work not found' })
        }

        // Only allow editing if work is NOT finalCompleted
        if (currentWork.status === 'finalCompleted') {
            return res.status(403).json({
                error: 'Final Completed works are locked and cannot be edited.',
                retryable: false
            })
        }

        // Prepare update data
        const updateData: {
            purpose?: string
            fees?: number
            completionDate?: Date
        } = {}
        if (purpose !== undefined) updateData.purpose = purpose.trim()
        if (fees !== undefined) updateData.fees = fees
        if (completionDate !== undefined && completionDate !== null) {
            updateData.completionDate = new Date(completionDate)
        }

        const updatedWork = await WorkService.update(id, updateData)

        res.status(200).json(updatedWork)
    } catch (error) {
        console.error('Error updating work:', error)
        res.status(500).json({
            error: 'Failed to update work',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}
