/**
 * 🖼️ Image Utilities - 4Cima
 * Utility functions for image URL validation and processing
 * 
 * @description Provides URL validation, sanitization, and fallback chain construction
 * @author 4Cima Team
 */

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 * 
 * @param url - URL string to validate
 * @returns true if valid URL, false otherwise
 */
export function isValidURL(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitizes an image URL by trimming whitespace
 * 
 * @param url - URL string to sanitize
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeImageURL(url: string | null | undefined): string | null {
  if (!isValidURL(url)) {
    return null;
  }
  return url!.trim();
}

/**
 * Constructs a fallback chain for image sources
 * Priority: thumbnail → poster_url/poster_path → backdrop_url/backdrop_path
 * 
 * @param content - Content object with image fields
 * @returns Array of valid image URLs in priority order
 */
export function constructFallbackChain(content: {
  thumbnail?: string | null;
  poster_path?: string | null;
  poster_url?: string | null;  // CockroachDB format
  backdrop_path?: string | null;
  backdrop_url?: string | null;  // CockroachDB format
}): string[] {
  const chain: string[] = [];

  // Priority 1: thumbnail from CockroachDB
  if (isValidURL(content.thumbnail)) {
    chain.push(content.thumbnail!.trim());
  }

  // Priority 2: poster_url (CockroachDB) or poster_path (TMDB)
  if (isValidURL(content.poster_url)) {
    chain.push(content.poster_url!.trim());
  } else if (isValidURL(content.poster_path)) {
    chain.push(content.poster_path!.trim());
  }

  // Priority 3: backdrop_url (CockroachDB) or backdrop_path (TMDB)
  if (isValidURL(content.backdrop_url)) {
    chain.push(content.backdrop_url!.trim());
  } else if (isValidURL(content.backdrop_path)) {
    chain.push(content.backdrop_path!.trim());
  }

  return chain;
}

/**
 * Gets the primary image source with fallback logic
 * Supports both TMDB format (poster_path) and CockroachDB format (poster_url)
 * 
 * @param content - Content object with image fields
 * @returns Primary image URL or null if none available
 */
export function getPrimaryImageSource(content: {
  thumbnail?: string | null;
  poster_path?: string | null;
  poster_url?: string | null;  // CockroachDB format
  backdrop_path?: string | null;
  backdrop_url?: string | null;  // CockroachDB format
}): string | null {
  const chain = constructFallbackChain(content);
  return chain.length > 0 ? chain[0] : null;
}

/**
 * Type guard to check if URL is from TMDB API
 * Used to detect architecture violations
 * 
 * @param url - URL to check
 * @returns true if URL is from TMDB API
 */
export function isTMDBURL(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes('image.tmdb.org') || url.includes('themoviedb.org');
}
