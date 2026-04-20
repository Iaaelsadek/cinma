/**
 * Unit Tests: Review Endpoints Logic
 *
 * Task 6.10: Write unit tests for review endpoints
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 22.1
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// Review validation helpers (mirrors server/routes/reviews-crud.js)
// ============================================================================

function validateReviewText(text: any): { valid: boolean; error?: string } {
  if (!text || typeof text !== 'string') return { valid: false, error: 'Review text is required' }
  const trimmed = text.trim()
  if (trimmed.length < 10) return { valid: false, error: 'Review text must be at least 10 characters' }
  if (trimmed.length > 5000) return { valid: false, error: 'Review text must not exceed 5000 characters' }
  return { valid: true }
}

function validateLanguage(lang: any): { valid: boolean; error?: string } {
  if (!['ar', 'en'].includes(lang as string)) {
    return { valid: false, error: 'Language must be "ar" or "en"' }
  }
  return { valid: true }
}

function validateRatingOptional(rating: any): { valid: boolean; error?: string } {
  if (rating === null || rating === undefined) return { valid: true }
  const num = Number(rating)
  if (isNaN(num) || num < 1 || num > 10 || !Number.isInteger(num)) {
    return { valid: false, error: 'Rating must be integer between 1 and 10' }
  }
  return { valid: true }
}

// In-memory review store
interface Review {
  id: string
  user_id: string
  external_id: string
  content_type: string
  title: string | null
  review_text: string
  rating: number | null
  language: 'ar' | 'en'
  contains_spoilers: boolean
  is_hidden: boolean
  edit_count: number
  created_at: string
  updated_at: string
}

function createReviewStore() {
  const store = new Map<string, Review>()
  let idCounter = 1

  function insert(review: Omit<Review, 'id' | 'created_at' | 'updated_at' | 'edit_count' | 'is_hidden'>): Review | null {
    const key = `${review.user_id}:${review.external_id}:${review.content_type}`
    if (store.has(key)) return null // duplicate
    const now = new Date().toISOString()
    const newReview: Review = {
      ...review,
      id: String(idCounter++),
      edit_count: 0,
      is_hidden: false,
      created_at: now,
      updated_at: now
    }
    store.set(key, newReview)
    return newReview
  }

  function update(id: string, userId: string, updates: Partial<Review>): Review | { error: string } {
    const review = Array.from(store.values()).find(r => r.id === id)
    if (!review) return { error: 'Review not found' }
    if (review.user_id !== userId) return { error: 'You can only edit your own reviews' }
    if (review.edit_count >= 5) return { error: 'Maximum 5 edits allowed per review' }
    Object.assign(review, updates, {
      edit_count: review.edit_count + 1,
      updated_at: new Date().toISOString()
    })
    return review
  }

  function remove(id: string, userId: string): { success: boolean; error?: string } {
    const review = Array.from(store.values()).find(r => r.id === id)
    if (!review) return { success: false, error: 'Review not found' }
    if (review.user_id !== userId) return { success: false, error: 'You can only delete your own reviews' }
    // Find and delete by key
    for (const [key, r] of store.entries()) {
      if (r.id === id) { store.delete(key); break }
    }
    return { success: true }
  }

  function getByContent(externalId: string, contentType: string, options: {
    sort?: string; language?: string; ratingFilter?: string
  } = {}): Review[] {
    let results = Array.from(store.values()).filter(
      r => r.external_id === externalId && r.content_type === contentType && !r.is_hidden
    )
    if (options.language && options.language !== 'all') {
      results = results.filter(r => r.language === options.language)
    }
    if (options.ratingFilter === 'positive') results = results.filter(r => r.rating !== null && r.rating >= 7)
    if (options.ratingFilter === 'mixed') results = results.filter(r => r.rating !== null && r.rating >= 4 && r.rating <= 6)
    if (options.ratingFilter === 'negative') results = results.filter(r => r.rating !== null && r.rating <= 3)
    if (options.sort === 'newest') results.sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (options.sort === 'highest_rating') results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    if (options.sort === 'lowest_rating') results.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0))
    return results
  }

  function getById(id: string): Review | null {
    return Array.from(store.values()).find(r => r.id === id) ?? null
  }

  function search(query: string): Review[] {
    const q = query.toLowerCase()
    return Array.from(store.values()).filter(
      r => r.review_text.toLowerCase().includes(q) || (r.title?.toLowerCase().includes(q) ?? false)
    )
  }

  function count(): number { return store.size }

  return { insert, update, remove, getByContent, getById, search, count }
}

// ============================================================================
// Tests: Review Creation (Req 15.1)
// ============================================================================

describe('Review Creation', () => {
  it('should create a review with valid inputs', () => {
    const store = createReviewStore()
    const review = store.insert({
      user_id: 'user1',
      external_id: '550',
      content_type: 'movie',
      title: 'Great film',
      review_text: 'This is a great film with amazing cinematography.',
      rating: 9,
      language: 'en',
      contains_spoilers: false
    })
    expect(review).not.toBeNull()
    expect(review!.id).toBeDefined()
    expect(review!.edit_count).toBe(0)
    expect(review!.is_hidden).toBe(false)
  })

  it('should reject duplicate review for same user-content', () => {
    const store = createReviewStore()
    store.insert({
      user_id: 'user1', external_id: '550', content_type: 'movie',
      title: null, review_text: 'First review text here.', rating: null, language: 'en', contains_spoilers: false
    })
    const duplicate = store.insert({
      user_id: 'user1', external_id: '550', content_type: 'movie',
      title: null, review_text: 'Second review text here.', rating: null, language: 'en', contains_spoilers: false
    })
    expect(duplicate).toBeNull()
    expect(store.count()).toBe(1)
  })

  it('should reject review text shorter than 10 chars', () => {
    expect(validateReviewText('Short').valid).toBe(false)
  })

  it('should reject review text longer than 5000 chars', () => {
    expect(validateReviewText('a'.repeat(5001)).valid).toBe(false)
  })

  it('should accept review without optional rating', () => {
    const store = createReviewStore()
    const review = store.insert({
      user_id: 'user1', external_id: '551', content_type: 'movie',
      title: null, review_text: 'A review without a rating score.', rating: null, language: 'ar', contains_spoilers: false
    })
    expect(review).not.toBeNull()
    expect(review!.rating).toBeNull()
  })
})

// ============================================================================
// Tests: Review Update (Req 15.2, 5.1, 5.2, 5.3, 26.3, 26.5)
// ============================================================================

describe('Review Update', () => {
  it('should allow owner to update their review', () => {
    const store = createReviewStore()
    const review = store.insert({
      user_id: 'user1', external_id: '550', content_type: 'movie',
      title: null, review_text: 'Original review text here.', rating: 7, language: 'en', contains_spoilers: false
    })!

    const updated = store.update(review.id, 'user1', { review_text: 'Updated review text here.' })
    expect('error' in updated).toBe(false)
    expect((updated as Review).edit_count).toBe(1)
    expect((updated as Review).review_text).toBe('Updated review text here.')
  })

  it('should reject update by non-owner', () => {
    const store = createReviewStore()
    const review = store.insert({
      user_id: 'user1', external_id: '550', content_type: 'movie',
      title: null, review_text: 'Original review text here.', rating: 7, language: 'en', contains_spoilers: false
    })!

    const result = store.update(review.id, 'user2', { review_text: 'Hacked review text here.' })
    expect('error' in result).toBe(true)
    expect((result as { error: string }).error).toContain('own reviews')
  })

  it('should reject update after 5 edits', () => {
    const store = createReviewStore()
    const review = store.insert({
      user_id: 'user1', external_id: '550', content_type: 'movie',
      title: null, review_text: 'Original review text here.', rating: 7, language: 'en', contains_spoilers: false
    })!

    // Make 5 edits
    for (let i = 0; i < 5; i++) {
      store.update(review.id, 'user1', { review_text: `Edit ${i + 1} review text here.` })
    }

    const result = store.update(review.id, 'user1', { review_text: 'Sixth edit review text here.' })
    expect('error' in result).toBe(true)
    expect((result as { error: string }).error).toContain('5 edits')
  })

  it('should increment edit_count on each update', () => {
    const store = createReviewStore()
    const review = store.insert({
      user_id: 'user1', external_id: '550', content_type: 'movie',
      title: null, review_text: 'Original review text here.', rating: 7, language: 'en', contains_spoilers: false
    })!

    store.update(review.id, 'user1', { review_text: 'First edit review text here.' })
    store.update(review.id, 'user1', { review_text: 'Second edit review text here.' })

    const updated = store.getById(review.id)
    expect(updated!.edit_count).toBe(2)
  })
})

// ============================================================================
// Tests: Review Deletion (Req 15.3, 5.4, 5.5)
// ============================================================================

describe('Review Deletion', () => {
  it('should allow owner to delete their review', () => {
    const store = createReviewStore()
    const review = store.insert({
      user_id: 'user1', external_id: '550', content_type: 'movie',
      title: null, review_text: 'Review to be deleted here.', rating: null, language: 'en', contains_spoilers: false
    })!

    const result = store.remove(review.id, 'user1')
    expect(result.success).toBe(true)
    expect(store.getById(review.id)).toBeNull()
  })

  it('should reject deletion by non-owner', () => {
    const store = createReviewStore()
    const review = store.insert({
      user_id: 'user1', external_id: '550', content_type: 'movie',
      title: null, review_text: 'Review to be deleted here.', rating: null, language: 'en', contains_spoilers: false
    })!

    const result = store.remove(review.id, 'user2')
    expect(result.success).toBe(false)
    expect(result.error).toContain('own reviews')
    expect(store.getById(review.id)).not.toBeNull()
  })

  it('should return error for non-existent review', () => {
    const store = createReviewStore()
    const result = store.remove('nonexistent-id', 'user1')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

// ============================================================================
// Tests: Review Filtering and Sorting (Req 15.4, 7.1-7.5, 33.1-33.4)
// ============================================================================

describe('Review Filtering and Sorting', () => {
  function seedStore() {
    const store = createReviewStore()
    store.insert({ user_id: 'u1', external_id: '550', content_type: 'movie', title: null, review_text: 'Arabic review text here.', rating: 8, language: 'ar', contains_spoilers: false })
    store.insert({ user_id: 'u2', external_id: '550', content_type: 'movie', title: null, review_text: 'English review text here.', rating: 3, language: 'en', contains_spoilers: false })
    store.insert({ user_id: 'u3', external_id: '550', content_type: 'movie', title: null, review_text: 'Another Arabic review text.', rating: 5, language: 'ar', contains_spoilers: false })
    return store
  }

  it('should filter by language ar', () => {
    const store = seedStore()
    const results = store.getByContent('550', 'movie', { language: 'ar' })
    expect(results.every(r => r.language === 'ar')).toBe(true)
    expect(results.length).toBe(2)
  })

  it('should filter by language en', () => {
    const store = seedStore()
    const results = store.getByContent('550', 'movie', { language: 'en' })
    expect(results.every(r => r.language === 'en')).toBe(true)
    expect(results.length).toBe(1)
  })

  it('should return all languages when filter is "all"', () => {
    const store = seedStore()
    const results = store.getByContent('550', 'movie', { language: 'all' })
    expect(results.length).toBe(3)
  })

  it('should filter positive ratings (7-10)', () => {
    const store = seedStore()
    const results = store.getByContent('550', 'movie', { ratingFilter: 'positive' })
    expect(results.every(r => r.rating !== null && r.rating >= 7)).toBe(true)
  })

  it('should filter mixed ratings (4-6)', () => {
    const store = seedStore()
    const results = store.getByContent('550', 'movie', { ratingFilter: 'mixed' })
    expect(results.every(r => r.rating !== null && r.rating >= 4 && r.rating <= 6)).toBe(true)
  })

  it('should filter negative ratings (1-3)', () => {
    const store = seedStore()
    const results = store.getByContent('550', 'movie', { ratingFilter: 'negative' })
    expect(results.every(r => r.rating !== null && r.rating <= 3)).toBe(true)
  })

  it('should sort by highest_rating descending', () => {
    const store = seedStore()
    const results = store.getByContent('550', 'movie', { sort: 'highest_rating' })
    for (let i = 0; i < results.length - 1; i++) {
      expect((results[i].rating ?? 0) >= (results[i + 1].rating ?? 0)).toBe(true)
    }
  })

  it('should sort by lowest_rating ascending', () => {
    const store = seedStore()
    const results = store.getByContent('550', 'movie', { sort: 'lowest_rating' })
    for (let i = 0; i < results.length - 1; i++) {
      expect((results[i].rating ?? 0) <= (results[i + 1].rating ?? 0)).toBe(true)
    }
  })
})

// ============================================================================
// Tests: Review Search (Req 22.1)
// ============================================================================

describe('Review Search', () => {
  it('should find reviews by keyword in review_text', () => {
    const store = createReviewStore()
    store.insert({ user_id: 'u1', external_id: '550', content_type: 'movie', title: null, review_text: 'Amazing cinematography and great acting.', rating: 9, language: 'en', contains_spoilers: false })
    store.insert({ user_id: 'u2', external_id: '551', content_type: 'movie', title: null, review_text: 'Boring plot with no character development.', rating: 3, language: 'en', contains_spoilers: false })

    const results = store.search('cinematography')
    expect(results.length).toBe(1)
    expect(results[0].review_text).toContain('cinematography')
  })

  it('should find reviews by keyword in title', () => {
    const store = createReviewStore()
    store.insert({ user_id: 'u1', external_id: '550', content_type: 'movie', title: 'Masterpiece of cinema', review_text: 'This film is truly remarkable in every way.', rating: 10, language: 'en', contains_spoilers: false })

    const results = store.search('masterpiece')
    expect(results.length).toBe(1)
  })

  it('should be case-insensitive', () => {
    const store = createReviewStore()
    store.insert({ user_id: 'u1', external_id: '550', content_type: 'movie', title: null, review_text: 'AMAZING film with great visuals.', rating: 9, language: 'en', contains_spoilers: false })

    expect(store.search('amazing').length).toBe(1)
    expect(store.search('AMAZING').length).toBe(1)
    expect(store.search('Amazing').length).toBe(1)
  })

  it('should return empty array when no matches', () => {
    const store = createReviewStore()
    store.insert({ user_id: 'u1', external_id: '550', content_type: 'movie', title: null, review_text: 'Good film overall worth watching.', rating: 7, language: 'en', contains_spoilers: false })

    expect(store.search('nonexistentword').length).toBe(0)
  })
})

// ============================================================================
// Tests: Language Validation
// ============================================================================

describe('Language Validation', () => {
  it('should accept "ar" and "en"', () => {
    expect(validateLanguage('ar').valid).toBe(true)
    expect(validateLanguage('en').valid).toBe(true)
  })

  it('should reject other languages', () => {
    expect(validateLanguage('fr').valid).toBe(false)
    expect(validateLanguage('de').valid).toBe(false)
    expect(validateLanguage('').valid).toBe(false)
    expect(validateLanguage(null).valid).toBe(false)
  })
})

// ============================================================================
// Tests: Optional Rating in Reviews
// ============================================================================

describe('Optional Rating in Reviews', () => {
  it('should accept null rating', () => {
    expect(validateRatingOptional(null).valid).toBe(true)
  })

  it('should accept undefined rating', () => {
    expect(validateRatingOptional(undefined).valid).toBe(true)
  })

  it('should accept valid integer ratings 1-10', () => {
    for (let i = 1; i <= 10; i++) {
      expect(validateRatingOptional(i).valid).toBe(true)
    }
  })

  it('should reject decimal ratings', () => {
    expect(validateRatingOptional(7.5).valid).toBe(false)
  })

  it('should reject out-of-range ratings', () => {
    expect(validateRatingOptional(0).valid).toBe(false)
    expect(validateRatingOptional(11).valid).toBe(false)
  })
})
