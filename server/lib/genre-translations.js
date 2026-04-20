/**
 * Genre Translation Service
 * 
 * This module provides bidirectional mapping between Arabic genre values
 * (stored in CockroachDB) and English translations for bilingual support.
 * 
 * CRITICAL: All content data comes from CockroachDB (NOT Supabase).
 * Arabic values are the source of truth (stored in database).
 * English translations are for display only.
 */

/**
 * Genre Translation Mapping
 * Maps Arabic genre values (stored in CockroachDB) to English translations
 */
export const genreTranslations = {
  // Movies & Series Genres
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
  
  // Gaming Genres
  'أكشن': 'Action',
  'آر-بي-جي': 'RPG',
  'استراتيجية': 'Strategy',
  'رياضة': 'Sports',
  'سباق': 'Racing',
  'محاكاة': 'Simulation',
  
  // Software Categories
  'إنتاجية': 'Productivity',
  'تصميم': 'Design',
  'تطوير': 'Development',
  'وسائط-متعددة': 'Multimedia',
  'أمان': 'Security',
  'أدوات': 'Utilities'
}

/**
 * Reverse mapping: English category slug to Arabic genre value
 * Used for category slug to genre value conversion from URL routes
 */
export const categorySlugToGenre = {
  // Movies & Series
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
  
  // Gaming
  'rpg': 'آر-بي-جي',
  'strategy': 'استراتيجية',
  'sports': 'رياضة',
  'racing': 'سباق',
  'simulation': 'محاكاة',
  
  // Software
  'productivity': 'إنتاجية',
  'design': 'تصميم',
  'development': 'تطوير',
  'multimedia': 'وسائط-متعددة',
  'security': 'أمان',
  'utilities': 'أدوات'
}

/**
 * Parse and validate genre mapping
 * 
 * @param {Object} mapping - Genre mapping object to validate
 * @returns {Object} Normalized mapping
 * @throws {Error} If mapping is invalid with descriptive error messages
 */
export function parseGenreMapping(mapping) {
  if (!mapping || typeof mapping !== 'object') {
    throw new Error('Genre mapping must be an object')
  }
  
  const errors = []
  const normalized = {}
  const values = new Set()
  
  for (const [key, value] of Object.entries(mapping)) {
    // Validate key
    if (!key || typeof key !== 'string' || key.trim() === '') {
      errors.push(`Invalid key: "${key}"`)
      continue
    }
    
    // Validate value
    if (!value || typeof value !== 'string' || value.trim() === '') {
      errors.push(`Invalid value for key "${key}": "${value}"`)
      continue
    }
    
    // Check for duplicate values
    if (values.has(value)) {
      errors.push(`Duplicate value: "${value}"`)
      continue
    }
    
    normalized[key.trim()] = value.trim()
    values.add(value.trim())
  }
  
  if (errors.length > 0) {
    throw new Error(`Genre mapping validation failed:\n${errors.join('\n')}`)
  }
  
  return normalized
}

/**
 * Pretty print genre mapping to formatted JSON string
 * 
 * @param {Object} mapping - Genre mapping object
 * @returns {string} Formatted JSON string with 2-space indentation
 */
export function prettyPrintGenreMapping(mapping) {
  return JSON.stringify(mapping, null, 2)
}

/**
 * Round-trip test: parse -> stringify -> parse
 * Validates data integrity through serialization cycle
 * 
 * @param {Object} mapping - Genre mapping object
 * @returns {boolean} True if round-trip succeeds
 * @throws {Error} If round-trip fails with details about the failure
 */
export function roundTripGenreMapping(mapping) {
  const parsed1 = parseGenreMapping(mapping)
  const stringified = prettyPrintGenreMapping(parsed1)
  const parsed2 = parseGenreMapping(JSON.parse(stringified))
  
  // Deep equality check
  const keys1 = Object.keys(parsed1).sort()
  const keys2 = Object.keys(parsed2).sort()
  
  if (keys1.length !== keys2.length) {
    throw new Error('Round-trip failed: key count mismatch')
  }
  
  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i]) {
      throw new Error(`Round-trip failed: key mismatch at index ${i}`)
    }
    if (parsed1[keys1[i]] !== parsed2[keys2[i]]) {
      throw new Error(`Round-trip failed: value mismatch for key "${keys1[i]}"`)
    }
  }
  
  return true
}

/**
 * Map category slug to Arabic genre value
 * 
 * @param {string} slug - English category slug from URL (e.g., "action", "sci-fi")
 * @returns {string|null} Arabic genre value or null if not found
 */
export function mapCategorySlugToGenre(slug) {
  if (!slug || typeof slug !== 'string') {
    return null
  }
  
  const normalized = slug.toLowerCase().trim()
  return categorySlugToGenre[normalized] || null
}

/**
 * Get genre label in specified language
 * 
 * @param {string} arabicValue - Arabic genre value from database
 * @param {string} lang - Language code ('ar' or 'en')
 * @returns {string} Genre label in requested language
 */
export function getGenreLabel(arabicValue, lang = 'ar') {
  if (lang === 'en') {
    return genreTranslations[arabicValue] || arabicValue
  }
  return arabicValue
}
