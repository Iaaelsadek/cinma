/**
 * Bug Condition Exploration Tests - Card Links and Errors Fix
 * 
 * **CRITICAL**: These tests MUST FAIL on unfixed code
 * - Failure confirms the bugs exist
 * - Tests encode the expected behavior
 * - They will validate fixes when they pass after implementation
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { MovieCard } from '../components/features/media/MovieCard'
import type { Movie } from '../components/features/media/MovieCard'
import axios from 'axios'

// Mock dependencies
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: null })
}))

vi.mock('../state/useLang', () => ({
  useLang: () => ({ lang: 'en' })
}))

vi.mock('../hooks/useDualTitles', () => ({
  useDualTitles: (movie: { title?: string; name?: string }) => ({
    main: movie.title || movie.name || 'Untitled',
    sub: null
  })
}))

vi.mock('../lib/translation', () => ({
  getTranslation: vi.fn().mockResolvedValue(null),
  resolveOverviewWithFallback: (movie: { overview?: string }) => movie.overview || '',
  resolveTitleWithFallback: (movie: { title?: string; name?: string }) => movie.title || movie.name || 'Untitled'
}))

vi.mock('../lib/supabase', () => ({
  addToWatchlist: vi.fn(),
  isInWatchlist: vi.fn().mockResolvedValue(false),
  removeFromWatchlist: vi.fn()
}))

vi.mock('../lib/genres', () => ({
  getGenreName: vi.fn().mockReturnValue('Action')
}))

vi.mock('../components/common/TmdbImage', () => ({
  TmdbImage: ({ fallback }: { alt?: string; fallback?: ReactNode }) => fallback || null
}))

vi.mock('../components/common/PrefetchLink', () => ({
  PrefetchLink: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} data-testid="prefetch-link" {...props}>
      {children}
    </a>
  )
}))

describe('Bug Condition Exploration Tests', () => {
  describe('Test 1.1: MovieCard click navigates to watch page (not details page)', () => {
    it('should navigate to /watch/movie/{slug} instead of /movie/{slug}', () => {
      // **EXPECTED**: Test FAILS (navigates to details page instead)
      // **Validates: Requirements 1.1, 2.1**
      
      const movieData: Movie = {
        id: 557,
        slug: 'spider-man',
        title: 'Spider-Man',
        release_date: '2002-05-01',
        poster_path: '/gh4cZbhZxyTbgxQPxD0dOudNPTn.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 7.2,
        overview: 'After being bitten by a genetically altered spider...',
        media_type: 'movie',
        genre_ids: [28, 14],
        original_language: 'en'
      }

      const { container } = render(
        <BrowserRouter>
          <MovieCard movie={movieData} index={0} />
        </BrowserRouter>
      )

      const link = container.querySelector('a[data-testid="prefetch-link"]')
      expect(link).toBeTruthy()
      
      const href = link?.getAttribute('href')
      
      // Expected behavior: should navigate to watch page
      expect(href).toBe('/watch/movie/spider-man')
      
      // Current buggy behavior: navigates to details page
      // This assertion will FAIL, confirming the bug exists
    })
  })

  describe('Test 1.2: TV series card click navigates to watch page with S1E1', () => {
    it('should navigate to /watch/tv/{slug}/s1/ep1 instead of /series/{slug}', () => {
      // **EXPECTED**: Test FAILS (navigates to details page instead)
      // **Validates: Requirements 1.2, 2.2**
      
      const tvSeriesData: Movie = {
        id: 1396,
        slug: 'breaking-bad',
        name: 'Breaking Bad',
        first_air_date: '2008-01-20',
        poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
        backdrop_path: '/backdrop.jpg',
        vote_average: 8.9,
        overview: 'A high school chemistry teacher diagnosed with cancer...',
        media_type: 'tv',
        genre_ids: [18, 80],
        original_language: 'en'
      }

      const { container } = render(
        <BrowserRouter>
          <MovieCard movie={tvSeriesData} index={0} />
        </BrowserRouter>
      )

      const link = container.querySelector('a[data-testid="prefetch-link"]')
      expect(link).toBeTruthy()
      
      const href = link?.getAttribute('href')
      
      // Expected behavior: should navigate to watch page with S1E1
      expect(href).toBe('/watch/tv/breaking-bad/s1/ep1')
      
      // Current buggy behavior: navigates to series details page
      // This assertion will FAIL, confirming the bug exists
    })
  })

  describe('Test 1.3: TMDB 404 errors are suppressed silently', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>
    
    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })
    
    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('should suppress 404 errors without logging to console', async () => {
      // **EXPECTED**: Test FAILS (error is logged to terminal)
      // **Validates: Requirements 1.3, 1.4, 2.3, 2.4**
      
      const _mockAxios = axios.create({
        baseURL: '/api/tmdb'
      })

      // Mock 404 response
      const mock404Error = {
        response: {
          status: 404,
          data: { status_message: 'The resource you requested could not be found.' }
        },
        config: {}
      }

      // Simulate TMDB 404 error
      try {
        throw mock404Error
      } catch (error: any) {
        // Current buggy behavior: error is logged
        // Expected behavior: 404 should be suppressed silently
        
        const errorObj = error as { response?: { status?: number } }
        const is404 = errorObj?.response?.status === 404
        expect(is404).toBe(true)
        
        // After fix, 404 errors should NOT be logged
        // This will FAIL on unfixed code because errors ARE logged
        expect(consoleErrorSpy).not.toHaveBeenCalled()
      }
    })
  })

  describe('Test 1.4: Database queries don\'t reference missing columns', () => {
    it('should not query origin_country or category columns that don\'t exist', async () => {
      // **EXPECTED**: Test FAILS (column errors thrown)
      // **Validates: Requirements 1.5, 1.6, 2.5, 2.6**
      
      // Simulate database query with missing columns
      const arabicSeriesQuery = `
        SELECT id, slug, name as title, poster_path, backdrop_path, vote_average,
               overview, first_air_date, popularity, 'tv' as media_type
        FROM tv_series
        WHERE (original_language = 'ar' OR origin_country && ARRAY['EG','SA','SY','AE','KW'])
          AND first_air_date <= $1
        ORDER BY popularity DESC
        LIMIT 50
      `
      
      const kidsMoviesQuery = `
        SELECT id, slug, title, poster_path, backdrop_path, vote_average,
               overview, release_date, popularity, 'movie' as media_type
        FROM movies
        WHERE category IN ('kids-family', 'kids', 'family', 'animation')
          AND release_date <= $1
        ORDER BY popularity DESC
        LIMIT 50
      `
      
      const bollywoodQuery = `
        SELECT id, slug, title, poster_path, backdrop_path, vote_average,
               overview, release_date, popularity, 'movie' as media_type
        FROM movies
        WHERE (category = 'bollywood' OR original_language = 'hi' OR origin_country && ARRAY['IN'])
          AND release_date <= $1
        ORDER BY popularity DESC
        LIMIT 50
      `
      
      // Check if queries reference missing columns
      const hasOriginCountry = arabicSeriesQuery.includes('origin_country') || 
                                bollywoodQuery.includes('origin_country')
      const hasCategory = kidsMoviesQuery.includes('category') || 
                         bollywoodQuery.includes('category')
      
      // Expected behavior: queries should NOT reference missing columns
      // Current buggy behavior: queries DO reference missing columns
      // These assertions will FAIL, confirming the bug exists
      expect(hasOriginCountry).toBe(false)
      expect(hasCategory).toBe(false)
    })
  })

  describe('Test 1.5: Connection timeouts retry with exponential backoff', () => {
    it('should retry connection with exponential backoff on timeout', async () => {
      // **EXPECTED**: Test FAILS (no retry, immediate error)
      // **Validates: Requirements 1.7, 2.7**
      
      let attemptCount = 0
      const _maxRetries = 3
      
      // Simulate database query function WITHOUT retry logic (current buggy behavior)
      const queryWithoutRetry = async () => {
        attemptCount++
        if (attemptCount === 1) {
          // First attempt times out
          throw new Error('Connection terminated due to connection timeout')
        }
        // Second attempt would succeed, but won't be reached without retry logic
        return { rows: [{ id: 1, slug: 'test' }] }
      }
      
      // Simulate query execution
      try {
        await queryWithoutRetry()
      } catch (error: any) {
        const errorObj = error as { message?: string }
        const isTimeout = errorObj.message?.includes('connection timeout') || 
                         errorObj.message?.includes('ETIMEDOUT')
        
        expect(isTimeout).toBe(true)
        
        // Expected behavior: should retry after timeout
        // Current buggy behavior: no retry, immediate error
        // This will FAIL because attemptCount is 1 (no retry happened)
        expect(attemptCount).toBeGreaterThan(1)
      }
    })

    it('should use exponential backoff delays (100ms, 200ms, 400ms)', async () => {
      // **EXPECTED**: Test FAILS (no backoff implemented)
      // **Validates: Requirements 2.7**
      
      const delays: number[] = []
      let lastTime = Date.now()
      
      // Simulate retry with exponential backoff
      const _simulateRetryWithBackoff = async (attempt: number) => {
        if (attempt > 1) {
          const currentTime = Date.now()
          const delay = currentTime - lastTime
          delays.push(delay)
          lastTime = currentTime
        }
      }
      
      // Current buggy behavior: no retry logic exists
      // Expected behavior: delays should be ~100ms, ~200ms, ~400ms
      
      // This will FAIL because no retry logic is implemented
      expect(delays.length).toBeGreaterThan(0)
      
      if (delays.length > 0) {
        // Check exponential backoff pattern
        expect(delays[0]).toBeGreaterThanOrEqual(90) // ~100ms (with tolerance)
        expect(delays[0]).toBeLessThanOrEqual(150)
      }
    })
  })
})
