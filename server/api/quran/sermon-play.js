// server/api/quran/sermon-play.js - Sermon Play Count Tracking
import { query } from '../../db/index.js'

/**
 * POST /api/quran/sermons/:id/play
 * Increment play count for a sermon when playback completes (95% threshold)
 * 
 * Requirements: 17.1, 17.3
 * 
 * Response:
 * - 200: { success: true, play_count: number }
 * - 404: { error: 'Sermon not found' }
 * - 500: { error: 'Failed to update play count', message: string }
 */
export async function POST(req, res) {
  try {
    const { id } = req.params
    
    // Validate ID exists and is numeric
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ 
        error: 'Invalid sermon ID',
        message: 'Sermon ID must be a valid number'
      })
    }
    
    // Increment play_count atomically and return updated value
    // Use string directly for BigInt support in CockroachDB
    const result = await query(
      `UPDATE quran_sermons 
       SET play_count = play_count + 1 
       WHERE id = $1 AND is_active = true
       RETURNING play_count`,
      [id]
    )
    
    // Check if sermon was found and updated
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Sermon not found',
        message: 'Sermon does not exist or is not active'
      })
    }
    
    res.json({ 
      success: true, 
      play_count: result.rows[0].play_count 
    })
  } catch (error) {
    console.error('Error incrementing sermon play count:', error)
    res.status(500).json({ 
      error: 'Failed to update play count',
      message: error.message 
    })
  }
}
