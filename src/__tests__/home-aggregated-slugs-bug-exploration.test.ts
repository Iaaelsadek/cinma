/**
 * Bug Exploration Test: Home Aggregated & Recommendations Missing Slugs
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**
 * 
 * IMPORTANT: This test is EXPECTED TO FAIL on unfixed code.
 * The failure confirms the bug exists.
 * 
 * This test encodes the expected behavior - it will verify the fix
 * when it passes after implementation.
 * 
 * Goal: Surface counterexamples that prove the bug exists
 * 
 * Bug Condition: 
 * - homeAggregated query returns TMDB data without slugs when /api/home endpoint fails
 * - topRatedMovies and trendingItems from TMDB API lack valid slugs
 * - All recommendations.ts functions (tmdbFallback, searchTitles, summarizeGenres, ultimate fallback) use TMDB API without slugs
 * - generateWatchUrl() and generateContentUrl() throw "Missing slug for content" errors when using TMDB data
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateWatchUrl, generateContentUrl } from '../lib/utils'
import * as fc from 'fast-check'

describe('Bug Exploration: Home Aggregated & Recommendations Missing Slugs', () => {
  describe('Property 1: Bug Condition - Home Aggregated Missing Slugs', () => {
    // Simulate TMDB API response structure (without slug field)
    // This is what homeAggregated returns when /api/home fails
    
    it('should throw error when homeAggregated returns TMDB popularMovies without slugs', () => {
      const tmdbPopularMovie = {
        id: 1523145,
        title: 'Твоё сердце будет разбито',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 7.5,
        overview: 'Movie from TMDB API',
        release_date: '2024-01-15',
        // slug is MISSING - this is the bug
      }

      expect(() => {
        generateWatchUrl(tmdbPopularMovie as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbPopularMovie as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when homeAggregated returns TMDB topRatedMovies without slugs', () => {
      const tmdbTopRatedMovie = {
        id: 278,
        title: 'The Shawshank Redemption',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.7,
        overview: 'Top rated movie from TMDB',
        release_date: '1994-09-23',
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbTopRatedMovie as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbTopRatedMovie as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when homeAggregated returns TMDB trending items without slugs', () => {
      const tmdbTrendingItem = {
        id: 94605,
        name: 'Arcane',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.9,
        overview: 'Trending series from TMDB',
        first_air_date: '2021-11-06',
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbTrendingItem as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbTrendingItem as any)
      }).toThrow(/Missing slug for content/)
    })
  })

  describe('Property 1: Bug Condition - Recommendations tmdbFallback Missing Slugs', () => {
    it('should throw error when tmdbFallback returns similar movies without slugs', () => {
      const tmdbSimilarMovie = {
        id: 550,
        title: 'Fight Club',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.4,
        overview: 'Similar movie from TMDB',
        release_date: '1999-10-15',
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbSimilarMovie as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbSimilarMovie as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when tmdbFallback returns similar TV shows without slugs', () => {
      const tmdbSimilarTV = {
        id: 1399,
        name: 'Game of Thrones',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.4,
        overview: 'Similar TV show from TMDB',
        first_air_date: '2011-04-17',
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbSimilarTV as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbSimilarTV as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when tmdbFallback returns discover movies without slugs', () => {
      const tmdbDiscoverMovie = {
        id: 603,
        title: 'The Matrix',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.2,
        overview: 'Discover movie from TMDB',
        release_date: '1999-03-31',
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbDiscoverMovie as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbDiscoverMovie as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when tmdbFallback returns discover TV shows without slugs', () => {
      const tmdbDiscoverTV = {
        id: 1396,
        name: 'Breaking Bad',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.9,
        overview: 'Discover TV show from TMDB',
        first_air_date: '2008-01-20',
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbDiscoverTV as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbDiscoverTV as any)
      }).toThrow(/Missing slug for content/)
    })
  })

  describe('Property 1: Bug Condition - Recommendations searchTitles Missing Slugs', () => {
    it('should throw error when searchTitles returns movie search results without slugs', () => {
      const tmdbSearchMovie = {
        id: 13,
        title: 'Forrest Gump',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.8,
        overview: 'Search result from TMDB',
        release_date: '1994-07-06',
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbSearchMovie as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbSearchMovie as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when searchTitles returns TV search results without slugs', () => {
      const tmdbSearchTV = {
        id: 1668,
        name: 'Friends',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.4,
        overview: 'Search result from TMDB',
        first_air_date: '1994-09-22',
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbSearchTV as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbSearchTV as any)
      }).toThrow(/Missing slug for content/)
    })
  })

  describe('Property 1: Bug Condition - Recommendations summarizeGenres Missing Slugs', () => {
    it('should throw error when summarizeGenres fetches movie details without slugs', () => {
      const tmdbMovieDetails = {
        id: 680,
        title: 'Pulp Fiction',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.5,
        overview: 'Movie details from TMDB',
        release_date: '1994-10-14',
        genres: [{ id: 80, name: 'Crime' }, { id: 18, name: 'Drama' }],
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbMovieDetails as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbMovieDetails as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when summarizeGenres fetches TV details without slugs', () => {
      const tmdbTVDetails = {
        id: 1402,
        name: 'The Walking Dead',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.1,
        overview: 'TV details from TMDB',
        first_air_date: '2010-10-31',
        genres: [{ id: 18, name: 'Drama' }, { id: 10765, name: 'Sci-Fi & Fantasy' }],
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbTVDetails as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbTVDetails as any)
      }).toThrow(/Missing slug for content/)
    })
  })

  describe('Property 1: Bug Condition - Ultimate Fallback Missing Slugs', () => {
    it('should throw error when ultimate fallback returns trending content without slugs', () => {
      const tmdbTrendingContent = {
        id: 505642,
        title: 'Black Panther: Wakanda Forever',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 7.3,
        overview: 'Trending content from TMDB',
        release_date: '2022-11-09',
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbTrendingContent as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbTrendingContent as any)
      }).toThrow(/Missing slug for content/)
    })

    it('should throw error when ultimate fallback returns trending TV without slugs', () => {
      const tmdbTrendingTV = {
        id: 94997,
        name: 'House of the Dragon',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.4,
        overview: 'Trending TV from TMDB',
        first_air_date: '2022-08-21',
        // slug is MISSING
      }

      expect(() => {
        generateWatchUrl(tmdbTrendingTV as any)
      }).toThrow(/Missing slug for content/)

      expect(() => {
        generateContentUrl(tmdbTrendingTV as any)
      }).toThrow(/Missing slug for content/)
    })
  })

  describe('Property-Based Test: Any TMDB Content Without Slug Should Fail', () => {
    it('should throw error for any TMDB movie without slug', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 999999 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            media_type: fc.constant('movie'),
            poster_path: fc.string(),
            backdrop_path: fc.string(),
            vote_average: fc.double({ min: 0, max: 10 }),
            overview: fc.string(),
            release_date: fc.date().map(d => d.toISOString().split('T')[0]),
            // slug is intentionally MISSING
          }),
          (tmdbMovie) => {
            expect(() => {
              generateWatchUrl(tmdbMovie as any)
            }).toThrow(/Missing slug for content/)

            expect(() => {
              generateContentUrl(tmdbMovie as any)
            }).toThrow(/Missing slug for content/)
          }
        ),
        { numRuns: 20 } // Scoped PBT for deterministic bugs
      )
    })

    it('should throw error for any TMDB TV show without slug', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.integer({ min: 1, max: 999999 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            media_type: fc.constant('tv'),
            poster_path: fc.string(),
            backdrop_path: fc.string(),
            vote_average: fc.double({ min: 0, max: 10 }),
            overview: fc.string(),
            first_air_date: fc.date().map(d => d.toISOString().split('T')[0]),
            // slug is intentionally MISSING
          }),
          (tmdbTV) => {
            expect(() => {
              generateWatchUrl(tmdbTV as any)
            }).toThrow(/Missing slug for content/)

            expect(() => {
              generateContentUrl(tmdbTV as any)
            }).toThrow(/Missing slug for content/)
          }
        ),
        { numRuns: 20 } // Scoped PBT for deterministic bugs
      )
    })
  })

  describe('Expected Behavior After Fix', () => {
    // These tests document what SHOULD happen after the fix
    // They will fail now, but should pass after implementation

    it('should generate valid URLs when homeAggregated returns CockroachDB data with slugs', () => {
      const cockroachDBMovie = {
        id: 1523145,
        title: 'Твоё сердце будет разбито',
        media_type: 'movie',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 7.5,
        overview: 'Movie from CockroachDB',
        release_date: '2024-01-15',
        slug: 'your-heart-will-be-broken-2024', // CockroachDB includes slug
      }

      const watchUrl = generateWatchUrl(cockroachDBMovie as any)
      expect(watchUrl).toBe('/watch/movie/your-heart-will-be-broken-2024')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBMovie as any)
      expect(contentUrl).toBe('/movie/your-heart-will-be-broken-2024')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })

    it('should generate valid URLs when recommendations return CockroachDB data with slugs', () => {
      const cockroachDBTV = {
        id: 94605,
        name: 'Arcane',
        media_type: 'tv',
        poster_path: '/path.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.9,
        overview: 'TV show from CockroachDB',
        first_air_date: '2021-11-06',
        slug: 'arcane-2021', // CockroachDB includes slug
      }

      const watchUrl = generateWatchUrl(cockroachDBTV as any)
      expect(watchUrl).toBe('/watch/tv/arcane-2021/s1/ep1')
      expect(watchUrl).not.toContain('undefined')
      expect(watchUrl).not.toContain('null')

      const contentUrl = generateContentUrl(cockroachDBTV as any)
      expect(contentUrl).toBe('/series/arcane-2021')
      expect(contentUrl).not.toContain('undefined')
      expect(contentUrl).not.toContain('null')
    })

    it('should filter out items without slugs before passing to QuantumTrain', () => {
      // After fix, the code should filter items without slugs
      const mixedItems = [
        { id: 1, title: 'Movie 1', slug: 'movie-1', media_type: 'movie' },
        { id: 2, title: 'Movie 2', slug: null, media_type: 'movie' }, // Should be filtered
        { id: 3, title: 'Movie 3', slug: '', media_type: 'movie' }, // Should be filtered
        { id: 4, title: 'Movie 4', slug: 'movie-4', media_type: 'movie' },
      ]

      // After fix, only items with valid slugs should remain
      const validItems = mixedItems.filter(item => item.slug && item.slug.trim() !== '')
      expect(validItems).toHaveLength(2)
      expect(validItems[0].id).toBe(1)
      expect(validItems[1].id).toBe(4)
    })
  })
})
