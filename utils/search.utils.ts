/**
 * Search and keyword utilities
 */

export const KEYWORDS = ['GST', 'TDS', 'ITR', 'AUDIT'] as const

export type Keyword = typeof KEYWORDS[number]

export interface SearchMatch {
  client: any
  score: number
  matchedKeywords: string[]
  matchedFields: string[]
}

/**
 * Check if a string contains any keywords (case-insensitive)
 */
export function containsKeywords(text: string, keywords: readonly string[]): string[] {
  const lowerText = text.toLowerCase()
  return keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase()))
}

/**
 * Calculate search relevance score for a client
 * Scoring system:
 * - Keyword in name: +20 points per keyword
 * - Keyword in work: +15 points per keyword
 * - Regular name match: +10 points
 * - Regular work match: +5 points
 * Higher score = better match, shown first in results
 */
export function calculateSearchScore(
  client: any,
  query: string,
  keywords: readonly string[]
): { score: number; matchedKeywords: string[]; matchedFields: string[] } {
  const lowerQuery = query.toLowerCase().trim()
  const matchedKeywords: string[] = []
  const matchedFields: string[] = []
  let score = 0

  // Score client name matches
  const clientName = (client.name || '').toLowerCase()
  if (clientName.includes(lowerQuery)) {
    score += 10
    matchedFields.push('name')
  }

  // Higher score for keyword matches in client name
  const nameKeywords = containsKeywords(client.name || '', keywords)
  if (nameKeywords.length > 0) {
    score += nameKeywords.length * 20
    matchedKeywords.push(...nameKeywords)
    if (!matchedFields.includes('name')) matchedFields.push('name')
  }

  // Score work purpose matches
  if (client.works && Array.isArray(client.works)) {
    client.works.forEach((work: any) => {
      const purpose = (work.purpose || '').toLowerCase()
      if (purpose.includes(lowerQuery)) {
        score += 5
        if (!matchedFields.includes('work')) matchedFields.push('work')
      }

      // Higher score for keyword matches in work purpose
      const purposeKeywords = containsKeywords(work.purpose || '', keywords)
      if (purposeKeywords.length > 0) {
        score += purposeKeywords.length * 15
        matchedKeywords.push(...purposeKeywords)
        if (!matchedFields.includes('work')) matchedFields.push('work')
      }
    })
  }

  return {
    score,
    matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicate keywords
    matchedFields: [...new Set(matchedFields)], // Remove duplicate fields
  }
}

/**
 * Highlight matching text in a string
 */
export function highlightText(
  text: string,
  query: string,
  keywords: readonly string[]
): string {
  if (!text) return text

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()
  const parts: Array<{ text: string; isHighlighted: boolean; type: 'keyword' | 'query' | 'none' }> = []
  let lastIndex = 0

  // Find all matches with their positions
  const matches: Array<{ start: number; end: number; type: 'keyword' | 'query' }> = []

  // Find keyword matches
  keywords.forEach((keyword) => {
    const lowerKeyword = keyword.toLowerCase()
    let index = lowerText.indexOf(lowerKeyword, 0)
    while (index !== -1) {
      matches.push({
        start: index,
        end: index + keyword.length,
        type: 'keyword',
      })
      index = lowerText.indexOf(lowerKeyword, index + 1)
    }
  })

  // Find query matches (if not a keyword)
  if (lowerQuery && !keywords.some((k) => lowerQuery === k.toLowerCase())) {
    let index = lowerText.indexOf(lowerQuery, 0)
    while (index !== -1) {
      // Check if this query match overlaps with a keyword match
      const overlaps = matches.some(
        (m) => m.type === 'keyword' && index >= m.start && index < m.end
      )
      if (!overlaps) {
        matches.push({
          start: index,
          end: index + lowerQuery.length,
          type: 'query',
        })
      }
      index = lowerText.indexOf(lowerQuery, index + 1)
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start)

  // Merge overlapping matches (keywords take priority)
  const mergedMatches: typeof matches = []
  matches.forEach((match) => {
    const overlapping = mergedMatches.find(
      (m) => !(match.end <= m.start || match.start >= m.end)
    )
    if (!overlapping) {
      mergedMatches.push(match)
    } else if (match.type === 'keyword' && overlapping.type === 'query') {
      // Replace query match with keyword match
      const index = mergedMatches.indexOf(overlapping)
      mergedMatches[index] = match
    }
  })

  // Build highlighted string
  mergedMatches.forEach((match) => {
    // Add text before match
    if (match.start > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.start),
        isHighlighted: false,
        type: 'none',
      })
    }

    // Add highlighted match
    const matchText = text.substring(match.start, match.end)
    parts.push({
      text: matchText,
      isHighlighted: true,
      type: match.type,
    })

    lastIndex = match.end
  })

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isHighlighted: false,
      type: 'none',
    })
  }

  // If no matches, return original text
  if (parts.length === 0) {
    return text
  }

  // Build HTML string
  return parts
    .map((part) => {
      if (!part.isHighlighted) {
        return part.text
      }
      const className =
        part.type === 'keyword'
          ? 'bg-yellow-200 font-semibold'
          : 'bg-blue-200 font-semibold'
      return `<mark class="${className}">${part.text}</mark>`
    })
    .join('')
}

