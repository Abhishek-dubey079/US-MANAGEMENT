import type { CreateWorkInput } from '@/types'
import { formatDate, formatCurrency } from '@/utils/formatters'

interface WorksListProps {
  works: CreateWorkInput[]
  onRemove?: (index: number) => void
}

export default function WorksList({ works, onRemove }: WorksListProps) {
  if (works.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">No works added yet. Click {'"ADD WORK"'} to add one.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {works.map((work, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900">{work.purpose}</h4>
                <div className="mt-2 flex gap-4 text-xs text-gray-600">
                  <span>
                    <span className="font-medium">Fees:</span> {formatCurrency(work.fees)}
                  </span>
                  <span>
                    <span className="font-medium">Completion:</span> {formatDate(work.completionDate)}
                  </span>
                </div>
              </div>
              {onRemove && (
                <button
                  onClick={() => onRemove(index)}
                  className="ml-4 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Remove work"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

