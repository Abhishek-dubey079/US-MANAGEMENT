/**
 * Local storage caching utilities for data persistence
 */

const CACHE_KEYS = {
  CLIENTS: 'fm_clients_cache',
  CLIENT_DRAFT: 'fm_client_draft',
  WORKS_DRAFT: 'fm_works_draft',
  CACHE_TIMESTAMP: 'fm_cache_timestamp',
} as const

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export interface CacheData<T> {
  data: T
  timestamp: number
}

/**
 * Save data to cache
 */
export function saveToCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return

  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(cacheData))
  } catch (error) {
    console.warn('Failed to save to cache:', error)
  }
}

/**
 * Get data from cache
 */
export function getFromCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null

    const cacheData: CacheData<T> = JSON.parse(cached)
    const age = Date.now() - cacheData.timestamp

    // Check if cache is still valid
    if (age > CACHE_DURATION) {
      localStorage.removeItem(key)
      return null
    }

    return cacheData.data
  } catch (error) {
    console.warn('Failed to read from cache:', error)
    return null
  }
}

/**
 * Clear specific cache
 */
export function clearCache(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn('Failed to clear cache:', error)
  }
}

/**
 * Clear all application cache
 */
export function clearAllCache(): void {
  if (typeof window === 'undefined') return
  try {
    Object.values(CACHE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })
  } catch (error) {
    console.warn('Failed to clear all cache:', error)
  }
}

/**
 * Save draft client data
 */
export function saveClientDraft(clientData: any): void {
  saveToCache(CACHE_KEYS.CLIENT_DRAFT, clientData)
}

/**
 * Get draft client data
 */
export function getClientDraft(): any | null {
  return getFromCache(CACHE_KEYS.CLIENT_DRAFT)
}

/**
 * Clear client draft
 */
export function clearClientDraft(): void {
  clearCache(CACHE_KEYS.CLIENT_DRAFT)
}

/**
 * Save draft works data
 */
export function saveWorksDraft(worksData: any[]): void {
  saveToCache(CACHE_KEYS.WORKS_DRAFT, worksData)
}

/**
 * Get draft works data
 */
export function getWorksDraft(): any[] | null {
  return getFromCache(CACHE_KEYS.WORKS_DRAFT)
}

/**
 * Clear works draft
 */
export function clearWorksDraft(): void {
  clearCache(CACHE_KEYS.WORKS_DRAFT)
}

/**
 * Save clients cache
 */
export function saveClientsCache(clients: any[]): void {
  saveToCache(CACHE_KEYS.CLIENTS, clients)
}

/**
 * Get clients cache
 */
export function getClientsCache(): any[] | null {
  return getFromCache(CACHE_KEYS.CLIENTS)
}

export { CACHE_KEYS }


