import type { NextPage, GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import PageHeader from '@/components/common/PageHeader'
import SectionCard from '@/components/common/SectionCard'
import ErrorBanner from '@/components/common/ErrorBanner'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { requireAuth } from '@/utils/auth.server'
import { safeApiCall } from '@/utils/api.utils'
import type { ApiError } from '@/utils/api.utils'
import { validatePasswordStrength } from '@/utils/validation'
import { logout } from '@/utils/auth.utils'

interface ChangePasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface FormErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

const Settings: NextPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (field: keyof ChangePasswordFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    
    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null)
    }

    // Clear success message when user makes changes
    if (successMessage) {
      setSuccessMessage(null)
    }

    // If confirmPassword changes, re-validate password match
    if (field === 'confirmPassword' || field === 'newPassword') {
      if (touched.confirmPassword && formData.newPassword && formData.confirmPassword) {
        validatePasswordMatch()
      }
    }
  }

  const handleBlur = (field: keyof ChangePasswordFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validateField(field, formData[field] || '')
  }

  const validateField = (field: keyof ChangePasswordFormData, value: string): boolean => {
    let validation: { isValid: boolean; error?: string } = { isValid: true }

    switch (field) {
      case 'currentPassword':
        if (!value || value.trim() === '') {
          validation = { isValid: false, error: 'Current password is required' }
        } else {
          validation = { isValid: true }
        }
        break
      case 'newPassword':
        if (!value || value.trim() === '') {
          validation = { isValid: false, error: 'New password is required' }
        } else if (value === formData.currentPassword) {
          validation = { isValid: false, error: 'New password must be different from current password' }
        } else {
          // Use password strength validation
          validation = validatePasswordStrength(value)
        }
        // Also validate password match if confirmPassword is filled
        if (touched.confirmPassword && formData.confirmPassword) {
          validatePasswordMatch()
        }
        break
      case 'confirmPassword':
        if (!value || value.trim() === '') {
          validation = { isValid: false, error: 'Please confirm your new password' }
        } else {
          validation = validatePasswordMatch()
        }
        break
    }

    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, [field]: validation.error }))
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }

    return validation.isValid
  }

  const validatePasswordMatch = (): { isValid: boolean; error?: string } => {
    if (formData.newPassword !== formData.confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: 'Passwords do not match' }))
      return { isValid: false, error: 'Passwords do not match' }
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
      return { isValid: true }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate all fields
    const currentPasswordValid = validateField('currentPassword', formData.currentPassword)
    if (!currentPasswordValid) {
      newErrors.currentPassword = errors.currentPassword
    }

    const newPasswordValid = validateField('newPassword', formData.newPassword)
    if (!newPasswordValid) {
      newErrors.newPassword = errors.newPassword
    }

    const confirmPasswordValid = validateField('confirmPassword', formData.confirmPassword)
    if (!confirmPasswordValid) {
      newErrors.confirmPassword = errors.confirmPassword
    }

    // Validate password match
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSuccessMessage(null)

    // Mark all fields as touched
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    })

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await safeApiCall<{
        message: string
        requiresReLogin?: boolean
      }>('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      }, 3)

      // Success - show success message and redirect to login after a short delay
      setSuccessMessage(response.message || 'Password changed successfully!')
      
      // Force re-login: redirect to login page after showing success message
      setTimeout(() => {
        router.push('/login?passwordChanged=true')
      }, 2000)
    } catch (error) {
      console.error('Error changing password:', error)
      const apiError = error as ApiError
      
      // Handle specific error cases
      if (apiError.message?.includes('Current password is incorrect') || apiError.message?.includes('Invalid password')) {
        setErrors((prev) => ({ ...prev, currentPassword: 'Current password is incorrect' }))
      } else {
        setSubmitError(apiError.message || 'Failed to change password. Please try again.')
      }
      
      setIsSubmitting(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      // Redirect to login page after logout
      router.push('/login')
    } catch (error) {
      console.error('Error during logout:', error)
      // Still redirect even if logout API call fails
      router.push('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <Head>
        <title>Security Settings - Finance Management</title>
        <meta name="description" content="Manage your security settings" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <PageHeader 
              title="Security Settings"
              subtitle="Manage your account security and password"
            />

            {/* Change Password Section */}
            <SectionCard title="Change Password">
              {isSubmitting ? (
                <LoadingSpinner size="lg" text="Changing password..." className="py-8" />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {successMessage && (
                    <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                      <p className="text-sm font-medium text-green-800">{successMessage}</p>
                    </div>
                  )}

                  {submitError && (
                    <ErrorBanner message={submitError} className="mb-4" />
                  )}

                  {/* Current Password */}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        id="currentPassword"
                        value={formData.currentPassword}
                        onChange={(e) => handleChange('currentPassword', e.target.value)}
                        onBlur={() => handleBlur('currentPassword')}
                        className={`block w-full rounded-lg border ${
                          errors.currentPassword && touched.currentPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        } px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
                        placeholder="Enter your current password"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCurrentPassword ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L9.88 9.88m-3.59-3.59l3.29 3.29M12 12l.01.01M21 12c-1.275 4.057-5.065 7-9.543 7a9.97 9.97 0 01-1.563-.029m-5.858-.908a3 3 0 114.243-4.243m0 0L3 3m18 18L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.currentPassword && touched.currentPassword && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.currentPassword}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        id="newPassword"
                        value={formData.newPassword}
                        onChange={(e) => handleChange('newPassword', e.target.value)}
                        onBlur={() => handleBlur('newPassword')}
                        className={`block w-full rounded-lg border ${
                          errors.newPassword && touched.newPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        } px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
                        placeholder="Enter your new password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L9.88 9.88m-3.59-3.59l3.29 3.29M12 12l.01.01M21 12c-1.275 4.057-5.065 7-9.543 7a9.97 9.97 0 01-1.563-.029m-5.858-.908a3 3 0 114.243-4.243m0 0L3 3m18 18L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.newPassword && touched.newPassword && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.newPassword}</p>
                    )}
                    <p className="mt-1.5 text-xs text-gray-500">
                      Password must be at least 8 characters and include uppercase, lowercase, number, and special character
                    </p>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        className={`block w-full rounded-lg border ${
                          errors.confirmPassword && touched.confirmPassword
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        } px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
                        placeholder="Confirm your new password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L9.88 9.88m-3.59-3.59l3.29 3.29M12 12l.01.01M21 12c-1.275 4.057-5.065 7-9.543 7a9.97 9.97 0 01-1.563-.029m-5.858-.908a3 3 0 114.243-4.243m0 0L3 3m18 18L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && touched.confirmPassword && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              )}
            </SectionCard>

            {/* Logout Section */}
            <SectionCard title="Account" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Logout</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Sign out of your account. You will need to log in again to access protected pages.
                  </p>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? (
                      <span className="flex items-center">
                        <svg
                          className="mr-2 h-4 w-4 animate-spin"
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
                        Logging out...
                      </span>
                    ) : (
                      'Logout'
                    )}
                  </button>
                </div>
              </div>
            </SectionCard>
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

export default Settings

