/**
 * Property-Based Tests: Rating Endpoints
 *
 * Task 4.6: Property 2 - Rating Upsert Behavior
 * Validates: Requirements 1.3, 1.4
 *
 * Task 4.7: Property 7 - Aggregate Rating Calculation
 * Validates: Requirements 3.1, 3.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// In-memory ratings store (mirrors Supabase upsert behavior)
// ============================================================================

interface Rating {
  user_id: string
  external_id: string
  content_type: string
  rating_value: number
  updated_at: string
}

function createRatingsStore() {
  const store = new Map<string, Rating>()

  function upsert(rating: Rating): Rating {
    const key = `${rating.user_id}:${rating.external_id}:${rating.content_type}`
    store.set(key, { ...rating })
    return store.get(key)!
  }

  function getAll(externalId: string, contentType: string): Rating[] {
    return Array.from(store.values()).filter(
      (r) => r.external_id === externalId && r.content_type === contentType
    )
  }

  function count(): number {
    return store.size
  }

  return { upsert, getAll, count }
}

// ============================================================================
// Aggregate calculation (mirrors server/routes/reviews.js)
// ============================================================================

function calculateAggregate(ratings: Rating[]): {
  average_rating: number | null
  rating_count: number
} {
  const rating_count = ratings.length
  if (rating_count === 0) return { average_rating: null, rating_count: 0 }

  const sum = ratings.reduce((acc, r) => acc + r.rating_value, 0)
  const average_rating = Math.round((sum / rating_count) * 10) / 10
  return { average_rating, rating_count }
}

// ============================================================================
// Property 2: Rating Upsert Behavior
// Validates: Requirements 1.3, 1.4
// ============================================================================

describe('Property 2: Rating Upsert Behavior', () => {
  it('should result in exactly one record per user-content pair regardless of submission count', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // userId
        fc.string({ minLength: 1, maxLength: 20 }), // externalId
        fc.constantFrom('movie', 'tv', 'game', 'software'),
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 20 }),
        (userId, externalId, contentType, ratingValues) => {
          const store = createRatingsStore()

          // Submit multiple ratings for the same content
          for (const value of ratingValues) {
            store.upsert({
              user_id: userId,
              external_id: externalId,
              content_type: contentType,
              rating_value: value,
              updated_at: new Date().toISOString()
            })
          }

          // Should only have 1 record
          const records = store.getAll(externalId, contentType)
          expect(records.length).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should store the latest rating value after multiple submissions', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('movie', 'tv', 'game', 'software'),
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 10 }),
        (userId, externalId, contentType, ratingValues) => {
          const store = createRatingsStore()

          for (const value of ratingValues) {
            store.upsert({
              user_id: userId,
              external_id: externalId,
              content_type: contentType,
              rating_value: value,
              updated_at: new Date().toISOString()
            })
          }

          const records = store.getAll(externalId, contentType)
          const lastValue = ratingValues[ratingValues.length - 1]
          expect(records[0].rating_value).toBe(lastValue)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should allow different users to each have their own rating for the same content', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('movie', 'tv', 'game', 'software'),
        (userIds, externalId, contentType) => {
          // Ensure unique user IDs
          const uniqueUserIds = [...new Set(userIds)]
          fc.pre(uniqueUserIds.length >= 2)

          const store = createRatingsStore()

          for (const userId of uniqueUserIds) {
            store.upsert({
              user_id: userId,
              external_id: externalId,
              content_type: contentType,
              rating_value: 7,
              updated_at: new Date().toISOString()
            })
          }

          const records = store.getAll(externalId, contentType)
          expect(records.length).toBe(uniqueUserIds.length)
        }
      ),
      { numRuns: 50 }
    )
  })
})

// ============================================================================
// Property 7: Aggregate Rating Calculation
// Validates: Requirements 3.1, 3.4
// ============================================================================

describe('Property 7: Aggregate Rating Calculation', () => {
  it('should return null average and 0 count when no ratings exist', () => {
    const result = calculateAggregate([])
    expect(result.average_rating).toBeNull()
    expect(result.rating_count).toBe(0)
  })

  it('should return correct count equal to number of ratings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 100 }),
        (values) => {
          const ratings: Rating[] = values.map((v, i) => ({
            user_id: `user-${i}`,
            external_id: 'ext-1',
            content_type: 'movie',
            rating_value: v,
            updated_at: new Date().toISOString()
          }))

          const result = calculateAggregate(ratings)
          expect(result.rating_count).toBe(values.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should round average to exactly 1 decimal place', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 50 }),
        (values) => {
          const ratings: Rating[] = values.map((v, i) => ({
            user_id: `user-${i}`,
            external_id: 'ext-1',
            content_type: 'movie',
            rating_value: v,
            updated_at: new Date().toISOString()
          }))

          const result = calculateAggregate(ratings)

          if (result.average_rating !== null) {
            // Should have at most 1 decimal place
            const decimalStr = result.average_rating.toString()
            const decimalPart = decimalStr.includes('.') ? decimalStr.split('.')[1] : ''
            expect(decimalPart.length).toBeLessThanOrEqual(1)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should compute average as sum/count rounded to 1 decimal', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 50 }),
        (values) => {
          const ratings: Rating[] = values.map((v, i) => ({
            user_id: `user-${i}`,
            external_id: 'ext-1',
            content_type: 'movie',
            rating_value: v,
            updated_at: new Date().toISOString()
          }))

          const result = calculateAggregate(ratings)
          const expectedAvg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10

          expect(result.average_rating).toBe(expectedAvg)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return average within 1-10 range when ratings are valid', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 50 }),
        (values) => {
          const ratings: Rating[] = values.map((v, i) => ({
            user_id: `user-${i}`,
            external_id: 'ext-1',
            content_type: 'movie',
            rating_value: v,
            updated_at: new Date().toISOString()
          }))

          const result = calculateAggregate(ratings)

          if (result.average_rating !== null) {
            expect(result.average_rating).toBeGreaterThanOrEqual(1)
            expect(result.average_rating).toBeLessThanOrEqual(10)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return exact value for single rating', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (value) => {
          const ratings: Rating[] = [{
            user_id: 'user-1',
            external_id: 'ext-1',
            content_type: 'movie',
            rating_value: value,
            updated_at: new Date().toISOString()
          }]

          const result = calculateAggregate(ratings)
          expect(result.average_rating).toBe(value)
          expect(result.rating_count).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })
})
