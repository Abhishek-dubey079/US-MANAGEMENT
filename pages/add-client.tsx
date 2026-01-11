import type { NextPage, GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import AddClientForm from '@/components/AddClientForm'
import WorkModal from '@/components/WorkModal'
import WorksList from '@/components/WorksList'
import PageHeader from '@/components/common/PageHeader'
import SectionCard from '@/components/common/SectionCard'
import ErrorBanner from '@/components/common/ErrorBanner'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { CreateClientInput, CreateWorkInput, Client, Work } from '@/types'
import { saveClientDraft, getClientDraft, clearClientDraft, saveWorksDraft, getWorksDraft, clearWorksDraft } from '@/utils/cache.utils'
import { safeApiCall } from '@/utils/api.utils'
import type { ApiError } from '@/utils/api.utils'
import { requireAuth } from '@/utils/auth.server'

const AddClient: NextPage = () => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientData, setClientData] = useState<CreateClientInput | null>(null)
  const [works, setWorks] = useState<CreateWorkInput[]>([])
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Load draft data on mount
  useEffect(() => {
    const draftClient = getClientDraft()
    const draftWorks = getWorksDraft()
    
    if (draftClient) {
      setClientData(draftClient)
    }
    if (draftWorks && draftWorks.length > 0) {
      setWorks(draftWorks)
    }
  }, [])

  // Auto-save drafts
  useEffect(() => {
    if (clientData) {
      saveClientDraft(clientData)
    }
  }, [clientData])

  useEffect(() => {
    if (works.length > 0) {
      saveWorksDraft(works)
    }
  }, [works])

  const handleClientSubmit = async (data: CreateClientInput) => {
    setClientData(data)
    saveClientDraft(data)
    // Client form is now "submitted" but not saved to database yet
    // User can now add works
  }

  const handleAddWork = () => {
    setIsWorkModalOpen(true)
  }

  const handleSaveWork = (work: CreateWorkInput) => {
    const updatedWorks = [...works, work]
    setWorks(updatedWorks)
    saveWorksDraft(updatedWorks)
  }

  const handleRemoveWork = (index: number) => {
    const updatedWorks = works.filter((_, i) => i !== index)
    setWorks(updatedWorks)
    saveWorksDraft(updatedWorks)
  }

  const handleFinalSubmit = async () => {
    if (!clientData) {
      alert('Please fill in the client form first.')
      return
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to save this client with ${works.length} work(s)? This action cannot be undone.`
    )
    if (!confirmed) return

    setIsSubmitting(true)
    setSaveError(null)

    try {
      await safeApiCall<{
        client: Client
        works: Work[]
        message: string
      }>('/api/clients/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client: clientData,
          works: works,
        }),
      }, 3)

      // Clear drafts after successful save
      clearClientDraft()
      clearWorksDraft()

      // Clear sessionStorage if it exists
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pendingClient')
        sessionStorage.removeItem('pendingWorks')
      }

      // Redirect to dashboard
      router.push('/')
    } catch (error) {
      console.error('Error saving client and works:', error)
      const apiError = error as ApiError
      setSaveError(apiError.message || 'Failed to save client and works. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/')
  }

  return (
    <>
      <Head>
        <title>Add New Client - Finance Management</title>
        <meta name="description" content="Add a new client to the system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <PageHeader 
              title="Add New Client"
              subtitle="Fill in the client information below, then add work details."
            />

            {/* Form Card */}
            <SectionCard title="Client Information">
              {isSubmitting ? (
                <LoadingSpinner size="lg" text="Processing..." className="py-8" />
              ) : (
                <AddClientForm onSubmit={handleClientSubmit} onCancel={handleCancel} />
              )}
            </SectionCard>

            {/* ADD WORK Section */}
            {clientData && (
              <SectionCard 
                title="ADD WORK"
                className="mt-6"
                headerClassName="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 -mt-3.5 mb-4">
                  <div></div>
                  <button
                    onClick={handleAddWork}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    + ADD WORK
                  </button>
                </div>
                <WorksList works={works} onRemove={handleRemoveWork} />
              </SectionCard>
            )}

            {/* FINAL SAVE Button */}
            {clientData && (
              <div className="mt-6">
                {saveError && (
                  <ErrorBanner message={saveError} className="mb-4" />
                )}
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="mr-2 h-5 w-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'FINAL SAVE'
                  )}
                </button>
                <p className="mt-2 text-center text-xs text-gray-500">
                  This will save the client and {works.length} work(s) to the database
                </p>
                <p className="mt-1 text-center text-xs text-gray-400">
                  Your data is automatically saved as a draft
                </p>
              </div>
            )}

            {/* Work Modal */}
            <WorkModal
              isOpen={isWorkModalOpen}
              onClose={() => setIsWorkModalOpen(false)}
              onSave={handleSaveWork}
              clientId=""
            />
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Require authentication - redirects to login if not authenticated
  return requireAuth(context)
}

export default AddClient

