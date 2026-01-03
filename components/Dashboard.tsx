import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { Client } from '@/types'
import ClientsTable from './ClientsTable'
import SearchBar from './SearchBar'
import LoadingSpinner from './common/LoadingSpinner'
import ErrorBanner from './common/ErrorBanner'
import SectionCard from './common/SectionCard'
import { useDebounce } from '@/hooks/useDebounce'
import { KEYWORDS, calculateSearchScore, findMatchingKeyword, type SearchMatch } from '@/utils/search.utils'
import { safeApiCall } from '@/utils/api.utils'
import { saveClientsCache, getClientsCache } from '@/utils/cache.utils'
import type { ApiError } from '@/utils/api.utils'

export default function Dashboard() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  // Debounce search query for performance (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  useEffect(() => {
    fetchClients()
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
      </div>
    </div>
  )
}

