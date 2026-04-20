/**
 * Cache Key Generation Utility
 *
 * Generates consistent, unique cache keys from endpoint + query parameters.
 * Sorts parameters alphabetically so different orderings produce the same key.
 *
 * Requirements: 4.8
 */

/**
 * Generate a cache key from an endpoint name and query parameters.
 *
 * @param {string} endpoint - The endpoint name (e.g. 'home', 'movies', 'tv')
 * @param {Record<string, any>} params - Query parameters object
 * @returns {string} Cache key string
 *
 * @example
 * generateCacheKey('movies', { page: 1, genre: 'action' })
 * // => 'movies:genre:action|page:1'
 *
 * generateCacheKey('home', {})
 * // => 'home:'
 */
export function generateCacheKey(endpoint, params = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');

  return `${endpoint}:${sortedParams}`;
}
