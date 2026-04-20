/**
 * Unit Tests for Data Helpers
 * 
 * These tests validate specific edge cases and examples for helper functions.
 * 
 * Tests:
 * - isValidSlug with null, empty, 'content', and valid values
 * - extractUsCertification with data without US certification
 * - extractUsTvRating with data without US rating
 */

import { describe, it, expect } from 'vitest'
import {
  isValidSlug,
  filterValidSlugs,
  extractUsCertification,
  extractUsTvRating
} from '../lib/dataHelpers'

describe('isValidSlug - Edge Cases', () => {
  it('should return false for null', () => {
    expect(isValidSlug(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isValidSlug(undefined)).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isValidSlug('')).toBe(false)
  })

  it('should return false for whitespace-only string', () => {
    expect(isValidSlug('   ')).toBe(false)
    expect(isValidSlug('\t')).toBe(false)
    expect(isValidSlug('\n')).toBe(false)
  })

  it('should return false for "content"', () => {
    expect(isValidSlug('content')).toBe(false)
  })

  it('should return true for valid slugs', () => {
    expect(isValidSlug('the-matrix')).toBe(true)
    expect(isValidSlug('breaking-bad')).toBe(true)
    expect(isValidSlug('inception-2010')).toBe(true)
    expect(isValidSlug('a')).toBe(true) // Single character is valid
  })

  it('should return true for slugs with numbers', () => {
    expect(isValidSlug('movie-123')).toBe(true)
    expect(isValidSlug('2001-a-space-odyssey')).toBe(true)
  })

  it('should return true for slugs with special characters', () => {
    expect(isValidSlug('the-lord-of-the-rings')).toBe(true)
    expect(isValidSlug('spider-man')).toBe(true)
  })
})

describe('filterValidSlugs - Edge Cases', () => {
  it('should return empty array for empty input', () => {
    expect(filterValidSlugs([])).toEqual([])
  })

  it('should filter out all invalid slugs', () => {
    const items = [
      { id: 1, slug: null, title: 'Movie 1' },
      { id: 2, slug: '', title: 'Movie 2' },
      { id: 3, slug: 'content', title: 'Movie 3' },
      { id: 4, slug: '   ', title: 'Movie 4' }
    ]
    
    expect(filterValidSlugs(items)).toEqual([])
  })

  it('should keep all valid slugs', () => {
    const items = [
      { id: 1, slug: 'the-matrix', title: 'The Matrix' },
      { id: 2, slug: 'inception', title: 'Inception' },
      { id: 3, slug: 'interstellar', title: 'Interstellar' }
    ]
    
    const result = filterValidSlugs(items)
    expect(result).toHaveLength(3)
    expect(result).toEqual(items)
  })

  it('should filter mixed valid and invalid slugs', () => {
    const items = [
      { id: 1, slug: 'the-matrix', title: 'The Matrix' },
      { id: 2, slug: null, title: 'Movie 2' },
      { id: 3, slug: 'inception', title: 'Inception' },
      { id: 4, slug: '', title: 'Movie 4' },
      { id: 5, slug: 'content', title: 'Movie 5' },
      { id: 6, slug: 'interstellar', title: 'Interstellar' }
    ]
    
    const result = filterValidSlugs(items)
    expect(result).toHaveLength(3)
    expect(result[0].slug).toBe('the-matrix')
    expect(result[1].slug).toBe('inception')
    expect(result[2].slug).toBe('interstellar')
  })

  it('should preserve all properties of filtered items', () => {
    const items = [
      { 
        id: 1, 
        slug: 'the-matrix', 
        title: 'The Matrix',
        year: 1999,
        rating: 8.7,
        genres: ['Action', 'Sci-Fi']
      },
      { 
        id: 2, 
        slug: null, 
        title: 'Invalid Movie'
      }
    ]
    
    const result = filterValidSlugs(items)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(items[0])
    expect(result[0].year).toBe(1999)
    expect(result[0].rating).toBe(8.7)
    expect(result[0].genres).toEqual(['Action', 'Sci-Fi'])
  })
})

