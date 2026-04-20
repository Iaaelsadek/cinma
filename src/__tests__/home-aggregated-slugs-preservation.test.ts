/**
 * Preservation Property Tests: CockroachDB Content & URL Generation Unchanged
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
 * 
 * IMPORTANT: This test follows the "Observe First" methodology.
 * We observe the behavior on unfixed code for CockroachDB content and write
 * property-based tests that capture the observed behavior patterns from preservation requirements.
 * 
 * Expected Result: Tests PASS on unfixed code (confirms baseline behavior to preserve)
 * 
 * These tests verify that:
 * - criticalHomeData from /api/db/home contains valid slugs
 * - diverseHero from /api/db/home contains valid slugs
 * - HomeBelowFoldSections with CockroachDB content works correctly
 * - generateWatchUrl() and generateContentUrl() work correctly with CockroachDB content
 * - MovieCard renders interactive cards correctly with valid slugs
 */

import { describe, it, expect } from 'vitest'
import { generateWatchUrl, generateContentUrl } from '../lib/utils'
import * as fc from 'fast-check'

describe('Preservation Property Tests: CockroachDB Content & URL Generation', () => {
  describe('Property 2.1: criticalHomeData from /api/db/home has valid slugs', () => {
    // Simulate CockroachDB API response structure (WITH slug field)
    // This is what /api/db/home returns with valid slugs
    
    it('should generate valid watch URL for trending movies from CockroachDB', () => {
      const cockroachDBTrendingMovie = {
        id: 550,
        slug: 'fight-club-1999',
        title: 'Fight Club',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.4,
        overview: 'Movie from CockroachDB',
        release_date: '1999-10-15',
        popularity: 95.5
      }

      const watchUrl = generateWatchUrl(cockroachDBTrendingMovie as any)
      expect(watchUrl).toBe('/watch/movie/fight-club-1999')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBTrendingMovie as any)
      expect(contentUrl).toBe('/movie/fight-club-1999')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })

    it('should generate valid watch URL for arabicSeries from CockroachDB', () => {
      const cockroachDBArabicSeries = {
        id: 12345,
        slug: 'arabic-series-2024',
        name: 'مسلسل عربي',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 7.8,
        overview: 'Arabic series from CockroachDB',
        first_air_date: '2024-01-01',
        popularity: 85.2
      }

      const watchUrl = generateWatchUrl(cockroachDBArabicSeries as any)
      expect(watchUrl).toBe('/watch/tv/arabic-series-2024/s1/ep1')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBArabicSeries as any)
      expect(contentUrl).toBe('/series/arabic-series-2024')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })

    it('should generate valid watch URL for kids movies from CockroachDB', () => {
      const cockroachDBKidsMovie = {
        id: 9999,
        slug: 'kids-movie-2023',
        title: 'Kids Movie',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 7.2,
        overview: 'Kids movie from CockroachDB',
        release_date: '2023-06-15',
        popularity: 78.9
      }

      const watchUrl = generateWatchUrl(cockroachDBKidsMovie as any)
      expect(watchUrl).toBe('/watch/movie/kids-movie-2023')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBKidsMovie as any)
      expect(contentUrl).toBe('/movie/kids-movie-2023')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })

    it('should generate valid watch URL for bollywood movies from CockroachDB', () => {
      const cockroachDBBollywoodMovie = {
        id: 7777,
        slug: 'bollywood-movie-2024',
        title: 'Bollywood Movie',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.1,
        overview: 'Bollywood movie from CockroachDB',
        release_date: '2024-03-20',
        popularity: 92.3
      }

      const watchUrl = generateWatchUrl(cockroachDBBollywoodMovie as any)
      expect(watchUrl).toBe('/watch/movie/bollywood-movie-2024')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBBollywoodMovie as any)
      expect(contentUrl).toBe('/movie/bollywood-movie-2024')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })
  })

  describe('Property 2.2: diverseHero from /api/db/home has valid slugs', () => {
    it('should generate valid URLs for diverse hero content from CockroachDB', () => {
      const cockroachDBHeroContent = {
        id: 8888,
        slug: 'hero-movie-2024',
        title: 'Hero Movie',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.5,
        overview: 'Hero movie from CockroachDB',
        release_date: '2024-02-14',
        popularity: 98.7
      }

      const watchUrl = generateWatchUrl(cockroachDBHeroContent as any)
      expect(watchUrl).toBe('/watch/movie/hero-movie-2024')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBHeroContent as any)
      expect(contentUrl).toBe('/movie/hero-movie-2024')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })
  })

  describe('Property 2.3: HomeBelowFoldSections with CockroachDB content works correctly', () => {
    it('should generate valid URLs for Korean series from CockroachDB', () => {
      const cockroachDBKoreanSeries = {
        id: 11111,
        slug: 'korean-drama-2024',
        name: 'Korean Drama',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.7,
        overview: 'Korean series from CockroachDB',
        first_air_date: '2024-01-10',
        popularity: 89.4
      }

      const watchUrl = generateWatchUrl(cockroachDBKoreanSeries as any)
      expect(watchUrl).toBe('/watch/tv/korean-drama-2024/s1/ep1')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBKoreanSeries as any)
      expect(contentUrl).toBe('/series/korean-drama-2024')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })

    it('should generate valid URLs for Turkish series from CockroachDB', () => {
      const cockroachDBTurkishSeries = {
        id: 22222,
        slug: 'turkish-drama-2024',
        name: 'Turkish Drama',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.3,
        overview: 'Turkish series from CockroachDB',
        first_air_date: '2024-02-05',
        popularity: 87.1
      }

      const watchUrl = generateWatchUrl(cockroachDBTurkishSeries as any)
      expect(watchUrl).toBe('/watch/tv/turkish-drama-2024/s1/ep1')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBTurkishSeries as any)
      expect(contentUrl).toBe('/series/turkish-drama-2024')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })

    it('should generate valid URLs for Chinese series from CockroachDB', () => {
      const cockroachDBChineseSeries = {
        id: 33333,
        slug: 'chinese-drama-2024',
        name: 'Chinese Drama',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.0,
        overview: 'Chinese series from CockroachDB',
        first_air_date: '2024-03-01',
        popularity: 82.5
      }

      const watchUrl = generateWatchUrl(cockroachDBChineseSeries as any)
      expect(watchUrl).toBe('/watch/tv/chinese-drama-2024/s1/ep1')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBChineseSeries as any)
      expect(contentUrl).toBe('/series/chinese-drama-2024')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })

    it('should generate valid URLs for documentaries from CockroachDB', () => {
      const cockroachDBDocumentary = {
        id: 44444,
        slug: 'documentary-2024',
        title: 'Documentary',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 7.9,
        overview: 'Documentary from CockroachDB',
        release_date: '2024-04-10',
        popularity: 75.8
      }

      const watchUrl = generateWatchUrl(cockroachDBDocumentary as any)
      expect(watchUrl).toBe('/watch/movie/documentary-2024')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBDocumentary as any)
      expect(contentUrl).toBe('/movie/documentary-2024')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })

    it('should generate valid URLs for anime from CockroachDB', () => {
      const cockroachDBAnime = {
        id: 55555,
        slug: 'anime-series-2024',
        name: 'Anime Series',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.8,
        overview: 'Anime from CockroachDB',
        first_air_date: '2024-01-15',
        popularity: 94.2
      }

      const watchUrl = generateWatchUrl(cockroachDBAnime as any)
      expect(watchUrl).toBe('/watch/tv/anime-series-2024/s1/ep1')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBAnime as any)
      expect(contentUrl).toBe('/series/anime-series-2024')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })

    it('should generate valid URLs for classics from CockroachDB', () => {
      const cockroachDBClassic = {
        id: 66666,
        slug: 'classic-movie-1975',
        title: 'Classic Movie',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.6,
        overview: 'Classic movie from CockroachDB',
        release_date: '1975-12-25',
        popularity: 88.9
      }

      const watchUrl = generateWatchUrl(cockroachDBClassic as any)
      expect(watchUrl).toBe('/watch/movie/classic-movie-1975')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBClassic as any)
      expect(contentUrl).toBe('/movie/classic-movie-1975')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })
  })

  describe('Property 2.4: generateWatchUrl() works correctly with CockroachDB content', () => {
    // Custom slug generator that produces valid slugs (lowercase alphanumeric with hyphens)
    const validSlugArbitrary = fc.stringMatching(/^[a-z0-9][a-z0-9-]{3,48}[a-z0-9]$/)
    
    it('should generate correct watch URLs for movies with valid slugs', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 999999 }),
            slug: validSlugArbitrary,
            title: fc.string({ minLength: 1, maxLength: 100 }),
            media_type: fc.constant('movie'),
            poster_path: fc.string(),
            backdrop_path: fc.string(),
            vote_average: fc.double({ min: 0, max: 10 }),
            overview: fc.string(),
            release_date: fc.date({ min: new Date('1900-01-01'), max: new Date('2099-12-31') }).map(d => d.toISOString().split('T')[0]),
            popularity: fc.double({ min: 0, max: 100 })
          }),
          (cockroachDBMovie) => {
            const watchUrl = generateWatchUrl(cockroachDBMovie as any)
            
            // Verify URL structure
            expect(watchUrl).toMatch(/^\/watch\/movie\/[a-z0-9-]+$/)
            expect(watchUrl).toContain(cockroachDBMovie.slug)
            expect(watchUrl).not.toContain('undefined')
            expect(watchUrl).not.toContain('null')
          }
        ),
        { numRuns: 50 } // Property-based test with 50 runs
      )
    })

    it('should generate correct watch URLs for TV series with valid slugs', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 999999 }),
            slug: validSlugArbitrary,
            name: fc.string({ minLength: 1, maxLength: 100 }),
            media_type: fc.constant('tv'),
            poster_path: fc.string(),
            backdrop_path: fc.string(),
            vote_average: fc.double({ min: 0, max: 10 }),
            overview: fc.string(),
            first_air_date: fc.date({ min: new Date('1900-01-01'), max: new Date('2099-12-31') }).map(d => d.toISOString().split('T')[0]),
            popularity: fc.double({ min: 0, max: 100 })
          }),
          (cockroachDBTV) => {
            const watchUrl = generateWatchUrl(cockroachDBTV as any)
            
            // Verify URL structure
            expect(watchUrl).toMatch(/^\/watch\/tv\/[a-z0-9-]+\/s1\/ep1$/)
            expect(watchUrl).toContain(cockroachDBTV.slug)
            expect(watchUrl).not.toContain('undefined')
            expect(watchUrl).not.toContain('null')
          }
        ),
        { numRuns: 50 } // Property-based test with 50 runs
      )
    })
  })

  describe('Property 2.5: generateContentUrl() works correctly with CockroachDB content', () => {
    // Custom slug generator that produces valid slugs (lowercase alphanumeric with hyphens)
    const validSlugArbitrary = fc.stringMatching(/^[a-z0-9][a-z0-9-]{3,48}[a-z0-9]$/)
    
    it('should generate correct content URLs for movies with valid slugs', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 999999 }),
            slug: validSlugArbitrary,
            title: fc.string({ minLength: 1, maxLength: 100 }),
            media_type: fc.constant('movie'),
            poster_path: fc.string(),
            backdrop_path: fc.string(),
            vote_average: fc.double({ min: 0, max: 10 }),
            overview: fc.string(),
            release_date: fc.date({ min: new Date('1900-01-01'), max: new Date('2099-12-31') }).map(d => d.toISOString().split('T')[0]),
            popularity: fc.double({ min: 0, max: 100 })
          }),
          (cockroachDBMovie) => {
            const contentUrl = generateContentUrl(cockroachDBMovie as any)
            
            // Verify URL structure
            expect(contentUrl).toMatch(/^\/movie\/[a-z0-9-]+$/)
            expect(contentUrl).toContain(cockroachDBMovie.slug)
            expect(contentUrl).not.toContain('undefined')
            expect(contentUrl).not.toContain('null')
          }
        ),
        { numRuns: 50 } // Property-based test with 50 runs
      )
    })

    it('should generate correct content URLs for TV series with valid slugs', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 999999 }),
            slug: validSlugArbitrary,
            name: fc.string({ minLength: 1, maxLength: 100 }),
            media_type: fc.constant('tv'),
            poster_path: fc.string(),
            backdrop_path: fc.string(),
            vote_average: fc.double({ min: 0, max: 10 }),
            overview: fc.string(),
            first_air_date: fc.date({ min: new Date('1900-01-01'), max: new Date('2099-12-31') }).map(d => d.toISOString().split('T')[0]),
            popularity: fc.double({ min: 0, max: 100 })
          }),
          (cockroachDBTV) => {
            const contentUrl = generateContentUrl(cockroachDBTV as any)
            
            // Verify URL structure
            expect(contentUrl).toMatch(/^\/series\/[a-z0-9-]+$/)
            expect(contentUrl).toContain(cockroachDBTV.slug)
            expect(contentUrl).not.toContain('undefined')
            expect(contentUrl).not.toContain('null')
          }
        ),
        { numRuns: 50 } // Property-based test with 50 runs
      )
    })
  })

  describe('Property 2.6: MovieCard renders correctly with valid slugs', () => {
    it('should accept content with valid slugs for rendering', () => {
      const cockroachDBContent = {
        id: 77777,
        slug: 'valid-movie-2024',
        title: 'Valid Movie',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.2,
        overview: 'Movie with valid slug',
        release_date: '2024-05-20',
        popularity: 91.7
      }

      // MovieCard should be able to generate URLs without errors
      const watchUrl = generateWatchUrl(cockroachDBContent as any)
      const contentUrl = generateContentUrl(cockroachDBContent as any)

      expect(watchUrl).toBe('/watch/movie/valid-movie-2024')
      expect(contentUrl).toBe('/movie/valid-movie-2024')
      
      // Verify no errors thrown
      expect(() => generateWatchUrl(cockroachDBContent as any)).not.toThrow()
      expect(() => generateContentUrl(cockroachDBContent as any)).not.toThrow()
    })

    it('should handle TV series content with valid slugs for rendering', () => {
      const cockroachDBTVContent = {
        id: 88888,
        slug: 'valid-series-2024',
        name: 'Valid Series',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.5,
        overview: 'Series with valid slug',
        first_air_date: '2024-06-15',
        popularity: 93.4
      }

      // MovieCard should be able to generate URLs without errors
      const watchUrl = generateWatchUrl(cockroachDBTVContent as any)
      const contentUrl = generateContentUrl(cockroachDBTVContent as any)

      expect(watchUrl).toBe('/watch/tv/valid-series-2024/s1/ep1')
      expect(contentUrl).toBe('/series/valid-series-2024')
      
      // Verify no errors thrown
      expect(() => generateWatchUrl(cockroachDBTVContent as any)).not.toThrow()
      expect(() => generateContentUrl(cockroachDBTVContent as any)).not.toThrow()
    })
  })

  describe('Property 2.7: User interactions with valid slugs work correctly', () => {
    it('should navigate to correct pages when clicking content with valid slugs', () => {
      const cockroachDBContent = {
        id: 99999,
        slug: 'clickable-movie-2024',
        title: 'Clickable Movie',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.0,
        overview: 'Movie for navigation test',
        release_date: '2024-07-01',
        popularity: 86.3
      }

      const watchUrl = generateWatchUrl(cockroachDBContent as any)
      const contentUrl = generateContentUrl(cockroachDBContent as any)

      // Verify URLs are valid and navigable
      expect(watchUrl).toBe('/watch/movie/clickable-movie-2024')
      expect(contentUrl).toBe('/movie/clickable-movie-2024')
      
      // Verify URLs don't contain invalid patterns
      expect(watchUrl).not.toMatch(/undefined|null|content\//)
      expect(contentUrl).not.toMatch(/undefined|null|content\//)
    })
  })

  describe('Property 2.8: Filtering items without slugs works correctly', () => {
    it('should filter out items without valid slugs before rendering', () => {
      const mixedItems = [
        { id: 1, title: 'Movie 1', slug: 'movie-1', media_type: 'movie', poster_path: '/path1.jpg' },
        { id: 2, title: 'Movie 2', slug: null, media_type: 'movie', poster_path: '/path2.jpg' },
        { id: 3, title: 'Movie 3', slug: '', media_type: 'movie', poster_path: '/path3.jpg' },
        { id: 4, title: 'Movie 4', slug: 'content', media_type: 'movie', poster_path: '/path4.jpg' },
        { id: 5, title: 'Movie 5', slug: 'movie-5', media_type: 'movie', poster_path: '/path5.jpg' },
      ]

      // Filter logic that should be applied before passing to components
      const validItems = mixedItems.filter(item => 
        item.slug && 
        item.slug.trim() !== '' && 
        item.slug !== 'content'
      )

      expect(validItems).toHaveLength(2)
      expect(validItems[0].id).toBe(1)
      expect(validItems[1].id).toBe(5)
      
      // Verify all valid items can generate URLs without errors
      validItems.forEach(item => {
        expect(() => generateWatchUrl(item as any)).not.toThrow()
        expect(() => generateContentUrl(item as any)).not.toThrow()
      })
    })
  })

  describe('Property 2.9: All CockroachDB content types preserve slug behavior', () => {
    it('should handle all content types from CockroachDB with valid slugs', () => {
      const contentTypes = [
        { id: 1, slug: 'movie-2024', title: 'Movie', media_type: 'movie', poster_path: '/p1.jpg' },
        { id: 2, slug: 'series-2024', name: 'Series', media_type: 'tv', poster_path: '/p2.jpg' },
        { id: 3, slug: 'anime-2024', name: 'Anime', media_type: 'anime', poster_path: '/p3.jpg' },
        { id: 4, slug: 'game-2024', title: 'Game', media_type: 'game', poster_path: '/p4.jpg' },
        { id: 5, slug: 'software-2024', title: 'Software', media_type: 'software', poster_path: '/p5.jpg' },
      ]

      contentTypes.forEach(content => {
        // All content types should generate valid URLs
        expect(() => generateWatchUrl(content as any)).not.toThrow()
        expect(() => generateContentUrl(content as any)).not.toThrow()
        
        const watchUrl = generateWatchUrl(content as any)
        const contentUrl = generateContentUrl(content as any)
        
        // Verify URLs contain the slug
        expect(watchUrl).toContain(content.slug)
        expect(contentUrl).toContain(content.slug)
        
        // Verify URLs don't contain invalid patterns
        expect(watchUrl).not.toMatch(/undefined|null|content\//)
        expect(contentUrl).not.toMatch(/undefined|null|content\//)
      })
    })
  })
})
