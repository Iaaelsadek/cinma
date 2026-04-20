// server/api/quran/story-play.js - Story Play Count Tracking
import { query } from '../../db/index.js'

/**
 * POST /api/quran/stories/:id/play
 * Increment play count for a story when playback completes (95% threshold)
 * 
 * Requirements: 17.2, 17.4
 * 
 * Response:
 * - 200: { success: true, play_count: number }
 * - 404: { error: 'Story not found' }
 * - 500: { error: 'Failed to update play count', message: string }
 */
export async function POST(req, res) {
  try {
    const { id } = req.params
    
    // Validate ID exists and is numeric
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ 
        error: 'Invalid story ID',
        message: 'Story ID must be a valid number'
      })
    }
    
    // Increment play_count atomically and return updated value
    // Use string directly for BigInt support in CockroachDB
    const result = await query(
      `UPDATE quran_stories 
       SET play_count = play_count + 1 
       WHERE id = $1 AND is_active = true
       RETURNING play_count`,
      [id]
    )
    
    // Check if story was found and updated
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Story not found',
        message: 'Story does not exist or is not active'
      })
    }
    
    res.json({ 
      success: true, 
      play_count: result.rows[0].play_count 
    })
  } catch (error) {
    console.error('Error incrementing story play count:', error)
    res.status(500).json({ 
      error: 'Failed to update play count',
      message: error.message 
    })
  }
}
