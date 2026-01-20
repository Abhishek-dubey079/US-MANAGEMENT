/**
 * Validation utilities for form fields
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validate PAN number (10 characters: 5 letters, 4 digits, 1 letter)
 */
export function validatePAN(pan: string): ValidationResult {
  if (!pan || pan.trim() === '') {
    return { isValid: true } // PAN is optional
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  const normalizedPAN = pan.toUpperCase().trim()

  if (!panRegex.test(normalizedPAN)) {
    return {
      isValid: false,
      error: 'PAN must be 10 characters: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)',
    }
  }

  return { isValid: true }
}

/**
 * Validate Aadhaar number (12 digits)
 */
export function validateAadhaar(aadhaar: string): ValidationResult {
  if (!aadhaar || aadhaar.trim() === '') {
    return { isValid: true } // Aadhaar is optional
  }

  const aadhaarRegex = /^[0-9]{12}$/
  const normalizedAadhaar = aadhaar.trim().replace(/\s/g, '')

  if (!aadhaarRegex.test(normalizedAadhaar)) {
    return {
      isValid: false,
      error: 'Aadhaar must be exactly 12 digits',
    }
  }

  return { isValid: true }
}

/**
 * Validate phone number (10 digits, numeric only)
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim() === '') {
    return { isValid: true } // Phone is optional
  }

  const phoneRegex = /^[0-9]{10}$/
  const normalizedPhone = phone.trim().replace(/\s/g, '')

  if (!phoneRegex.test(normalizedPhone)) {
    return {
      isValid: false,
      error: 'Phone number must be exactly 10 digits',
    }
  }

  return { isValid: true }
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    }
  }

  return { isValid: true }
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * - Contains at least one special character
 */
export function validatePasswordStrength(password: string): ValidationResult {
  if (!password || password.trim() === '') {
    return {
      isValid: false,
      error: 'Password is required',
    }
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters long',
    }
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one uppercase letter',
    }
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one lowercase letter',
    }
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one number',
    }
  }

  // Check for at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      isValid: false,
      error: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)',
    }
  }

  return { isValid: true }
}





