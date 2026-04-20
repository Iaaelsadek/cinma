// server/api/quran/reciters.js - Quran Reciters API (CockroachDB)
import { query } from '../../db/index.js'

/**
 * GET /api/quran/reciters
 * Fetch Quran reciters from CockroachDB with optional filtering
 * 
 * Query Parameters:
 * - search: Search by reciter name (case-insensitive)
 * - rewaya: Filter by rewaya (رواية)
 * - limit: Maximum number of results (default: 100)
 */
export async function GET(req, res) {
  try {
    const { search, rewaya, limit = '100' } = req.query
    
    let sql = `SELECT * FROM quran_reciters WHERE is_active = true`
    const params = []
    let paramIndex = 1
    
    // Add search filter
    if (search && search.trim()) {
      sql += ` AND name ILIKE $${paramIndex}`
      params.push(`%${search.trim()}%`)
      paramIndex++
    }
    
    // Add rewaya filter
    if (rewaya && rewaya.trim()) {
      sql += ` AND rewaya ILIKE $${paramIndex}`
      params.push(`%${rewaya.trim()}%`)
      paramIndex++
    }
    
    sql += ` ORDER BY id ASC LIMIT $${paramIndex}`
    params.push(parseInt(limit) || 100)
    
    const result = await query(sql, params)
    
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching Quran reciters:', error)
    res.status(500).json({ 
      error: 'Failed to fetch reciters',
      message: error.message 
    })
  }
}