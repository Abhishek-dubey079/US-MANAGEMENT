/**
 * Formatting utilities for dates, currency, and other data types
 */

/**
 * Format a date to a readable string (Indian locale)
 * @param date - Date object or string to format
 * @returns Formatted date string or '-' if date is invalid
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return '-'
  }
}

/**
 * Format a number as Indian Rupee currency
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a date for input fields (YYYY-MM-DD)
 * @param date - Date object or string
 * @returns Formatted date string for input[type="date"]
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  try {
    return new Date(date).toISOString().split('T')[0]
  } catch {
    return ''
  }
}


