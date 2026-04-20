// server/api/quran/stories.js - Quran Stories API (CockroachDB)
import { query } from '../../db/index.js'

/**
 * GET /api/quran/stories
 * Fetch all active Quran stories from CockroachDB
 * 
 * Query Parameters:
 * - category (optional): Filter by story category
 * - featured (optional): If "true", return only featured stories
 * - narrator (optional): Filter by narrator name (matches Arabic or English)
 */
export async function GET(req, res) {
  try {
    const { category, featured, narrator } = req.query
    
    // Build dynamic SQL query
    let sql = 'SELECT * FROM quran_stories WHERE is_active = true'
    const params = []
    let paramIndex = 1
    
    // Add category filter
    if (category) {
      sql += ` AND category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }
    
    // Add featured filter
    if (featured === 'true') {
      sql += ' AND featured = true'
    }
    
    // Add narrator name filter (case-insensitive, matches Arabic or English)
    if (narrator) {
      sql += ` AND (narrator_name_ar ILIKE $${paramIndex} OR narrator_name_en ILIKE $${paramIndex})`
      params.push(`%${narrator}%`)
      paramIndex++
    }
    
    // Order by featured first, then by popularity, then by newest
    sql += ' ORDER BY featured DESC, play_count DESC, created_at DESC'
    
    const result = await query(sql, params)
    
    res.json({ stories: result.rows })
  } catch (error) {
    console.error('Error fetching Quran stories:', error)
    res.status(500).json({ 
      error: 'Failed to fetch stories',
      message: error.message 
    })
  }
}
