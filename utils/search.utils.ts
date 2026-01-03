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
 * Supports partial matching (e.g., "td" matches "TDS")
 */
export function containsKeywords(text: string, keywords: readonly string[]): string[] {
  const lowerText = text.toLowerCase()
  return keywords.filter((keyword) => lowerText.includes(keyword.toLowerCase()))
}

/**
 * Check if a query partially matches any keyword (case-insensitive)
 * Returns the matched keyword if found, null otherwise
 * Example: "td" → "TDS", "gst" → "GST"
 */
export function findMatchingKeyword(query: string, keywords: readonly string[]): string | null {
  const lowerQuery = query.toLowerCase().trim()
  if (!lowerQuery) return null
  
  // Check if query matches any keyword (partial or full)
  const matched = keywords.find((keyword) => {
    const lowerKeyword = keyword.toLowerCase()
    // Full match or partial match (query is substring of keyword or vice versa)
    return lowerKeyword.includes(lowerQuery) || lowerQuery.includes(lowerKeyword)
  })
  
  return matched || null
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

  // Score work purpose matches (prioritize work-based matches)
  if (client.works && Array.isArray(client.works)) {
    client.works.forEach((work: any) => {
      const purpose = (work.purpose || '').toLowerCase()
      
      // Check if query matches a keyword (partial or full)
      const matchingKeyword = findMatchingKeyword(query, keywords)
      
      if (matchingKeyword && purpose.includes(matchingKeyword.toLowerCase())) {
        // Higher score for keyword matches in work purpose (prioritize work-based search)
        score += 25 // Increased from 15 to prioritize work matches
        matchedKeywords.push(matchingKeyword)
        if (!matchedFields.includes('work')) matchedFields.push('work')
      } else if (purpose.includes(lowerQuery)) {
        // Regular work purpose match
        score += 5
        if (!matchedFields.includes('work')) matchedFields.push('work')
      }

      // Also check for any keyword matches in work purpose
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
 * Highlight work purpose text with matched keywords
 * Returns HTML with light background and bold text for matches
 */
export function highlightWorkPurpose(
  purpose: string,
  query: string,
  keywords: readonly string[]
): string {
  if (!purpose) return purpose

  const lowerPurpose = purpose.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()
  const matchingKeyword = findMatchingKeyword(query, keywords)
  
  // Find matches: keyword matches take priority
  const matches: Array<{ start: number; end: number; isKeyword: boolean }> = []
  
  // Check for keyword match first (e.g., "td" → "TDS")
  if (matchingKeyword) {
    const lowerKeyword = matchingKeyword.toLowerCase()
    let index = lowerPurpose.indexOf(lowerKeyword, 0)
    while (index !== -1) {
      matches.push({
        start: index,
        end: index + matchingKeyword.length,
        isKeyword: true,
      })
      index = lowerPurpose.indexOf(lowerKeyword, index + 1)
    }
  }
  
  // Check for query match if not already covered by keyword
  if (lowerQuery && !matchingKeyword) {
    let index = lowerPurpose.indexOf(lowerQuery, 0)
    while (index !== -1) {
      // Check if this overlaps with existing matches
      const overlaps = matches.some(
        (m) => index >= m.start && index < m.end
      )
      if (!overlaps) {
        matches.push({
          start: index,
          end: index + lowerQuery.length,
          isKeyword: false,
        })
      }
      index = lowerPurpose.indexOf(lowerQuery, index + 1)
    }
  }
  
  // Sort matches by position
  matches.sort((a, b) => a.start - b.start)
  
  // Build highlighted string
  if (matches.length === 0) return purpose
  
  let result = ''
  let lastIndex = 0
  
  matches.forEach((match) => {
    // Add text before match
    if (match.start > lastIndex) {
      result += purpose.substring(lastIndex, match.start)
    }
    
    // Add highlighted match (light background, bold text)
    const matchText = purpose.substring(match.start, match.end)
    result += `<mark class="bg-yellow-100 font-bold px-0.5 rounded">${matchText}</mark>`
    
    lastIndex = match.end
  })
  
  // Add remaining text
  if (lastIndex < purpose.length) {
    result += purpose.substring(lastIndex)
  }
  
  return result || purpose
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

