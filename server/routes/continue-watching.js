/**
 * Continue Watching API Route
 * Handles user's continue watching data from Supabase
 */

import express from 'express'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('[Continue Watching] Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * GET /api/continue-watching
 * Get user's continue watching list
 * Requires authentication via Authorization header
 */
router.get('/', async (req, res) => {
  try {
    // Get user from authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    
    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Fetch continue watching data
    const { data, error } = await supabase
      .from('continue_watching')
      .select('external_id, external_source, content_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[Continue Watching] Query error:', error)
      return res.status(500).json({ error: 'Failed to fetch continue watching data' })
    }

    res.json(data || [])
  } catch (error) {
    console.error('[Continue Watching] Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
