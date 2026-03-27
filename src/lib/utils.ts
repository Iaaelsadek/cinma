import { GENRES } from './genres'

export const slugify = (text: string) => {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with -
    // Allow English, Arabic, and CJK (Chinese, Japanese, Korean) characters
    .replace(/[^\w-\u0621-\u064A\u0660-\u0669\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/g, '') 
    .replace(/--+/g, '-')   // Replace multiple - with single -
    .replace(/^-+|-+$/g, '')  // Trim - from ends
}

export const getGenreSlug = (genreId: number) => {
  const genre = GENRES[genreId]?.en || 'General'
  return slugify(genre)
}

export const generateContentUrl = (item: { id: number | string, slug?: string | null, media_type?: string, type?: string, title?: string | null, name?: string | null }) => {
  const type = item.media_type || item.type || 'movie'
  let identifier = item.slug
  
  // CRITICAL: Ignore legacy slugs that look like "content-12345" or just numbers
  if (identifier && (/^content-\d+$/.test(identifier) || /^\d+$/.test(identifier))) {
    identifier = undefined
  }
  
  if (!identifier) {
    // CRITICAL: User demands PURE SLUGS ONLY. If slug is missing, generate it on the fly from title
    const title = item.title || item.name || 'content'
    identifier = slugify(title)
    
    // If slugify fails or returns empty, use a generic slug (never raw ID)
    if (!identifier) identifier = 'content'
  }
  
  switch (type) {
    case 'movie': return `/movie/${identifier}`
    case 'tv':
    case 'series':
    case 'anime': return `/series/${identifier}`
    case 'actor':
    case 'person': return `/actor/${identifier}`
    case 'game': return `/game/${identifier}`
    case 'software': return `/software/${identifier}`
    default: return `/${type}/${identifier}`
  }
}

export const generateWatchUrl = (item: { id: number | string, slug?: string | null, media_type?: string, type?: string, name?: string | null, title?: string | null }, season?: number, episode?: number) => {
  const type = item.media_type || item.type || (item.name && !item.title ? 'tv' : 'movie')
  let identifier = item.slug
  
  // CRITICAL: Ignore legacy slugs that look like "content-12345" or just numbers
  if (identifier && (/^content-\d+$/.test(identifier) || /^\d+$/.test(identifier))) {
    identifier = undefined
  }
  
  if (!identifier) {
    const title = item.title || item.name || 'content'
    identifier = slugify(title)
    if (!identifier) identifier = 'content'
  }

  const isSeries = type === 'tv' || type === 'series' || type === 'anime'
  
  if (isSeries) {
    const s = season || 1
    const e = episode || 1
    return `/watch/tv/${identifier}/s${s}/ep${e}`
  }
  
  return `/watch/movie/${identifier}`
}

export const generateWatchPath = (item: any) => {
  return generateWatchUrl(item, 1, 1)
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
