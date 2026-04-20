/**
 * Unit Tests for Watch Page - Slug Resolution
 * 
 * Tests slug resolution logic in the Watch page
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolveSlug, clearCache } from '../../../lib/slugResolver'
import { extractYearFromSlug, detectLegacyUrl } from '../../../lib/url-utils'

// Mock fetch globally
global.fetch = vi.fn()

describe('Watch Page - Slug Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCache() // Clear cache before each test
  })

  describe('Database Resolution', () => {
    it('should resolve movie slug from database', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 12345 })
      })

      const id = await resolveSlug('spider-man', 'movie')
      
      expect(id).toBe(12345)
      expect(global.fetch).toHaveBeenCalledWith('/api/db/movies/slug/spider-man')
    })

    it('should resolve TV series slug from database', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 67890 })
      })

      const id = await resolveSlug('breaking-bad', 'tv')
      
      expect(id).toBe(67890)
    })

    it('should return null for non-existent slug', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const id = await resolveSlug('non-existent-movie', 'movie')
      
      expect(id).toBeNull()
    })
  })

  describe('TMDB Fallback', () => {
    it('should extract year from slug for TMDB search', () => {
      const year = extractYearFromSlug('spider-man-2024')
      
      expect(year).toBe(2024)
    })

    it('should handle slugs without years', () => {
      const year = extractYearFromSlug('spider-man')
      
      expect(year).toBeNull()
    })

    it('should convert slug to search query', () => {
      const slug = 'spider-man-2024'
      const query = slug.replace(/-/g, ' ')
      
      expect(query).toBe('spider man 2024')
    })
  })

  describe('Legacy URL Handling', () => {
    it('should detect legacy URL with ID', () => {
      const detection = detectLegacyUrl('spider-man-12345')
      
      expect(detection.isLegacy).toBe(true)
      expect(detection.id).toBe(12345)
      expect(detection.cleanSlug).toBe('spider-man')
    })

    it('should not detect clean URL as legacy', () => {
      const detection = detectLegacyUrl('spider-man')
      
      expect(detection.isLegacy).toBe(false)
      expect(detection.id).toBeNull()
    })

    it('should handle TV series legacy URLs', () => {
      const detection = detectLegacyUrl('breaking-bad-67890')
      
      expect(detection.isLegacy).toBe(true)
      expect(detection.id).toBe(67890)
    })
  })

  describe('404 Error Handling', () => {
    it('should handle database errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const id = await resolveSlug('spider-man', 'movie')
      
      expect(id).toBeNull()
    })

    it('should handle network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      const id = await resolveSlug('spider-man', 'movie')
      
      expect(id).toBeNull()
    })

    it('should handle empty slug', async () => {
      const id = await resolveSlug('', 'movie')
      
      expect(id).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle Arabic transliterated slugs', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 99999 })
      })

      const id = await resolveSlug('sbaydr-man', 'movie')
      
      expect(id).toBe(99999)
    })

    it('should handle slugs with multiple hyphens', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 11111 })
      })

      const id = await resolveSlug('the-amazing-spider-man', 'movie')
      
      expect(id).toBe(11111)
    })

    it('should handle very long slugs', async () => {
      const longSlug = 'a'.repeat(100)
      
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const id = await resolveSlug(longSlug, 'movie')
      
      expect(id).toBeNull()
    })

    it('should handle slugs with numbers in the middle', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 22222 })
      })

      const id = await resolveSlug('spider-man-2', 'movie')
      
      expect(id).toBe(22222)
    })
  })

  describe('Year Prioritization', () => {
    it('should extract year for TMDB prioritization', () => {
      const testCases = [
        { slug: 'spider-man-2024', expectedYear: 2024 },
        { slug: 'inception-2010', expectedYear: 2010 },
        { slug: 'the-matrix-1999', expectedYear: 1999 },
        { slug: 'spider-man', expectedYear: null }
      ]
      
      testCases.forEach(({ slug, expectedYear }) => {
        const year = extractYearFromSlug(slug)
        expect(year).toBe(expectedYear)
      })
    })

    it('should handle invalid years', () => {
      const testCases = [
        'movie-1899', // Too old
        'movie-2100', // Too far in future
        'movie-123',  // Not a valid year
        'movie-12345' // ID, not year
      ]
      
      testCases.forEach(slug => {
        const year = extractYearFromSlug(slug)
        // Years outside 1900-2099 should return null
        if (slug.includes('1899') || slug.includes('2100')) {
          expect(year).toBeNull()
        }
      })
    })
  })
})
