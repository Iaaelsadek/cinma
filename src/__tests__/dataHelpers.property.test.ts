/**
 * Property-Based Tests for Data Helpers
 * 
 * These tests validate the correctness properties of helper functions
 * using property-based testing with fast-check.
 * 
 * Tests:
 * - Property 1: Valid Slug Filtering
 * - Property 2: Certification Extraction and Normalization
 * - Property 3: TV Rating Extraction and Normalization
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  isValidSlug,
  filterValidSlugs,
  extractUsCertification,
  extractUsTvRating
} from '../lib/dataHelpers'

describe('Property 1: Valid Slug Filtering', () => {
  it('should always return true for non-empty strings that are not "content"', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s !== 'content' && s.trim() !== ''),
        (slug) => {
          expect(isValidSlug(slug)).toBe(true)
        }
      )
    )
  })

  it('should always return false for null, undefined, empty strings, or "content"', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.constant('   '),
          fc.constant('content')
        ),
        (invalidSlug) => {
          expect(isValidSlug(invalidSlug)).toBe(false)
        }
      )
    )
  })

  it('should filter out items without valid slugs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer(),
            slug: fc.oneof(
              fc.string({ minLength: 1, maxLength: 50 }).filter(s => s !== 'content' && s.trim() !== ''),
              fc.constant(null),
              fc.constant(undefined),
              fc.constant(''),
              fc.constant('content')
            ),
            title: fc.string()
          })
        ),
        (items) => {
          const filtered = filterValidSlugs(items)
          
          // All filtered items must have valid slugs
          filtered.forEach(item => {
            expect(isValidSlug(item.slug)).toBe(true)
          })
          
          // Filtered array length should be <= original array length
          expect(filtered.length).toBeLessThanOrEqual(items.length)
          
          // Count of valid slugs in original should equal filtered length
          const validCount = items.filter(item => isValidSlug(item.slug)).length
          expect(filtered.length).toBe(validCount)
        }
      )
    )
  })

  it('should preserve all properties of items with valid slugs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.integer(),
            slug: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s !== 'content' && s.trim() !== ''),
            title: fc.string(),
            extra: fc.anything()
          })
        ),
        (items) => {
          const filtered = filterValidSlugs(items)
          
          // All properties should be preserved
          filtered.forEach((filteredItem, index) => {
            const originalItem = items.find(item => item.id === filteredItem.id)
            expect(originalItem).toBeDefined()
            expect(filteredItem).toEqual(originalItem)
          })
        }
      )
    )
  })
})

describe('Property 2: Certification Extraction and Normalization', () => {
  it('should always return uppercase certification when US certification exists', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        (cert) => {
          const movie = {
            id: 123,
            release_dates: {
              results: [
                {
                  iso_3166_1: 'US',
                  release_dates: [{ certification: cert }]
                }
              ]
            }
          }
          
          const result = extractUsCertification(movie)
          
          // Should return uppercase version
          expect(result).toBe(cert.toUpperCase())
          
          // Should be a string
          expect(typeof result).toBe('string')
        }
      )
    )
  })

  it('should return empty string when no US certification exists', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            iso_3166_1: fc.string({ minLength: 2, maxLength: 2 }).filter(s => s !== 'US'),
            release_dates: fc.array(
              fc.record({
                certification: fc.string()
              })
            )
          })
        ),
        (nonUSResults) => {
          const movie = {
            id: 123,
            release_dates: {
              results: nonUSResults
            }
          }
          
          const result = extractUsCertification(movie)
          expect(result).toBe('')
        }
      )
    )
  })

  it('should handle malformed data gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
          fc.record({ release_dates: fc.constant(null) }),
          fc.record({ release_dates: fc.record({ results: fc.constant(null) }) }),
          fc.record({ release_dates: fc.record({ results: fc.constant('not-an-array') }) })
        ),
        (malformedMovie) => {
          const result = extractUsCertification(malformedMovie)
          
          // Should always return a string
          expect(typeof result).toBe('string')
          
          // Should return empty string for malformed data
          expect(result).toBe('')
        }
      )
    )
  })

  it('should be idempotent - calling twice should give same result', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer(),
          release_dates: fc.record({
            results: fc.array(
              fc.record({
                iso_3166_1: fc.string({ minLength: 2, maxLength: 2 }),
                release_dates: fc.array(
                  fc.record({
                    certification: fc.option(fc.string(), { nil: undefined })
                  })
                )
              })
            )
          })
        }),
        (movie) => {
          const result1 = extractUsCertification(movie)
          const result2 = extractUsCertification(movie)
          
          expect(result1).toBe(result2)
        }
      )
    )
  })
})

describe('Property 3: TV Rating Extraction and Normalization', () => {
  it('should always return uppercase rating when US rating exists', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        (rating) => {
          const series = {
            id: 456,
            content_ratings: {
              results: [
                {
                  iso_3166_1: 'US',
                  rating: rating
                }
              ]
            }
          }
          
          const result = extractUsTvRating(series)
          
          // Should return uppercase version
          expect(result).toBe(rating.toUpperCase())
          
          // Should be a string
          expect(typeof result).toBe('string')
        }
      )
    )
  })

  it('should return empty string when no US rating exists', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            iso_3166_1: fc.string({ minLength: 2, maxLength: 2 }).filter(s => s !== 'US'),
            rating: fc.string()
          })
        ),
        (nonUSResults) => {
          const series = {
            id: 456,
            content_ratings: {
              results: nonUSResults
            }
          }
          
          const result = extractUsTvRating(series)
          expect(result).toBe('')
        }
      )
    )
  })

  it('should handle malformed data gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
          fc.record({ content_ratings: fc.constant(null) }),
          fc.record({ content_ratings: fc.record({ results: fc.constant(null) }) }),
          fc.record({ content_ratings: fc.record({ results: fc.constant('not-an-array') }) })
        ),
        (malformedSeries) => {
          const result = extractUsTvRating(malformedSeries)
          
          // Should always return a string
          expect(typeof result).toBe('string')
          
          // Should return empty string for malformed data
          expect(result).toBe('')
        }
      )
    )
  })

  it('should be idempotent - calling twice should give same result', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.integer(),
          content_ratings: fc.record({
            results: fc.array(
              fc.record({
                iso_3166_1: fc.string({ minLength: 2, maxLength: 2 }),
                rating: fc.option(fc.string(), { nil: undefined })
              })
            )
          })
        }),
        (series) => {
          const result1 = extractUsTvRating(series)
          const result2 = extractUsTvRating(series)
          
          expect(result1).toBe(result2)
        }
      )
    )
  })

  it('should handle missing rating field gracefully', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            iso_3166_1: fc.constant('US')
            // No rating field
          })
        ),
        (results) => {
          const series = {
            id: 456,
            content_ratings: {
              results: results
            }
          }
          
          const result = extractUsTvRating(series)
          
          // Should return empty string when rating field is missing
          expect(result).toBe('')
        }
      )
    )
  })
})
