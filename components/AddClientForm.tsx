import { useState } from 'react'
import { validateRequired, validatePAN, validateAadhaar, validatePhone } from '@/utils/validation'
import type { CreateClientInput } from '@/types'

interface AddClientFormProps {
  onSubmit: (data: CreateClientInput) => void
  onCancel?: () => void
}

interface FormErrors {
  name?: string
  pan?: string
  aadhaar?: string
  phone?: string
}

export default function AddClientForm({ onSubmit, onCancel }: AddClientFormProps) {
  const [formData, setFormData] = useState<CreateClientInput>({
    name: '',
    pan: '',
    aadhaar: '',
    address: '',
    phone: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const handleChange = (field: keyof CreateClientInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleBlur = (field: keyof CreateClientInput) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validateField(field, formData[field] || '')
  }

  const validateField = (field: keyof CreateClientInput, value: string) => {
    let validation: { isValid: boolean; error?: string } = { isValid: true }

    switch (field) {
      case 'name':
        validation = validateRequired(value, 'Client Name')
        break
      case 'pan':
        validation = validatePAN(value)
        break
      case 'aadhaar':
        validation = validateAadhaar(value)
        break
      case 'phone':
        validation = validatePhone(value)
        break
    }

    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, [field]: validation.error }))
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

    return validation.isValid
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate all fields
    const nameValid = validateField('name', formData.name || '')
    if (!nameValid) {
      newErrors.name = errors.name
    }

    if (formData.pan) {
      const panValid = validateField('pan', formData.pan)
      if (!panValid) {
        newErrors.pan = errors.pan
      }
    }

    if (formData.aadhaar) {
      const aadhaarValid = validateField('aadhaar', formData.aadhaar)
      if (!aadhaarValid) {
        newErrors.aadhaar = errors.aadhaar
      }
    }

    if (formData.phone) {
      const phoneValid = validateField('phone', formData.phone)
      if (!phoneValid) {
        newErrors.phone = errors.phone
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0 && nameValid
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched
    setTouched({
      name: true,
      pan: true,
      aadhaar: true,
      phone: true,
      address: true,
    })

    if (validateForm()) {
      // Normalize data before submitting
      const normalizedData: CreateClientInput = {
        name: formData.name.trim(),
        pan: formData.pan?.trim() || undefined,
        aadhaar: formData.aadhaar?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
      }

      onSubmit(normalizedData)
    }
  }

  const handlePhoneChange = (value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, '')
    // Limit to 10 digits
    const limitedValue = numericValue.slice(0, 10)
    handleChange('phone', limitedValue)
  }

  const handleAadhaarChange = (value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, '')
    // Limit to 12 digits
    const limitedValue = numericValue.slice(0, 12)
    handleChange('aadhaar', limitedValue)
  }

  const handlePANChange = (value: string) => {
    // Convert to uppercase and remove spaces
    const upperValue = value.toUpperCase().replace(/\s/g, '')
    // Limit to 10 characters
    const limitedValue = upperValue.slice(0, 10)
    handleChange('pan', limitedValue)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
          Client Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          onBlur={() => handleBlur('name')}
          className={`block w-full rounded-lg border ${
            errors.name && touched.name
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          } px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
          placeholder="Enter client or company name"
        />
        {errors.name && touched.name && (
          <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* PAN Number */}
      <div>
        <label htmlFor="pan" className="block text-sm font-medium text-gray-700 mb-1.5">
          PAN Number
        </label>
        <input
          type="text"
          id="pan"
          value={formData.pan}
          onChange={(e) => handlePANChange(e.target.value)}
          onBlur={() => handleBlur('pan')}
          className={`block w-full rounded-lg border ${
            errors.pan && touched.pan
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          } px-3 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
          placeholder="ABCDE1234F"
          maxLength={10}
        />
        {errors.pan && touched.pan && (
          <p className="mt-1.5 text-sm text-red-600">{errors.pan}</p>
        )}
        {!errors.pan && touched.pan && (
          <p className="mt-1.5 text-xs text-gray-500">Format: 5 letters, 4 digits, 1 letter</p>
        )}
      </div>

      {/* Aadhaar Number */}
      <div>
        <label htmlFor="aadhaar" className="block text-sm font-medium text-gray-700 mb-1.5">
          Aadhaar Number
        </label>
        <input
          type="text"
          id="aadhaar"
          value={formData.aadhaar}
          onChange={(e) => handleAadhaarChange(e.target.value)}
          onBlur={() => handleBlur('aadhaar')}
          className={`block w-full rounded-lg border ${
            errors.aadhaar && touched.aadhaar
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          } px-3 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
          placeholder="123456789012"
          maxLength={12}
        />
        {errors.aadhaar && touched.aadhaar && (
          <p className="mt-1.5 text-sm text-red-600">{errors.aadhaar}</p>
        )}
        {!errors.aadhaar && touched.aadhaar && (
          <p className="mt-1.5 text-xs text-gray-500">Must be exactly 12 digits</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
          Address
        </label>
        <textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          rows={4}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter client address"
        />
      </div>

      {/* Phone Number */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
          Phone Number
        </label>
        <input
          type="text"
          id="phone"
          value={formData.phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          onBlur={() => handleBlur('phone')}
          className={`block w-full rounded-lg border ${
            errors.phone && touched.phone
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
          } px-3 py-2.5 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
          placeholder="9876543210"
          maxLength={10}
        />
        {errors.phone && touched.phone && (
          <p className="mt-1.5 text-sm text-red-600">{errors.phone}</p>
        )}
        {!errors.phone && touched.phone && (
          <p className="mt-1.5 text-xs text-gray-500">Must be exactly 10 digits</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Save Client Info
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

