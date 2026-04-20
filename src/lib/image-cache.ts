/**
 * 🗄️ Image Cache - Cinema Online
 * In-memory cache for image load status
 * 
 * @description Tracks image loading states to prevent redundant requests
 * @author Cinema Online Team
 */

type ImageStatus = 'loading' | 'success' | 'error';

/**
 * In-memory cache for image load status
 * Key: image URL
 * Value: loading status
 */
const imageCache = new Map<string, ImageStatus>();

/**
 * Gets the cached status of an image URL
 * 
 * @param url - Image URL to check
 * @returns Cached status or null if not in cache
 */
export function getCacheStatus(url: string): ImageStatus | null {
  return imageCache.get(url) || null;
}

/**
 * Sets the cached status of an image URL
 * 
 * @param url - Image URL
 * @param status - Loading status to cache
 */
export function setCacheStatus(url: string, status: ImageStatus): void {
  imageCache.set(url, status);
}

/**
 * Clears all cached image statuses
 * Useful for testing or manual cache invalidation
 */
export function clearCache(): void {
  imageCache.clear();
}

/**
 * Removes a specific URL from the cache
 * 
 * @param url - Image URL to remove
 * @returns true if URL was in cache, false otherwise
 */
export function removeCacheEntry(url: string): boolean {
  return imageCache.delete(url);
}

/**
 * Gets the current cache size
 * 
 * @returns Number of cached URLs
 */
export function getCacheSize(): number {
  return imageCache.size;
}

/**
 * Checks if a URL is in the cache
 * 
 * @param url - Image URL to check
 * @returns true if URL is cached
 */
export function isCached(url: string): boolean {
  return imageCache.has(url);
}
