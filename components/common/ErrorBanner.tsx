/**
 * Reusable error banner component
 */

interface ErrorBannerProps {
  message: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

export default function ErrorBanner({ 
  message, 
  onRetry, 
  retrying = false,
  className = '' 
}: ErrorBannerProps) {
  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-800">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="ml-4 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 flex-shrink-0"
          >
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  )
}


