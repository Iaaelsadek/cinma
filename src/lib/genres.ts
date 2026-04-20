/**
 * Genre Translation Utility
 * 
 * Provides genre name translation between English and Arabic
 * Used across MovieCard, Watch page, and other components
 */

export const GENRE_TRANSLATIONS: Record<string, string> = {
  'action': 'أكشن',
  'adventure': 'مغامرات',
  'animation': 'رسوم متحركة',
  'comedy': 'كوميدي',
  'crime': 'جريمة',
  'documentary': 'وثائقي',
  'drama': 'دراما',
  'family': 'عائلي',
  'fantasy': 'خيال',
  'history': 'تاريخي',
  'horror': 'رعب',
  'music': 'موسيقي',
  'mystery': 'غموض',
  'romance': 'رومانسي',
  'sci-fi': 'خيال علمي',
  'science fiction': 'خيال علمي',
  'thriller': 'إثارة',
  'war': 'حرب',
  'western': 'غربي',
  'kids': 'أطفال',
  'news': 'أخبار',
  'reality': 'واقعي',
  'soap': 'درامي',
  'talk': 'حواري',
  'tv movie': 'فيلم تلفزيوني'
}

/**
 * Translate genre name to Arabic
 * @param genreEn - English genre name
 * @returns Arabic translation or original name if no translation exists
 */
export function translateGenre(genreEn: string): string {
  if (!genreEn) return genreEn

  const normalized = genreEn.toLowerCase().trim()
  return GENRE_TRANSLATIONS[normalized] || genreEn
}

/**
 * Get genre name based on language preference
 * @param genreEn - English genre name
 * @param lang - Language preference ('ar' or 'en')
 * @returns Translated genre name if lang='ar', otherwise English name
 */
export function getGenreName(genreEn: string, lang: 'ar' | 'en' = 'en'): string {
  if (lang === 'ar') {
    return translateGenre(genreEn)
  }
  return genreEn
}

// Legacy export for backward compatibility
export { getGenreName as default }
