import type { NextPage, GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import type { ClientWithWorks, Work, CreateWorkInput } from '@/types'
import ConfirmDialog from '@/components/ConfirmDialog'
import WorkModal from '@/components/WorkModal'
import CheckIcon from '@/components/icons/CheckIcon'
import CrossIcon from '@/components/icons/CrossIcon'
import PageHeader from '@/components/common/PageHeader'
import SectionCard from '@/components/common/SectionCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { formatDate, formatCurrency } from '@/utils/formatters'
import { safeApiCall } from '@/utils/api.utils'
import type { ApiError } from '@/utils/api.utils'

// Serialized version for getServerSideProps (dates as ISO strings)
interface SerializedClientWithWorks {
  id: string
  name: string
  pan: string | null
  aadhaar: string | null
  address: string | null
  phone: string | null
  createdAt: string // ISO string
  works: Array<{
    id: string
    clientId: string
    purpose: string
    fees: number
    completionDate: string | null // ISO string or null
    status: 'pending' | 'completed' | 'finalCompleted'
    paymentReceived: boolean
    createdAt: string // ISO string
    updatedAt: string // ISO string
  }>
}

interface ClientDetailsProps {
  initialClient: SerializedClientWithWorks | null
}

const ClientDetails: NextPage<ClientDetailsProps> = ({ initialClient }) => {
  const router = useRouter()
  
  // Convert serialized dates back to Date objects
  const deserializeClient = (clientData: any): ClientWithWorks | null => {
    if (!clientData) return null
    return {
      ...clientData,
      createdAt: new Date(clientData.createdAt),
      works: clientData.works.map((work: any) => ({
        ...work,
        createdAt: new Date(work.createdAt),
        updatedAt: new Date(work.updatedAt),
        completionDate: work.completionDate ? new Date(work.completionDate) : null,
        // Ensure paymentReceived is preserved (defaults to false for backward compatibility)
        paymentReceived: work.paymentReceived ?? false,
      })),
    }
  }
  
  const [client, setClient] = useState<ClientWithWorks | null>(
    initialClient ? deserializeClient(initialClient) : null
  )
  const [loading, setLoading] = useState(!initialClient)
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false)
  const [isAddingWork, setIsAddingWork] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    workId: string | null
    newStatus: 'completed' | 'finalCompleted' | null
  }>({
    isOpen: false,
    workId: null,
    newStatus: null,
  })

  useEffect(() => {
    if (!initialClient && router.query.id) {
      fetchClient(router.query.id as string)
    }
  }, [router.query.id, initialClient])

  const fetchClient = async (id: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${id}`)
      if (response.ok) {
        const data = await response.json()
        // Convert date strings to Date objects
        setClient(deserializeClient(data))
      } else {
        console.error('Failed to fetch client')
      }
    } catch (error) {
      console.error('Error fetching client:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle status checkbox click with lifecycle enforcement
   * - Pending → Completed (work done, payment not received) (with confirmation)
   * - Completed → Final Completed (work done, payment received) (with confirmation)
   * - Final Completed → Locked (no changes allowed)
   */
  const handleStatusClick = (workId: string, currentStatus: string) => {
    if (currentStatus === 'finalCompleted') {
      // Final completed works are locked and cannot be changed
      return
    }

    if (currentStatus === 'pending') {
      // Move from pending to completed (work done, payment not received)
      setConfirmDialog({
        isOpen: true,
        workId,
        newStatus: 'completed',
      })
    } else if (currentStatus === 'completed') {
      // Move from completed to final completed (work done, payment received)
      setConfirmDialog({
        isOpen: true,
        workId,
        newStatus: 'finalCompleted',
      })
    }
  }

  /**
   * Confirm and execute status update with optimistic UI
   * - Updates UI immediately for better UX
   * - Reverts changes if API call fails
   * - Refreshes data after successful update
   */
  const handleConfirmStatusUpdate = async () => {
    if (!client || !confirmDialog.workId || !confirmDialog.newStatus) return

    const workId = confirmDialog.workId
    const newStatus = confirmDialog.newStatus

    // Close confirmation dialog
    setConfirmDialog({ isOpen: false, workId: null, newStatus: null })

    // Optimistic update: show changes immediately
    // Update status and paymentReceived based on new meaning:
    // - completed = work completed but payment not received (paymentReceived: false)
    // - finalCompleted = work completed and payment received (paymentReceived: true)
    const originalClient = client
    const paymentReceived = newStatus === 'finalCompleted'
    const updatedWorks = client.works.map((work) =>
      work.id === workId 
        ? { ...work, status: newStatus, paymentReceived } 
        : work
    )
    setClient({ ...client, works: updatedWorks })

    try {
      const response = await fetch(`/api/works/${workId}/update-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        // Revert optimistic update on error
        setClient(originalClient)
        const errorData = await response.json()
        alert(`Failed to update status: ${errorData.error || 'Unknown error'}`)
      } else {
        // Refresh to get latest data from server
        if (router.query.id) {
          fetchClient(router.query.id as string)
        }
      }
    } catch (error) {
      // Revert optimistic update on network error
      setClient(originalClient)
      console.error('Error updating work status:', error)
      alert('Failed to update work status. Please try again.')
    }
  }

  const handleCancelStatusUpdate = () => {
    setConfirmDialog({ isOpen: false, workId: null, newStatus: null })
  }

  /**
   * Handle adding new work to the client
   * New work always starts with status 'pending' and paymentReceived: false
   */
  const handleAddWork = () => {
    setIsWorkModalOpen(true)
  }

  const handleSaveWork = async (workData: CreateWorkInput) => {
    if (!client) return

    setIsAddingWork(true)
    try {
      const response = await safeApiCall<{
        work: Work
        message: string
      }>('/api/works/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...workData,
          clientId: client.id,
          status: 'pending', // Always start as pending
          paymentReceived: false, // Always start with payment not received
        }),
      }, 3)

      // Close modal
      setIsWorkModalOpen(false)

      // Refresh client data to show the new work
      if (router.query.id) {
        await fetchClient(router.query.id as string)
      }
    } catch (error) {
      console.error('Error adding work:', error)
      const apiError = error as ApiError
      alert(`Failed to add work: ${apiError.message || 'Unknown error'}`)
    } finally {
      setIsAddingWork(false)
    }
  }

  // Group works by status
  const pendingWorks = client?.works.filter((work) => work.status === 'pending') || []
  const completedWorks = client?.works.filter((work) => work.status === 'completed') || []
  const finalCompletedWorks = client?.works.filter((work) => work.status === 'finalCompleted') || []

  const renderWorkItem = (work: Work) => {
    const isLocked = work.status === 'finalCompleted'

    return (
      <div
        key={work.id}
        className={`rounded-lg border ${
          isLocked ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
        } p-4`}
      >
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-base font-semibold text-gray-900">{work.purpose}</h3>
                {work.status === 'completed' && (
                  <span className="text-red-600" title="Completed">
                    <CrossIcon size={18} className="text-red-600" />
                  </span>
                )}
                {work.status === 'finalCompleted' && (
                  <span className="text-green-600" title="Final Completed">
                    <CheckIcon size={18} className="text-green-600" />
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                <div>
                  <span className="font-medium text-gray-700">Fees:</span>{' '}
                  <span className="text-gray-900">{formatCurrency(work.fees)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Completion Date:</span>{' '}
                  <span className="text-gray-900">
                    {work.completionDate ? formatDate(work.completionDate) : '-'}
                  </span>
                </div>
                {work.status === 'completed' && (
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <span className="font-medium text-gray-700">Payment Status:</span>{' '}
                    <span className="text-red-600 font-semibold flex items-center gap-1">
                      <CrossIcon size={16} className="text-red-600" />
                      Fees not received
                    </span>
                  </div>
                )}
                {work.status === 'finalCompleted' && (
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <span className="font-medium text-gray-700">Payment Status:</span>{' '}
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <CheckIcon size={16} className="text-green-600" />
                      Payment received
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Checkbox */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              {work.status === 'pending' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleStatusClick(work.id, work.status)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">
                    Mark as Completed (Work Done, Payment Pending)
                  </span>
                </label>
              )}
              {work.status === 'completed' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleStatusClick(work.id, work.status)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">Payment Received</span>
                </label>
              )}
              {work.status === 'finalCompleted' && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 opacity-50 cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-500">Final Completed - Payment Received (Locked)</span>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading Client Details - Finance Management</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner size="lg" text="Loading client details..." />
        </div>
      </>
    )
  }

  if (!client) {
    return (
      <>
        <Head>
          <title>Client Not Found - Finance Management</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Client Not Found</h1>
            <p className="text-gray-600 mb-4">The client you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{client.name} - Client Details - Finance Management</title>
        <meta name="description" content={`Client details for ${client.name}`} />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Client Details</h1>
                <button
                  onClick={handleAddWork}
                  disabled={isAddingWork}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAddingWork ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>ADD WORK</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Client Information Card */}
            <SectionCard title="Client Information" className="mb-6">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Client/Company Name</dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">{client.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">PAN Number</dt>
                    <dd className="mt-1 text-sm font-mono text-gray-900">{client.pan || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Aadhaar Number</dt>
                    <dd className="mt-1 text-sm font-mono text-gray-900">{client.aadhaar || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                    <dd className="mt-1 text-sm font-mono text-gray-900">{client.phone || '-'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{client.address || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(client.createdAt)}</dd>
                  </div>
                </dl>
            </SectionCard>

            {/* Works Section */}
            <div className="space-y-6">
              {/* Pending Works Section */}
              {pendingWorks.length > 0 && (
                <SectionCard 
                  title={`PENDING (${pendingWorks.length})`}
                  borderColor="yellow"
                >
                  <div className="space-y-4">
                    {pendingWorks.map(renderWorkItem)}
                  </div>
                </SectionCard>
              )}

              {/* Completed Works Section - Work done, payment pending */}
              {completedWorks.length > 0 && (
                <SectionCard 
                  title={`COMPLETED - Payment Pending (${completedWorks.length})`}
                  borderColor="red"
                >
                  <div className="space-y-4">
                    {completedWorks.map(renderWorkItem)}
                  </div>
                </SectionCard>
              )}

              {/* Final Completed Works Section - Work done, payment received */}
              {finalCompletedWorks.length > 0 && (
                <SectionCard 
                  title={`FINAL COMPLETED - Payment Received (${finalCompletedWorks.length})`}
                  borderColor="green"
                >
                  <div className="space-y-4">
                    {finalCompletedWorks.map(renderWorkItem)}
                  </div>
                </SectionCard>
              )}

              {/* Empty State */}
              {client.works.length === 0 && (
                <SectionCard title="Works">
                  <div className="py-8 text-center text-gray-500">
                    <p>No works found for this client.</p>
                  </div>
                </SectionCard>
              )}
            </div>

            {/* Confirmation Dialog */}
            <ConfirmDialog
              isOpen={confirmDialog.isOpen}
              title={
                confirmDialog.newStatus === 'completed'
                  ? 'Confirm Work Completion'
                  : 'Confirm Payment Received'
              }
              message={
                confirmDialog.newStatus === 'completed'
                  ? 'Mark this work as completed? (Work is done, but payment has not been received yet.)'
                  : 'Mark payment as received? This will move the work to Final Completed section and cannot be undone.'
              }
              confirmText="Confirm"
              cancelText="Cancel"
              onConfirm={handleConfirmStatusUpdate}
              onCancel={handleCancelStatusUpdate}
            />

            {/* Work Modal */}
            <WorkModal
              isOpen={isWorkModalOpen}
              onClose={() => setIsWorkModalOpen(false)}
              onSave={handleSaveWork}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!

  try {
    // Import service directly for server-side rendering
    const { ClientService } = await import('@/services/client.service')
    const client = await ClientService.findByIdWithWorks(id as string)
    
    if (client) {
      // Serialize Date objects to ISO strings for JSON serialization
      // Next.js getServerSideProps requires JSON-serializable data
      const serializedClient = {
        ...client,
        createdAt: client.createdAt.toISOString(),
        works: client.works.map((work) => ({
          ...work,
          createdAt: work.createdAt.toISOString(),
          updatedAt: work.updatedAt.toISOString(),
          completionDate: work.completionDate ? work.completionDate.toISOString() : null,
          paymentReceived: work.paymentReceived,
        })),
      }
      
      return {
        props: {
          initialClient: serializedClient,
        },
      }
    }
  } catch (error) {
    console.error('Error fetching client:', error)
  }

  return {
    props: {
      initialClient: null,
    },
  }
}

export default ClientDetails

