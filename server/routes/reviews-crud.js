/**
 * Review CRUD Operations - CockroachDB
 * 
 * Handles review creation, reading, updating, and deletion.
 * All reviews stored in CockroachDB (primary content database).
 */

import express from 'express'
import { authenticateUser } from '../middleware/auth.js'
import { rateLimitReviews } from '../middleware/rateLimiter.js'
import pool from '../../src/db/pool.js'
import DOMPurify from 'isomorphic-dompurify'

const router = express.Router()

// ============================================================================
// Utility Functions
// ============================================================================

function sanitizeReviewText(text) {
  if (!text) return ''
  const cleaned = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
  return cleaned.trim()
}

function sanitizeReviewTitle(title) {
  if (!title) return null
  const cleaned = DOMPurify.sanitize(title, { ALLOWED_TAGS: [] })
  return cleaned.trim() || null
}

function validateContentType(content_type) {
  const validTypes = ['movie', 'tv', 'software']
  if (!content_type || !validTypes.includes(content_type)) {
    throw new Error(`content_type must be one of: ${validTypes.join(', ')}`)
  }
}

// ============================================================================
// REVIEW ENDPOINTS
// ============================================================================

/**
 * GET /api/reviews
 * Get reviews for content with filtering and sorting
 */
router.get('/reviews', async (req, res) => {
  try {
    const {
      content_type,
      content_id,
      user_id,
      sort = 'newest',
      language = 'all',
      limit = 20,
      offset = 0
    } = req.query

    const parsedLimit = Math.min(parseInt(limit) || 20, 100)
    const parsedOffset = parseInt(offset) || 0

    // Build query
    let query = `
      SELECT 
        r.*,
        COALESCE(COUNT(DISTINCT rl.id), 0)::int AS helpful_count
      FROM reviews r
      LEFT JOIN review_likes rl ON r.id = rl.review_id
      WHERE r.is_published = true
    `
    const params = []
    let paramIndex = 1

    // Filter by content
    if (content_type && content_id) {
      validateContentType(content_type)
      query += ` AND r.content_type = $${paramIndex++} AND r.content_id = $${paramIndex++}`
      params.push(content_type, content_id)
    }

    // Filter by user
    if (user_id) {
      query += ` AND r.user_id = $${paramIndex++}`
      params.push(user_id)
    }

    // Language filter
    if (language !== 'all') {
      query += ` AND r.language = $${paramIndex++}`
      params.push(language)
    }

    query += ` GROUP BY r.id`

    // Sorting
    if (sort === 'newest') {
      query += ` ORDER BY r.created_at DESC`
    } else if (sort === 'highest_rating') {
      query += ` ORDER BY r.rating DESC NULLS LAST, r.created_at DESC`
    } else if (sort === 'lowest_rating') {
      query += ` ORDER BY r.rating ASC NULLS LAST, r.created_at DESC`
    } else if (sort === 'most_helpful') {
      query += ` ORDER BY helpful_count DESC, r.created_at DESC`
    }

    // Pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(parsedLimit, parsedOffset)

    const result = await pool.query(query, params)

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM reviews WHERE is_published = true`
    const countParams = []
    let countIndex = 1

    if (content_type && content_id) {
      countQuery += ` AND content_type = $${countIndex++} AND content_id = $${countIndex++}`
      countParams.push(content_type, content_id)
    }
    if (user_id) {
      countQuery += ` AND user_id = $${countIndex++}`
      countParams.push(user_id)
    }
    if (language !== 'all') {
      countQuery += ` AND language = $${countIndex++}`
      countParams.push(language)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count)

    res.json({
      reviews: result.rows,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: (parsedOffset + parsedLimit) < total
      }
    })
  } catch (error) {
    console.error(`[${req.id}] Reviews fetch error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch reviews' })
  }
})

/**
 * GET /api/reviews/:id
 * Get single review by ID
 */
router.get('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params

    const query = `
      SELECT 
        r.*,
        COALESCE(COUNT(DISTINCT rl.id), 0)::int AS helpful_count
      FROM reviews r
      LEFT JOIN review_likes rl ON r.id = rl.review_id
      WHERE r.id = $1
      GROUP BY r.id
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error(`[${req.id}] Review fetch error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch review' })
  }
})

/**
 * POST /api/reviews
 * Create a new review
 */
