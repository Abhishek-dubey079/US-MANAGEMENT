import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { WorkWithClient } from '@/types'
import ClientsTable from './ClientsTable'
import SearchBar from './SearchBar'
import LoadingSpinner from './common/LoadingSpinner'
import SectionCard from './common/SectionCard'
import { useDebounce } from '@/hooks/useDebounce'
import { KEYWORDS, calculateSearchScore, findMatchingKeyword, highlightText, type SearchMatch } from '@/utils/search.utils'
import { safeApiCall } from '@/utils/api.utils'
import { saveClientsCache, getClientsCache } from '@/utils/cache.utils'
import type { ApiError } from '@/utils/api.utils'
import { formatDate, formatCurrency } from '@/utils/formatters'
import CheckIcon from './icons/CheckIcon'
import ConfirmDialog from './ConfirmDialog'

export default function Dashboard() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  
  // History section state
  const [history, setHistory] = useState<WorkWithClient[]>([])
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [deleteHistoryDialog, setDeleteHistoryDialog] = useState<{
    isOpen: boolean
    historyId: string | null
  }>({ isOpen: false, historyId: null })
  const [isDeletingHistory, setIsDeletingHistory] = useState(false)

  // Debounce search query for performance (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const debouncedHistorySearchQuery = useDebounce(historySearchQuery, 300)

  // Fetch data on mount
  useEffect(() => {
    fetchClients()
    fetchHistory()
  }, [])

  // Refresh history when page becomes visible or when work changes occur
  // This ensures history is up-to-date after deleting a work or changing work status
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchHistory()
      }
    }

    const handleFocus = () => {
      fetchHistory()
    }

    // Listen for custom events from client detail page
    const handleWorkStatusChanged = () => {
      // Refresh history when work becomes finalCompleted (new history record created)
      fetchHistory()
    }

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)
    // Listen for window focus (when user returns to tab)
    window.addEventListener('focus', handleFocus)
    // Listen for work status change events (when work becomes finalCompleted)
    window.addEventListener('workStatusChanged', handleWorkStatusChanged)
    
    // Note: We do NOT listen for workDeleted events
    // History records persist even after work deletion and should not be refreshed
    // Deleting a work only removes it from the client's active work list
    // History records remain untouched and continue to exist independently

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('workStatusChanged', handleWorkStatusChanged)
    }
  }, [])

  /**
   * Enhanced search with clear priority logic:
   * Priority 1: Client name match (highest priority)
   * Priority 2: Work purpose match
   * Priority 3: Other clients (non-matching, preserve original order)
   * 
   * Features:
   * - Case-insensitive search
   * - Partial matching supported
   * - No duplicate entries
   * - Stable rendering (uses client.id as key)
   */
  const filteredClients = useMemo(() => {
    // Return all clients if no search query
    if (!debouncedSearchQuery.trim()) {
      return clients
    }

    const query = debouncedSearchQuery.trim()
    const lowerQuery = query.toLowerCase()
    const matchingKeyword = findMatchingKeyword(query, KEYWORDS)

    // Categorize clients by match type
    const nameMatches: SearchMatch[] = []
    const workMatches: SearchMatch[] = []
    const nonMatches: any[] = []
    
    // Track processed client IDs to prevent duplicates
    const processedIds = new Set<string>()

    clients.forEach((client) => {
      // Skip if already processed (prevent duplicates)
      if (processedIds.has(client.id)) {
        return
      }
      processedIds.add(client.id)

      const { score, matchedKeywords, matchedFields } = calculateSearchScore(
        client,
        query,
        KEYWORDS
      )

      // Check for client name match (case-insensitive, partial match)
      const clientName = (client.name || '').toLowerCase()
      const matchesName = clientName.includes(lowerQuery) || 
                         matchedFields.includes('name')

      // Check for work purpose match (case-insensitive, partial match, supports keyword matching)
      const matchesWork = client.works?.some((work: any) => {
        if (!work.purpose) return false
        const lowerPurpose = work.purpose.toLowerCase()
        // Check if query matches keyword (e.g., "td" → "TDS") or direct match
        if (matchingKeyword) {
          return lowerPurpose.includes(matchingKeyword.toLowerCase())
        }
        return lowerPurpose.includes(lowerQuery)
      }) || matchedFields.includes('work')

      // Categorize client based on priority
      if (matchesName) {
        // Priority 1: Client name match
        nameMatches.push({
          client,
          score,
          matchedKeywords,
          matchedFields,
        })
      } else if (matchesWork) {
        // Priority 2: Work purpose match
        workMatches.push({
          client,
          score,
          matchedKeywords,
          matchedFields,
        })
      } else {
        // Priority 3: Non-matching clients (preserve original order)
        nonMatches.push(client)
      }
    })

    // Sort name matches: by score (highest first), then alphabetically
    nameMatches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return a.client.name.localeCompare(b.client.name)
    })

    // Sort work matches: by score (highest first), then alphabetically
    workMatches.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return a.client.name.localeCompare(b.client.name)
    })

    // Combine results in priority order: name matches → work matches → non-matches
    return [
      ...nameMatches.map((item) => item.client),
      ...workMatches.map((item) => item.client),
      ...nonMatches,
    ]
  }, [debouncedSearchQuery, clients])

  /**
   * Fetch clients from API with caching and error handling
   * - Uses cache for instant initial render
   * - Falls back to cache if API fails
   * - Implements retry logic via safeApiCall
   */
  const fetchClients = async (useCache = true) => {
    try {
      setLoading(true)
      setError(null)

      // Load from cache for instant UI update
      if (useCache) {
        const cachedClients = getClientsCache()
        if (cachedClients && cachedClients.length > 0) {
          setClients(cachedClients)
          setLoading(false)
        }
      }

      // Fetch fresh data with automatic retry (3 attempts)
      const data = await safeApiCall<any[]>('/api/clients', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, 3)

      setClients(data)
      saveClientsCache(data) // Update cache with fresh data
      setLoading(false)
    } catch (error) {
      console.error('Error fetching clients:', error)
      const apiError = error as ApiError
      
      // Graceful degradation: use cache if available
      const cachedClients = getClientsCache()
      if (cachedClients && cachedClients.length > 0) {
        setClients(cachedClients)
        setError('Using cached data. Some information may be outdated.')
      } else {
        setError(apiError.message || 'Failed to load clients. Please refresh the page.')
      }
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setRetrying(true)
    fetchClients(false).finally(() => setRetrying(false))
  }

  const handleAddNew = () => {
    router.push('/add-client')
  }

  /**
   * Fetch history (Final Completed works) from API
   */
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true)
      setHistoryError(null)

      const data = await safeApiCall<WorkWithClient[]>('/api/history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, 3)

      setHistory(data)
      setHistoryLoading(false)
    } catch (error) {
      console.error('Error fetching history:', error)
      const apiError = error as ApiError
      setHistoryError(apiError.message || 'Failed to load history. Please refresh the page.')
      setHistoryLoading(false)
    }
  }

  /**
   * Handle delete history record
   */
  const handleDeleteHistoryClick = (historyId: string) => {
    setDeleteHistoryDialog({ isOpen: true, historyId })
  }

  const handleCancelDeleteHistory = () => {
    setDeleteHistoryDialog({ isOpen: false, historyId: null })
  }

  const handleConfirmDeleteHistory = async () => {
    if (!deleteHistoryDialog.historyId) return

    setIsDeletingHistory(true)
    try {
      const response = await fetch(`/api/history/${deleteHistoryDialog.historyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete history record')
      }

      // Remove deleted history record from state immediately
      setHistory((prevHistory) =>
        prevHistory.filter((work) => work.id !== deleteHistoryDialog.historyId)
      )

      // Close dialog
      setDeleteHistoryDialog({ isOpen: false, historyId: null })
    } catch (error) {
      console.error('Error deleting history record:', error)
      setIsDeletingHistory(false)
      setDeleteHistoryDialog({ isOpen: false, historyId: null })
      alert(`Failed to delete history record: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeletingHistory(false)
    }
  }

  /**
   * Filter history based on search query
   * Searches in: client name, PAN number, work purpose (case-insensitive)
   * Optimized for fast filtering on large datasets
   * 
   * Note: This is completely independent from MAIN section search logic
   */
  const filteredHistory = useMemo(() => {
    if (!debouncedHistorySearchQuery.trim()) {
      return history
    }

    const query = debouncedHistorySearchQuery.trim()
    const lowerQuery = query.toLowerCase()

    // Fast filtering using lowercase comparison
    return history.filter((work) => {
      const clientName = (work.client.name || '').toLowerCase()
      const pan = (work.client.pan || '').toLowerCase()
      const purpose = (work.purpose || '').toLowerCase()

      return (
        clientName.includes(lowerQuery) ||
        pan.includes(lowerQuery) ||
        purpose.includes(lowerQuery)
      )
    })
  }, [debouncedHistorySearchQuery, history])

  /**
   * Compute highlighted history items for display
   * Memoized for performance with large datasets
   * Applies text highlighting to matched search terms
   */
  const highlightedHistory = useMemo(() => {
    if (!debouncedHistorySearchQuery.trim()) {
      return filteredHistory.map((work) => ({
        ...work,
        highlightedName: work.client.name,
        highlightedPan: work.client.pan || '',
        highlightedPurpose: work.purpose,
      }))
    }

    const query = debouncedHistorySearchQuery.trim()

    return filteredHistory.map((work) => ({
      ...work,
      highlightedName: highlightText(work.client.name, query, KEYWORDS),
      highlightedPan: work.client.pan 
        ? highlightText(work.client.pan, query, KEYWORDS)
        : '',
      highlightedPurpose: highlightText(work.purpose, query, KEYWORDS),
    }))
  }, [filteredHistory, debouncedHistorySearchQuery])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Finance Management</h1>
            <p className="mt-1 text-sm text-gray-600 hidden sm:block">Manage clients and their financial works</p>
          </div>
          <button
            onClick={handleAddNew}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            ADD NEW
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by client name or keywords (GST, TDS, ITR, Audit)..."
          />
        </div>

        {/* Main Section */}
        <SectionCard title="MAIN">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                  <button
                    onClick={handleRetry}
                    disabled={retrying}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {retrying ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                <p className="mt-4 text-sm text-gray-500">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                {searchQuery ? 'No clients found matching your search.' : 'No clients found.'}
              </div>
            ) : (
              <ClientsTable clients={filteredClients} searchQuery={debouncedSearchQuery} />
            )}
        </SectionCard>

        {/* History Section */}
        <SectionCard title="HISTORY" className="mt-6">
          {/* History Search Bar */}
          <div className="mb-6">
            <SearchBar
              value={historySearchQuery}
              onChange={setHistorySearchQuery}
              placeholder="Search history by client name, PAN, or work purpose..."
            />
          </div>

          {historyError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{historyError}</p>
              </div>
            </div>
          )}

          {historyLoading ? (
            <div className="py-12 text-center">
              <LoadingSpinner size="md" text="Loading history..." />
            </div>
          ) : highlightedHistory.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              {historySearchQuery 
                ? 'No history found matching your search.' 
                : 'No completed works found in history.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Client Name
                    </th>
                    <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      PAN Number
                    </th>
                    <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Work Purpose
                    </th>
                    <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Fees
                    </th>
                    <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Completion Date
                    </th>
                    <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Payment
                    </th>
                    <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {highlightedHistory.map((work) => (
                    <tr key={work.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">
                        <span dangerouslySetInnerHTML={{ __html: work.highlightedName || work.client.name }} />
                      </td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm font-mono text-gray-700">
                        {work.client.pan ? (
                          <span dangerouslySetInnerHTML={{ __html: work.highlightedPan || work.client.pan }} />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                        <span dangerouslySetInnerHTML={{ __html: work.highlightedPurpose || work.purpose }} />
                      </td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(work.fees)}
                      </td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm text-gray-700">
                        {work.completionDate ? formatDate(work.completionDate) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm">
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckIcon size={16} className="text-green-600" />
                          <span className="font-medium">Received</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteHistoryClick(work.id)
                          }}
                          disabled={isDeletingHistory}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete this history record"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Delete History Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteHistoryDialog.isOpen}
          title="Delete History Record"
          message="Are you sure you want to permanently delete this history record? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDeleteHistory}
          onCancel={handleCancelDeleteHistory}
        />
      </div>
    </div>
  )
}

