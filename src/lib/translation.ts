/**
 * Translation utilities - Using CockroachDB API only
 * 
 * DEPRECATED: TMDB API calls removed - all translations stored in database
 * Use title_ar, title_en, overview_ar, overview_en from database directly
 */

export interface TranslatedContent {
  title_ar?: string
  overview_ar?: string
  title_en?: string
  overview_en?: string
}

const cleanText = (value: any): string => (typeof value === 'string' ? value.trim() : '')

const pickFirst = (...values: unknown[]): string => {
  for (const value of values) {
    const cleaned = cleanText(value)
    if (cleaned) return cleaned
  }
  return ''
}

export const resolveTitleWithFallback = (content: any): string => {
  const arabicTitle = pickFirst(content?.title_ar, content?.translated_title_ar, content?.title, content?.name)
  const englishTitle = pickFirst(content?.title_en, content?.translated_title_en)
  const originalTitle = pickFirst(content?.original_title, content?.original_name)
  return pickFirst(arabicTitle, englishTitle, originalTitle)
}

export const resolveOverviewWithFallback = (content: any, lang: string = 'ar'): string => {
  const arabicOverview = pickFirst(content?.overview_ar, content?.translated_overview_ar)
  const englishOverview = pickFirst(content?.overview_en, content?.translated_overview_en, content?.overview)

  // Return based on language preference
  if (lang === 'ar') {
    return pickFirst(arabicOverview, englishOverview)
  }
  return pickFirst(englishOverview, arabicOverview)
}

/**
 * @deprecated Use database fields directly (title_ar, title_en, overview_ar, overview_en)
 * This function is kept for backward compatibility but returns null
 */
export async function getTranslation(movie: any): Promise<TranslatedContent | null> {
  // DEPRECATED: All translations are now stored in CockroachDB
  // Use title_ar, title_en, overview_ar, overview_en from database directly
  return null
}
