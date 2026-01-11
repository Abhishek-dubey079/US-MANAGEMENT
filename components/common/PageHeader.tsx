/**
 * Reusable page header component with back button
 */

import { useRouter } from 'next/router'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backUrl?: string
  backLabel?: string
}

export default function PageHeader({ 
  title, 
  subtitle,
  backUrl = '/',
  backLabel = 'Back to Dashboard'
}: PageHeaderProps) {
  const router = useRouter()

  return (
    <div className="mb-6">
      <button
        onClick={() => router.push(backUrl)}
        className="mb-4 flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <svg
          className="mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        {backLabel}
      </button>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
    </div>
  )
}