describe('extractUsCertification - Edge Cases', () => {
  it('should return empty string when movie has no release_dates', () => {
    const movie = {
      id: 123,
      title: 'Test Movie'
    }
    
    expect(extractUsCertification(movie)).toBe('')
  })

  it('should return empty string when release_dates is null', () => {
    const movie = {
      id: 123,
      release_dates: null
    }
    
    expect(extractUsCertification(movie)).toBe('')
  })

  it('should return empty string when results is null', () => {
    const movie = {
      id: 123,
      release_dates: {
        results: null
      }
    }
    
    expect(extractUsCertification(movie)).toBe('')
  })

  it('should return empty string when results is not an array', () => {
    const movie = {
      id: 123,
      release_dates: {
        results: 'not-an-array'
      }
    }
    
    expect(extractUsCertification(movie)).toBe('')
  })

  it('should return empty string when no US certification exists', () => {
    const movie = {
      id: 123,
      release_dates: {
        results: [
          {
            iso_3166_1: 'GB',
            release_dates: [{ certification: '15' }]
          },
          {
            iso_3166_1: 'FR',
            release_dates: [{ certification: '12' }]
          }
        ]
      }
    }
    
    expect(extractUsCertification(movie)).toBe('')
  })

  it('should return empty string when US entry has no release_dates', () => {
    const movie = {
      id: 123,
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: []
          }
        ]
      }
    }
    
    expect(extractUsCertification(movie)).toBe('')
  })

  it('should return empty string when US certification is empty', () => {
    const movie = {
      id: 123,
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [{ certification: '' }]
          }
        ]
      }
    }
    
    expect(extractUsCertification(movie)).toBe('')
  })

  it('should return uppercase certification when US certification exists', () => {
    const movie = {
      id: 123,
      release_dates: {
        results: [
          {
            iso_3166_1: 'US',
            release_dates: [{ certification: 'pg-13' }]
          }
        ]
      }
    }
    
    expect(extractUsCertification(movie)).toBe('PG-13')
  })

  it('should handle multiple countries and return only US certification', () => {
    const movie = {
      id: 123,
      release_dates: {
        results: [
          {
            iso_3166_1: 'GB',
            release_dates: [{ certification: '15' }]
          },
          {
            iso_3166_1: 'US',
            release_dates: [{ certification: 'R' }]
          },
          {
            iso_3166_1: 'FR',
            release_dates: [{ certification: '12' }]
          }
        ]
      }
    }
    
    expect(extractUsCertification(movie)).toBe('R')
  })

  it('should handle common US certifications', () => {
    const certifications = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR']
    
    certifications.forEach(cert => {
      const movie = {
        id: 123,
        release_dates: {
          results: [
            {
              iso_3166_1: 'US',
              release_dates: [{ certification: cert.toLowerCase() }]
            }
          ]
        }
      }
      
      expect(extractUsCertification(movie)).toBe(cert)
    })
  })
})

describe('extractUsTvRating - Edge Cases', () => {
  it('should return empty string when series has no content_ratings', () => {
    const series = {
      id: 456,
      name: 'Test Series'
    }
    
    expect(extractUsTvRating(series)).toBe('')
  })

  it('should return empty string when content_ratings is null', () => {
    const series = {
      id: 456,
      content_ratings: null
    }
    
    expect(extractUsTvRating(series)).toBe('')
  })

  it('should return empty string when results is null', () => {
    const series = {
      id: 456,
      content_ratings: {
        results: null
      }
    }
    
    expect(extractUsTvRating(series)).toBe('')
  })

  it('should return empty string when results is not an array', () => {
    const series = {
      id: 456,
      content_ratings: {
        results: 'not-an-array'
      }
    }
    
    expect(extractUsTvRating(series)).toBe('')
  })

  it('should return empty string when no US rating exists', () => {
    const series = {
      id: 456,
      content_ratings: {
        results: [
          {
            iso_3166_1: 'GB',
            rating: '15'
          },
          {
            iso_3166_1: 'FR',
            rating: '12'
          }
        ]
      }
    }
    
    expect(extractUsTvRating(series)).toBe('')
  })

  it('should return empty string when US rating is missing', () => {
    const series = {
      id: 456,
      content_ratings: {
        results: [
          {
            iso_3166_1: 'US'
            // No rating field
          }
        ]
      }
    }
    
    expect(extractUsTvRating(series)).toBe('')
  })

  it('should return empty string when US rating is empty', () => {
    const series = {
      id: 456,
      content_ratings: {
        results: [
          {
            iso_3166_1: 'US',
            rating: ''
          }
        ]
      }
    }
    
    expect(extractUsTvRating(series)).toBe('')
  })

  it('should return uppercase rating when US rating exists', () => {
    const series = {
      id: 456,
      content_ratings: {
        results: [
          {
            iso_3166_1: 'US',
            rating: 'tv-14'
          }
        ]
      }
    }
    
    expect(extractUsTvRating(series)).toBe('TV-14')
  })

  it('should handle multiple countries and return only US rating', () => {
    const series = {
      id: 456,
      content_ratings: {
        results: [
          {
            iso_3166_1: 'GB',
            rating: '15'
          },
          {
            iso_3166_1: 'US',
            rating: 'TV-MA'
          },
          {
            iso_3166_1: 'FR',
            rating: '12'
          }
        ]
      }
    }
    
    expect(extractUsTvRating(series)).toBe('TV-MA')
  })

  it('should handle common US TV ratings', () => {
    const ratings = ['TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA']
    
    ratings.forEach(rating => {
      const series = {
        id: 456,
        content_ratings: {
          results: [
            {
              iso_3166_1: 'US',
              rating: rating.toLowerCase()
            }
          ]
        }
      }
      
      expect(extractUsTvRating(series)).toBe(rating)
    })
  })
})
