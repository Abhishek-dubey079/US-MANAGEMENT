import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import PageHeader from '@/components/common/PageHeader'
import SectionCard from '@/components/common/SectionCard'
import ErrorBanner from '@/components/common/ErrorBanner'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface LoginFormData {
  username: string
  password: string
}

interface FormErrors {
  username?: string
  password?: string
}

const Login: NextPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [passwordChangedMessage, setPasswordChangedMessage] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Check for signup success message
  useEffect(() => {
    if (router.query.signup === 'success') {
      setShowSuccessMessage(true)
      // Clear the query parameter
      router.replace('/login', undefined, { shallow: true })
    }
  }, [router.query])

  // Check for password changed message
  useEffect(() => {
    if (router.query.passwordChanged === 'true') {
      setPasswordChangedMessage(true)
      // Clear the query parameter
      router.replace('/login', undefined, { shallow: true })
    }
  }, [router.query])

  const handleChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    
    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null)
    }
  }

  const handleBlur = (field: keyof LoginFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validateField(field, formData[field] || '')
  }

  const validateField = (field: keyof LoginFormData, value: string): boolean => {
    let validation: { isValid: boolean; error?: string } = { isValid: true }

    switch (field) {
      case 'username':
        if (!value || value.trim() === '') {
          validation = { isValid: false, error: 'Username is required' }
        } else {
          validation = { isValid: true }
        }
        break
      case 'password':
        if (!value || value.trim() === '') {
          validation = { isValid: false, error: 'Password is required' }
        } else {
          validation = { isValid: true }
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Validate all fields
    const usernameValid = validateField('username', formData.username)
    if (!usernameValid) {
      newErrors.username = errors.username
    }

    const passwordValid = validateField('password', formData.password)
    if (!passwordValid) {
      newErrors.password = errors.password
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setShowSuccessMessage(false)

    // Mark all fields as touched
    setTouched({
      username: true,
      password: true,
    })

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const { safeApiCall } = await import('@/utils/api.utils')
      
      await safeApiCall<{
        user: {
          id: string
          name: string
          username: string
          createdAt: string
        }
        message: string
      }>('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
        }),
      }, 3)

      // Success - session cookie is set by API, redirect to dashboard
      router.push('/')
    } catch (error) {
      console.error('Error during login:', error)
      const apiError = error as { message?: string }
      
      setSubmitError(apiError.message || 'Invalid username or password. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Head>
        <title>Login - Finance Management</title>
        <meta name="description" content="Sign in to your account" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <div className="mx-auto max-w-md">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Sign In</h1>
              <p className="mt-2 text-sm text-gray-600">Welcome back! Please sign in to your account</p>
            </div>

            {/* Form Card */}
            <SectionCard title="Login">
              {isSubmitting ? (
                <LoadingSpinner size="lg" text="Signing in..." className="py-8" />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {showSuccessMessage && (
                    <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                      <p className="text-sm font-medium text-green-800">
                        Account created successfully! Please sign in with your credentials.
                      </p>
                    </div>
                  )}

                  {passwordChangedMessage && (
                    <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                      <p className="text-sm font-medium text-green-800">
                        Password changed successfully! Please sign in with your new password.
                      </p>
                    </div>
                  )}

                  {submitError && (
                    <ErrorBanner message={submitError} className="mb-4" />
                  )}

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
                      placeholder="Enter your username"
                      autoComplete="username"
                    />
                    {errors.username && touched.username && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.username}</p>
                    )}
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
                        autoComplete="current-password"
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
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Signing In...' : 'Sign In'}
                    </button>
                  </div>

                  {/* Signup Link */}
                  <div className="pt-2 text-center">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{' '}
                      <a
                        href="/signup"
                        className="font-medium text-blue-600 hover:text-blue-500"
                      >
                        Sign up
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

export default Login

