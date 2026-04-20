/**
 * Reviews and Ratings API Routes
 * 
 * Implements comprehensive ratings and reviews system for Cinema.online.
 * 
 * Architecture:
 * - Supabase: User data (ratings, reviews, likes, reports)
 * - CockroachDB: Content data (movies, tv_series, software)
 * - Bridge: external_id (TMDB ID) connects the two
 * 
 * Features:
 * - Rate content (1-10 scale)
 * - Write bilingual reviews (Arabic/English)
 * - Like reviews (helpful votes)
 * - Report inappropriate reviews
 * - Admin moderation
 * - Rate limiting (10 reviews/hour, 50 ratings/hour)
 * - Caching (5-minute TTL for aggregates)
 */

import express from 'express'
import { authenticateUser, optionalAuth, requireAdmin, supabase } from '../middleware/auth.js'
import { rateLimitReviews, rateLimitRatings } from '../middleware/rateLimiter.js'
import NodeCache from 'node-cache'
import DOMPurify from 'isomorphic-dompurify'

const router = express.Router()

// Cache for aggregate ratings (5-minute TTL)
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60,
  useClones: false
})

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitize review text - remove HTML tags, preserve line breaks
 */
function sanitizeReviewText(text) {
  if (!text) return ''
  // Remove HTML tags but preserve line breaks
  const cleaned = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
  return cleaned.trim()
}

/**
 * Sanitize review title - remove HTML and scripts
 */
function sanitizeReviewTitle(title) {
  if (!title) return null
  const cleaned = DOMPurify.sanitize(title, { ALLOWED_TAGS: [] })
  return cleaned.trim() || null
}

/**
 * Validate external_id
 */
function validateExternalId(external_id) {
  if (!external_id || typeof external_id !== 'string' || !external_id.trim()) {
    throw new Error('external_id is required and must be a non-empty string')
  }
}

/**
 * Validate content_type
 */
function validateContentType(content_type) {
  const validTypes = ['movie', 'tv', 'software']
  if (!content_type || !validTypes.includes(content_type)) {
    throw new Error(`content_type must be one of: ${validTypes.join(', ')}`)
  }
}


// ============================================================================
// RATING ENDPOINTS
// ============================================================================

/**
 * POST /api/ratings
 * Create or update a user's rating for content
 */
router.post('/ratings', authenticateUser, rateLimitRatings, async (req, res) => {
  try {
    const { external_id, content_type, rating_value, external_source = 'tmdb' } = req.body
    const userId = req.user.id

    // Validate inputs
    validateExternalId(external_id)
    validateContentType(content_type)

    if (!rating_value || !Number.isInteger(rating_value) || rating_value < 1 || rating_value > 10) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 10' })
    }

    // Upsert rating
    const { data, error } = await supabase
      .from('ratings')
      .upsert({
        user_id: userId,
        external_id,
        external_source,
        content_type,
        rating_value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,external_id,content_type',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error(`[${req.id}] Rating submission error:`, error)
      return res.status(500).json({ error: 'Failed to submit rating' })
    }

    // Invalidate aggregate rating cache
    const cacheKey = `aggregate_rating:${external_id}:${content_type}`
    cache.del(cacheKey)

    res.json({ success: true, rating: data })
  } catch (error) {
    console.error(`[${req.id}] Rating endpoint error:`, error)
    res.status(500).json({ error: error.message || 'Failed to submit rating' })
  }
})

/**
 * DELETE /api/ratings
 * Delete a user's rating
 */
router.delete('/ratings', authenticateUser, async (req, res) => {
  try {
    const { external_id, content_type } = req.query
    const userId = req.user.id

    validateExternalId(external_id)
    validateContentType(content_type)

    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('user_id', userId)
      .eq('external_id', external_id)
      .eq('content_type', content_type)

    if (error) {
      console.error(`[${req.id}] Rating deletion error:`, error)
      return res.status(500).json({ error: 'Failed to delete rating' })
    }

    // Invalidate cache
    const cacheKey = `aggregate_rating:${external_id}:${content_type}`
    cache.del(cacheKey)

    res.json({ success: true })
  } catch (error) {
    console.error(`[${req.id}] Delete rating error:`, error)
    res.status(500).json({ error: error.message || 'Failed to delete rating' })
  }
})

/**
 * GET /api/ratings/user
 * Get user's rating for specific content
 */
