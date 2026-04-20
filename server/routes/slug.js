/**
 * Slug Resolution API Routes
 * 
 * Endpoints for resolving slugs to content IDs
 */

import express from 'express'
import { getPool } from '../lib/db.js'

const router = express.Router()

/**
 * GET /api/db/movies/slug/:slug
 * Resolve movie slug to ID
 */
router.get('/movies/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const pool = getPool()

    const result = await pool.query(
      'SELECT id, title, slug FROM movies WHERE slug = $1 LIMIT 1',
      [slug]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Movie not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error resolving movie slug:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/db/tv/slug/:slug
 * Resolve TV series slug to ID
 */
router.get('/tv/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const pool = getPool()

    const result = await pool.query(
      'SELECT id, name, slug FROM tv_series WHERE slug = $1 LIMIT 1',
      [slug]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'TV series not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error resolving TV slug:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/db/slug/resolve-batch
 * Batch resolve multiple slugs
 */
router.post('/slug/resolve-batch', async (req, res) => {
  try {
    const { slugs, table } = req.body

    if (!slugs || !Array.isArray(slugs) || slugs.length === 0) {
      return res.status(400).json({ error: 'Invalid slugs array' })
    }

    if (!table || !['movies', 'tv_series'].includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' })
    }

    const pool = getPool()

    // Use parameterized query with ANY for array matching
    const result = await pool.query(
      `SELECT id, slug FROM ${table} WHERE slug = ANY($1)`,
      [slugs]
    )

    res.json({ results: result.rows })
  } catch (error) {
    console.error('Error batch resolving slugs:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
