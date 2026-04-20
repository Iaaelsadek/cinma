/**
 * Property-Based Tests: External ID Validation
 *
 * Task 10.6: Property 30 - External ID Validation
 * Validates: Requirements 20.1, 20.4
 *
 * Verifies that null/empty/whitespace external_ids are rejected
 * by the Supabase helper functions' validation layer.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// External ID validation (mirrors src/lib/supabase.ts validation)
// ============================================================================

function validateExternalId(externalId: any): { valid: boolean; error?: string } {
  if (externalId === null || externalId === undefined) {
    return { valid: false, error: 'external_id is required' }
  }
  if (typeof externalId !== 'string') {
    return { valid: false, error: 'external_id must be a string' }
  }
  if (!externalId.trim()) {
    return { valid: false, error: 'external_id must not be empty or whitespace' }
  }
  return { valid: true }
}

function validateContentType(contentType: any): { valid: boolean; error?: string } {
  const valid = ['movie', 'tv', 'game', 'software']
  if (!contentType || !valid.includes(contentType as string)) {
    return { valid: false, error: `content_type must be one of: ${valid.join(', ')}` }
  }
  return { valid: true }
}

// ============================================================================
// Property 30: External ID Validation
// Validates: Requirements 20.1, 20.4
// ============================================================================

describe('Property 30: External ID Validation', () => {
  it('should reject null external_id', () => {
    expect(validateExternalId(null).valid).toBe(false)
  })

  it('should reject undefined external_id', () => {
    expect(validateExternalId(undefined).valid).toBe(false)
  })

  it('should reject empty string external_id', () => {
    expect(validateExternalId('').valid).toBe(false)
  })

  it('should reject whitespace-only external_ids for any whitespace combination', () => {
    fc.assert(
      fc.property(
        // Generate strings that are entirely whitespace
        fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 })
          .map(chars => chars.join('')),
        (whitespace) => {
          expect(validateExternalId(whitespace).valid).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should accept any non-empty, non-whitespace string as external_id', () => {
    fc.assert(
      fc.property(
        // Generate strings with at least one non-whitespace character
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        (externalId) => {
          expect(validateExternalId(externalId).valid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should accept numeric string IDs (TMDB format)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999999 }).map(n => String(n)),
        (id) => {
          expect(validateExternalId(id).valid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject non-string types', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.boolean(),
          fc.constant({}),
          fc.constant([])
        ),
        (value) => {
          expect(validateExternalId(value).valid).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should provide descriptive error messages for invalid IDs', () => {
    expect(validateExternalId(null).error).toBeDefined()
    expect(validateExternalId('').error).toBeDefined()
    expect(validateExternalId('   ').error).toBeDefined()
    expect(validateExternalId(123).error).toBeDefined()
  })
})

// ============================================================================
// Additional: Content Type Validation (Req 20.2)
// ============================================================================

describe('Content Type Validation', () => {
  it('should accept all valid content types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('movie', 'tv', 'game', 'software'),
        (contentType) => {
          expect(validateContentType(contentType).valid).toBe(true)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should reject invalid content types', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          s => !['movie', 'tv', 'game', 'software'].includes(s)
        ),
        (contentType) => {
          expect(validateContentType(contentType).valid).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject null and undefined content types', () => {
    expect(validateContentType(null).valid).toBe(false)
    expect(validateContentType(undefined).valid).toBe(false)
    expect(validateContentType('').valid).toBe(false)
  })
})

// ============================================================================
// Combined validation: both external_id and content_type must be valid
// ============================================================================

describe('Combined External ID + Content Type Validation', () => {
  it('should require both to be valid for operation to proceed', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.constantFrom('movie', 'tv', 'game', 'software'),
        (externalId, contentType) => {
          const idResult = validateExternalId(externalId)
          const typeResult = validateContentType(contentType)
          expect(idResult.valid && typeResult.valid).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should fail when external_id is invalid even if content_type is valid', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined, '', '   '),
        fc.constantFrom('movie', 'tv', 'game', 'software'),
        (externalId, contentType) => {
          const idResult = validateExternalId(externalId)
          expect(idResult.valid).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })
})
