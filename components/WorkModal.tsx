import { useState, useEffect } from 'react'
import type { CreateWorkInput } from '@/types'
import { formatDateForInput } from '@/utils/formatters'

interface WorkModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (work: CreateWorkInput) => void
  clientId?: string
}

export default function WorkModal({ isOpen, onClose, onSave, clientId = '' }: WorkModalProps) {
  const [formData, setFormData] = useState<CreateWorkInput>({
    clientId: clientId,
    purpose: '',
    fees: undefined,
    completionDate: undefined,
  })

  const [errors, setErrors] = useState<{
    purpose?: string
    fees?: string
  }>({})

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        clientId: clientId,
        purpose: '',
        fees: undefined,
        completionDate: undefined,
      })
      setErrors({})
    }
  }, [isOpen, clientId])

  const handleChange = (field: keyof CreateWorkInput, value: string | number | Date | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!formData.purpose || formData.purpose.trim() === '') {
      newErrors.purpose = 'Purpose of work is required'
    }

    if (formData.fees !== undefined && formData.fees < 0) {
      newErrors.fees = 'Fees cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      const workData: CreateWorkInput = {
        clientId: formData.clientId,
        purpose: formData.purpose.trim(),
        fees: formData.fees,
        completionDate: formData.completionDate,
        status: 'pending',
      }

      onSave(workData)
      onClose()
    }
  }

  const handleFeesChange = (value: string) => {
    if (value === '') {
      handleChange('fees', undefined)
      return
    }
    const numericValue = parseFloat(value)
    if (!isNaN(numericValue)) {
      handleChange('fees', numericValue)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200">
        {/* Modal Header */}
        <div className="border-b border-gray-200 px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Add Work</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4">
          <div className="space-y-4">
            {/* Purpose of Work */}
            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1.5">
                Purpose of Work <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="purpose"
                value={formData.purpose}
                onChange={(e) => handleChange('purpose', e.target.value)}
                className={`block w-full rounded-lg border ${
                  errors.purpose
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
                placeholder="Enter purpose of work"
              />
              {errors.purpose && (
                <p className="mt-1.5 text-sm text-red-600">{errors.purpose}</p>
              )}
            </div>

            {/* Fees */}
            <div>
              <label htmlFor="fees" className="block text-sm font-medium text-gray-700 mb-1.5">
                Fees
              </label>
              <input
                type="number"
                id="fees"
                value={formData.fees === undefined ? '' : formData.fees}
                onChange={(e) => handleFeesChange(e.target.value)}
                min="0"
                step="0.01"
                className={`block w-full rounded-lg border ${
                  errors.fees
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                } px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
                placeholder="0.00"
              />
              {errors.fees && (
                <p className="mt-1.5 text-sm text-red-600">{errors.fees}</p>
              )}
            </div>

            {/* Date of Completion */}
            <div>
              <label htmlFor="completionDate" className="block text-sm font-medium text-gray-700 mb-1.5">
                Date of Completion
              </label>
              <input
                type="date"
                id="completionDate"
                value={formatDateForInput(formData.completionDate)}
                onChange={(e) =>
                  handleChange('completionDate', e.target.value ? new Date(e.target.value) : undefined)
                }
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Work
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

