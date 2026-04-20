// server/routes/videos.js - Videos API Routes
// Fetches videos from CockroachDB

import express from 'express'
import pool from '../../src/db/pool.js'

const router = express.Router()

// GET /api/videos/:id - Get single video by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Fetch from CockroachDB
    const result = await pool.query(
      'SELECT * FROM videos WHERE id = $1',
      [id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching video:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /api/videos - Get videos by category
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      limit = 50, 
      orderBy = 'created_at', 
      ascending = 'false',
      year 
    } = req.query
    
    let query = 'SELECT * FROM videos'
    const params = []
    const conditions = []
    
    if (category) {
      conditions.push(`category = $${params.length + 1}`)
      params.push(category)
    }
    
    if (year) {
      conditions.push(`EXTRACT(YEAR FROM created_at) = $${params.length + 1}`)
      params.push(parseInt(year))
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    const order = ascending === 'true' ? 'ASC' : 'DESC'
    query += ` ORDER BY ${orderBy} ${order}`
    query += ` LIMIT $${params.length + 1}`
    params.push(parseInt(limit))
    
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching videos:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
