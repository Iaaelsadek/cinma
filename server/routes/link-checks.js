// server/routes/link-checks.js - Link Checks API (CockroachDB)
import express from 'express'
import pool from '../../src/db/pool.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * GET /api/link-checks
 * Get link checks with optional filters
 * Query params:
 * - filter: 'broken' to get only broken links
 * - count: 'true' to return count only
 * - limit: number of results
 * - order: 'checked_at.desc' or 'checked_at.asc'
 * - since: ISO date string to filter by checked_at >= since
 */
router.get('/', asyncHandler(async (req, res) => {
  const { filter, count, limit, order, since } = req.query
  
  let query = 'SELECT * FROM link_checks WHERE 1=1'
  const params = []
  let paramIndex = 1
  
  // Filter broken links
  if (filter === 'broken') {
    const healthyCodes = [0, 200, 201, 206, 301, 302, 403, 408, 409, 425, 429, 500, 502, 503, 504, 520, 521, 522, 524]
    query += ` AND status_code NOT IN (${healthyCodes.join(',')})`
  }
  
  // Filter by date
  if (since) {
    query += ` AND checked_at >= $${paramIndex}`
    params.push(since)
    paramIndex++
  }
  
  // Count only
  if (count === 'true') {
    query = query.replace('SELECT *', 'SELECT COUNT(*) as count')
    const result = await pool.query(query, params)
    return res.json({ count: parseInt(result.rows[0].count) })
  }
  
  // Order
  if (order) {
    const [field, direction] = order.split('.')
    query += ` ORDER BY ${field} ${direction?.toUpperCase() || 'DESC'}`
  }
  
  // Limit
  if (limit) {
    query += ` LIMIT $${paramIndex}`
    params.push(parseInt(limit))
  }
  
  const result = await pool.query(query, params)
  res.json({ data: result.rows })
}))

/**
 * POST /api/link-checks
 * Create a new link check report
 * Body: {
 *   provider_id?: string,
 *   content_id?: number,
 *   content_type?: string,
 *   source_name?: string,
 *   url: string,
 *   ok: boolean,
 *   status_code: number,
 *   response_ms: number,
 *   checked_at: string (ISO),
 *   source?: string
 * }
 */
router.post('/', asyncHandler(async (req, res) => {
  const {
    provider_id,
    content_id,
    content_type,
    source_name,
    url,
    ok,
    status_code,
    response_ms,
    checked_at,
    source,
    season_number,
    episode_number
  } = req.body
  
  const query = `
    INSERT INTO link_checks (
      provider_id, content_id, content_type, source_name, url,
      ok, status_code, response_ms, checked_at, source,
      season_number, episode_number
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `
  
  const result = await pool.query(query, [
    provider_id || null,
    content_id || null,
    content_type || null,
    source_name || null,
    url,
    ok !== undefined ? ok : false,
    status_code || 0,
    response_ms || 0,
    checked_at || new Date().toISOString(),
    source || 'manual',
    season_number || null,
    episode_number || null
  ])
  
  res.status(201).json(result.rows[0])
}))

/**
 * DELETE /api/link-checks
 * Delete link checks by content_id and content_type
 * Query params:
 * - content_id: number
 * - content_type: 'movie' | 'tv'
 */
router.delete('/', asyncHandler(async (req, res) => {
  const { content_id, content_type } = req.query
  
  if (!content_id || !content_type) {
    return res.status(400).json({ error: 'content_id and content_type are required' })
  }
  
  const query = 'DELETE FROM link_checks WHERE content_id = $1 AND content_type = $2'
  await pool.query(query, [parseInt(content_id), content_type])
  
  res.json({ success: true })
}))

export default router
