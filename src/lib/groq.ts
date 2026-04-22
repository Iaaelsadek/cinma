// lib/groq.ts - AI Client for Frontend (Optimized based on benchmarks)
// Summary: Mistral open-mistral-nemo (1.5s avg)
// Recommendations: Groq llama-3.3-70b (283ms avg)
import { logger } from './logger'

/**
 * Generate Arabic summary using Mistral AI backend (open-mistral-nemo)
 * Benchmark: 1,521ms avg, 205 tokens/sec - Best for Arabic
 */
export const generateArabicSummary = async (
  title: string,
  originalOverview?: string
): Promise<string> => {
  if (!title) return originalOverview || 'لا يوجد وصف متاح'
  if (!originalOverview) return 'لا يوجد وصف متاح'

  try {
    const res = await fetch('/api/groq-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, overview: originalOverview })
    })

    if (!res.ok) {
      return originalOverview || 'لا يوجد وصف متاح'
    }

    const data = await res.json() as { summary?: string }
    const summary = (data.summary || '').trim()

    if (!summary) return originalOverview || 'لا يوجد وصف متاح'
    return summary
  } catch (err: any) {
    logger.warn('[AI] backend summary failed:', err)
    return originalOverview || 'لا يوجد وصف متاح'
  }
}

/**
 * Search term correction (currently returns as-is, can be enhanced later)
 */
export const correctSearchTerm = async (query: string): Promise<string> => {
  return query
}

/**
 * AI Insights - Disabled for security reasons
 */
export const generateAiInsights = async (
  _title: string,
  _type: 'movie' | 'tv',
  _overview?: string
): Promise<string[]> => {
  return []
}

/**
 * Smart search processing - Disabled on frontend
 */
export const processSmartSearch = async (_query: string): Promise<any> => {
  return null
}

/**
 * AI Playlist generation - Disabled on frontend
 */
export const generateAiPlaylist = async (_theme?: string, _history?: string): Promise<any> => {
  return null
}

/**
 * Translate title to Arabic using CockroachDB + MyMemory fallback
 */
export const translateTitleToArabic = async (title: string): Promise<string> => {
  if (!title) return ''

  // 1) Already Arabic
  if (/[\u0600-\u06FF]/.test(title)) return title

  // 2) Too short or numbers only
  if (title.length < 3 || /^\d+$/.test(title)) return title

  // 3) Cache in localStorage
  const cacheKey = `ar_title_cache_${title.toLowerCase().trim()}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) return cached

  // 4) CockroachDB translations table via API
  try {
    const response = await fetch(`/api/translations/general/${encodeURIComponent(title)}`)
    
    if (response.ok) {
      const data = await response.json()
      if (data && data.arabic_title) {
        localStorage.setItem(cacheKey, data.arabic_title)
        return data.arabic_title
      }
    }
  } catch {
    // Ignore network errors
  }

  let finalTranslation = title

  // 5) Fallback: MyMemory
  const backoffKey = 'mymemory_backoff_until'
  const backoffUntil = localStorage.getItem(backoffKey)
  const isBackedOff = backoffUntil && Date.now() < parseInt(backoffUntil)

  if (!isBackedOff) {
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(title)}&langpair=en|ar`
      )

      if (res.status === 429) {
        logger.warn('[Translation] MyMemory rate limit reached. Pausing requests for 1 hour.')
        localStorage.setItem(backoffKey, String(Date.now() + 3600000))
      } else {
        const data = await res.json()
        if (data.responseData && data.responseData.translatedText) {
          const translated = data.responseData.translatedText
          if (!translated.includes('MYMEMORY') && !translated.includes('QUERY LENGTH LIMIT')) {
            finalTranslation = translated
            localStorage.setItem(cacheKey, finalTranslation)

            // Save to CockroachDB API
            fetch('/api/translations/general', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                original_title: title,
                arabic_title: finalTranslation
              })
            }).catch(() => {})
          }
        }
      }
    } catch {
      // Ignore network errors
    }
  }

  return finalTranslation
}
