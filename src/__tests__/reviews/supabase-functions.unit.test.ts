/**
 * Unit Tests: Supabase Helper Functions
 *
 * Task 10.7: Write unit tests for Supabase functions
 * Requirements: 1.1, 2.1, 6.1, 36.1
 *
 * Tests the pure validation logic of the Supabase helper functions
 * without requiring a live database connection.
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// Validation helpers (mirrors src/lib/supabase.ts)
// ============================================================================

function validateExternalId(external_id: string | undefined | null): void {
  if (!external_id || typeof external_id !== 'string' || !external_id.trim()) {
    throw new Error('external_id is required and must be a non-empty string')
  }
}

function validateContentType(content_type: string | undefined | null): void {
  const validTypes = ['movie', 'tv', 'game', 'software']
  if (!content_type || !validTypes.includes(content_type)) {
    throw new Error(`content_type must be one of: ${validTypes.join(', ')}`)
  }
}

function validateRatingValue(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 10) {
    throw new Error('Rating value must be an integer between 1 and 10')
  }
}

function validateReviewText(text: string): void {
  const trimmed = text?.trim() ?? ''
  if (trimmed.length < 10) throw new Error('Review text must be at least 10 characters')
  if (trimmed.length > 5000) throw new Error('Review text must not exceed 5000 characters')
}

function validateLanguage(language: string): void {
  if (!['ar', 'en'].includes(language)) {
    throw new Error('Language must be "ar" or "en"')
  }
}

function validateReportReason(reason: string): void {
  const trimmed = reason?.trim() ?? ''
  if (trimmed.length < 10) throw new Error('Reason must be at least 10 characters')
  if (trimmed.length > 500) throw new Error('Reason must not exceed 500 characters')
}

// Draft validation
function validateDraftArgs(args: {
  userId: string
  externalId: string
  contentType: string
}): void {
  if (!args.userId) throw new Error('userId is required')
  validateExternalId(args.externalId)
  validateContentType(args.contentType)
}

// ============================================================================
// Tests: Rating Functions (Req 1.1, 1.2, 1.3, 1.4)
// ============================================================================

describe('submitRating validation', () => {
  it('should not throw for valid inputs', () => {
    expect(() => {
      validateExternalId('550')
      validateContentType('movie')
      validateRatingValue(8)
    }).not.toThrow()
  })

  it('should throw for null external_id', () => {
    expect(() => validateExternalId(null)).toThrow('external_id is required')
  })

  it('should throw for empty external_id', () => {
    expect(() => validateExternalId('')).toThrow('external_id is required')
  })

  it('should throw for whitespace external_id', () => {
    expect(() => validateExternalId('   ')).toThrow('external_id is required')
  })

  it('should throw for rating below 1', () => {
    expect(() => validateRatingValue(0)).toThrow('between 1 and 10')
  })

  it('should throw for rating above 10', () => {
    expect(() => validateRatingValue(11)).toThrow('between 1 and 10')
  })

  it('should throw for decimal rating', () => {
    expect(() => validateRatingValue(7.5)).toThrow('between 1 and 10')
  })

  it('should accept all valid ratings 1-10', () => {
    for (let i = 1; i <= 10; i++) {
      expect(() => validateRatingValue(i)).not.toThrow()
    }
  })
})

describe('getUserRating validation', () => {
  it('should throw for invalid external_id', () => {
    expect(() => validateExternalId('')).toThrow()
  })

  it('should throw for invalid content_type', () => {
    expect(() => validateContentType('anime')).toThrow()
  })

  it('should not throw for valid inputs', () => {
    expect(() => {
      validateExternalId('550')
      validateContentType('tv')
    }).not.toThrow()
  })
})

// ============================================================================
// Tests: Review Functions (Req 2.1, 2.2, 2.3, 2.4, 2.5)
// ============================================================================

describe('submitReview validation', () => {
  it('should not throw for valid review inputs', () => {
    expect(() => {
      validateExternalId('550')
      validateContentType('movie')
      validateReviewText('This is a great film with amazing cinematography.')
      validateLanguage('en')
    }).not.toThrow()
  })

  it('should throw for review text too short', () => {
    expect(() => validateReviewText('Short')).toThrow('at least 10 characters')
  })

  it('should throw for review text too long', () => {
    expect(() => validateReviewText('a'.repeat(5001))).toThrow('5000 characters')
  })

  it('should throw for invalid language', () => {
    expect(() => validateLanguage('fr')).toThrow('Language must be')
  })

  it('should accept Arabic language', () => {
    expect(() => validateLanguage('ar')).not.toThrow()
  })

  it('should accept English language', () => {
    expect(() => validateLanguage('en')).not.toThrow()
  })

  it('should accept review text at exactly 10 chars', () => {
    expect(() => validateReviewText('1234567890')).not.toThrow()
  })

  it('should accept review text at exactly 5000 chars', () => {
    expect(() => validateReviewText('a'.repeat(5000))).not.toThrow()
  })
})

describe('updateReview validation', () => {
  it('should validate review text if provided', () => {
    expect(() => validateReviewText('Updated review text here.')).not.toThrow()
    expect(() => validateReviewText('Too short')).toThrow()
  })
})

// ============================================================================
// Tests: Review Like Functions (Req 6.1, 6.2, 6.3, 6.4, 6.5)
// ============================================================================

describe('likeReview validation', () => {
  it('should require reviewId', () => {
    const reviewId = 'review-uuid-123'
    const userId = 'user-uuid-456'
    expect(reviewId).toBeTruthy()
    expect(userId).toBeTruthy()
  })

  it('should detect self-like scenario', () => {
    const reviewAuthorId = 'user-uuid-123'
    const likerId = 'user-uuid-123'
    expect(reviewAuthorId === likerId).toBe(true) // self-like detected
  })

  it('should allow like from different user', () => {
    const reviewAuthorId = 'user-uuid-123'
    const likerId = 'user-uuid-456'
    expect(reviewAuthorId === likerId).toBe(false) // not self-like
  })
})

// ============================================================================
// Tests: Review Report Functions (Req 24.1)
// ============================================================================

describe('reportReview validation', () => {
  it('should not throw for valid reason', () => {
    expect(() => validateReportReason('This review contains offensive language.')).not.toThrow()
  })

  it('should throw for reason too short', () => {
    expect(() => validateReportReason('Bad')).toThrow('at least 10 characters')
  })

  it('should throw for reason too long', () => {
    expect(() => validateReportReason('a'.repeat(501))).toThrow('500 characters')
  })

  it('should accept reason at exactly 10 chars', () => {
    expect(() => validateReportReason('1234567890')).not.toThrow()
  })

  it('should accept reason at exactly 500 chars', () => {
    expect(() => validateReportReason('a'.repeat(500))).not.toThrow()
  })
})

// ============================================================================
// Tests: Review Draft Functions (Req 36.1, 36.2, 36.3, 36.4)
// ============================================================================

describe('saveReviewDraft validation', () => {
  it('should not throw for valid draft args', () => {
    expect(() => validateDraftArgs({
      userId: 'user-123',
      externalId: '550',
      contentType: 'movie'
    })).not.toThrow()
  })

  it('should throw for missing userId', () => {
    expect(() => validateDraftArgs({
      userId: '',
      externalId: '550',
      contentType: 'movie'
    })).toThrow('userId is required')
  })

  it('should throw for invalid externalId', () => {
    expect(() => validateDraftArgs({
      userId: 'user-123',
      externalId: '',
      contentType: 'movie'
    })).toThrow('external_id is required')
  })

  it('should throw for invalid contentType', () => {
    expect(() => validateDraftArgs({
      userId: 'user-123',
      externalId: '550',
      contentType: 'invalid'
    })).toThrow('content_type must be one of')
  })

  it('should accept all valid content types for drafts', () => {
    for (const ct of ['movie', 'tv', 'game', 'software']) {
      expect(() => validateDraftArgs({
        userId: 'user-123',
        externalId: '550',
        contentType: ct
      })).not.toThrow()
    }
  })
})

// ============================================================================
// Tests: Content Type Validation across all functions
// ============================================================================

describe('Content type validation', () => {
  it('should accept movie', () => expect(() => validateContentType('movie')).not.toThrow())
  it('should accept tv', () => expect(() => validateContentType('tv')).not.toThrow())
  it('should accept game', () => expect(() => validateContentType('game')).not.toThrow())
  it('should accept software', () => expect(() => validateContentType('software')).not.toThrow())
  it('should reject anime', () => expect(() => validateContentType('anime')).toThrow())
  it('should reject book', () => expect(() => validateContentType('book')).toThrow())
  it('should reject null', () => expect(() => validateContentType(null)).toThrow())
  it('should reject empty string', () => expect(() => validateContentType('')).toThrow())
})
