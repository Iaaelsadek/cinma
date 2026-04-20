/**
 * Genre API Endpoint
 * 
 * Provides dynamic genre lists fetched from CockroachDB for filtering content.
 * Replaces hardcoded genre lists with real data from the database.
 * 
 * CRITICAL: All content data comes from CockroachDB (NOT Supabase)
 */

import NodeCache from 'node-cache'
import pool from '../../src/db/pool.js'
import { genreTranslations } from '../lib/genre-translations.js'

/**
 * Cache instance for genre data
 * TTL: 3600 seconds (1 hour)
 * checkperiod: 600 seconds (10 minutes) - automatic cleanup of expired keys
 */
const genreCache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
  useClones: false // Performance optimization - return references instead of clones
})

/**
 * Query database with connection pooling
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

/**
 * Check database availability
 * @returns {Promise<boolean>} True if database is available
 */
async function checkDB() {
  try {
    await query('SELECT 1', [])
    return true
  } catch (error) {
    console.error('[Genre API] Database check failed:', error.message)
    return false
  }
}

/**
 * Map content type to CockroachDB table name
 * @param {string} contentType - Content type (movies, series, anime, gaming, software)
 * @returns {string} Table name
 */
function getTableName(contentType) {
  const tableMap = {
    movies: 'movies',
    series: 'tv_series',
    anime: 'anime',
    gaming: 'games',
    software: 'software'
  }
  return tableMap[contentType]
}

/**
 * Register genre API routes
 * @param {Express} app - Express application instance
 */
export function registerGenreRoutes(app) {
  /**
   * GET /api/genres/:contentType
   * 
   * Fetch distinct genre values from CockroachDB for specified content type
   * 
   * @param {string} contentType - Content type (movies, series, anime, gaming, software)
   * @returns {Object} {genres: GenreOption[], contentType: string, count: number}
   */
  app.get('/api/genres/:contentType', async (req, res) => {
    const { contentType } = req.params
    
    // Validate content type
    const validTypes = ['movies', 'series', 'anime', 'gaming', 'software']
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({
        error: 'Invalid content type',
        message: `Content type must be one of: ${validTypes.join(', ')}`,
        validTypes
      })
    }
    
    // Generate cache key
    const cacheKey = `genres-${contentType}`
    
    try {
      // Check cache first
      const cachedData = genreCache.get(cacheKey)
      if (cachedData) {
        console.log(`[Genre API] Cache hit for ${contentType}`)
        return res.json(cachedData)
      }
      
      console.log(`[Genre API] Cache miss for ${contentType}, fetching from database`)
      
      // Check database availability
      if (!(await checkDB())) {
        console.error('[Genre API] Database unavailable')
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Database connection failed. Please try again later.'
        })
      }
      
      // Map content type to table name
      const tableName = getTableName(contentType)
      
      // Build query for distinct genres
      let sql = `
        SELECT DISTINCT primary_genre 
        FROM ${tableName}
        WHERE primary_genre IS NOT NULL 
          AND primary_genre != ''
        ORDER BY primary_genre
        LIMIT 100
      `
      
      // Add category filter for anime (only anime content, not all from anime table)
      if (contentType === 'anime') {
        sql = `
          SELECT DISTINCT primary_genre 
          FROM ${tableName}
          WHERE primary_genre IS NOT NULL 
            AND primary_genre != ''
            AND category = 'anime'
          ORDER BY primary_genre
          LIMIT 100
        `
      }
      
      // Execute query
      const result = await query(sql, [])
      
      // Apply translations to create bilingual genre options
      const genres = result.rows.map(row => {
        const arabicValue = row.primary_genre
        const englishLabel = genreTranslations[arabicValue] || arabicValue
        
        return {
          value: arabicValue,
          labelAr: arabicValue,
          labelEn: englishLabel
        }
      })
      
      // Sort by Arabic label alphabetically
      genres.sort((a, b) => a.labelAr.localeCompare(b.labelAr, 'ar'))
      
      // Check for NULL primary_genre percentage and log warning
      const totalCountResult = await query(
        `SELECT COUNT(*) as total FROM ${tableName}`,
        []
      )
      const totalCount = parseInt(totalCountResult.rows[0]?.total || 0)
      const genreCount = genres.length
      const nullCount = totalCount - genreCount
      const nullPercentage = totalCount > 0 ? (nullCount / totalCount) * 100 : 0
      
      if (nullPercentage > 10) {
        console.warn(
          `[Genre API] Warning: ${nullPercentage.toFixed(1)}% of ${contentType} ` +
          `have NULL or empty primary_genre (${nullCount}/${totalCount})`
        )
      }
      
      // Prepare response
      const responseData = {
        genres,
        contentType,
        count: genres.length
      }
      
      // Store in cache
      genreCache.set(cacheKey, responseData)
      console.log(`[Genre API] Cached ${contentType} genres for 1 hour`)
      
      // Return response
      res.json(responseData)
      
    } catch (error) {
      console.error('[Genre API] Error fetching genres:', error)
      // Track error rate for monitoring
      const errorDetails = {
        endpoint: `/api/genres/${req.params.contentType}`,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }
      console.error('[Genre API] Error details:', JSON.stringify(errorDetails))
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch genres from database',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  })
}
