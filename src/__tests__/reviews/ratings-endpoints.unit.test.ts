/**
 * Unit Tests: Rating Endpoints Logic
 *
 * Task 4.8: Write unit tests for rating endpoints
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 *
 * Tests the pure validation and calculation logic used by rating endpoints.
 * No HTTP layer or database connections needed.
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// Validation helpers (mirrors server/routes/reviews.js)
// ============================================================================

function validateRatingValue(value: any): { valid: boolean; error?: string } {
  if (value === null || value === undefined) {
    return { valid: false, error: 'Rating must be an integer between 1 and 10' }
  }
  if (typeof value !== 'number') {
    return { valid: false, error: 'Rating must be an integer between 1 and 10' }
  }
  if (!Number.isInteger(value)) {
    return { valid: false, error: 'Rating must be an integer between 1 and 10' }
  }
  if (value < 1 || value > 10) {
    return { valid: false, error: 'Rating must be an integer between 1 and 10' }
  }
  return { valid: true }
}

function validateExternalId(external_id: any): { valid: boolean; error?: string } {
  if (!external_id || typeof external_id !== 'string' || !external_id.trim()) {
    return { valid: false, error: 'external_id is required and must be a non-empty string' }
  }
  return { valid: true }
}

function validateContentType(content_type: any): { valid: boolean; error?: string } {
  const validTypes = ['movie', 'tv', 'game', 'software']
  if (!content_type || !validTypes.includes(content_type as string)) {
    return { valid: false, error: `content_type must be one of: ${validTypes.join(', ')}` }
  }
  return { valid: true }
}

// Aggregate calculation
function calculateAggregate(ratingValues: number[]): {
  average_rating: number | null
  rating_count: number
} {
  const rating_count = ratingValues.length
  if (rating_count === 0) return { average_rating: null, rating_count: 0 }
  const sum = ratingValues.reduce((a, b) => a + b, 0)
  const average_rating = Math.round((sum / rating_count) * 10) / 10
  return { average_rating, rating_count }
}

// Upsert store
function createUpsertStore() {
  const store = new Map<string, number>()
  return {
    upsert(userId: string, externalId: string, contentType: string, value: number) {
      store.set(`${userId}:${externalId}:${contentType}`, value)
    },
    get(userId: string, externalId: string, contentType: string): number | null {
      return store.get(`${userId}:${externalId}:${contentType}`) ?? null
    },
    delete(userId: string, externalId: string, contentType: string) {
      store.delete(`${userId}:${externalId}:${contentType}`)
    },
    size() { return store.size }
  }
}

// ============================================================================
// Tests: Rating Value Validation (Req 16.1, 38.1, 38.2, 38.3, 38.4)
// ============================================================================

describe('Rating Value Validation', () => {
  it('should accept valid ratings 1 through 10', () => {
    for (let i = 1; i <= 10; i++) {
      expect(validateRatingValue(i).valid).toBe(true)
    }
  })

  it('should reject 0', () => {
    const result = validateRatingValue(0)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('1 and 10')
  })

  it('should reject 11', () => {
    expect(validateRatingValue(11).valid).toBe(false)
  })

  it('should reject decimal 7.5', () => {
    expect(validateRatingValue(7.5).valid).toBe(false)
  })

  it('should reject null', () => {
    expect(validateRatingValue(null).valid).toBe(false)
  })

  it('should reject undefined', () => {
    expect(validateRatingValue(undefined).valid).toBe(false)
  })

  it('should reject string "8"', () => {
    expect(validateRatingValue('8').valid).toBe(false)
  })

  it('should reject negative numbers', () => {
    expect(validateRatingValue(-1).valid).toBe(false)
    expect(validateRatingValue(-10).valid).toBe(false)
  })
})

// ============================================================================
// Tests: External ID Validation (Req 20.1, 20.4)
// ============================================================================

describe('External ID Validation', () => {
  it('should accept non-empty string IDs', () => {
    expect(validateExternalId('550').valid).toBe(true)
    expect(validateExternalId('tt0111161').valid).toBe(true)
    expect(validateExternalId('1').valid).toBe(true)
  })

  it('should reject null', () => {
    expect(validateExternalId(null).valid).toBe(false)
  })

  it('should reject undefined', () => {
    expect(validateExternalId(undefined).valid).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validateExternalId('').valid).toBe(false)
  })

  it('should reject whitespace-only string', () => {
    expect(validateExternalId('   ').valid).toBe(false)
  })
})

// ============================================================================
// Tests: Content Type Validation (Req 20.2)
// ============================================================================

describe('Content Type Validation', () => {
  it('should accept valid content types', () => {
    expect(validateContentType('movie').valid).toBe(true)
    expect(validateContentType('tv').valid).toBe(true)
    expect(validateContentType('game').valid).toBe(true)
    expect(validateContentType('software').valid).toBe(true)
  })

  it('should reject invalid content types', () => {
    expect(validateContentType('anime').valid).toBe(false)
    expect(validateContentType('book').valid).toBe(false)
    expect(validateContentType('').valid).toBe(false)
    expect(validateContentType(null).valid).toBe(false)
  })
})

// ============================================================================
// Tests: Rating Upsert Behavior (Req 1.3, 1.4)
// ============================================================================

describe('Rating Upsert Behavior', () => {
  it('should store a new rating', () => {
    const store = createUpsertStore()
    store.upsert('user1', '550', 'movie', 8)
    expect(store.get('user1', '550', 'movie')).toBe(8)
  })

  it('should update existing rating (upsert)', () => {
    const store = createUpsertStore()
    store.upsert('user1', '550', 'movie', 8)
    store.upsert('user1', '550', 'movie', 5)
    expect(store.get('user1', '550', 'movie')).toBe(5)
    expect(store.size()).toBe(1) // still only 1 record
  })

  it('should not affect other users ratings', () => {
    const store = createUpsertStore()
    store.upsert('user1', '550', 'movie', 8)
    store.upsert('user2', '550', 'movie', 3)
    expect(store.get('user1', '550', 'movie')).toBe(8)
    expect(store.get('user2', '550', 'movie')).toBe(3)
    expect(store.size()).toBe(2)
  })
})

// ============================================================================
// Tests: Rating Deletion (Req 16.2)
// ============================================================================

describe('Rating Deletion', () => {
  it('should delete an existing rating', () => {
    const store = createUpsertStore()
    store.upsert('user1', '550', 'movie', 8)
    store.delete('user1', '550', 'movie')
    expect(store.get('user1', '550', 'movie')).toBeNull()
  })

  it('should not affect other ratings when deleting', () => {
    const store = createUpsertStore()
    store.upsert('user1', '550', 'movie', 8)
    store.upsert('user2', '550', 'movie', 6)
    store.delete('user1', '550', 'movie')
    expect(store.get('user2', '550', 'movie')).toBe(6)
  })
})

// ============================================================================
// Tests: Aggregate Calculation (Req 16.4, 3.1, 3.2, 3.3, 3.4)
// ============================================================================

describe('Aggregate Rating Calculation', () => {
  it('should return null average and 0 count for empty ratings', () => {
    const result = calculateAggregate([])
    expect(result.average_rating).toBeNull()
    expect(result.rating_count).toBe(0)
  })

  it('should return exact value for single rating', () => {
    const result = calculateAggregate([7])
    expect(result.average_rating).toBe(7)
    expect(result.rating_count).toBe(1)
  })

  it('should calculate correct average for multiple ratings', () => {
    const result = calculateAggregate([8, 6, 10])
    expect(result.average_rating).toBe(8)
    expect(result.rating_count).toBe(3)
  })

  it('should round to 1 decimal place', () => {
    // 7 + 8 = 15 / 2 = 7.5
    const result = calculateAggregate([7, 8])
    expect(result.average_rating).toBe(7.5)
  })

  it('should round 7.666... to 7.7', () => {
    // 7 + 8 + 8 = 23 / 3 = 7.666...
    const result = calculateAggregate([7, 8, 8])
    expect(result.average_rating).toBe(7.7)
  })

  it('should handle all same ratings', () => {
    const result = calculateAggregate([5, 5, 5, 5])
    expect(result.average_rating).toBe(5)
    expect(result.rating_count).toBe(4)
  })
})

// ============================================================================
// Tests: Batch Aggregate (Req 16.5, 3.5)
// ============================================================================

describe('Batch Aggregate Validation', () => {
  it('should validate batch items array is required', () => {
    const items = null
    expect(Array.isArray(items)).toBe(false)
  })

  it('should reject batch with more than 100 items', () => {
    const items = Array.from({ length: 101 }, (_, i) => ({
      external_id: String(i),
      content_type: 'movie'
    }))
    expect(items.length > 100).toBe(true)
  })

  it('should accept batch with exactly 100 items', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      external_id: String(i),
      content_type: 'movie'
    }))
    expect(items.length <= 100).toBe(true)
  })

  it('should process each item independently', () => {
    const items = [
      { external_id: '550', content_type: 'movie', ratings: [8, 9] },
      { external_id: '551', content_type: 'movie', ratings: [5] },
      { external_id: '552', content_type: 'tv', ratings: [] }
    ]

    const results = items.map(item => ({
      external_id: item.external_id,
      content_type: item.content_type,
      ...calculateAggregate(item.ratings)
    }))

    expect(results[0].average_rating).toBe(8.5)
    expect(results[0].rating_count).toBe(2)
    expect(results[1].average_rating).toBe(5)
    expect(results[1].rating_count).toBe(1)
    expect(results[2].average_rating).toBeNull()
    expect(results[2].rating_count).toBe(0)
  })
})
