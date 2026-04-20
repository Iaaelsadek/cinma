/**
 * Bug Exploration Test: TMDB Content Missing Slugs
 * 
 * IMPORTANT: This test is EXPECTED TO FAIL on unfixed code.
 * The failure confirms the bug exists.
 * 
 * This test encodes the expected behavior - it will verify the fix
 * when it passes after implementation.
 * 
 * Goal: Surface counterexamples that prove the bug exists
 * 
 * Bug Condition: Content fetched from TMDB API lacks slug field,
 * causing generateWatchUrl() and generateContentUrl() to throw errors.
 */

import { describe, it, expect } from 'vitest'
import { generateWatchUrl, generateContentUrl } from '../lib/utils'

describe('Bug Exploration: TMDB Content Missing Slugs', () => {
  // Simulate TMDB API response structure (without slug field)
  const tmdbKoreanSeries = {
    id: 100088,
    name: '사랑의 불시착',
    title: undefined,
    media_type: 'tv',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 8.9,
    overview: 'Korean drama',
    first_air_date: '2019-12-14',
    // slug is MISSING - this is the bug
  }

  const tmdbTurkishSeries = {
    id: 83097,
    name: 'Muhteşem Yüzyıl',
    title: undefined,
    media_type: 'tv',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 8.2,
    overview: 'Turkish drama',
    first_air_date: '2011-01-05',
    // slug is MISSING
  }

  const tmdbChineseSeries = {
    id: 95557,
    name: '陈情令',
    title: undefined,
    media_type: 'tv',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 8.7,
    overview: 'Chinese drama',
    first_air_date: '2019-06-27',
    // slug is MISSING
  }

  const tmdbDocumentary = {
    id: 58172,
    title: 'Planet Earth II',
    name: undefined,
    media_type: 'movie',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 9.2,
    overview: 'Documentary',
    release_date: '2016-11-06',
    // slug is MISSING
  }

  const tmdbAnime = {
    id: 1429,
    name: '進撃の巨人',
    title: undefined,
    media_type: 'tv',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 8.6,
    overview: 'Anime series',
    first_air_date: '2013-04-07',
    // slug is MISSING
  }

  const tmdbClassic = {
    id: 289,
    title: 'Casablanca',
    name: undefined,
    media_type: 'movie',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 8.3,
    overview: 'Classic movie',
    release_date: '1942-11-26',
    // slug is MISSING
  }

  const tmdbBollywood = {
    id: 19404,
    title: 'Dilwale Dulhania Le Jayenge',
    name: undefined,
    media_type: 'movie',
    poster_path: '/path.jpg',
    backdrop_path: '/backdrop.jpg',
    vote_average: 8.7,
    overview: 'Bollywood movie',
    release_date: '1995-10-20',
    // slug is MISSING
  }

  describe('Property 1: Bug Condition - TMDB Content Missing Slugs', () => {
    it('should throw error when generating watch URL for Korean series without slug', () => {
      expect(() => {
        generateWatchUrl(tmdbKoreanSeries as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating content URL for Korean series without slug', () => {
      expect(() => {
        generateContentUrl(tmdbKoreanSeries as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating watch URL for Turkish series without slug', () => {
      expect(() => {
        generateWatchUrl(tmdbTurkishSeries as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating content URL for Turkish series without slug', () => {
      expect(() => {
        generateContentUrl(tmdbTurkishSeries as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating watch URL for Chinese series without slug', () => {
      expect(() => {
        generateWatchUrl(tmdbChineseSeries as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating content URL for Chinese series without slug', () => {
      expect(() => {
        generateContentUrl(tmdbChineseSeries as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating watch URL for documentary without slug', () => {
      expect(() => {
        generateWatchUrl(tmdbDocumentary as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating content URL for documentary without slug', () => {
      expect(() => {
        generateContentUrl(tmdbDocumentary as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating watch URL for anime without slug', () => {
      expect(() => {
        generateWatchUrl(tmdbAnime as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating content URL for anime without slug', () => {
      expect(() => {
        generateContentUrl(tmdbAnime as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating watch URL for classic movie without slug', () => {
      expect(() => {
        generateWatchUrl(tmdbClassic as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating content URL for classic movie without slug', () => {
      expect(() => {
        generateContentUrl(tmdbClassic as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating watch URL for Bollywood movie without slug', () => {
      expect(() => {
        generateWatchUrl(tmdbBollywood as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when generating content URL for Bollywood movie without slug', () => {
      expect(() => {
        generateContentUrl(tmdbBollywood as any)
      }).toThrow(/Missing slug for content/)
    })
  })

  describe('Expected Behavior After Fix', () => {
    // These tests document what SHOULD happen after the fix
    // They will fail now, but should pass after implementation

    const cockroachDBKoreanSeries = {
      ...tmdbKoreanSeries,
      slug: 'crash-landing-on-you-2019' // CockroachDB includes slug
    }

    const cockroachDBTurkishSeries = {
      ...tmdbTurkishSeries,
      slug: 'magnificent-century-2011'
    }

    it('should generate valid watch URL when content has slug (Korean series)', () => {
      const url = generateWatchUrl(cockroachDBKoreanSeries as any)
      expect(url).toBe('/watch/tv/crash-landing-on-you-2019/s1/ep1')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
    })

    it('should generate valid content URL when content has slug (Korean series)', () => {
      const url = generateContentUrl(cockroachDBKoreanSeries as any)
      expect(url).toBe('/series/crash-landing-on-you-2019')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
    })

    it('should generate valid watch URL when content has slug (Turkish series)', () => {
      const url = generateWatchUrl(cockroachDBTurkishSeries as any)
      expect(url).toBe('/watch/tv/magnificent-century-2011/s1/ep1')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
    })

    it('should generate valid content URL when content has slug (Turkish series)', () => {
      const url = generateContentUrl(cockroachDBTurkishSeries as any)
      expect(url).toBe('/series/magnificent-century-2011')
      expect(url).not.toContain('undefined')
      expect(url).not.toContain('null')
    })
  })
})
