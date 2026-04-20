/**
 * Unit Tests for Redirect Handler
 * 
 * Tests redirect URL generation for legacy URLs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateRedirectUrl } from '../url-utils'

// Mock fetch globally
global.fetch = vi.fn()

describe('Redirect Handler - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Movie Redirects', () => {
    it('should generate redirect URL for movie with slug', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 12345,
          slug: 'spider-man',
          title: 'Spider-Man'
        })
      })

      const redirectUrl = await generateRedirectUrl(12345, 'movie')
      
      expect(redirectUrl).toBe('/watch/movie/spider-man')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/db/movies/12345')
      )
    })

    it('should return null for non-existent movie', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const redirectUrl = await generateRedirectUrl(99999, 'movie')
      
      expect(redirectUrl).toBeNull()
    })

    it('should return null for movie without slug', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 12345,
          slug: null,
          title: 'Spider-Man'
        })
      })

      const redirectUrl = await generateRedirectUrl(12345, 'movie')
      
      expect(redirectUrl).toBeNull()
    })
  })

  describe('TV Series Redirects', () => {
    it('should generate redirect URL for TV series with season and episode', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 67890,
          slug: 'breaking-bad',
          name: 'Breaking Bad'
        })
      })

      const redirectUrl = await generateRedirectUrl(67890, 'tv', 2, 5)
      
      expect(redirectUrl).toBe('/watch/tv/breaking-bad/s2/ep5')
    })

    it('should generate redirect URL for TV series without season/episode', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 67890,
          slug: 'breaking-bad',
          name: 'Breaking Bad'
        })
      })

      const redirectUrl = await generateRedirectUrl(67890, 'tv')
      
      // Without season/episode, should not include them
      expect(redirectUrl).not.toContain('/s')
      expect(redirectUrl).not.toContain('/ep')
    })

    it('should preserve season and episode numbers', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 67890,
          slug: 'breaking-bad',
          name: 'Breaking Bad'
        })
      })

      const redirectUrl = await generateRedirectUrl(67890, 'tv', 1, 1)
      
      expect(redirectUrl).toBe('/watch/tv/breaking-bad/s1/ep1')
    })

    it('should handle high season and episode numbers', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 67890,
          slug: 'breaking-bad',
          name: 'Breaking Bad'
        })
      })

      const redirectUrl = await generateRedirectUrl(67890, 'tv', 10, 25)
      
      expect(redirectUrl).toBe('/watch/tv/breaking-bad/s10/ep25')
    })
  })

  describe('Other Content Types', () => {
    it('should generate redirect URL for games', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 22222,
          slug: 'the-witcher-3',
          title: 'The Witcher 3'
        })
      })

      const redirectUrl = await generateRedirectUrl(22222, 'game')
      
      expect(redirectUrl).toBe('/game/the-witcher-3')
    })

    it('should generate redirect URL for software', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 33333,
          slug: 'adobe-photoshop',
          title: 'Adobe Photoshop'
        })
      })

      const redirectUrl = await generateRedirectUrl(33333, 'software')
      
      expect(redirectUrl).toBe('/software/adobe-photoshop')
    })

    it('should generate redirect URL for actors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 11111,
          slug: 'tom-hanks',
          name: 'Tom Hanks'
        })
      })

      const redirectUrl = await generateRedirectUrl(11111, 'actor')
      
      expect(redirectUrl).toBe('/actor/tom-hanks')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const redirectUrl = await generateRedirectUrl(12345, 'movie')
      
      expect(redirectUrl).toBeNull()
    })

    it('should handle network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      const redirectUrl = await generateRedirectUrl(12345, 'movie')
      
      expect(redirectUrl).toBeNull()
    })

    it('should handle malformed JSON', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      const redirectUrl = await generateRedirectUrl(12345, 'movie')
      
      expect(redirectUrl).toBeNull()
    })

    it('should handle empty response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => null
      })

      const redirectUrl = await generateRedirectUrl(12345, 'movie')
      
      expect(redirectUrl).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    it('should handle content with empty slug', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 12345,
          slug: '',
          title: 'Spider-Man'
        })
      })

      const redirectUrl = await generateRedirectUrl(12345, 'movie')
      
      expect(redirectUrl).toBeNull()
    })

    it('should handle content with whitespace slug', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 12345,
          slug: '   ',
          title: 'Spider-Man'
        })
      })

      const redirectUrl = await generateRedirectUrl(12345, 'movie')
      
      expect(redirectUrl).toBeNull()
    })

    it('should handle zero content ID', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const redirectUrl = await generateRedirectUrl(0, 'movie')
      
      expect(redirectUrl).toBeNull()
    })

    it('should handle negative content ID', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const redirectUrl = await generateRedirectUrl(-1, 'movie')
      
      expect(redirectUrl).toBeNull()
    })

    it('should handle season without episode', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 67890,
          slug: 'breaking-bad',
          name: 'Breaking Bad'
        })
      })

      const redirectUrl = await generateRedirectUrl(67890, 'tv', 2, undefined)
      
      // Should not include season/episode if episode is missing
      expect(redirectUrl).not.toContain('/s2')
    })

    it('should handle episode without season', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: 67890,
          slug: 'breaking-bad',
          name: 'Breaking Bad'
        })
      })

      const redirectUrl = await generateRedirectUrl(67890, 'tv', undefined, 5)
      
      // Should not include season/episode if season is missing
      expect(redirectUrl).not.toContain('/ep5')
    })
  })
})
