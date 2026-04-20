/**
 * Review Interactions API - CockroachDB
 * 
 * Handles review likes (helpful votes) and reports.
 * All data stored in CockroachDB (primary content database).
 */

import express from 'express'
import { authenticateUser } from '../middleware/auth.js'
import pool from '../../src/db/pool.js'

const router = express.Router()

// ============================================================================
// REVIEW LIKE ENDPOINTS
// ============================================================================

/**
 * POST /api/reviews/:id/like
 * Toggle helpful vote on a review
 */
router.post('/reviews/:id/like', authenticateUser, async (req, res) => {
  try {
    const { id: reviewId } = req.params
    const userId = req.user.id
    
    // Fetch review to get author
    const reviewQuery = `SELECT user_id FROM reviews WHERE id = $1`
    const reviewResult = await pool.query(reviewQuery, [reviewId])
    
    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' })
    }
    
    // Prevent users from liking their own reviews
    if (reviewResult.rows[0].user_id === userId) {
      return res.status(400).json({ error: 'You cannot like your own review' })
    }
    
    // Check if already liked
    const existingQuery = `SELECT id FROM review_likes WHERE review_id = $1 AND user_id = $2`
    const existing = await pool.query(existingQuery, [reviewId, userId])
    
    let liked = false
    
    if (existing.rows.length > 0) {
      // Unlike - delete the like
      await pool.query(`DELETE FROM review_likes WHERE id = $1`, [existing.rows[0].id])
      liked = false
    } else {
      // Like - insert new like
      await pool.query(
        `INSERT INTO review_likes (review_id, user_id) VALUES ($1, $2)`,
        [reviewId, userId]
      )
      liked = true
    }
    
    // Get updated like count
    const countQuery = `SELECT COUNT(*) FROM review_likes WHERE review_id = $1`
    const countResult = await pool.query(countQuery, [reviewId])
    const likeCount = parseInt(countResult.rows[0].count)
    
    res.json({
      liked,
      like_count: likeCount
    })
  } catch (error) {
    console.error(`[${req.id}] Review like error:`, error)
    res.status(500).json({ error: error.message || 'Failed to toggle like' })
  }
})

/**
 * GET /api/reviews/:id/likes
 * Get like count for a review
 */
router.get('/reviews/:id/likes', async (req, res) => {
  try {
    const { id: reviewId } = req.params
    
    const query = `SELECT COUNT(*) FROM review_likes WHERE review_id = $1`
    const result = await pool.query(query, [reviewId])
    const likeCount = parseInt(result.rows[0].count)
    
    res.json({ like_count: likeCount })
  } catch (error) {
    console.error(`[${req.id}] Like count error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch like count' })
  }
})

// ============================================================================
// REVIEW REPORT ENDPOINTS
// ============================================================================

/**
 * POST /api/reviews/:id/report
 * Report an inappropriate review
 */
router.post('/reviews/:id/report', authenticateUser, async (req, res) => {
  try {
    const { id: reviewId } = req.params
    const { reason } = req.body
    const userId = req.user.id
    
    // Validate reason
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ error: 'Reason must be at least 10 characters' })
    }
    
    if (reason.length > 500) {
      return res.status(400).json({ error: 'Reason must not exceed 500 characters' })
    }
    
    // Check if review exists
    const reviewQuery = `SELECT id FROM reviews WHERE id = $1`
    const reviewResult = await pool.query(reviewQuery, [reviewId])
    
    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' })
    }
    
    // Check for duplicate report
    const existingQuery = `
      SELECT id FROM review_reports 
      WHERE review_id = $1 AND reporter_id = $2
    `
    const existing = await pool.query(existingQuery, [reviewId, userId])
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You have already reported this review' })
    }
    
    // Insert report
    const insertQuery = `
      INSERT INTO review_reports (review_id, reporter_id, reason)
      VALUES ($1, $2, $3)
      RETURNING *
    `
    const result = await pool.query(insertQuery, [reviewId, userId, reason.trim()])
    
    res.status(201).json({ success: true, report: result.rows[0] })
  } catch (error) {
    console.error(`[${req.id}] Report submission error:`, error)
    res.status(500).json({ error: error.message || 'Failed to submit report' })
  }
})

// ============================================================================
// USER STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/reviews/user/:userId/stats
 * Get review statistics for a user
 */
router.get('/reviews/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params
    
    // Get total reviews count
    const countQuery = `
      SELECT COUNT(*) as total_reviews
      FROM reviews
      WHERE user_id = $1 AND is_published = true
    `
    const countResult = await pool.query(countQuery, [userId])
    const totalReviews = parseInt(countResult.rows[0].total_reviews)
    
    // Get total helpful votes
    const votesQuery = `
      SELECT COUNT(*) as total_votes
      FROM review_likes rl
      JOIN reviews r ON rl.review_id = r.id
      WHERE r.user_id = $1 AND r.is_published = true
    `
    const votesResult = await pool.query(votesQuery, [userId])
    const totalHelpfulVotes = parseInt(votesResult.rows[0].total_votes)
    
    // Calculate average rating
    const avgQuery = `
      SELECT AVG(rating) as avg_rating
      FROM reviews
      WHERE user_id = $1 AND is_published = true AND rating IS NOT NULL
    `
    const avgResult = await pool.query(avgQuery, [userId])
    const averageRating = avgResult.rows[0].avg_rating 
      ? Math.round(parseFloat(avgResult.rows[0].avg_rating) * 10) / 10 
      : null
    
    res.json({
      total_reviews: totalReviews,
      total_helpful_votes: totalHelpfulVotes,
      average_rating: averageRating
    })
  } catch (error) {
    console.error(`[${req.id}] User stats error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch user statistics' })
  }
})

export default router