router.post('/reviews', authenticateUser, rateLimitReviews, async (req, res) => {
  try {
    const {
      content_id,
      content_type,
      body,
      title,
      rating,
      language = 'ar'
    } = req.body

    const userId = req.user.id

    // Validate inputs
    if (!content_id) {
      return res.status(400).json({ error: 'content_id is required' })
    }
    validateContentType(content_type)

    // Sanitize text inputs
    const sanitizedBody = sanitizeReviewText(body)
    const sanitizedTitle = sanitizeReviewTitle(title)

    // Validate review text length
    if (!sanitizedBody || sanitizedBody.length < 10) {
      return res.status(400).json({ error: 'Review text must be at least 10 characters' })
    }

    if (sanitizedBody.length > 5000) {
      return res.status(400).json({ error: 'Review text must not exceed 5000 characters' })
    }

    // Validate title length
    if (sanitizedTitle && sanitizedTitle.length > 200) {
      return res.status(400).json({ error: 'Title must not exceed 200 characters' })
    }

    // Validate rating
    if (rating !== null && rating !== undefined) {
      const numRating = parseFloat(rating)
      if (isNaN(numRating) || numRating < 0 || numRating > 10) {
        return res.status(400).json({ error: 'Rating must be between 0 and 10' })
      }
    }

    // Validate language
    if (!['ar', 'en'].includes(language)) {
      return res.status(400).json({ error: 'Language must be "ar" or "en"' })
    }

    // Check if user already reviewed this content
    const existingQuery = `
      SELECT id FROM reviews 
      WHERE user_id = $1 AND content_id = $2 AND content_type = $3
    `
    const existing = await pool.query(existingQuery, [userId, content_id, content_type])

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reviewed this content. Use PUT to update.' })
    }

    // Insert review
    const insertQuery = `
      INSERT INTO reviews (
        user_id, content_id, content_type, title, body, rating, language
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `

    const result = await pool.query(insertQuery, [
      userId,
      content_id,
      content_type,
      sanitizedTitle,
      sanitizedBody,
      rating || null,
      language
    ])

    res.status(201).json({ success: true, review: result.rows[0] })
  } catch (error) {
    console.error(`[${req.id}] Review creation error:`, error)
    res.status(500).json({ error: error.message || 'Failed to create review' })
  }
})

/**
 * PUT /api/reviews/:id
 * Update an existing review
 */
router.put('/reviews/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const { body, title, rating } = req.body
    const userId = req.user.id

    // Fetch existing review to verify ownership
    const existingQuery = `SELECT user_id, edit_count FROM reviews WHERE id = $1`
    const existing = await pool.query(existingQuery, [id])

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' })
    }

    // Verify ownership
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own reviews' })
    }

    // Check edit limit
    if (existing.rows[0].edit_count >= 5) {
      return res.status(400).json({ error: 'Maximum 5 edits allowed per review' })
    }

    // Build update fields
    const updates = []
    const params = []
    let paramIndex = 1

    // Sanitize and validate text if provided
    if (body !== undefined) {
      const sanitizedBody = sanitizeReviewText(body)
      if (!sanitizedBody || sanitizedBody.length < 10) {
        return res.status(400).json({ error: 'Review text must be at least 10 characters' })
      }
      if (sanitizedBody.length > 5000) {
        return res.status(400).json({ error: 'Review text must not exceed 5000 characters' })
      }
      updates.push(`body = $${paramIndex++}`)
      params.push(sanitizedBody)
    }

    // Sanitize and validate title if provided
    if (title !== undefined) {
      const sanitizedTitle = sanitizeReviewTitle(title)
      if (sanitizedTitle && sanitizedTitle.length > 200) {
        return res.status(400).json({ error: 'Title must not exceed 200 characters' })
      }
      updates.push(`title = $${paramIndex++}`)
      params.push(sanitizedTitle)
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      const numRating = parseFloat(rating)
      if (isNaN(numRating) || numRating < 0 || numRating > 10) {
        return res.status(400).json({ error: 'Rating must be between 0 and 10' })
      }
      updates.push(`rating = $${paramIndex++}`)
      params.push(numRating)
    }

    // Always update edit_count and updated_at
    updates.push(`edit_count = edit_count + 1`)
    updates.push(`updated_at = NOW()`)

    if (updates.length === 2) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    // Update review
    params.push(id)
    const updateQuery = `
      UPDATE reviews 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(updateQuery, params)

    res.json({ success: true, review: result.rows[0] })
  } catch (error) {
    console.error(`[${req.id}] Review update error:`, error)
    res.status(500).json({ error: error.message || 'Failed to update review' })
  }
})

/**
 * DELETE /api/reviews/:id
 * Delete a review
 */
router.delete('/reviews/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Fetch review to verify ownership
    const existingQuery = `SELECT user_id FROM reviews WHERE id = $1`
    const existing = await pool.query(existingQuery, [id])

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' })
    }

    // Verify ownership
    if (existing.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own reviews' })
    }

    // Delete review (cascades to review_likes and review_reports)
    await pool.query(`DELETE FROM reviews WHERE id = $1`, [id])

    res.json({ success: true })
  } catch (error) {
    console.error(`[${req.id}] Review deletion error:`, error)
    res.status(500).json({ error: error.message || 'Failed to delete review' })
  }
})

export default router
