/**
 * Slug Generator Module
 * 
 * Generates URL-safe slugs from content titles with support for:
 * - Arabic to Latin transliteration
 * - Special character handling
 * - Length constraints (max 100 characters)
 * - Uniqueness via ID suffix
 */

export interface SlugGeneratorOptions {
  maxLength?: number
  appendId?: boolean
}

export interface SlugGenerator {
  /**
   * Generate a slug from a title
   * @param title - Content title (Arabic or English)
   * @param contentId - Optional ID to append for uniqueness
   * @returns URL-safe slug
   */
  generateSlug(title: string, contentId?: number): string
  
  /**
   * Validate if a slug is properly formatted
   * @param slug - Slug to validate
   * @returns true if valid
   */
  isValidSlug(slug: string): boolean
  
  /**
   * Extract ID from slug if present
   * @param slug - Slug potentially containing ID
   * @returns Extracted ID or null
   */
  extractIdFromSlug(slug: string): number | null
}

/**
 * Arabic to Latin transliteration map
 * Maps common Arabic characters to their Latin equivalents
 */
const ARABIC_TO_LATIN: Record<string, string> = {
  // Arabic letters
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a',
  'ب': 'b',
  'ت': 't', 'ة': 'h',
  'ث': 'th',
  'ج': 'j',
  'ح': 'h',
  'خ': 'kh',
  'د': 'd',
  'ذ': 'dh',
  'ر': 'r',
  'ز': 'z',
  'س': 's',
  'ش': 'sh',
  'ص': 's',
  'ض': 'd',
  'ط': 't',
  'ظ': 'z',
  'ع': 'a',
  'غ': 'gh',
  'ف': 'f',
  'ق': 'q',
  'ك': 'k',
  'ل': 'l',
  'م': 'm',
  'ن': 'n',
  'ه': 'h',
  'و': 'w', 'ؤ': 'w',
  'ي': 'y', 'ى': 'y', 'ئ': 'y',
  // Arabic diacritics (remove them)
  '\u064B': '', '\u064C': '', '\u064D': '', '\u064E': '', '\u064F': '',
  '\u0650': '', '\u0651': '', '\u0652': '', '\u0653': '', '\u0654': '',
  '\u0655': '', '\u0656': '', '\u0657': '', '\u0658': '', '\u0659': '',
  '\u065A': '', '\u065B': '', '\u065C': '', '\u065D': '', '\u065E': '',
  '\u065F': ''
}

/**
 * Transliterate Arabic text to Latin characters
 * @param text - Text containing Arabic characters
 * @returns Transliterated text with Latin characters
 */
function transliterateArabic(text: string): string {
  if (!text) return ''
  
  return text.split('').map(char => {
    return ARABIC_TO_LATIN[char] || char
  }).join('')
}

/**
 * Generate a URL-safe slug from a title
 * 
 * Process:
 * 1. Transliterate Arabic characters to Latin
 * 2. Convert to lowercase
 * 3. Replace spaces with hyphens
 * 4. Remove special characters (keep only alphanumeric and hyphens)
 * 5. Collapse consecutive hyphens
 * 6. Remove leading/trailing hyphens
 * 7. Limit to maxLength characters
 * 8. Append ID suffix if provided
 * 
 * @param title - Content title (Arabic or English)
 * @param contentId - Optional ID to append for uniqueness
 * @param options - Configuration options
 * @returns URL-safe slug
 */
export function generateSlug(
  title: string,
  contentId?: number,
  options: SlugGeneratorOptions = {}
): string {
  const { maxLength = 100, appendId = false } = options
  
  if (!title || title.trim() === '') {
    return ''
  }
  
  // Step 1: Transliterate Arabic to Latin
  let slug = transliterateArabic(title)
  
  // Step 2: Convert to lowercase
  slug = slug.toLowerCase()
  
  // Step 3: Replace spaces with hyphens
  slug = slug.replace(/\s+/g, '-')
  
  // Step 4: Remove special characters (keep only alphanumeric and hyphens)
  slug = slug.replace(/[^a-z0-9-]/g, '')
  
  // Step 5: Collapse consecutive hyphens
  slug = slug.replace(/-+/g, '-')
  
  // Step 6: Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '')
  
  // Step 7: Apply length limit (reserve space for ID suffix if needed)
  if (contentId !== undefined || appendId) {
    const idSuffix = contentId !== undefined ? `-${contentId}` : ''
    const maxSlugLength = maxLength - idSuffix.length
    
    if (slug.length > maxSlugLength) {
      slug = slug.substring(0, maxSlugLength)
      // Remove trailing hyphen if truncation created one
      slug = slug.replace(/-+$/, '')
    }
    
    // Step 8: Append ID suffix
    if (contentId !== undefined) {
      slug = `${slug}${idSuffix}`
    }
  } else {
    // No ID suffix, just apply max length
    if (slug.length > maxLength) {
      slug = slug.substring(0, maxLength)
      slug = slug.replace(/-+$/, '')
    }
  }
  
  return slug
}

/**
 * Validate if a slug is properly formatted
 * 
 * Valid slug criteria:
 * - Contains only lowercase alphanumeric characters and hyphens
 * - No consecutive hyphens
 * - No leading or trailing hyphens
 * - Not empty
 * 
 * @param slug - Slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.trim() === '') {
    return false
  }
  
  // Check if contains only lowercase alphanumeric and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return false
  }
  
  // Check for consecutive hyphens
  if (/--/.test(slug)) {
    return false
  }
  
  // Check for leading or trailing hyphens
  if (/^-|-$/.test(slug)) {
    return false
  }
  
  return true
}

/**
 * Extract ID from slug if present
 * 
 * Looks for pattern: {slug}-{id} where id is one or more digits at the end
 * Example: "spider-man-60282" -> 60282
 * 
 * @param slug - Slug potentially containing ID suffix
 * @returns Extracted ID as number, or null if no ID found
 */
export function extractIdFromSlug(slug: string): number | null {
  if (!slug) {
    return null
  }
  
  // Match pattern: -{digits} at the end of the slug
  const match = slug.match(/-(\d+)$/)
  
  if (match && match[1]) {
    const id = parseInt(match[1], 10)
    return isNaN(id) ? null : id
  }
  
  return null
}

/**
 * Default slug generator implementation
 */
export const slugGenerator: SlugGenerator = {
  generateSlug,
  isValidSlug,
  extractIdFromSlug
}