router.get('/ratings/user', authenticateUser, async (req, res) => {
  try {
    const { external_id, content_type } = req.query
    const userId = req.user.id

    validateExternalId(external_id)
    validateContentType(content_type)

    const { data, error } = await supabase
      .from('ratings')
      .select('rating_value, created_at, updated_at')
      .eq('user_id', userId)
      .eq('external_id', external_id)
      .eq('content_type', content_type)
      .maybeSingle()

    if (error) {
      console.error(`[${req.id}] Get user rating error:`, error)
      return res.status(500).json({ error: 'Failed to fetch rating' })
    }

    res.json(data)
  } catch (error) {
    console.error(`[${req.id}] Get user rating error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch rating' })
  }
})


/**
 * GET /api/ratings/aggregate
 * Get aggregate rating for content
 */
router.get('/ratings/aggregate', async (req, res) => {
  try {
    const { external_id, content_type } = req.query

    validateExternalId(external_id)
    validateContentType(content_type)

    // Check cache first
    const cacheKey = `aggregate_rating:${external_id}:${content_type}`
    const cached = cache.get(cacheKey)

    if (cached) {
      return res.json(cached)
    }

    // Query database
    const { data, error } = await supabase
      .from('ratings')
      .select('rating_value')
      .eq('external_id', external_id)
      .eq('content_type', content_type)

    if (error) {
      console.error(`[${req.id}] Aggregate rating error:`, error)
      return res.status(500).json({ error: 'Failed to fetch aggregate rating' })
    }

    const rating_count = data.length
    let average_rating = null

    if (rating_count > 0) {
      const sum = data.reduce((acc, curr) => acc + curr.rating_value, 0)
      average_rating = Math.round((sum / rating_count) * 10) / 10 // Round to 1 decimal
    }

    const result = {
      external_id,
      content_type,
      average_rating,
      rating_count
    }

    // Cache for 5 minutes
    cache.set(cacheKey, result)

    res.json(result)
  } catch (error) {
    console.error(`[${req.id}] Aggregate rating error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch aggregate rating' })
  }
})

/**
 * POST /api/ratings/aggregate/batch
 * Get aggregate ratings for multiple content items
 */
router.post('/ratings/aggregate/batch', async (req, res) => {
  try {
    const { items } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' })
    }

    if (items.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 items per request' })
    }

    const results = []

    for (const item of items) {
      const { external_id, content_type } = item

      try {
        validateExternalId(external_id)
        validateContentType(content_type)
      } catch (err) {
        results.push({
          external_id,
          content_type,
          average_rating: null,
          rating_count: 0,
          error: err.message
        })
        continue
      }

      // Check cache
      const cacheKey = `aggregate_rating:${external_id}:${content_type}`
      const cached = cache.get(cacheKey)

      if (cached) {
        results.push(cached)
        continue
      }

      // Query database
      try {
        const { data, error } = await supabase
          .from('ratings')
          .select('rating_value')
          .eq('external_id', external_id)
          .eq('content_type', content_type)

        if (error) throw error

        const rating_count = data.length
        let average_rating = null

        if (rating_count > 0) {
          const sum = data.reduce((acc, curr) => acc + curr.rating_value, 0)
          average_rating = Math.round((sum / rating_count) * 10) / 10
        }

        const result = {
          external_id,
          content_type,
          average_rating,
          rating_count
        }

        cache.set(cacheKey, result)
        results.push(result)
      } catch (error) {
        console.error(`[${req.id}] Batch aggregate error for ${external_id}:`, error)
        results.push({
          external_id,
          content_type,
          average_rating: null,
          rating_count: 0
        })
      }
    }

    res.json({ results })
  } catch (error) {
    console.error(`[${req.id}] Batch aggregate error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch aggregate ratings' })
  }
})

// ============================================================================
// REVIEW COUNT ENDPOINTS
// ============================================================================

/**
 * GET /api/reviews/count
 * Get review count for content
 */
router.get('/reviews/count', async (req, res) => {
  try {
    const { external_id, content_type } = req.query

    validateExternalId(external_id)
    validateContentType(content_type)

    // Check cache first
    const cacheKey = `review_count:${content_type}:${external_id}`
    const cached = cache.get(cacheKey)

    if (cached !== undefined) {
      return res.json({ count: cached })
    }

    // Query database - exclude hidden reviews
    const { count, error } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('external_id', external_id)
      .eq('content_type', content_type)
      .eq('is_hidden', false)

    if (error) {
      console.error(`[${req.id}] Review count error:`, error)
      return res.status(500).json({ error: 'Failed to fetch review count' })
    }

    // Cache for 5 minutes
    cache.set(cacheKey, count)

    res.json({ count })
  } catch (error) {
    console.error(`[${req.id}] Review count error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch review count' })
  }
})

/**
 * POST /api/reviews/count/batch
 * Get review counts for multiple content items
 */
router.post('/reviews/count/batch', async (req, res) => {
  try {
    const { items } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' })
    }

    if (items.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 items per request' })
    }

    const results = []

    for (const item of items) {
      const { external_id, content_type } = item

      try {
        validateExternalId(external_id)
        validateContentType(content_type)
      } catch (err) {
        results.push({
          external_id,
          content_type,
          count: 0,
          error: err.message
        })
        continue
      }

      // Check cache
      const cacheKey = `review_count:${content_type}:${external_id}`
      const cached = cache.get(cacheKey)

      if (cached !== undefined) {
        results.push({
          external_id,
          content_type,
          count: cached
        })
        continue
      }

      // Query database - exclude hidden reviews
      try {
        const { count, error } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('external_id', external_id)
          .eq('content_type', content_type)
          .eq('is_hidden', false)

        if (error) throw error

        // Cache for 5 minutes
        cache.set(cacheKey, count)

        results.push({
          external_id,
          content_type,
          count
        })
      } catch (error) {
        console.error(`[${req.id}] Batch review count error for ${external_id}:`, error)
        results.push({
          external_id,
          content_type,
          count: 0
        })
      }
    }

    res.json({ results })
  } catch (error) {
    console.error(`[${req.id}] Batch review count error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch review counts' })
  }
})

export default router
