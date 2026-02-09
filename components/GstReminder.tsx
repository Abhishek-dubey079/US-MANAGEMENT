import { useState, useEffect } from 'react'
import SectionCard from './common/SectionCard'
import LoadingSpinner from './common/LoadingSpinner'
import { getCycleMonthName } from '@/utils/gst.utils'

interface GstReminderData {
    id: string
    clientId: string
    month: string
    status: 'PENDING' | 'DONE'
    completedAt: string | null
    workTypes: string
    client: {
        name: string
    }
}

interface ApiResponse {
    active: boolean
    cycleMonth: string
    reminders: GstReminderData[]
}

export default function GstReminder() {
    const [data, setData] = useState<ApiResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    useEffect(() => {
        fetchReminders()
    }, [])

    const fetchReminders = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/gst-reminders')
            if (!res.ok) throw new Error('Failed to fetch reminders')
            const json = await res.json()
            setData(json)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAsDone = async (clientId: string) => {
        try {
            setUpdatingId(clientId)
            const res = await fetch('/api/gst-reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId, status: 'DONE' })
            })
            if (!res.ok) throw new Error('Failed to update status')

            // Update local state
            setData(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    reminders: prev.reminders.map(r =>
                        r.clientId === clientId ? { ...r, status: 'DONE', completedAt: new Date().toISOString() } : r
                    )
                }
            })
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update status')
        } finally {
            setUpdatingId(null)
        }
    }

    if (loading) return <div className="py-12 text-center"><LoadingSpinner size="md" text="Loading GST Reminders..." /></div>
    if (error) return <div className="p-4 text-red-600 bg-red-50 rounded-lg border border-red-200">{error}</div>
    if (!data) return null

    const pending = data.reminders.filter(r => r.status === 'PENDING')
    const completed = data.reminders.filter(r => r.status === 'DONE')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">GST Reminder</h1>
                <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                    Cycle: {getCycleMonthName(data.cycleMonth)}
                </span>
            </div>

            {!data.active && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                GST Reminder will start on the 10th of this month. Currently showing next cycle preview if applicable.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <SectionCard title="🔔 GST Reminder (Pending)">
                {pending.length === 0 ? (
                    <p className="py-4 text-center text-gray-500">No pending GST work for this cycle.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Type</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {pending.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.client.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.workTypes}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleMarkAsDone(item.clientId)}
                                                disabled={updatingId === item.clientId}
                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                            >
                                                {updatingId === item.clientId ? 'Marking...' : 'Mark as Done'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>

            <SectionCard title="✅ GST Completed (This Month)">
                {completed.length === 0 ? (
                    <p className="py-4 text-center text-gray-500">No completed GST work yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed At</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {completed.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.client.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.workTypes}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.completedAt ? new Date(item.completedAt).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>
        </div>
    )
}
