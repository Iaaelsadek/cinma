/**
 * 🐛 Bug Condition Exploration Tests - Image Display Fixes
 * 
 * @description Property-based tests to identify and validate bug conditions
 * @spec .kiro/specs/image-display-fixes/bugfix.md
 * @author Cinema Online Team
 */

import { describe, test, expect } from 'vitest'
import { fc } from '@fast-check/vitest'
import { isValidURL, isTMDBURL, getPrimaryImageSource } from '../../lib/image-utils'

/**
 * Bug Condition Function: isBugCondition(X)
 * 
 * Returns true when image display bugs are present:
 * - TMDB API usage (architecture violation)
 * - Missing/invalid thumbnail URLs
 * - Fallback chain failures
 */
function isBugCondition(input: {
  thumbnail?: string | null
  poster_path?: string | null
  backdrop_path?: string | null
  source?: 'tmdb_api' | 'cockroachdb'
}): boolean {
  // Architecture violation: Using TMDB API
  if (input.source === 'tmdb_api') return true
  
  // Missing or invalid thumbnail
  if (!input.thumbnail || input.thumbnail.trim() === '') return true
  if (!isValidURL(input.thumbnail)) return true
  
  // TMDB URL in thumbnail (should use CockroachDB)
  if (isTMDBURL(input.thumbnail)) return true
  
  // All fallbacks missing
  if (!input.thumbnail && !input.poster_path && !input.backdrop_path) return true
  
  return false
}

