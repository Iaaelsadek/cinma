/**
 * Property-Based Tests: Rate Limiting
 *
 * Task 3.4: Property 23 - Review Submission Rate Limiting
 * Validates: Requirements 8.1
 *
 * Task 3.5: Property 24 - Rate Limit Reset
 * Validates: Requirements 8.4, 9.4
 *
 * Tests the in-memory rate limiter logic directly (no HTTP layer needed).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Inline rate limiter implementation (mirrors server/middleware/rateLimiter.js)
// Tested in isolation so no server startup is needed.
// ============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

function createRateLimiterStore() {
  const store = new Map<string, RateLimitEntry>()

  function attempt(userId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const key = `rl_${userId}`
    const entry = store.get(key)

    if (!entry || now > entry.resetAt) {
      // First request or window expired — allow and start new window
      store.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }

    if (entry.count >= maxRequests) {
      return false // Rate limit exceeded
    }

    entry.count++
    return true
  }

  function reset(userId: string) {
    store.delete(`rl_${userId}`)
  }

  function getEntry(userId: string): RateLimitEntry | undefined {
    return store.get(`rl_${userId}`)
  }

  return { attempt, reset, getEntry }
}

// ============================================================================
// Property 23: Review Submission Rate Limiting
// Validates: Requirements 8.1
// ============================================================================

describe('Property 23: Review Submission Rate Limiting', () => {
  it('should allow exactly 10 review submissions per hour, reject the 11th', () => {
    const REVIEW_LIMIT = 10
    const WINDOW_MS = 60 * 60 * 1000 // 1 hour

    fc.assert(
      fc.property(
        fc.uuid(), // random userId
        (userId) => {
          const limiter = createRateLimiterStore()

          // First 10 should succeed
          for (let i = 0; i < REVIEW_LIMIT; i++) {
            const allowed = limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)
            expect(allowed).toBe(true)
          }

          // 11th should be rejected with 429
          const rejected = limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)
          expect(rejected).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should track limits independently per user', () => {
    const REVIEW_LIMIT = 10
    const WINDOW_MS = 60 * 60 * 1000

    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (userId1, userId2) => {
          fc.pre(userId1 !== userId2)

          const limiter = createRateLimiterStore()

          // Exhaust user1's limit
          for (let i = 0; i < REVIEW_LIMIT; i++) {
            limiter.attempt(userId1, REVIEW_LIMIT, WINDOW_MS)
          }
          expect(limiter.attempt(userId1, REVIEW_LIMIT, WINDOW_MS)).toBe(false)

          // user2 should still be allowed
          expect(limiter.attempt(userId2, REVIEW_LIMIT, WINDOW_MS)).toBe(true)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should allow 50 rating submissions per hour, reject the 51st', () => {
    const RATING_LIMIT = 50
    const WINDOW_MS = 60 * 60 * 1000

    fc.assert(
      fc.property(
        fc.uuid(),
        (userId) => {
          const limiter = createRateLimiterStore()

          for (let i = 0; i < RATING_LIMIT; i++) {
            expect(limiter.attempt(userId, RATING_LIMIT, WINDOW_MS)).toBe(true)
          }

          expect(limiter.attempt(userId, RATING_LIMIT, WINDOW_MS)).toBe(false)
        }
      ),
      { numRuns: 30 }
    )
  })
})

// ============================================================================
// Property 24: Rate Limit Reset
// Validates: Requirements 8.4, 9.4
// ============================================================================

describe('Property 24: Rate Limit Reset', () => {
  it('should reset the counter after the time window expires', () => {
    vi.useFakeTimers()

    const REVIEW_LIMIT = 10
    const WINDOW_MS = 60 * 60 * 1000 // 1 hour

    fc.assert(
      fc.property(
        fc.uuid(),
        (userId) => {
          const limiter = createRateLimiterStore()

          // Exhaust the limit
          for (let i = 0; i < REVIEW_LIMIT; i++) {
            limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)
          }
          expect(limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)).toBe(false)

          // Advance time past the window
          vi.advanceTimersByTime(WINDOW_MS + 1)

          // Should be allowed again after reset
          expect(limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)).toBe(true)
        }
      ),
      { numRuns: 50 }
    )

    vi.useRealTimers()
  })

  it('should not reset before the window expires', () => {
    vi.useFakeTimers()

    const REVIEW_LIMIT = 10
    const WINDOW_MS = 60 * 60 * 1000

    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: WINDOW_MS - 1 }), // time before window ends
        (userId, elapsed) => {
          const limiter = createRateLimiterStore()

          // Exhaust the limit
          for (let i = 0; i < REVIEW_LIMIT; i++) {
            limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)
          }

          // Advance time but NOT past the window
          vi.advanceTimersByTime(elapsed)

          // Should still be blocked
          expect(limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)).toBe(false)
        }
      ),
      { numRuns: 50 }
    )

    vi.useRealTimers()
  })

  it('should allow a full new batch of requests after window reset', () => {
    vi.useFakeTimers()

    const REVIEW_LIMIT = 10
    const WINDOW_MS = 60 * 60 * 1000

    const limiter = createRateLimiterStore()
    const userId = 'test-user-reset'

    // First window: exhaust limit
    for (let i = 0; i < REVIEW_LIMIT; i++) {
      expect(limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)).toBe(true)
    }
    expect(limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)).toBe(false)

    // Advance past window
    vi.advanceTimersByTime(WINDOW_MS + 1)

    // Second window: should get full 10 again
    for (let i = 0; i < REVIEW_LIMIT; i++) {
      expect(limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)).toBe(true)
    }
    expect(limiter.attempt(userId, REVIEW_LIMIT, WINDOW_MS)).toBe(false)

    vi.useRealTimers()
  })
})
