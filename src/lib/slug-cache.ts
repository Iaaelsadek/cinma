/**
 * Slug Cache - LRU Cache with TTL for Slug Resolution
 * 
 * This module provides an in-memory LRU cache for slug resolution
 * with automatic expiration (TTL) to improve performance.
 */

import { logger } from './logger'

/**
 * Cache entry with value and expiration timestamp
 */
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

/**
 * LRU Cache with TTL support
 */
export class SlugCache<T = number> {
  private cache: Map<string, CacheEntry<T>>
  private maxSize: number
  private ttl: number // Time to live in milliseconds

  /**
   * Create a new SlugCache
   * 
   * @param maxSize - Maximum number of entries (default: 10000)
   * @param ttl - Time to live in milliseconds (default: 1 hour)
   */
  constructor(maxSize: number = 10000, ttl: number = 60 * 60 * 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.ttl = ttl
  }

  /**
   * Get a value from the cache
   * 
   * @param key - Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  /**
   * Set a value in the cache
   * 
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: string, value: T): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    // Add new entry with expiration
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl
    })
  }

  /**
   * Check if a key exists in the cache (and is not expired)
   * 
   * @param key - Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Delete a specific key from the cache
   * 
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Clear expired entries from the cache
   * 
   * @returns Number of entries removed
   */
  clearExpired(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }

  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    ttl: number
    hitRate?: number
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    }
  }

  /**
   * Get the current size of the cache
   * 
   * @returns Number of entries in cache
   */
  get size(): number {
    return this.cache.size
  }
}

/**
 * Global slug cache instances
 */
export const movieSlugCache = new SlugCache<number>(10000, 60 * 60 * 1000) // 1 hour TTL
export const tvSlugCache = new SlugCache<number>(10000, 60 * 60 * 1000)
export const softwareSlugCache = new SlugCache<number>(5000, 60 * 60 * 1000)
export const actorSlugCache = new SlugCache<number>(5000, 60 * 60 * 1000)

/**
 * Get the appropriate cache for a content type
 * 
 * @param contentType - Type of content
 * @returns Slug cache instance
 */
export function getCacheForType(contentType: string): SlugCache<number> {
  switch (contentType) {
    case 'movie':
      return movieSlugCache
    case 'tv':
      return tvSlugCache
    case 'software':
      return softwareSlugCache
    case 'actor':
      return actorSlugCache
    default:
      return movieSlugCache
  }
}

/**
 * Clear all slug caches
 */
export function clearAllCaches(): void {
  movieSlugCache.clear()
  tvSlugCache.clear()
  softwareSlugCache.clear()
  actorSlugCache.clear()
}

/**
 * Clear expired entries from all caches
 * 
 * @returns Total number of entries removed
 */
export function clearAllExpired(): number {
  return (
    movieSlugCache.clearExpired() +
    tvSlugCache.clearExpired() +
    softwareSlugCache.clearExpired() +
    actorSlugCache.clearExpired()
  )
}

/**
 * Get statistics for all caches
 * 
 * @returns Statistics for each cache
 */
export function getAllCacheStats(): Record<string, ReturnType<SlugCache['getStats']>> {
  return {
    movie: movieSlugCache.getStats(),
    tv: tvSlugCache.getStats(),
    software: softwareSlugCache.getStats(),
    actor: actorSlugCache.getStats()
  }
}

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const removed = clearAllExpired()
    if (removed > 0) {
      logger.info(`[SlugCache] Cleared ${removed} expired entries`, { removed })
    }
  }, 5 * 60 * 1000)
}