describe('Bug Condition Exploration - Image Display Fixes', () => {
  describe('Architecture Violations', () => {
    test('(PBT) detects TMDB API usage as bug condition', () => {
      fc.assert(
        fc.property(
          fc.record({
            thumbnail: fc.oneof(fc.constant(null), fc.webUrl()),
            poster_path: fc.oneof(fc.constant(null), fc.string()),
            backdrop_path: fc.oneof(fc.constant(null), fc.string()),
            source: fc.constant('tmdb_api' as const)
          }),
          (input) => {
            expect(isBugCondition(input)).toBe(true)
          }
        )
      )
    })

    test('(PBT) detects TMDB URLs in thumbnail field', () => {
      fc.assert(
        fc.property(
          fc.record({
            thumbnail: fc.constant('https://image.tmdb.org/t/p/w500/abc123.jpg'),
            poster_path: fc.oneof(fc.constant(null), fc.string()),
            backdrop_path: fc.oneof(fc.constant(null), fc.string()),
            source: fc.constant('cockroachdb' as const)
          }),
          (input) => {
            expect(isBugCondition(input)).toBe(true)
            expect(isTMDBURL(input.thumbnail!)).toBe(true)
          }
        )
      )
    })
  })

  describe('Missing/Invalid Data', () => {
    test('(PBT) detects null thumbnail as bug condition', () => {
      fc.assert(
        fc.property(
          fc.record({
            thumbnail: fc.constant(null),
            poster_path: fc.oneof(fc.constant(null), fc.string()),
            backdrop_path: fc.oneof(fc.constant(null), fc.string()),
            source: fc.constant('cockroachdb' as const)
          }),
          (input) => {
            expect(isBugCondition(input)).toBe(true)
          }
        )
      )
    })

    test('(PBT) detects empty string thumbnail as bug condition', () => {
      fc.assert(
        fc.property(
          fc.record({
            thumbnail: fc.constantFrom('', '   ', '\t', '\n'),
            poster_path: fc.oneof(fc.constant(null), fc.string()),
            backdrop_path: fc.oneof(fc.constant(null), fc.string()),
            source: fc.constant('cockroachdb' as const)
          }),
          (input) => {
            expect(isBugCondition(input)).toBe(true)
          }
        )
      )
    })

    test('(PBT) detects invalid URL formats', () => {
      fc.assert(
        fc.property(
          fc.record({
            thumbnail: fc.constantFrom(
              'not-a-url',
              'ftp://invalid.com/image.jpg',
              'javascript:alert(1)',
              '../../../etc/passwd',
              'file:///C:/Windows/System32'
            ),
            poster_path: fc.oneof(fc.constant(null), fc.string()),
            backdrop_path: fc.oneof(fc.constant(null), fc.string()),
            source: fc.constant('cockroachdb' as const)
          }),
          (input) => {
            expect(isBugCondition(input)).toBe(true)
            expect(isValidURL(input.thumbnail!)).toBe(false)
          }
        )
      )
    })

    test('(PBT) detects all missing image sources', () => {
      fc.assert(
        fc.property(
          fc.record({
            thumbnail: fc.constant(null),
            poster_path: fc.constant(null),
            backdrop_path: fc.constant(null),
            source: fc.constant('cockroachdb' as const)
          }),
          (input) => {
            expect(isBugCondition(input)).toBe(true)
            expect(getPrimaryImageSource(input)).toBe(null)
          }
        )
      )
    })
  })

  describe('URL Validation Edge Cases', () => {
    test('validates correct HTTP/HTTPS URLs', () => {
      const validUrls = [
        'https://cdn.example.com/image.jpg',
        'http://localhost:3000/image.png',
        'https://storage.googleapis.com/bucket/image.webp'
      ]

      validUrls.forEach(url => {
        expect(isValidURL(url)).toBe(true)
      })
    })

    test('rejects invalid URL protocols', () => {
      const invalidUrls = [
        'ftp://example.com/image.jpg',
        'file:///path/to/image.jpg',
        'javascript:alert(1)',
        'data:image/png;base64,abc123'
      ]

      invalidUrls.forEach(url => {
        expect(isValidURL(url)).toBe(false)
      })
    })

    test('handles whitespace in URLs', () => {
      expect(isValidURL('  https://example.com/image.jpg  ')).toBe(true)
      expect(isValidURL('https://example.com/image.jpg\n')).toBe(true)
      expect(isValidURL('\thttps://example.com/image.jpg')).toBe(true)
    })

    test('rejects malformed URLs', () => {
      const malformedUrls = [
        '//example.com/image.jpg',
        'example.com/image.jpg',
        ''
      ]

      malformedUrls.forEach(url => {
        expect(isValidURL(url)).toBe(false)
      })
    })
  })

  describe('Fallback Chain Logic', () => {
    test('prioritizes thumbnail over poster_path', () => {
      const input = {
        thumbnail: 'https://cdn.example.com/thumb.jpg',
        poster_path: 'https://cdn.example.com/poster.jpg',
        backdrop_path: 'https://cdn.example.com/backdrop.jpg'
      }

      const primary = getPrimaryImageSource(input)
      expect(primary).toBe(input.thumbnail)
    })

    test('falls back to poster_path when thumbnail is invalid', () => {
      const input = {
        thumbnail: null,
        poster_path: 'https://cdn.example.com/poster.jpg',
        backdrop_path: 'https://cdn.example.com/backdrop.jpg'
      }

      const primary = getPrimaryImageSource(input)
      expect(primary).toBe(input.poster_path)
    })

    test('falls back to backdrop_path when thumbnail and poster_path are invalid', () => {
      const input = {
        thumbnail: null,
        poster_path: null,
        backdrop_path: 'https://cdn.example.com/backdrop.jpg'
      }

      const primary = getPrimaryImageSource(input)
      expect(primary).toBe(input.backdrop_path)
    })

    test('returns null when all sources are invalid', () => {
      const input = {
        thumbnail: null,
        poster_path: null,
        backdrop_path: null
      }

      const primary = getPrimaryImageSource(input)
      expect(primary).toBe(null)
    })
  })

  describe('TMDB URL Detection', () => {
    test('detects TMDB image URLs', () => {
      const tmdbUrls = [
        'https://image.tmdb.org/t/p/w500/abc123.jpg',
        'https://image.tmdb.org/t/p/original/xyz789.jpg',
        'http://image.tmdb.org/t/p/w342/test.png'
      ]

      tmdbUrls.forEach(url => {
        expect(isTMDBURL(url)).toBe(true)
      })
    })

    test('does not flag non-TMDB URLs', () => {
      const nonTmdbUrls = [
        'https://cdn.example.com/image.jpg',
        'https://storage.googleapis.com/bucket/image.jpg',
        'https://example.com/tmdb-like-url.jpg'
      ]

      nonTmdbUrls.forEach(url => {
        expect(isTMDBURL(url)).toBe(false)
      })
    })
  })

  describe('Real-World Bug Scenarios', () => {
    test('Scenario 1: Movie with TMDB API dependency', () => {
      const movie = {
        id: 550,
        thumbnail: null,
        poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
        source: 'tmdb_api' as const
      }

      expect(isBugCondition(movie)).toBe(true)
    })

    test('Scenario 2: Movie with broken thumbnail URL', () => {
      const movie = {
        id: 123,
        thumbnail: 'https://broken-cdn.com/404.jpg',
        poster_path: null,
        backdrop_path: null,
        source: 'cockroachdb' as const
      }

      // URL is valid format, but would fail to load
      // This is detected at runtime, not in bug condition
      expect(isValidURL(movie.thumbnail)).toBe(true)
    })

    test('Scenario 3: Movie with all null image fields', () => {
      const movie = {
        id: 456,
        thumbnail: null,
        poster_path: null,
        backdrop_path: null,
        source: 'cockroachdb' as const
      }

      expect(isBugCondition(movie)).toBe(true)
      expect(getPrimaryImageSource(movie)).toBe(null)
    })

    test('Scenario 4: Movie with whitespace-only thumbnail', () => {
      const movie = {
        id: 789,
        thumbnail: '   ',
        poster_path: '/fallback.jpg',
        backdrop_path: null,
        source: 'cockroachdb' as const
      }

      expect(isBugCondition(movie)).toBe(true)
    })

    test('Scenario 5: Movie with valid CockroachDB thumbnail', () => {
      const movie = {
        id: 999,
        thumbnail: 'https://cdn.cinmaonline.com/thumbnails/movie-999.jpg',
        poster_path: '/fallback.jpg',
        backdrop_path: null,
        source: 'cockroachdb' as const
      }

      expect(isBugCondition(movie)).toBe(false)
      expect(getPrimaryImageSource(movie)).toBe(movie.thumbnail)
    })
  })
})
