import { ClientWithWorks } from '@/types'

/**
 * Gets the current GST cycle month (YYYY-MM).
 * The cycle resets on the 27th of every month for the next month.
 */
export function getCurrentCycleMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  const day = now.getDate()

  let targetDate: Date
  if (day >= 27) {
    // If today is 27th or later, the cycle is for the NEXT month
    targetDate = new Date(year, month + 1, 1)
  } else {
    // Otherwise, the cycle is for the CURRENT month
    targetDate = new Date(year, month, 1)
  }

  const targetYear = targetDate.getFullYear()
  const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0')
  return `${targetYear}-${targetMonth}`
}

/**
 * Checks if today is the 10th or later of the month.
 * GST reminders only become active from the 10th.
 */
export function isReminderActive(): boolean {
  const now = new Date()
  return now.getDate() >= 10
}

const GST_KEYWORDS = ['GST', 'GSTR', 'REGISTRATION', 'FILING', 'RETURN']

/**
 * Detects if a client has GST-related work.
 * Checks existing work/service types for GST keywords.
 */
export function isGstClient(client: ClientWithWorks): boolean {
  return getGstWorks(client).length > 0
}

/**
 * Filters and returns only GST-related works for a client.
 */
export function getGstWorks(client: any): any[] {
  const works = client.works || []

  return works.filter((work: any) => {
    const purpose = (work.purpose || '').toUpperCase()
    return GST_KEYWORDS.some(keyword => purpose.includes(keyword))
  })
}

/**
 * Returns the descriptive name for the current cycle month.
 * Example: "February 2026"
 */
export function getCycleMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
