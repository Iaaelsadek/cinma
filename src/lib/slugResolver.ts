/**
 * Slug Resolver Service
 * 
 * Resolves slugs to content IDs with LRU caching support.
 * Features:
 * - LRU cache with 1-hour TTL
 * - Batch resolution for multiple slugs
 * - Database query with parameterized statements (SQL injection protection)
 * - Cache invalidation support
 */

export type ContentType = 'movie' | 'tv' | 'actor' | 'game' | 'software' | 'cinematic'

/**
 * Cache entry with TTL support
 */
interface CacheEntry {
  contentId: number
  timestamp: number
  ttl: number
}

/**
 * Slug Resolver Cache Interface
 */
export interface SlugResolverCache {
  /**
   * Get content ID from cache
   * @param key - Cache key in format {contentType}:{slug}
   * @returns Content ID or undefined if not found or expired
   */
  get(key: string): number | undefined
  
  /**
   * Set content ID in cache with TTL
   * @param key - Cache key in format {contentType}:{slug}
   * @param value - Content ID
   * @param ttl - Time to live in milliseconds
   */
  set(key: string, value: number, ttl: number): void
  
  /**
   * Clear cache entries
   * @param pattern - Optional pattern to match keys (e.g., "movie:*")
   */
  clear(pattern?: string): void
}

/**
 * LRU Cache implementation with TTL support
 */
class LRUCache implements SlugResolverCache {
  private cache: Map<string, CacheEntry>
  private maxSize: number
  
  constructor(maxSize: number = 10000) {
    this.cache = new Map()
    this.maxSize = maxSize
  }
  
  get(key: string): number | undefined {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return undefined
    }
    
    // Check if entry has expired
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return undefined
    }
    
    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    
    return entry.contentId
  }
  
  set(key: string, value: number, ttl: number): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    
    // Add new entry
    this.cache.set(key, {
      contentId: value,
      timestamp: Date.now(),
      ttl
    })
  }
  
  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }
    
    // Clear entries matching pattern
    const regex = new RegExp(pattern.replace('*', '.*'))
    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

/**
 * Slug Resolver Service
 */
export interface SlugResolver {
  /**
   * Resolve a slug to content ID
   * @param slug - URL slug
   * @param contentType - Type of content (movie, tv, etc.)
   * @returns Content ID or null if not found
   */
  resolveSlug(slug: string, contentType: ContentType): Promise<number | null>
  
  /**
   * Batch resolve multiple slugs
   * @param slugs - Array of slug-type pairs
   * @returns Map of slug to ID
   */
  resolveBatch(slugs: Array<{slug: string, type: ContentType}>): Promise<Map<string, number>>
  
  /**
   * Clear cache for specific content type
   * @param contentType - Optional type to clear, or all if omitted
   */
  clearCache(contentType?: ContentType): void
}

/**
 * Default cache instance with 1-hour TTL
 */
const DEFAULT_TTL = 60 * 60 * 1000 // 1 hour in milliseconds
const cache = new LRUCache(10000)

/**
 * Map content type to database table name
 */
function getTableName(contentType: ContentType): string {
  switch (contentType) {
    case 'movie':
      return 'movies'
    case 'tv':
      return 'tv_series'
    case 'actor':
      return 'actors'
    case 'game':
      return 'games'
    case 'software':
      return 'software'
    case 'cinematic':
      return 'cinematics' // Assuming table name
    default:
      throw new Error(`Unknown content type: ${contentType}`)
  }
}

/**
 * Generate cache key
 */
function getCacheKey(contentType: ContentType, slug: string): string {
  return `${contentType}:${slug}`
}

/**
 * Resolve a slug to content ID
 */
export async function resolveSlug(
  slug: string,
  contentType: ContentType
): Promise<number | null> {
  if (!slug || slug.trim() === '') {
    return null
  }
  
  // Check cache first
  const cacheKey = getCacheKey(contentType, slug)
  const cachedId = cache.get(cacheKey)
  
  if (cachedId !== undefined) {
    return cachedId
  }
  
  // Cache miss - query database
  try {
    const tableName = getTableName(contentType)
    const API_BASE = '/api/db'
    
    // Query database via API with parameterized query
    const response = await fetch(`${API_BASE}/slug/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        table: tableName
      })
    })
    
    if (response.status === 404) {
      return null
    }
    
    if (!response.ok) {
      console.error('API Error', {
        status: response.status,
        statusText: response.statusText
      })
      return null
    }
    
    const data = await response.json()
    const contentId = data?.id
    
    if (contentId) {
      // Cache the result
      cache.set(cacheKey, contentId, DEFAULT_TTL)
      return contentId
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Batch resolve multiple slugs
 */
export async function resolveBatch(
  slugs: Array<{slug: string, type: ContentType}>
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  
  if (!slugs || slugs.length === 0) {
    return result
  }
  
  // Group slugs by content type
  const slugsByType = new Map<ContentType, string[]>()
  const uncachedSlugs: Array<{slug: string, type: ContentType}> = []
  
  for (const item of slugs) {
    const cacheKey = getCacheKey(item.type, item.slug)
    const cachedId = cache.get(cacheKey)
    
    if (cachedId !== undefined) {
      result.set(item.slug, cachedId)
    } else {
      uncachedSlugs.push(item)
      
      if (!slugsByType.has(item.type)) {
        slugsByType.set(item.type, [])
      }
      slugsByType.get(item.type)!.push(item.slug)
    }
  }
  
  // Query database for uncached slugs (one query per content type)
  try {
    const API_BASE = '/api/db'
    
    for (const [contentType, slugList] of slugsByType.entries()) {
      const tableName = getTableName(contentType)
      
      const response = await fetch(`${API_BASE}/slug/resolve-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slugs: slugList,
          table: tableName
        })
      })
      
      if (!response.ok) {
        console.error('API Error', {
          status: response.status,
          statusText: response.statusText
        })
        continue
      }
      
      const data = await response.json()
      const results = data?.results || []
      
      for (const item of results) {
        if (item.slug && item.id) {
          result.set(item.slug, item.id)
          
          // Cache the result
          const cacheKey = getCacheKey(contentType, item.slug)
          cache.set(cacheKey, item.id, DEFAULT_TTL)
        }
      }
    }
  } catch (error) {
  }
  
  return result
}

/**
 * Clear cache for specific content type or all
 */
export function clearCache(contentType?: ContentType): void {
  if (contentType) {
    cache.clear(`${contentType}:*`)
  } else {
    cache.clear()
  }
}

/**
 * Default slug resolver implementation
 */
export const slugResolver: SlugResolver = {
  resolveSlug,
  resolveBatch,
  clearCache
}

