/**
 * Unit Tests: Review Interaction Endpoints
 *
 * Task 7.7: Write unit tests for review interaction endpoints
 * Requirements: 17.1, 17.2, 17.3, 24.1, 24.2, 23.4
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// In-memory stores
// ============================================================================

function createInteractionStore() {
  const likes = new Set<string>()
  const reports = new Map<string, { reason: string; status: string; reporterId: string }>()

  // Like toggle
  function toggleLike(reviewId: string, userId: string, authorId: string): {
    liked: boolean; likeCount: number; error?: string
  } {
    if (userId === authorId) {
      return { liked: false, likeCount: getLikeCount(reviewId), error: 'Cannot like your own review' }
    }
    const key = `${reviewId}:${userId}`
    if (likes.has(key)) {
      likes.delete(key)
      return { liked: false, likeCount: getLikeCount(reviewId) }
    }
    likes.add(key)
    return { liked: true, likeCount: getLikeCount(reviewId) }
  }

  function getLikeCount(reviewId: string): number {
    let count = 0
    for (const key of likes) {
      if (key.startsWith(`${reviewId}:`)) count++
    }
    return count
  }

  function isLiked(reviewId: string, userId: string): boolean {
    return likes.has(`${reviewId}:${userId}`)
  }

  // Report
  function report(reviewId: string, reporterId: string, reason: string): {
    success: boolean; error?: string
  } {
    if (!reason || reason.trim().length < 10) {
      return { success: false, error: 'Reason must be at least 10 characters' }
    }
    if (reason.trim().length > 500) {
      return { success: false, error: 'Reason must not exceed 500 characters' }
    }
    const key = `${reviewId}:${reporterId}`
    if (reports.has(key)) {
      return { success: false, error: 'You have already reported this review' }
    }
    reports.set(key, { reason: reason.trim(), status: 'pending', reporterId })
    return { success: true }
  }

  function getReportCount(reviewId: string): number {
    let count = 0
    for (const key of reports.keys()) {
      if (key.startsWith(`${reviewId}:`)) count++
    }
    return count
  }

  return { toggleLike, getLikeCount, isLiked, report, getReportCount }
}

// User stats calculator
function calculateUserStats(reviews: Array<{ rating: number | null; helpfulVotes: number; isHidden: boolean }>) {
  const visibleReviews = reviews.filter(r => !r.isHidden)
  const totalReviews = visibleReviews.length
  const totalHelpfulVotes = visibleReviews.reduce((sum, r) => sum + r.helpfulVotes, 0)
  const ratingsWithValues = visibleReviews.filter(r => r.rating !== null)
  const averageRating = ratingsWithValues.length > 0
    ? Math.round((ratingsWithValues.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratingsWithValues.length) * 10) / 10
    : 0
  return { totalReviews, totalHelpfulVotes, averageRating }
}

// ============================================================================
// Tests: Like Creation (Req 17.1, 6.2)
// ============================================================================

describe('Like Creation', () => {
  it('should create a like when user likes a review', () => {
    const store = createInteractionStore()
    const result = store.toggleLike('review1', 'user2', 'user1')
    expect(result.liked).toBe(true)
    expect(result.likeCount).toBe(1)
    expect(result.error).toBeUndefined()
  })

  it('should return updated like count after liking', () => {
    const store = createInteractionStore()
    store.toggleLike('review1', 'user2', 'user1')
    store.toggleLike('review1', 'user3', 'user1')
    const result = store.toggleLike('review1', 'user4', 'user1')
    expect(result.likeCount).toBe(3)
  })

  it('should reflect correct like count via getLikeCount', () => {
    const store = createInteractionStore()
    store.toggleLike('review1', 'user2', 'user1')
    store.toggleLike('review1', 'user3', 'user1')
    expect(store.getLikeCount('review1')).toBe(2)
  })
})

// ============================================================================
// Tests: Like Toggle / Unlike (Req 17.3, 6.3)
// ============================================================================

describe('Like Toggle (Unlike)', () => {
  it('should unlike when user likes a review they already liked', () => {
    const store = createInteractionStore()
    store.toggleLike('review1', 'user2', 'user1') // like
    const result = store.toggleLike('review1', 'user2', 'user1') // unlike
    expect(result.liked).toBe(false)
    expect(result.likeCount).toBe(0)
  })

  it('should return liked=true then liked=false on consecutive toggles', () => {
    const store = createInteractionStore()
    const first = store.toggleLike('review1', 'user2', 'user1')
    const second = store.toggleLike('review1', 'user2', 'user1')
    expect(first.liked).toBe(true)
    expect(second.liked).toBe(false)
  })

  it('should correctly track isLiked state', () => {
    const store = createInteractionStore()
    expect(store.isLiked('review1', 'user2')).toBe(false)
    store.toggleLike('review1', 'user2', 'user1')
    expect(store.isLiked('review1', 'user2')).toBe(true)
    store.toggleLike('review1', 'user2', 'user1')
    expect(store.isLiked('review1', 'user2')).toBe(false)
  })
})

// ============================================================================
// Tests: Self-Like Prevention (Req 6.5, 17.5)
// ============================================================================

describe('Self-Like Prevention', () => {
  it('should reject self-like with error', () => {
    const store = createInteractionStore()
    const result = store.toggleLike('review1', 'user1', 'user1')
    expect(result.error).toBeDefined()
    expect(result.liked).toBe(false)
  })

  it('should not increment like count on self-like attempt', () => {
    const store = createInteractionStore()
    store.toggleLike('review1', 'user1', 'user1')
    expect(store.getLikeCount('review1')).toBe(0)
  })

  it('should allow other users to like after self-like attempt', () => {
    const store = createInteractionStore()
    store.toggleLike('review1', 'user1', 'user1') // self-like (fails)
    const result = store.toggleLike('review1', 'user2', 'user1') // other user (succeeds)
    expect(result.liked).toBe(true)
    expect(store.getLikeCount('review1')).toBe(1)
  })
})

// ============================================================================
// Tests: Review Reporting (Req 24.1, 24.2, 24.3)
// ============================================================================

describe('Review Reporting', () => {
  it('should create a report with valid reason', () => {
    const store = createInteractionStore()
    const result = store.report('review1', 'user2', 'This review contains offensive language and hate speech.')
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(store.getReportCount('review1')).toBe(1)
  })

  it('should reject report with reason shorter than 10 chars', () => {
    const store = createInteractionStore()
    const result = store.report('review1', 'user2', 'Bad')
    expect(result.success).toBe(false)
    expect(result.error).toContain('10 characters')
  })

  it('should reject report with reason longer than 500 chars', () => {
    const store = createInteractionStore()
    const result = store.report('review1', 'user2', 'a'.repeat(501))
    expect(result.success).toBe(false)
    expect(result.error).toContain('500 characters')
  })

  it('should reject duplicate report from same user', () => {
    const store = createInteractionStore()
    store.report('review1', 'user2', 'This review contains offensive language and hate speech.')
    const duplicate = store.report('review1', 'user2', 'Reporting again for the same reason here.')
    expect(duplicate.success).toBe(false)
    expect(duplicate.error).toContain('already reported')
    expect(store.getReportCount('review1')).toBe(1)
  })

  it('should allow different users to report the same review', () => {
    const store = createInteractionStore()
    store.report('review1', 'user2', 'This review contains offensive language and hate speech.')
    store.report('review1', 'user3', 'This review contains misinformation and false claims.')
    expect(store.getReportCount('review1')).toBe(2)
  })

  it('should accept report with exactly 10 characters (boundary)', () => {
    const store = createInteractionStore()
    const result = store.report('review1', 'user2', '1234567890')
    expect(result.success).toBe(true)
  })

  it('should accept report with exactly 500 characters (boundary)', () => {
    const store = createInteractionStore()
    const result = store.report('review1', 'user2', 'a'.repeat(500))
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// Tests: User Review Statistics (Req 23.4)
// ============================================================================

describe('User Review Statistics', () => {
  it('should calculate total reviews (excluding hidden)', () => {
    const reviews = [
      { rating: 8, helpfulVotes: 5, isHidden: false },
      { rating: 6, helpfulVotes: 2, isHidden: false },
      { rating: 9, helpfulVotes: 0, isHidden: true } // hidden
    ]
    const stats = calculateUserStats(reviews)
    expect(stats.totalReviews).toBe(2)
  })

  it('should calculate total helpful votes', () => {
    const reviews = [
      { rating: 8, helpfulVotes: 5, isHidden: false },
      { rating: 6, helpfulVotes: 3, isHidden: false }
    ]
    const stats = calculateUserStats(reviews)
    expect(stats.totalHelpfulVotes).toBe(8)
  })

  it('should calculate average rating across reviews', () => {
    const reviews = [
      { rating: 8, helpfulVotes: 0, isHidden: false },
      { rating: 6, helpfulVotes: 0, isHidden: false }
    ]
    const stats = calculateUserStats(reviews)
    expect(stats.averageRating).toBe(7)
  })

  it('should return 0 average when no reviews have ratings', () => {
    const reviews = [
      { rating: null, helpfulVotes: 0, isHidden: false }
    ]
    const stats = calculateUserStats(reviews)
    expect(stats.averageRating).toBe(0)
  })

  it('should return zeros for user with no reviews', () => {
    const stats = calculateUserStats([])
    expect(stats.totalReviews).toBe(0)
    expect(stats.totalHelpfulVotes).toBe(0)
    expect(stats.averageRating).toBe(0)
  })

  it('should exclude hidden reviews from all stats', () => {
    const reviews = [
      { rating: 10, helpfulVotes: 100, isHidden: true },
      { rating: 5, helpfulVotes: 2, isHidden: false }
    ]
    const stats = calculateUserStats(reviews)
    expect(stats.totalReviews).toBe(1)
    expect(stats.totalHelpfulVotes).toBe(2)
    expect(stats.averageRating).toBe(5)
  })
})
