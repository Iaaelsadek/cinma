/**
 * Admin Review Moderation API - CockroachDB
 * 
 * Endpoints for moderators to manage reviews and reports.
 * Requires admin or supervisor role.
 */

import express from 'express'
import { authenticateUser, requireAdmin } from '../middleware/auth.js'
import pool from '../../src/db/pool.js'

const router = express.Router()

// ============================================================================
// ADMIN REVIEW MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/reviews
 * Get all reviews including hidden ones (admin only)
 */
router.get('/admin/reviews', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { is_published, limit = 50, offset = 0 } = req.query
    
    const parsedLimit = Math.min(parseInt(limit) || 50, 100)
    const parsedOffset = parseInt(offset) || 0
    
    let query = `
      SELECT * FROM reviews
      WHERE 1=1
    `
    const params = []
    let paramIndex = 1
    
    // Filter by published status if specified
    if (is_published !== undefined) {
      query += ` AND is_published = $${paramIndex++}`
      params.push(is_published === 'true')
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(parsedLimit, parsedOffset)
    
    const result = await pool.query(query, params)
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM reviews WHERE 1=1`
    const countParams = []
    if (is_published !== undefined) {
      countQuery += ` AND is_published = $1`
      countParams.push(is_published === 'true')
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
    console.error(`[${req.id}] Admin reviews error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch reviews' })
  }
})

/**
 * PUT /api/admin/reviews/:id/hide
 * Hide a review (admin only)
 */
router.put('/admin/reviews/:id/hide', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    const query = `
      UPDATE reviews 
      SET is_published = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `
    
    const result = await pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' })
    }
    
    res.json({ success: true, review: result.rows[0] })
  } catch (error) {
    console.error(`[${req.id}] Hide review error:`, error)
    res.status(500).json({ error: error.message || 'Failed to hide review' })
  }
})

/**
 * PUT /api/admin/reviews/:id/unhide
 * Unhide a review (admin only)
 */
router.put('/admin/reviews/:id/unhide', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    const query = `
      UPDATE reviews 
      SET is_published = true, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `
    
    const result = await pool.query(query, [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' })
    }
    
    res.json({ success: true, review: result.rows[0] })
  } catch (error) {
    console.error(`[${req.id}] Unhide review error:`, error)
    res.status(500).json({ error: error.message || 'Failed to unhide review' })
  }
})

// ============================================================================
// ADMIN REPORT MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/reports
 * Get all review reports (admin only)
 */
router.get('/admin/reports', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    
    const parsedLimit = Math.min(parseInt(limit) || 50, 100)
    const parsedOffset = parseInt(offset) || 0
    
    const query = `
      SELECT 
        rr.*,
        r.title as review_title,
        r.body as review_body,
        r.user_id as review_user_id
      FROM review_reports rr
      JOIN reviews r ON rr.review_id = r.id
      ORDER BY rr.created_at DESC
      LIMIT $1 OFFSET $2
    `
    
    const result = await pool.query(query, [parsedLimit, parsedOffset])
    
    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) FROM review_reports`)
    const total = parseInt(countResult.rows[0].count)
    
    res.json({
      reports: result.rows,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: (parsedOffset + parsedLimit) < total
      }
    })
  } catch (error) {
    console.error(`[${req.id}] Admin reports error:`, error)
    res.status(500).json({ error: error.message || 'Failed to fetch reports' })
  }
})

/**
 * DELETE /api/admin/reports/:id
 * Delete a report (admin only)
 */
router.delete('/admin/reports/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    const result = await pool.query(`DELETE FROM review_reports WHERE id = $1 RETURNING *`, [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' })
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error(`[${req.id}] Delete report error:`, error)
    res.status(500).json({ error: error.message || 'Failed to delete report' })
  }
})

export default router
