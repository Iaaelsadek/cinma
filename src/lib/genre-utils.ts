/**
 * Genre Translation Utilities (Frontend)
 * Mirrors server/lib/genre-translations.js for frontend use
 */

import type { GenreOption } from '../types/genre'

// Arabic → English translations
export const genreTranslations: Record<string, string> = {
  'حركة': 'Action',
  'كوميديا': 'Comedy',
  'دراما': 'Drama',
  'رعب': 'Horror',
  'خيال-علمي': 'Sci-Fi',
  'رومانسي': 'Romance',
  'إثارة': 'Thriller',
  'مغامرة': 'Adventure',
  'جريمة': 'Crime',
  'غموض': 'Mystery',
  'فانتازيا': 'Fantasy',
  'رسوم-متحركة': 'Animation',
  'وثائقي': 'Documentary',
  'عائلي': 'Family',
  'موسيقي': 'Music',
  'تاريخي': 'History',
  'حرب': 'War',
  'غربي': 'Western',
  'أكشن': 'Action',
  'آر-بي-جي': 'RPG',
  'استراتيجية': 'Strategy',
  'رياضة': 'Sports',
  'سباق': 'Racing',
  'محاكاة': 'Simulation',
  'إنتاجية': 'Productivity',
  'تصميم': 'Design',
  'تطوير': 'Development',
  'وسائط-متعددة': 'Multimedia',
  'أمان': 'Security',
  'أدوات': 'Utilities',
}

// English slug → Arabic value
export const categorySlugToGenreMap: Record<string, string> = {
  'action': 'حركة',
  'comedy': 'كوميديا',
  'drama': 'دراما',
  'horror': 'رعب',
  'science-fiction': 'خيال-علمي',
  'sci-fi': 'خيال-علمي',
  'romance': 'رومانسي',
  'thriller': 'إثارة',
  'adventure': 'مغامرة',
  'crime': 'جريمة',
  'mystery': 'غموض',
  'fantasy': 'فانتازيا',
  'animation': 'رسوم-متحركة',
  'documentary': 'وثائقي',
  'family': 'عائلي',
  'music': 'موسيقي',
  'history': 'تاريخي',
  'war': 'حرب',
  'western': 'غربي',
  'rpg': 'آر-بي-جي',
  'strategy': 'استراتيجية',
  'sports': 'رياضة',
  'racing': 'سباق',
  'simulation': 'محاكاة',
  'productivity': 'إنتاجية',
  'design': 'تصميم',
  'development': 'تطوير',
  'multimedia': 'وسائط-متعددة',
  'security': 'أمان',
  'utilities': 'أدوات',
}

/** Convert URL slug to Arabic genre value */
export function mapCategorySlugToGenre(slug: string): string | null {
  if (!slug) return null
  return categorySlugToGenreMap[slug.toLowerCase().trim()] || null
}

/** Get genre label in specified language */
export function getGenreLabel(arabicValue: string, lang: 'ar' | 'en' = 'ar'): string {
  if (lang === 'en') return genreTranslations[arabicValue] || arabicValue
  return arabicValue
}

/** Fallback genres when API fails */
export function getFallbackGenres(contentType: string, lang: 'ar' | 'en' = 'ar'): GenreOption[] {
  const fallbacks: Record<string, string[]> = {
    movies: ['دراما', 'حركة', 'كوميديا', 'رعب', 'إثارة', 'مغامرة'],
    series: ['دراما', 'كوميديا', 'إثارة', 'رومانسي'],
    anime: ['رسوم-متحركة', 'مغامرة', 'حركة'],
    gaming: ['أكشن', 'استراتيجية', 'آر-بي-جي', 'رياضة'],
    software: ['إنتاجية', 'تصميم', 'تطوير', 'أدوات'],
  }
  const list = fallbacks[contentType] || fallbacks.movies
  return list.map(ar => ({
    value: ar,
    labelAr: ar,
    labelEn: genreTranslations[ar] || ar,
  }))
}
