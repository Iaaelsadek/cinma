/**
 * Preservation Tests: CockroachDB Content Unchanged
 * 
 * IMPORTANT: These tests should PASS on unfixed code.
 * They verify that existing CockroachDB content continues to work correctly.
 * 
 * Goal: Ensure the fix doesn't break existing functionality
 * 
 * Property 2: For any content that already has valid slugs from CockroachDB API,
 * the fixed code SHALL produce exactly the same behavior as the original code.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { generateWatchUrl, generateContentUrl } from '../lib/utils'

describe('Preservation: CockroachDB Content Unchanged', () => {
  // Simulate CockroachDB API response structure (WITH slug field)
  const cockroachDBMovie = {
    id: 550,
    slug: 'fight-club-1999',
    title: 'Fight Club',
    media_type: 'movie',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 8.4,
    overview: 'Movie overview',
    release_date: '1999-10-15',
  }

  const cockroachDBTVSeries = {
    id: 1399,
    slug: 'game-of-thrones-2011',
    name: 'Game of Thrones',
    media_type: 'tv',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 8.3,
    overview: 'TV series overview',
    first_air_date: '2011-04-17',
  }

  const cockroachDBArabicSeries = {
    id: 12345,
    slug: 'arabic-series-2020',
    name: 'مسلسل عربي',
    media_type: 'tv',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 7.8,
    overview: 'Arabic series',
    first_air_date: '2020-04-24',
  }

  const cockroachDBKidsMovie = {
    id: 862,
    slug: 'toy-story-1995',
    title: 'Toy Story',
    media_type: 'movie',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 8.0,
    overview: 'Kids movie',
    release_date: '1995-11-22',
  }

  const cockroachDBBollywood = {
    id: 19404,
    slug: 'dilwale-dulhania-le-jayenge-1995',
    title: 'Dilwale Dulhania Le Jayenge',
    media_type: 'movie',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 8.7,
    overview: 'Bollywood movie',
    release_date: '1995-10-20',
  }

  describe('Property 2: Preservation - URL Generation Works Correctly', () => {
    it('should generate correct watch URL for movie with slug', () => {
      const url = generateWatchUrl(cockroachDBMovie as any)
      expect(url).toBe('/watch/movie/fight-club-1999')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
      expect(url).not.toContain('550') // Should not contain ID
    })

    it('should generate correct content URL for movie with slug', () => {
      const url = generateContentUrl(cockroachDBMovie as any)
      expect(url).toBe('/movie/fight-club-1999')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
      expect(url).not.toContain('550')
    })

    it('should generate correct watch URL for TV series with slug', () => {
      const url = generateWatchUrl(cockroachDBTVSeries as any)
      expect(url).toBe('/watch/tv/game-of-thrones-2011/s1/ep1')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
      expect(url).not.toContain('1399')
    })

    it('should generate correct content URL for TV series with slug', () => {
      const url = generateContentUrl(cockroachDBTVSeries as any)
      expect(url).toBe('/series/game-of-thrones-2011')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
      expect(url).not.toContain('1399')
    })

    it('should generate correct watch URL for Arabic series with slug', () => {
      const url = generateWatchUrl(cockroachDBArabicSeries as any)
      expect(url).toBe('/watch/tv/arabic-series-2020/s1/ep1')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
    })

    it('should generate correct content URL for Arabic series with slug', () => {
      const url = generateContentUrl(cockroachDBArabicSeries as any)
      expect(url).toBe('/series/arabic-series-2020')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
    })

    it('should generate correct watch URL for kids movie with slug', () => {
      const url = generateWatchUrl(cockroachDBKidsMovie as any)
      expect(url).toBe('/watch/movie/toy-story-1995')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
    })

    it('should generate correct content URL for kids movie with slug', () => {
      const url = generateContentUrl(cockroachDBKidsMovie as any)
      expect(url).toBe('/movie/toy-story-1995')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
    })

    it('should generate correct watch URL for Bollywood movie with slug', () => {
      const url = generateWatchUrl(cockroachDBBollywood as any)
      expect(url).toBe('/watch/movie/dilwale-dulhania-le-jayenge-1995')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
    })

    it('should generate correct content URL for Bollywood movie with slug', () => {
      const url = generateContentUrl(cockroachDBBollywood as any)
      expect(url).toBe('/movie/dilwale-dulhania-le-jayenge-1995')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
    })
  })

  describe('Property 2: Preservation - Slug Validation', () => {
    it('should accept valid slugs (non-null, non-empty, not "content")', () => {
      expect(() => generateWatchUrl(cockroachDBMovie as any)).not.toThrow()
      expect(() => generateContentUrl(cockroachDBMovie as any)).not.toThrow()
    })

    it('should accept slugs with hyphens and numbers', () => {
      const content = {
        id: 123,
        slug: 'movie-title-2024',
        title: 'Movie Title',
        media_type: 'movie',
      }
      expect(() => generateWatchUrl(content as any)).not.toThrow()
      expect(() => generateContentUrl(content as any)).not.toThrow()
    })

    it('should accept slugs with multiple words', () => {
      const content = {
        id: 456,
        slug: 'the-lord-of-the-rings-2001',
        title: 'The Lord of the Rings',
        media_type: 'movie',
      }
      const watchUrl = generateWatchUrl(content as any)
      const contentUrl = generateContentUrl(content as any)
      
      expect(watchUrl).toBe('/watch/movie/the-lord-of-the-rings-2001')
      expect(contentUrl).toBe('/movie/the-lord-of-the-rings-2001')
    })

    it('should work with TV series slugs', () => {
      const content = {
        id: 789,
        slug: 'breaking-bad-2008',
        name: 'Breaking Bad',
        media_type: 'tv',
      }
      const watchUrl = generateWatchUrl(content as any)
      const contentUrl = generateContentUrl(content as any)
      
      expect(watchUrl).toBe('/watch/tv/breaking-bad-2008/s1/ep1')
      expect(contentUrl).toBe('/series/breaking-bad-2008')
    })
  })

  describe('Property 2: Preservation - Edge Cases', () => {
    it('should handle slugs with special characters (Arabic, CJK)', () => {
      const arabicContent = {
        id: 111,
        slug: 'arabic-movie-2020',
        title: 'فيلم عربي',
        media_type: 'movie',
      }
      expect(() => generateWatchUrl(arabicContent as any)).not.toThrow()
      expect(() => generateContentUrl(arabicContent as any)).not.toThrow()
    })

    it('should handle very long slugs', () => {
      const longSlugContent = {
        id: 222,
        slug: 'this-is-a-very-long-movie-title-with-many-words-2024',
        title: 'This is a very long movie title with many words',
        media_type: 'movie',
      }
      const url = generateWatchUrl(longSlugContent as any)
      expect(url).toContain('this-is-a-very-long-movie-title-with-many-words-2024')
    })

    it('should handle slugs with year suffix', () => {
      const content = {
        id: 333,
        slug: 'avatar-2009',
        title: 'Avatar',
        media_type: 'movie',
      }
      const url = generateWatchUrl(content as any)
      expect(url).toBe('/watch/movie/avatar-2009')
    })
  })

  describe('Property 2: Preservation - Consistency', () => {
    it('should produce same URL for same input (idempotent)', () => {
      const url1 = generateWatchUrl(cockroachDBMovie as any)
      const url2 = generateWatchUrl(cockroachDBMovie as any)
      expect(url1).toBe(url2)
    })

    it('should produce same content URL for same input', () => {
      const url1 = generateContentUrl(cockroachDBTVSeries as any)
      const url2 = generateContentUrl(cockroachDBTVSeries as any)
      expect(url1).toBe(url2)
    })

    it('should handle both title and name fields correctly', () => {
      const movieWithTitle = {
        id: 444,
        slug: 'movie-2020',
        title: 'Movie Title',
        media_type: 'movie',
      }
      const seriesWithName = {
        id: 555,
        slug: 'series-2020',
        name: 'Series Name',
        media_type: 'tv',
      }
      
      expect(() => generateWatchUrl(movieWithTitle as any)).not.toThrow()
      expect(() => generateWatchUrl(seriesWithName as any)).not.toThrow()
    })
  })
})
