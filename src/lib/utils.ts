import { GENRES } from './genres'

export const slugify = (text: string) => {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-')   // Replace multiple - with single -
}

export const getGenreSlug = (genreId: number) => {
  const genre = GENRES[genreId]?.en || 'General'
  return slugify(genre)
}

export const generateWatchPath = (item: any) => {
  // Determine Type
  let type = 'movie'
  if (item.media_type === 'tv' || item.media_type === 'anime' || item.name) type = 'tv'
  if (item.media_type === 'movie' || item.title) type = 'movie'
  
  const id = item.id

  if (type === 'tv') {
    return `/watch/tv/${id}/s1/ep1`
  }
  
  return `/watch/movie/${id}`
}

export const parseWatchPath = (slug: string) => {
  // Extract ID from the end of the slug (e.g., "primate-12345" -> 12345)
  const parts = slug.split('-')
  const id = parts[parts.length - 1]
  return /^\d+$/.test(id) ? parseInt(id) : null
}

export const isCJK = (text: string) => {
  if (!text) return false
  // Range covers Chinese, Japanese, Korean characters
  return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text)
}

/**
 * Normalizes text for better search matching
 * - Converts to lowercase
 * - Normalizes Arabic characters (alef, teh marbuta, etc.)
 * - Removes extra spaces
 */
export const normalizeSearchText = (text: string): string => {
  if (!text) return ''
  
  return text
    .toLowerCase()
    .trim()
    // Normalize Arabic Alef
    .replace(/[أإآا]/g, 'ا')
    // Normalize Arabic Teh Marbuta
    .replace(/[ةه]/g, 'ه')
    // Normalize Arabic Yeh
    .replace(/[ىيئ]/g, 'ي')
    // Normalize Arabic Waw
    .replace(/[ؤو]/g, 'و')
    // Remove Arabic Diacritics (Tashkeel)
    .replace(/[\u064B-\u065F]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
}

/**
 * Maps English keyboard characters to their Arabic equivalents
 * (for when a user searches for Arabic text while their keyboard is set to English)
 */
export const mapEnglishToArabicKeyboard = (text: string): string => {
  const map: Record<string, string> = {
    'q': 'ض', 'w': 'ص', 'e': 'ث', 'r': 'ق', 't': 'ف', 'y': 'غ', 'u': 'ع', 'i': 'ه', 'o': 'خ', 'p': 'ح', '[': 'ج', ']': 'د',
    'a': 'ش', 's': 'س', 'd': 'ي', 'f': 'ب', 'g': 'ل', 'h': 'ا', 'j': 'ت', 'k': 'ن', 'l': 'م', ';': 'ك', "'": 'ط',
    'z': 'ئ', 'x': 'ء', 'c': 'ؤ', 'v': 'ر', 'b': 'لا', 'n': 'ى', 'm': 'ة', ',': 'و', '.': 'ز', '/': 'ظ'
  }
  
  return text.toLowerCase().split('').map(char => map[char] || char).join('')
}

/**
 * Advanced search matching that handles:
 * 1. Case-insensitive matching
 * 2. Arabic normalization (alef, teh marbuta, etc.)
 * 3. English-to-Arabic keyboard mapping
 * 4. Partial word matching
 */
export const advancedSearchMatch = (target: string, query: string): boolean => {
  if (!query) return true
  if (!target) return false

  const normalizedTarget = normalizeSearchText(target)
  const normalizedQuery = normalizeSearchText(query)
  const keyboardMappedQuery = normalizeSearchText(mapEnglishToArabicKeyboard(query))

  // Direct match in normalized text
  if (normalizedTarget.includes(normalizedQuery)) return true
  
  // Keyboard mapping match (e.g. searching 'sfhd]v' for 'سينما')
  if (normalizedTarget.includes(keyboardMappedQuery)) return true

  // Word-by-word matching (fuzzy-ish)
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 1)
  if (queryWords.length > 0) {
    return queryWords.every(word => normalizedTarget.includes(word))
  }

  return false
}
