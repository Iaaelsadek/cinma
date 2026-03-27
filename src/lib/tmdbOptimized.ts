// 🎯 Optimized TMDB Client - Zero Budget Edition
// يجمع بين caching و rate limiting لتوفير 70-80% من API calls

import { tmdbCache } from './tmdbCache'
import { rateLimiter } from './rateLimiter'
import { logger } from './logger'

class TmdbOptimized {
  async get<T = any>(endpoint: string, config?: { params?: any }): Promise<{ data: T }> {
    try {
      // Check rate limit first
      await rateLimiter.checkLimit('tmdb')

      // Try cache
      const response = await tmdbCache.get<T>(endpoint, config)
      
      return response
    } catch (error: any) {
      // Log error for monitoring
      logger.error('TMDB API Error:', { endpoint, error: error.message })
      throw error
    }
  }

  // Batch requests with deduplication
  async batchGet<T = any>(requests: Array<{ endpoint: string; params?: any }>): Promise<Array<{ data: T }>> {
    // Deduplicate requests
    const uniqueRequests = new Map<string, { endpoint: string; params?: any }>()
    requests.forEach(req => {
      const key = `${req.endpoint}:${JSON.stringify(req.params || {})}`
      uniqueRequests.set(key, req)
    })

    // Execute unique requests
    const results = await Promise.all(
      Array.from(uniqueRequests.values()).map(req => this.get<T>(req.endpoint, { params: req.params }))
    )

    return results
  }

  // Get cache stats
  getCacheStats() {
    return tmdbCache.getStats()
  }

  // Get rate limit stats
  getRateLimitStats() {
    return rateLimiter.getStats('tmdb')
  }

  // Clear cache
  clearCache() {
    tmdbCache.clearAll()
  }
}

export const tmdbOptimized = new TmdbOptimized()

// Export as default for easy migration
export default tmdbOptimized

// Helper functions re-exported for convenience
export async function fetchGenres(type: 'movie' | 'tv') {
  const { data } = await tmdbOptimized.get(`/genre/${type}/list`)
  return (data?.genres || []) as Array<{ id: number; name: string }>
}
