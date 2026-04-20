// server/routes/embed-sources.js - Embed Sources API (CockroachDB)
import express from 'express'
import pool from '../../src/db/pool.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = express.Router()

/**
 * GET /api/embed-sources
 * Get embed sources by names
 * Query params:
 * - names: comma-separated list of source names
 */
router.get('/', asyncHandler(async (req, res) => {
  const { names } = req.query
  
  if (!names) {
    // Return all sources
    const result = await pool.query('SELECT * FROM embed_sources ORDER BY priority ASC')
    return res.json(result.rows)
  }
  
  const nameList = names.split(',').map(n => n.trim())
  const placeholders = nameList.map((_, i) => `$${i + 1}`).join(',')
  
  const query = `
    SELECT name, priority, response_time_ms
    FROM embed_sources
    WHERE name IN (${placeholders})
    ORDER BY priority ASC
  `
  
  const result = await pool.query(query, nameList)
  res.json(result.rows)
}))

export default router
