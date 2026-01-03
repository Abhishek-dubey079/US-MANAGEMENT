/**
 * API utility functions with retry logic and error handling
 */

export interface ApiError {
  message: string
  status?: number
  details?: string
}

/**
 * Fetch with retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  retryDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      // Retry on server errors (5xx) or network errors
      if (response.status >= 500 || response.status === 0) {
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
          continue
        }
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Network error')
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * Handle API response with proper error handling
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'An error occurred'
    let errorDetails: string | undefined

    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
      errorDetails = errorData.details
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
    }

    const error: ApiError = {
      message: errorMessage,
      status: response.status,
      details: errorDetails,
    }

    throw error
  }

  return response.json()
}

/**
 * Safe API call with error handling
 */
export async function safeApiCall<T>(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  try {
    const response = await fetchWithRetry(url, options, retries)
    return handleApiResponse<T>(response)
  } catch (error) {
    if (error instanceof Error) {
      throw {
        message: error.message,
        status: 0,
        details: 'Network or connection error',
      } as ApiError
    }
    throw error
  }
}


