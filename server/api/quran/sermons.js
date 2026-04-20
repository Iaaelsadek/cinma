// server/api/quran/sermons.js - Quran Sermons API (CockroachDB)
import { query } from '../../db/index.js'

/**
 * GET /api/quran/sermons
 * Fetch all active Quran sermons from CockroachDB
 * 
 * Query Parameters:
 * - category (optional): Filter by sermon category
 * - featured (optional): If "true", return only featured sermons
 * - scholar (optional): Filter by scholar name (matches Arabic or English)
 */
export async function GET(req, res) {
  try {
    const { category, featured, scholar } = req.query
    
    // Build dynamic SQL query
    let sql = 'SELECT * FROM quran_sermons WHERE is_active = true'
    const params = []
    let paramIndex = 1
    
    // Add category filter
    if (category) {
      sql += ' AND category = $' + paramIndex
      params.push(category)
      paramIndex++
    }
    
    // Add featured filter
    if (featured === 'true') {
      sql += ' AND featured = true'
    }
    
    // Add scholar name filter (case-insensitive, matches Arabic or English)
    if (scholar) {
      sql += ' AND (scholar_name_ar ILIKE $' + paramIndex + ' OR scholar_name_en ILIKE $' + paramIndex + ')'
      params.push(`%${scholar}%`)
      paramIndex++
    }
    
    // Order by featured first, then by popularity, then by newest
    sql += ' ORDER BY featured DESC, play_count DESC, created_at DESC'
    
    const result = await query(sql, params)
    
    res.json({ sermons: result.rows })
  } catch (error) {
    console.error('Error fetching Quran sermons:', error)
    res.status(500).json({ 
      error: 'Failed to fetch sermons',
      message: error.message 
    })
  }
}
