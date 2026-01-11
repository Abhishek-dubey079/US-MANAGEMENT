import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState } from 'react'
import PageHeader from '@/components/common/PageHeader'
import SectionCard from '@/components/common/SectionCard'
import ErrorBanner from '@/components/common/ErrorBanner'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { validateRequired } from '@/utils/validation'
import { safeApiCall } from '@/utils/api.utils'
import type { ApiError } from '@/utils/api.utils'

interface SignupFormData {
  name: string
  username: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  name?: string
  username?: string
  password?: string
  confirmPassword?: string
}

const Signup: NextPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (field: keyof SignupFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    
    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null)
    }

    // If confirmPassword changes, re-validate password match
    if (field === 'confirmPassword' || field === 'password') {
      if (touched.confirmPassword && formData.password && formData.confirmPassword) {
        validatePasswordMatch()
      }
    }
  }

  const handleBlur = (field: keyof SignupFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validateField(field, formData[field] || '')
  }

  const validateField = (field: keyof SignupFormData, value: string): boolean => {
    let validation: { isValid: boolean; error?: string } = { isValid: true }

    switch (field) {
      case 'name':
        validation = validateRequired(value, 'Full Name')
        break
      case 'username':
        if (!value || value.trim() === '') {
          validation = { isValid: false, error: 'Username is required' }
        } else if (value.length < 3) {
          validation = { isValid: false, error: 'Username must be at least 3 characters long' }
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          validation = { isValid: false, error: 'Username can only contain letters, numbers, and underscores' }
        } else {
          validation = { isValid: true }
        }
        break
      case 'password':
        if (!value || value.trim() === '') {
          validation = { isValid: false, error: 'Password is required' }
        } else if (value.length < 6) {
          validation = { isValid: false, error: 'Password must be at least 6 characters long' }
        } else {
          validation = { isValid: true }
        }
        // Also validate password match if confirmPassword is filled
        if (touched.confirmPassword && formData.confirmPassword) {
          validatePasswordMatch()
        }
        break
      case 'confirmPassword':
        if (!value || value.trim() === '') {
          validation = { isValid: false, error: 'Please confirm your password' }
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
    if (formData.password !== formData.confirmPassword) {
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
    const nameValid = validateField('name', formData.name)
    if (!nameValid) {
      newErrors.name = errors.name
    }

    const usernameValid = validateField('username', formData.username)
    if (!usernameValid) {
      newErrors.username = errors.username
    }

    const passwordValid = validateField('password', formData.password)
    if (!passwordValid) {
      newErrors.password = errors.password
    }

    const confirmPasswordValid = validateField('confirmPassword', formData.confirmPassword)
    if (!confirmPasswordValid) {
      newErrors.confirmPassword = errors.confirmPassword
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    // Mark all fields as touched
    setTouched({
      name: true,
      username: true,
      password: true,
      confirmPassword: true,
    })

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await safeApiCall<{
        user: {
          id: string
          name: string
          username: string
          createdAt: string
        }
        message: string
      }>('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          username: formData.username.trim(),
          password: formData.password,
        }),
      }, 3)

      // Success - redirect to login page
      router.push('/login?signup=success')
    } catch (error) {
      console.error('Error during signup:', error)
      const apiError = error as ApiError
      
      // Handle specific error cases
      if (apiError.message?.includes('Username already exists') || apiError.message?.includes('already exists')) {
        setErrors((prev) => ({ ...prev, username: 'Username already exists. Please choose a different username.' }))
      } else {
        setSubmitError(apiError.message || 'Failed to create account. Please try again.')
      }
      
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>Sign Up - Finance Management</title>
        <meta name="description" content="Create a new account" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mx-auto max-w-md">
            {/* Header */}
            <PageHeader 
              title="Create Account"
              subtitle="Sign up to get started with Finance Management"
              backUrl="/"
              backLabel="Back to Home"
            />

            {/* Form Card */}
            <SectionCard title="Sign Up">
              {isSubmitting ? (
                <LoadingSpinner size="lg" text="Creating your account..." className="py-8" />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {submitError && (
                    <ErrorBanner message={submitError} className="mb-4" />
                  )}

                  {/* Full Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
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
                      placeholder="Enter your full name"
                    />
                    {errors.name && touched.name && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Username */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleChange('username', e.target.value)}
                      onBlur={() => handleBlur('username')}
                      className={`block w-full rounded-lg border ${
                        errors.username && touched.username
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                      } px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
                      placeholder="Choose a unique username"
                    />
                    {errors.username && touched.username && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.username}</p>
                    )}
                    <p className="mt-1.5 text-xs text-gray-500">
                      Username must be at least 3 characters and can only contain letters, numbers, and underscores
                    </p>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        onBlur={() => handleBlur('password')}
                        className={`block w-full rounded-lg border ${
                          errors.password && touched.password
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        } px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
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
                    {errors.password && touched.password && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>
                    )}
                    <p className="mt-1.5 text-xs text-gray-500">
                      Password must be at least 6 characters long
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
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
                        placeholder="Confirm your password"
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
                      {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                    </button>
                  </div>

                  {/* Login Link */}
                  <div className="pt-2 text-center">
                    <p className="text-sm text-gray-600">
                      Already have an account?{' '}
                      <a
                        href="/login"
                        className="font-medium text-blue-600 hover:text-blue-500"
                      >
                        Sign in
                      </a>
                    </p>
                  </div>
                </form>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </>
  )
}

export default Signup

