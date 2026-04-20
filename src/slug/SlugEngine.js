/**
 * SlugEngine - Centralized Slug Generation for Cinema.online
 * 
 * This is the ONLY place in the entire codebase where slugs are generated.
 * No other file may contain slug generation logic.
 * 
 * Philosophy:
 * - SlugEngine generates slug STRING candidates only
 * - It does NOT check database uniqueness
 * - Uniqueness checking is the CoreIngestor's responsibility
 * - No TMDB IDs or UUIDs in slugs - EVER
 */

import slugifyLib from 'slugify';

class SlugEngine {
  /**
   * Generates a slug candidate string. Does NOT check DB uniqueness.
   * Uniqueness is the CoreIngestor's responsibility.
   *
   * @param {string} title - Primary title (may be Arabic)
   * @param {string} originalTitle - Fallback title (usually English)
   * @param {number|null} year - Release year (4 digits) or null
   * @param {number} attempt - Retry attempt number (1 = first try, 2+ = duplicates)
   * @returns {string} - Slug candidate, never empty, never contains UUID/TMDB ID
   */
  generate(title, originalTitle, year, attempt = 1) {
    // Step 1: Try primary title
    let slugBase = this._processTitle(title);
    
    // Step 2: Fallback to original title if primary is empty
    if (!slugBase || slugBase.length < 2) {
      slugBase = this._processTitle(originalTitle);
    }
    
    // Step 3: Final fallback - random alphanumeric
    if (!slugBase || slugBase.length < 2) {
      slugBase = this._generateFallbackSlug();
    }
    
    // Step 4: Append year if available
    let finalSlug = slugBase;
    if (year && typeof year === 'number' && year >= 1000 && year <= 9999) {
      finalSlug = `${slugBase}-${year}`;
    }
    
    // Step 5: Append attempt counter if > 1
    if (attempt > 1) {
      finalSlug = `${finalSlug}-${attempt}`;
    }
    
    return finalSlug;
  }

  /**
   * Process a title through the full pipeline:
   * Arabic normalization → Transliteration → Slugify
   * 
   * @param {string} text
   * @returns {string}
   * @private
   */
  _processTitle(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Step 1: Normalize Arabic characters
    const normalized = this.normalizeArabic(text);
    
    // Step 2 & 3: Use slugify library which handles transliteration + slugification
    const slug = slugifyLib(normalized, {
      lower: true,
      strict: true,
      locale: 'ar',
      trim: true
    });
    
    return slug;
  }

  /**
   * Arabic Unicode normalization - 6 steps in exact order
   * Exposed for unit testing.
   * 
   * @param {string} text
   * @returns {string}
   */
  normalizeArabic(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    let normalized = text;
    
    // Step 1: Strip Tashkeel (Diacritics) - Unicode range U+064B–U+065F
    // Remove: harakat (َ ِ ُ ً ٍ ٌ ّ ْ)
    normalized = normalized.replace(/[\u064B-\u065F]/g, '');
    
    // Step 2: Normalize Hamza Variants → ا
    normalized = normalized.replace(/[أإآٱ]/g, 'ا');
    
    // Step 3: Normalize Taa Marbuta → ه
    normalized = normalized.replace(/ة/g, 'ه');
    
    // Step 4: Normalize Alef Maqsura → ي
    normalized = normalized.replace(/ى/g, 'ي');
    
    // Step 5: Normalize Waw with Hamza Above → و
    normalized = normalized.replace(/ؤ/g, 'و');
    
    // Step 6: Normalize Yaa with Hamza Below → ي
    normalized = normalized.replace(/ئ/g, 'ي');
    
    return normalized;
  }

  /**
   * Slugify a plain Latin string.
   * Exposed for unit testing.
   * 
   * @param {string} text
   * @returns {string}
   */
  slugify(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    return text
      .toLowerCase()                      // Convert to lowercase
      .trim()                             // Trim whitespace
      .replace(/[^a-z0-9\s-]/g, '')       // Strip non-alphanumeric (keep spaces and hyphens)
      .replace(/[\s]+/g, '-')             // Spaces → hyphens
      .replace(/-+/g, '-')                // Collapse multiple hyphens
      .replace(/^-+|-+$/g, '');           // Trim leading/trailing hyphens
  }

  /**
   * Generate a fallback slug when all else fails
   * Format: content-type prefix + 4-char random alphanumeric
   * 
   * @returns {string}
   * @private
   */
  _generateFallbackSlug() {
    const randomChars = Math.random().toString(36).substring(2, 6);
    return `content-${randomChars}`;
  }
}

// Export singleton instance
export default new SlugEngine();
