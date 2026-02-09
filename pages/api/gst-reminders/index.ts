import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionFromCookie } from '@/pages/api/auth/session'
import { UserService } from '@/services/user.service'
import { getCurrentCycleMonth, isGstClient, isReminderActive } from '@/utils/gst.utils'

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const userId = getSessionFromCookie(req)
    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
    }

    const user = await UserService.findById(userId)
    if (!user) {
        return res.status(401).json({ error: 'Invalid session' })
    }

    const { default: prisma } = await import('@/services/database')
    const cycleMonth = getCurrentCycleMonth()

    if (req.method === 'GET') {
        try {
            // 1. Check if reminders should be visible
            const active = isReminderActive()
            const { checkIsAdmin } = await import('@/utils/auth.api')
            const isAdmin = await checkIsAdmin(req)

            // 2. Fetch clients to detect GST clients
            // Admins see all clients, normal users only their own
            const query: any = { include: { works: true } }
            if (!isAdmin) {
                query.where = { userId }
            }

            const clientsWithWorks = await prisma.client.findMany(query)
            const { getGstWorks } = await import('@/utils/gst.utils')

            const gstClients = clientsWithWorks.filter((client: any) => isGstClient(client as any))

            // 3. Ensure GstReminderStatus records exist for the current cycle
            await Promise.all(
                gstClients.map(async (client) => {
                    return (prisma as any).gstReminderStatus.upsert({
                        where: {
                            clientId_month: {
                                clientId: client.id,
                                month: cycleMonth
                            }
                        },
                        update: {},
                        create: {
                            clientId: client.id,
                            month: cycleMonth,
                            status: 'PENDING'
                        }
                    })
                })
            )

            // 4. Fetch the statuses for the current cycle
            const statuses = await (prisma as any).gstReminderStatus.findMany({
                where: {
                    clientId: { in: gstClients.map(c => c.id) },
                    month: cycleMonth
                },
                include: {
                    client: true
                }
            })

            // Enhance with work type info using unified helper
            const results = statuses.map((status: any) => {
                const client = gstClients.find(c => c.id === status.clientId)
                const gstWorks = getGstWorks(client)
                const workTypes = Array.from(new Set(gstWorks.map((w: any) => w.purpose))).join(', ')

                return {
                    ...status,
                    workTypes
                }
            })

            return res.status(200).json({
                active,
                cycleMonth,
                reminders: results
            })
        } catch (error) {
            console.error('Error fetching GST reminders:', error)
            return res.status(500).json({ error: 'Failed to fetch GST reminders' })
        }
    }

    if (req.method === 'POST') {
        try {
            const { clientId, status } = req.body

            if (!clientId || status !== 'DONE') {
                return res.status(400).json({ error: 'Invalid request' })
            }

            // Verify ownership (Admins can skip this)
            const { checkIsAdmin } = await import('@/utils/auth.api')
            const isAdmin = await checkIsAdmin(req)

            if (!isAdmin) {
                const client = await prisma.client.findFirst({
                    where: { id: clientId, userId }
                })

                if (!client) {
                    return res.status(404).json({ error: 'Client not found' })
                }
            }

            const updated = await (prisma as any).gstReminderStatus.update({
                where: {
                    clientId_month: {
                        clientId,
                        month: cycleMonth
                    }
                },
                data: {
                    status: 'DONE',
                    completedAt: new Date()
                }
            })

            return res.status(200).json(updated)
        } catch (error) {
            console.error('Error updating GST reminder:', error)
            return res.status(500).json({ error: 'Failed to update GST reminder' })
        }
    }

    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).json({ error: `Method ${req.method} Not Allowed` })
}
