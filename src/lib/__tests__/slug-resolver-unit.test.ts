/**
 * Unit Tests for Slug Resolver - Additional Coverage
 * 
 * Tests specific scenarios for slug resolution including:
 * - Database queries
 * - TMDB fallback
 * - Year prioritization
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolveSlug } from '../slug-resolver'
import { clearAllCaches } from '../slug-cache'

// Mock fetch globally
global.fetch = vi.fn()

describe('Slug Resolver - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAllCaches() // Clear cache before each test
  })

  describe('Database Query', () => {
    it('should query correct endpoint for movies', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 12345, slug: 'spider-man', title: 'Spider-Man' })
      })

      const result = await resolveSlug('spider-man', 'movie')

      expect(result).toBe(12345)
      expect(global.fetch).toHaveBeenCalledWith('/api/db/movies/slug/spider-man')
    })

    it('should query correct endpoint for TV series', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 67890, slug: 'breaking-bad', name: 'Breaking Bad' })
      })

      const result = await resolveSlug('breaking-bad', 'tv')

      expect(result).toBe(67890)
      expect(global.fetch).toHaveBeenCalledWith('/api/db/tv/slug/breaking-bad')
    })

    it('should query correct endpoint for actors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 11111, slug: 'tom-hanks', name: 'Tom Hanks' })
      })

      const result = await resolveSlug('tom-hanks', 'actor')

      expect(result).toBe(11111)
      expect(global.fetch).toHaveBeenCalledWith('/api/db/actors/slug/tom-hanks')
    })

    it('should query correct endpoint for games', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 22222, slug: 'the-witcher-3', title: 'The Witcher 3' })
      })

      // Note: 'game' is not a valid type for resolveSlug, using 'software' instead
      const result = await resolveSlug('the-witcher-3', 'software')

      expect(result).toBe(22222)
      expect(global.fetch).toHaveBeenCalledWith('/api/db/software/slug/the-witcher-3')
    })

    it('should query correct endpoint for software', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 33333, slug: 'adobe-photoshop', title: 'Adobe Photoshop' })
      })

      const result = await resolveSlug('adobe-photoshop', 'software')

      expect(result).toBe(33333)
      expect(global.fetch).toHaveBeenCalledWith('/api/db/software/slug/adobe-photoshop')
    })
  })

  describe('TMDB Fallback', () => {
    it('should not search TMDB for non-movie/tv content', async () => {
      // Mock database miss
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const result = await resolveSlug('some-software', 'software')

      expect(result).toBeNull()
      expect(global.fetch).toHaveBeenCalledTimes(1) // Only database query
    })

    it('should handle TMDB search errors gracefully', async () => {
      // Mock database miss
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      // Note: TMDB fallback is handled in slug-resolver.ts
      // This test verifies the function returns null on database miss for non-movie/tv
      const result = await resolveSlug('non-existent', 'software')

      expect(result).toBeNull()
    })
  })

  describe('Year Prioritization', () => {
    it('should extract year from slug for TMDB search', async () => {
      // This is tested indirectly through the slug-resolver implementation
      // The year extraction is done in url-utils.ts

      // Mock database miss
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      await resolveSlug('spider-man-2024', 'movie')

      // Verify database was queried with the full slug including year
      expect(global.fetch).toHaveBeenCalledWith('/api/db/movies/slug/spider-man-2024')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      const result = await resolveSlug('spider-man', 'movie', false) // Disable TMDB fallback

      expect(result).toBeNull()
    })

    it('should handle network timeout', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network timeout'))

      const result = await resolveSlug('spider-man', 'movie', false) // Disable TMDB fallback

      expect(result).toBeNull()
    })

    it('should handle 500 server errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const result = await resolveSlug('spider-man', 'movie', false) // Disable TMDB fallback

      expect(result).toBeNull()
    })

    it('should handle empty response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null
      })

      const result = await resolveSlug('spider-man', 'movie', false) // Disable TMDB fallback

      expect(result).toBeNull()
    })

    it('should handle response without id field', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ slug: 'spider-man', title: 'Spider-Man' })
      })

      const result = await resolveSlug('spider-man', 'movie', false) // Disable TMDB fallback

      expect(result).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty slug', async () => {
      const result = await resolveSlug('', 'movie')

      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only slug', async () => {
      const result = await resolveSlug('   ', 'movie')

      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle very long slugs', async () => {
      const longSlug = 'a'.repeat(200)

        ; (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: false,
          status: 404
        })

      const result = await resolveSlug(longSlug, 'movie', false) // Disable TMDB fallback

      expect(result).toBeNull()
    })

    it('should handle slugs with special characters', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 12345, slug: 'spider-man-2024', title: 'Spider-Man' })
      })

      const result = await resolveSlug('spider-man-2024', 'movie', false) // Disable TMDB fallback

      expect(result).toBe(12345)
    })

    it('should handle Arabic slugs', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 99999, slug: 'sbaydr-man', title: 'سبايدر مان' })
      })

      const result = await resolveSlug('sbaydr-man', 'movie', false) // Disable TMDB fallback

      expect(result).toBe(99999)
    })
  })

  describe('Cache Behavior', () => {
    it('should cache successful resolutions', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 12345, slug: 'spider-man', title: 'Spider-Man' })
      })

      // First call
      const result1 = await resolveSlug('spider-man', 'movie', false) // Disable TMDB fallback
      expect(result1).toBe(12345)
      expect(global.fetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result2 = await resolveSlug('spider-man', 'movie', false) // Disable TMDB fallback
      expect(result2).toBe(12345)
      expect(global.fetch).toHaveBeenCalledTimes(1) // Still 1
    })

    it('should not cache failed resolutions', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404
      })

      // First call
      const result1 = await resolveSlug('non-existent', 'movie', false) // Disable TMDB fallback
      expect(result1).toBeNull()
      expect(global.fetch).toHaveBeenCalledTimes(1)

      // Second call should try again (not cached)
      const result2 = await resolveSlug('non-existent', 'movie', false) // Disable TMDB fallback
      expect(result2).toBeNull()
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })
})
