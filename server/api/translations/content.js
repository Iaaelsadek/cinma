// server/api/translations/content.js - Content Translations API (CockroachDB)
import { query } from '../../db/index.js'

/**
 * GET /api/translations/content/:tmdbId/:mediaType
 * Fetch translation for specific content
 */
export async function GET(req, res) {
  try {
    const { tmdbId, mediaType } = req.params
    
    if (!tmdbId || !mediaType) {
      return res.status(400).json({ error: 'Missing tmdbId or mediaType' })
    }
    
    const result = await query(
      `SELECT title_ar, overview_ar, title_en, overview_en 
       FROM content_translations 
       WHERE tmdb_id = $1 AND media_type = $2`,
      [parseInt(tmdbId), mediaType]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Translation not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching content translation:', error)
    res.status(500).json({ 
      error: 'Failed to fetch translation',
      message: error.message 
    })
  }
}

/**
 * POST /api/translations/content
 * Create or update content translation
 */
export async function POST(req, res) {
  try {
    const { tmdb_id, media_type, title_ar, overview_ar, title_en, overview_en } = req.body
    
    if (!tmdb_id || !media_type) {
      return res.status(400).json({ error: 'Missing required fields: tmdb_id, media_type' })
    }
    
    const result = await query(
      `INSERT INTO content_translations (tmdb_id, media_type, title_ar, overview_ar, title_en, overview_en)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tmdb_id, media_type) 
       DO UPDATE SET 
         title_ar = EXCLUDED.title_ar,
         overview_ar = EXCLUDED.overview_ar,
         title_en = EXCLUDED.title_en,
         overview_en = EXCLUDED.overview_en,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [tmdb_id, media_type, title_ar || null, overview_ar || null, title_en || null, overview_en || null]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error upserting content translation:', error)
    res.status(500).json({ 
      error: 'Failed to save translation',
      message: error.message 
    })
  }
}
