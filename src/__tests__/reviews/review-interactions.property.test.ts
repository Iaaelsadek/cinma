/**
 * Property-Based Tests: Review Interactions
 *
 * Task 7.5: Property 19 - Review Like Toggle
 * Validates: Requirements 6.3
 *
 * Task 7.6: Property 20 - Self-Like Prevention
 * Validates: Requirements 6.5
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// In-memory like store (mirrors review_likes table behavior)
// ============================================================================

function createLikeStore() {
  const store = new Set<string>()

  function toggle(reviewId: string, userId: string, reviewAuthorId: string): {
    liked: boolean
    likeCount: number
    error?: string
  } {
    // Prevent self-like
    if (userId === reviewAuthorId) {
      return { liked: false, likeCount: getLikeCount(reviewId), error: 'Cannot like your own review' }
    }

    const key = `${reviewId}:${userId}`
    if (store.has(key)) {
      store.delete(key) // unlike
      return { liked: false, likeCount: getLikeCount(reviewId) }
    } else {
      store.add(key) // like
      return { liked: true, likeCount: getLikeCount(reviewId) }
    }
  }

  function isLiked(reviewId: string, userId: string): boolean {
    return store.has(`${reviewId}:${userId}`)
  }

  function getLikeCount(reviewId: string): number {
    let count = 0
    for (const key of store) {
      if (key.startsWith(`${reviewId}:`)) count++
    }
    return count
  }

  return { toggle, isLiked, getLikeCount }
}

// ============================================================================
// Property 19: Review Like Toggle
// Validates: Requirements 6.3
// ============================================================================

describe('Property 19: Review Like Toggle', () => {
  it('should result in unliked state after liking twice', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // reviewId
        fc.uuid(), // userId
        fc.uuid(), // authorId (different from userId)
        (reviewId, userId, authorId) => {
          fc.pre(userId !== authorId)

          const store = createLikeStore()

          // Like once
          const first = store.toggle(reviewId, userId, authorId)
          expect(first.liked).toBe(true)
          expect(first.error).toBeUndefined()

          // Like again (should unlike)
          const second = store.toggle(reviewId, userId, authorId)
          expect(second.liked).toBe(false)
          expect(second.error).toBeUndefined()

          // Final state: not liked
          expect(store.isLiked(reviewId, userId)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should result in liked state after liking odd number of times', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 9 }).filter(n => n % 2 === 1), // odd
        (reviewId, userId, authorId, times) => {
          fc.pre(userId !== authorId)

          const store = createLikeStore()

          for (let i = 0; i < times; i++) {
            store.toggle(reviewId, userId, authorId)
          }

          expect(store.isLiked(reviewId, userId)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should result in unliked state after liking even number of times', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }).map(n => n * 2), // even
        (reviewId, userId, authorId, times) => {
          fc.pre(userId !== authorId)

          const store = createLikeStore()

          for (let i = 0; i < times; i++) {
            store.toggle(reviewId, userId, authorId)
          }

          expect(store.isLiked(reviewId, userId)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should track like counts correctly across multiple users', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // reviewId
        fc.uuid(), // authorId
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
        (reviewId, authorId, userIds) => {
          const uniqueUsers = [...new Set(userIds)].filter(u => u !== authorId)
          fc.pre(uniqueUsers.length >= 2)

          const store = createLikeStore()

          // All users like the review
          for (const userId of uniqueUsers) {
            store.toggle(reviewId, userId, authorId)
          }

          expect(store.getLikeCount(reviewId)).toBe(uniqueUsers.length)

          // All users unlike
          for (const userId of uniqueUsers) {
            store.toggle(reviewId, userId, authorId)
          }

          expect(store.getLikeCount(reviewId)).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })
})

// ============================================================================
// Property 20: Self-Like Prevention
// Validates: Requirements 6.5
// ============================================================================

describe('Property 20: Self-Like Prevention', () => {
  it('should always reject self-likes regardless of review or user ID', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // reviewId
        fc.uuid(), // userId (same as authorId)
        (reviewId, userId) => {
          const store = createLikeStore()

          // User tries to like their own review (userId === authorId)
          const result = store.toggle(reviewId, userId, userId)

          expect(result.error).toBeDefined()
          expect(result.error).toContain('own review')
          expect(result.liked).toBe(false)
          expect(store.isLiked(reviewId, userId)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not count self-like attempts in like count', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (reviewId, userId) => {
          const store = createLikeStore()

          // Multiple self-like attempts
          store.toggle(reviewId, userId, userId)
          store.toggle(reviewId, userId, userId)
          store.toggle(reviewId, userId, userId)

          expect(store.getLikeCount(reviewId)).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should allow other users to like while blocking self-like', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // reviewId
        fc.uuid(), // authorId
        fc.uuid(), // otherUserId
        (reviewId, authorId, otherUserId) => {
          fc.pre(authorId !== otherUserId)

          const store = createLikeStore()

          // Author tries to self-like (should fail)
          const selfLike = store.toggle(reviewId, authorId, authorId)
          expect(selfLike.error).toBeDefined()

          // Other user likes (should succeed)
          const otherLike = store.toggle(reviewId, otherUserId, authorId)
          expect(otherLike.error).toBeUndefined()
          expect(otherLike.liked).toBe(true)

          expect(store.getLikeCount(reviewId)).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })
})
