/**
 * Admin Content Management API
 * 
 * Endpoints for admin operations on CockroachDB content
 */

import { getPool } from '../lib/db.js'

/**
 * GET /api/admin/series/:id
 * Get series details with seasons
 */
export async function getSeriesWithSeasons(req, res) {
  try {
    const { id } = req.params
    const pool = getPool()
    
    const [seriesResult, seasonsResult] = await Promise.all([
      pool.query(
        'SELECT id, name, overview, first_air_date, poster_path, backdrop_path, trailer_url, is_active FROM tv_series WHERE id = $1',
        [id]
      ),
      pool.query(
        'SELECT id, series_id, season_number, name, overview, air_date, poster_path FROM seasons WHERE series_id = $1 ORDER BY season_number',
        [id]
      )
    ])
    
    if (seriesResult.rows.length === 0) {
      return res.status(404).json({ error: 'Series not found' })
    }
    
    res.json({
      series: seriesResult.rows[0],
      seasons: seasonsResult.rows
    })
  } catch (error) {
    console.error('Error fetching series:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * PUT /api/admin/series/:id
 * Update series
 */
export async function updateSeries(req, res) {
  try {
    const { id } = req.params
    const { name, overview, first_air_date, poster_path, backdrop_path, trailer_url, is_active } = req.body
    const pool = getPool()
    
    const result = await pool.query(
      `UPDATE tv_series 
       SET name = $1, overview = $2, first_air_date = $3, poster_path = $4, 
           backdrop_path = $5, trailer_url = $6, is_active = $7
       WHERE id = $8
       RETURNING *`,
      [name, overview, first_air_date, poster_path, backdrop_path, trailer_url, is_active, id]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating series:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * DELETE /api/admin/series/:id
 * Delete series (cascades to seasons and episodes)
 */
export async function deleteSeries(req, res) {
  try {
    const { id } = req.params
    const pool = getPool()
    
    await pool.query('DELETE FROM tv_series WHERE id = $1', [id])
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting series:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * POST /api/admin/seasons
 * Create season
 */
export async function createSeason(req, res) {
  try {
    const { series_id, season_number, name, overview, air_date, poster_path } = req.body
    const pool = getPool()
    
    const result = await pool.query(
      `INSERT INTO seasons (series_id, season_number, name, overview, air_date, poster_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [series_id, season_number, name, overview, air_date, poster_path]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error creating season:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * PUT /api/admin/seasons/:id
 * Update season
 */
export async function updateSeason(req, res) {
  try {
    const { id } = req.params
    const { season_number, name, overview, air_date, poster_path } = req.body
    const pool = getPool()
    
    const result = await pool.query(
      `UPDATE seasons 
       SET season_number = $1, name = $2, overview = $3, air_date = $4, poster_path = $5
       WHERE id = $6
       RETURNING *`,
      [season_number, name, overview, air_date, poster_path, id]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating season:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * DELETE /api/admin/seasons/:id
 * Delete season (cascades to episodes)
 */
export async function deleteSeason(req, res) {
  try {
    const { id } = req.params
    const pool = getPool()
    
    await pool.query('DELETE FROM seasons WHERE id = $1', [id])
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting season:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * POST /api/admin/episodes
 * Create episode
 */
export async function createEpisode(req, res) {
  try {
    const { 
      season_id, 
      episode_number, 
      name, 
      overview, 
      air_date, 
      still_path,
      duration,
      video_url 
    } = req.body
    const pool = getPool()
    
    // Try with all columns first
    try {
      const result = await pool.query(
        `INSERT INTO episodes (season_id, episode_number, name, overview, air_date, still_path, duration, video_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [season_id, episode_number, name, overview, air_date, still_path, duration, video_url]
      )
      return res.json(result.rows[0])
    } catch (err) {
      // Fallback without optional columns
      const result = await pool.query(
        `INSERT INTO episodes (season_id, episode_number, name, overview, air_date, still_path)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [season_id, episode_number, name, overview, air_date, still_path]
      )
      return res.json(result.rows[0])
    }
  } catch (error) {
    console.error('Error creating episode:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * PUT /api/admin/episodes/:id
 * Update episode
 */
export async function updateEpisode(req, res) {
  try {
    const { id } = req.params
    const { 
      episode_number, 
      name, 
      overview, 
      air_date, 
      still_path,
      duration,
      video_url 
    } = req.body
    const pool = getPool()
    
    // Try with all columns first
    try {
      const result = await pool.query(
        `UPDATE episodes 
         SET episode_number = $1, name = $2, overview = $3, air_date = $4, 
             still_path = $5, duration = $6, video_url = $7
         WHERE id = $8
         RETURNING *`,
        [episode_number, name, overview, air_date, still_path, duration, video_url, id]
      )
      return res.json(result.rows[0])
    } catch (err) {
      // Fallback without optional columns
      const result = await pool.query(
        `UPDATE episodes 
         SET episode_number = $1, name = $2, overview = $3, air_date = $4, still_path = $5
         WHERE id = $6
         RETURNING *`,
        [episode_number, name, overview, air_date, still_path, id]
      )
      return res.json(result.rows[0])
    }
  } catch (error) {
    console.error('Error updating episode:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * DELETE /api/admin/episodes/:id
 * Delete episode
 */
export async function deleteEpisode(req, res) {
  try {
    const { id } = req.params
    const pool = getPool()
    
    await pool.query('DELETE FROM episodes WHERE id = $1', [id])
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting episode:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * GET /api/admin/content-health
 * Get content health info for admin dashboard
 */
export async function getContentHealth(req, res) {
  try {
    const pool = getPool()
    
    const movieIds = req.query.movieIds ? req.query.movieIds.split(',').map(Number) : []
    const seriesIds = req.query.seriesIds ? req.query.seriesIds.split(',').map(Number) : []
    
    const [moviesResult, seriesResult, episodesResult] = await Promise.all([
      movieIds.length > 0 
        ? pool.query('SELECT id, title, poster_path FROM movies WHERE id = ANY($1)', [movieIds])
        : { rows: [] },
      seriesIds.length > 0
        ? pool.query('SELECT id, name, poster_path FROM tv_series WHERE id = ANY($1)', [seriesIds])
        : { rows: [] },
      seriesIds.length > 0
        ? pool.query('SELECT series_id FROM episodes WHERE series_id = ANY($1)', [seriesIds])
        : { rows: [] }
    ])
    
    res.json({
      movies: moviesResult.rows,
      series: seriesResult.rows,
      episodes: episodesResult.rows
    })
  } catch (error) {
    console.error('Error fetching content health:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default {
  getSeriesWithSeasons,
  updateSeries,
  deleteSeries,
  createSeason,
  updateSeason,
  deleteSeason,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  getContentHealth
}
