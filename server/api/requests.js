// ✅ Content Requests Management API - Get and manage pending/processed requests
import { createClient } from '@supabase/supabase-js'
import pkg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Initialize CockroachDB pool
const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

/**
 * Handle GET, PUT, DELETE for content requests
 */
export default async function handler(req, res) {
  try {
    // 1. Validate admin authentication for any request method
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['admin', 'supervisor'].includes(profile.role)) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' })
    }

    // --- GET: List requests ---
    if (req.method === 'GET') {
      const { status = 'all', limit = 50, offset = 0 } = req.query
      
      let query = 'SELECT * FROM requests'
      const params = []
      
      if (status !== 'all') {
        params.push(status)
        query += ' WHERE status = $1'
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(parseInt(limit), parseInt(offset))
      
      const result = await pool.query(query, params)
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) FROM requests'
      const countParams = []
      if (status !== 'all') {
        countParams.push(status)
        countQuery += ' WHERE status = $1'
      }
      
      const countResult = await pool.query(countQuery, countParams)
      
      return res.status(200).json({
        requests: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      })
    }

    // --- PUT: Update request (e.g. manually change status or notes) ---
    else if (req.method === 'PUT') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Request ID is required' })
        
      const { status, notes, media_type, tmdb_id } = req.body
      
      // Build dynamic update query
      const updates = []
      const params = [id]
      let paramCount = 2
      
      if (status) {
        updates.push(`status = $${paramCount++}`)
        params.push(status)
        if (status === 'processed') {
          updates.push(`processed_at = NOW()`)
          updates.push(`processed_by = $${paramCount++}`)
          params.push(user.id)
        }
      }
      
      if (notes !== undefined) {
        updates.push(`notes = $${paramCount++}`)
        params.push(notes)
      }
      
      if (media_type) {
        updates.push(`media_type = $${paramCount++}`)
        params.push(media_type)
      }
      
      if (tmdb_id) {
        updates.push(`tmdb_id = $${paramCount++}`)
        params.push(tmdb_id)
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' })
      }
      
      const query = `UPDATE requests SET ${updates.join(', ')} WHERE id = $1 RETURNING *`
      const result = await pool.query(query, params)
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Request not found' })
      }
      
      return res.status(200).json(result.rows[0])
    }

    // --- DELETE: Remove request ---
    else if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'Request ID is required' })
        
      const result = await pool.query('DELETE FROM requests WHERE id = $1 RETURNING id', [id])
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Request not found' })
      }
      
      return res.status(200).json({ success: true, message: 'Request deleted successfully' })
    }

    // --- Invalid Method ---
    else {
      return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Requests API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
