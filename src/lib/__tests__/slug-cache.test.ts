/**
 * Unit Tests for Slug Cache
 * 
 * Tests the LRU cache with TTL functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { SlugCache, getCacheForType, clearAllCaches, clearAllExpired, getAllCacheStats } from '../slug-cache'

describe('SlugCache', () => {
  let cache: SlugCache<number>

  beforeEach(() => {
    cache = new SlugCache<number>(5, 1000) // Small cache with 1 second TTL for testing
  })

  describe('Basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('spider-man', 12345)
      
      const value = cache.get('spider-man')
      
      expect(value).toBe(12345)
    })

    it('should return undefined for non-existent key', () => {
      const value = cache.get('non-existent')
      
      expect(value).toBeUndefined()
    })

    it('should check if key exists', () => {
      cache.set('spider-man', 12345)
      
      expect(cache.has('spider-man')).toBe(true)
      expect(cache.has('non-existent')).toBe(false)
    })

    it('should delete specific key', () => {
      cache.set('spider-man', 12345)
      cache.delete('spider-man')
      
      expect(cache.has('spider-man')).toBe(false)
    })

    it('should clear all entries', () => {
      cache.set('spider-man', 12345)
      cache.set('inception', 67890)
      
      cache.clear()
      
      expect(cache.size).toBe(0)
      expect(cache.has('spider-man')).toBe(false)
      expect(cache.has('inception')).toBe(false)
    })
  })

  describe('LRU eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      // Fill cache to max size (5)
      cache.set('key1', 1)
      cache.set('key2', 2)
      cache.set('key3', 3)
      cache.set('key4', 4)
      cache.set('key5', 5)
      
      expect(cache.size).toBe(5)
      
      // Add one more - should evict key1
      cache.set('key6', 6)
      
      expect(cache.size).toBe(5)
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key6')).toBe(true)
    })

    it('should move accessed entry to end (most recently used)', () => {
      cache.set('key1', 1)
      cache.set('key2', 2)
      cache.set('key3', 3)
      cache.set('key4', 4)
      cache.set('key5', 5)
      
      // Access key1 - moves it to end
      cache.get('key1')
      
      // Add new entry - should evict key2 (now oldest)
      cache.set('key6', 6)
      
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
    })

    it('should handle multiple evictions', () => {
      cache.set('key1', 1)
      cache.set('key2', 2)
      cache.set('key3', 3)
      cache.set('key4', 4)
      cache.set('key5', 5)
      
      // Add 3 more entries
      cache.set('key6', 6)
      cache.set('key7', 7)
      cache.set('key8', 8)
      
      expect(cache.size).toBe(5)
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(false)
      expect(cache.has('key3')).toBe(false)
      expect(cache.has('key8')).toBe(true)
    })
  })

  describe('TTL expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should expire entries after TTL', () => {
      cache.set('spider-man', 12345)
      
      expect(cache.has('spider-man')).toBe(true)
      
      // Advance time by 1.5 seconds (TTL is 1 second)
      vi.advanceTimersByTime(1500)
      
      expect(cache.has('spider-man')).toBe(false)
    })

    it('should not expire entries before TTL', () => {
      cache.set('spider-man', 12345)
      
      // Advance time by 0.5 seconds (TTL is 1 second)
      vi.advanceTimersByTime(500)
      
      expect(cache.has('spider-man')).toBe(true)
    })

    it('should handle multiple entries with different expiration times', () => {
      cache.set('key1', 1)
      
      vi.advanceTimersByTime(500)
      
      cache.set('key2', 2)
      
      vi.advanceTimersByTime(600) // Total: 1100ms
      
      // key1 should be expired (1100ms > 1000ms)
      // key2 should still be valid (600ms < 1000ms)
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(true)
    })
  })

  describe('Clear expired entries', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should clear only expired entries', () => {
      cache.set('key1', 1)
      cache.set('key2', 2)
      
      vi.advanceTimersByTime(500)
      
      cache.set('key3', 3)
      
      vi.advanceTimersByTime(600) // Total: 1100ms
      
      // key1 and key2 expired, key3 still valid
      const removed = cache.clearExpired()
      
      expect(removed).toBe(2)
      expect(cache.size).toBe(1)
      expect(cache.has('key3')).toBe(true)
    })

    it('should return 0 when no entries expired', () => {
      cache.set('key1', 1)
      cache.set('key2', 2)
      
      const removed = cache.clearExpired()
      
      expect(removed).toBe(0)
      expect(cache.size).toBe(2)
    })

    it('should clear all entries when all expired', () => {
      cache.set('key1', 1)
      cache.set('key2', 2)
      cache.set('key3', 3)
      
      vi.advanceTimersByTime(1500)
      
      const removed = cache.clearExpired()
      
      expect(removed).toBe(3)
      expect(cache.size).toBe(0)
    })
  })

  describe('Cache statistics', () => {
    it('should return correct stats', () => {
      cache.set('key1', 1)
      cache.set('key2', 2)
      
      const stats = cache.getStats()
      
      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(5)
      expect(stats.ttl).toBe(1000)
    })

    it('should update size after operations', () => {
      expect(cache.getStats().size).toBe(0)
      
      cache.set('key1', 1)
      expect(cache.getStats().size).toBe(1)
      
      cache.set('key2', 2)
      expect(cache.getStats().size).toBe(2)
      
      cache.delete('key1')
      expect(cache.getStats().size).toBe(1)
      
      cache.clear()
      expect(cache.getStats().size).toBe(0)
    })
  })

  describe('Global cache functions', () => {
    it('should get cache for different content types', () => {
      const movieCache = getCacheForType('movie')
      const tvCache = getCacheForType('tv')
      const gameCache = getCacheForType('game')
      
      expect(movieCache).toBeDefined()
      expect(tvCache).toBeDefined()
      expect(gameCache).toBeDefined()
      
      // Should be different instances
      expect(movieCache).not.toBe(tvCache)
      expect(tvCache).not.toBe(gameCache)
    })

    it('should clear all caches', () => {
      const movieCache = getCacheForType('movie')
      const tvCache = getCacheForType('tv')
      
      movieCache.set('spider-man', 123)
      tvCache.set('breaking-bad', 456)
      
      clearAllCaches()
      
      expect(movieCache.size).toBe(0)
      expect(tvCache.size).toBe(0)
    })

    it('should get stats for all caches', () => {
      const stats = getAllCacheStats()
      
      expect(stats).toHaveProperty('movie')
      expect(stats).toHaveProperty('tv')
      expect(stats).toHaveProperty('game')
      expect(stats).toHaveProperty('software')
      expect(stats).toHaveProperty('actor')
      
      expect(stats.movie.maxSize).toBe(10000)
      expect(stats.tv.maxSize).toBe(10000)
      expect(stats.game.maxSize).toBe(5000)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty string key', () => {
      cache.set('', 123)
      
      const value = cache.get('')
      
      expect(value).toBe(123)
    })

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(1000)
      
      cache.set(longKey, 123)
      
      const value = cache.get(longKey)
      
      expect(value).toBe(123)
    })

    it('should handle special characters in keys', () => {
      const specialKeys = [
        'spider-man-2024',
        'movie/123',
        'content:456',
        'slug@789'
      ]
      
      specialKeys.forEach((key, index) => {
        cache.set(key, index)
        expect(cache.get(key)).toBe(index)
      })
    })

    it('should handle zero as value', () => {
      cache.set('key', 0)
      
      const value = cache.get('key')
      
      expect(value).toBe(0)
    })

    it('should handle negative numbers as values', () => {
      cache.set('key', -123)
      
      const value = cache.get('key')
      
      expect(value).toBe(-123)
    })
  })

  describe('Concurrent operations', () => {
    it('should handle rapid set operations', () => {
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, i)
      }
      
      // Cache should only contain last 5 entries (maxSize = 5)
      expect(cache.size).toBe(5)
      
      // Should have keys 95-99
      expect(cache.has('key99')).toBe(true)
      expect(cache.has('key98')).toBe(true)
      expect(cache.has('key0')).toBe(false)
    })

    it('should handle rapid get operations', () => {
      cache.set('key', 123)
      
      // Get same key multiple times
      for (let i = 0; i < 100; i++) {
        const value = cache.get('key')
        expect(value).toBe(123)
      }
    })

    it('should handle mixed operations', () => {
      cache.set('key1', 1)
      cache.get('key1')
      cache.set('key2', 2)
      cache.delete('key1')
      cache.set('key3', 3)
      
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(true)
      expect(cache.has('key3')).toBe(true)
    })
  })
})
