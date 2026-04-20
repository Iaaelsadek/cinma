// server/api/translations/general.js - General Translations API (CockroachDB)
import { query } from '../../db/index.js'

/**
 * GET /api/translations/general/:originalTitle
 * Fetch Arabic translation for a title
 */
export async function GET(req, res) {
  try {
    const { originalTitle } = req.params
    
    if (!originalTitle) {
      return res.status(400).json({ error: 'Missing originalTitle' })
    }
    
    const result = await query(
      `SELECT arabic_title 
       FROM translations 
       WHERE original_title = $1`,
      [originalTitle]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Translation not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching translation:', error)
    res.status(500).json({ 
      error: 'Failed to fetch translation',
      message: error.message 
    })
  }
}

/**
 * POST /api/translations/general
 * Create or update general translation
 */
export async function POST(req, res) {
  try {
    const { original_title, arabic_title } = req.body
    
    if (!original_title || !arabic_title) {
      return res.status(400).json({ error: 'Missing required fields: original_title, arabic_title' })
    }
    
    const result = await query(
      `INSERT INTO translations (original_title, arabic_title)
       VALUES ($1, $2)
       ON CONFLICT (original_title) 
       DO UPDATE SET 
         arabic_title = EXCLUDED.arabic_title,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [original_title, arabic_title]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error upserting translation:', error)
    res.status(500).json({ 
      error: 'Failed to save translation',
      message: error.message 
    })
  }
}
