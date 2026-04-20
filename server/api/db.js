// server/api/db.js - CockroachDB API routes
import pkg from 'pg'
const { Pool } = pkg

function cacheControl(seconds) {
  return (_req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=' + seconds + ', stale-while-revalidate=' + (seconds * 2))
    next()
  }
}

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.COCKROACHDB_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  return pool;
}

async function query(text, params) {
  const currentPool = getPool();
  const maxRetries = 3;
  const baseDelay = 100; // milliseconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await currentPool.connect()
      try {
        return await client.query(text, params)
      } finally {
        client.release()
      }
    } catch (error) {
      // Check if error is a connection timeout
      const isTimeout = error.message?.includes('connection timeout') ||
        error.message?.includes('ETIMEDOUT') ||
        error.message?.includes('Connection terminated')

      // Only retry on timeout errors, not on SQL syntax errors
      if (isTimeout && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) // 100ms, 200ms, 400ms
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // If not a timeout or last attempt, throw the error
      throw error
    }
  }
}

let dbAvailable = null
let dbAvailableCheckedAt = 0
async function checkDB() {
  const now = Date.now()
  if (dbAvailable !== null && now - dbAvailableCheckedAt < 30000) return dbAvailable
  try { await query('SELECT 1'); dbAvailable = true }
  catch { dbAvailable = false }
  dbAvailableCheckedAt = now
  return dbAvailable
}

const memCache = new Map()
function getCached(key) {
  const entry = memCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { memCache.delete(key); return null }
  return entry.data
}
function setCache(key, data, ttlMs = 300000) {
  memCache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

// Build parameterized SQL with correct $N placeholders
function buildSearchSQL(table, titleCol, dateCol, filters) {
  const { q, genre, min_rating, year, safeLimit, offset } = filters
  const params = []
  const conditions = []

  if (q) {
    params.push('%' + q + '%')
    const idx = params.length
    conditions.push('(' + titleCol + ' ILIKE $' + idx + ' OR overview ILIKE $' + idx + ')')
  }
  if (genre) {
    params.push('%' + genre + '%')
    conditions.push('genres::text ILIKE $' + params.length)
  }
  if (min_rating) {
    params.push(parseFloat(min_rating))
    conditions.push('vote_average >= $' + params.length)
  }
  if (year) {
    params.push(parseInt(year))
    conditions.push('EXTRACT(YEAR FROM ' + dateCol + ') = $' + params.length)
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
  params.push(safeLimit)
  const limitIdx = params.length
  params.push(offset)
  const offsetIdx = params.length

  const selectCol = titleCol === 'name' ? 'name' : 'title'
  const sql = 'SELECT id, slug, ' + selectCol + ', overview, poster_path, backdrop_path, ' +
    dateCol + ', vote_average, vote_count, popularity, genres ' +
    'FROM ' + table + ' ' + where + ' ' +
    'ORDER BY popularity DESC LIMIT $' + limitIdx + ' OFFSET $' + offsetIdx

  return { sql, params }
}

export function registerDBRoutes(app) {
  // GET /api/db/movies/trending
  app.get('/api/db/movies/trending', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'movies-trending-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, title, overview, poster_path, backdrop_path, ' +
        'release_date, vote_average, vote_count, popularity, genres ' +
        'FROM movies ORDER BY popularity DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/movies/random
  app.get('/api/db/movies/random', cacheControl(60), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 20)
    const minRating = parseFloat(req.query.min_rating) || 6.0
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, title, overview, poster_path, backdrop_path, ' +
        'release_date, vote_average, vote_count, popularity, genres ' +
        'FROM movies ' +
        'WHERE vote_average >= $1 AND poster_path IS NOT NULL AND backdrop_path IS NOT NULL ' +
        'ORDER BY RANDOM() LIMIT $2',
        [minRating, limit]
      )
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/movies/:identifier
  app.get('/api/db/movies/:identifier', async (req, res) => {
    const identifier = req.params.identifier

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      // Support both numeric IDs and slugs
      const isNumericId = /^\d+$/.test(identifier)
      const queryField = isNumericId ? 'id' : 'slug'
      const queryValue = isNumericId ? parseInt(identifier) : identifier

      // Query with all available fields (overview_ar and overview_en don't exist in schema)
      const result = await query(
        `SELECT 
          id, slug, external_id, external_source,
          title, title_ar, title_en, original_title,
          overview,
          original_language, poster_path, backdrop_path,
          release_date, vote_average, vote_count, popularity, runtime,
          genres, primary_genre, status
        FROM movies
        WHERE ${queryField} = $1`,
        [queryValue]
      )

      if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
      res.json(result.rows[0])
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // POST /api/db/movies/search
  app.post('/api/db/movies/search', async (req, res) => {
    const {
      query: q,
      genre,           // Genre filter (Arabic value)
      category,        // Alias for genre (for Islamic content)
      min_rating,
      year,
      sortBy,          // Nullable sort parameter (NULL = no explicit sorting)
      page = 1,
      limit = 20
    } = req.body || {}

    // Validate parameters
    if (year !== undefined && year !== null) {
      const yearNum = parseInt(year)
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        return res.status(400).json({
          error: 'Invalid year parameter',
          message: 'Year must be between 1900 and 2100'
        })
      }
    }

    if (min_rating !== undefined && min_rating !== null) {
      const ratingNum = parseFloat(min_rating)
      if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 10) {
        return res.status(400).json({
          error: 'Invalid rating parameter',
          message: 'Rating must be between 0 and 10'
        })
      }
    }

    if (sortBy !== undefined && sortBy !== null) {
      const allowedSorts = ['popularity', 'vote_average', 'release_date', 'title']
      if (!allowedSorts.includes(sortBy)) {
        return res.status(400).json({
          error: 'Invalid sortBy parameter',
          message: `sortBy must be one of: ${allowedSorts.join(', ')}, or null for no sorting`
        })
      }
    }

    const safeLimit = Math.min(parseInt(limit) || 20, 100)
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit

    // Build WHERE clause with parameterized queries
    const params = []
    const conditions = []

    if (q) {
      params.push(`%${q}%`)
      conditions.push(`(title ILIKE $${params.length} OR overview ILIKE $${params.length})`)
    }

    // Prefer genre over category when both provided
    const genreValue = genre || category
    if (genreValue) {
      params.push(genreValue)
      // Search in both primary_genre AND genres JSONB array
      conditions.push(`(primary_genre = $${params.length} OR genres::text ILIKE '%' || $${params.length} || '%')`)
    }

    if (year) {
      params.push(parseInt(year))
      conditions.push(`EXTRACT(YEAR FROM release_date) = $${params.length}`)
    }

    if (min_rating) {
      params.push(parseFloat(min_rating))
      conditions.push(`vote_average >= $${params.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Build ORDER BY clause only when sortBy is not NULL
    let orderByClause = ''
    if (sortBy) {
      const sortMap = {
        'popularity': 'popularity DESC',
        'vote_average': 'vote_average DESC',
        'release_date': 'release_date DESC',
        'title': 'title ASC'
      }
      orderByClause = `ORDER BY ${sortMap[sortBy]}`
    }

    params.push(safeLimit)
    const limitParam = params.length
    params.push(offset)
    const offsetParam = params.length

    const sql = `
      SELECT id, slug, title, overview, poster_path, backdrop_path,
             release_date, vote_average, vote_count, popularity, 
             primary_genre, genres
      FROM movies
      ${whereClause}
      ${orderByClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) {
      console.error('[Movies Search] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // GET /api/db/tv/trending
  app.get('/api/db/tv/trending', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'tv-trending-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, name, overview, poster_path, backdrop_path, ' +
        'first_air_date, vote_average, vote_count, popularity, genres ' +
        'FROM tv_series ORDER BY popularity DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/tv/random
  app.get('/api/db/tv/random', cacheControl(60), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 20)
    const minRating = parseFloat(req.query.min_rating) || 6.0
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, name, overview, poster_path, backdrop_path, ' +
        'first_air_date, vote_average, vote_count, popularity, genres ' +
        'FROM tv_series ' +
        'WHERE vote_average >= $1 AND poster_path IS NOT NULL AND backdrop_path IS NOT NULL ' +
        'ORDER BY RANDOM() LIMIT $2',
        [minRating, limit]
      )
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/tv/:identifier
  app.get('/api/db/tv/:identifier', async (req, res) => {
    const identifier = req.params.identifier

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      // Support both numeric IDs and slugs
      const isNumericId = /^\d+$/.test(identifier)
      const queryField = isNumericId ? 'id' : 'slug'
      const queryValue = isNumericId ? parseInt(identifier) : identifier

      // Query with all available fields (overview_ar and overview_en don't exist in schema)
      const result = await query(
        `SELECT 
          id, slug, external_id, external_source,
          name, name_ar, name_en, original_name,
          overview,
          original_language, poster_path, backdrop_path,
          first_air_date, last_air_date, vote_average, vote_count, popularity,
          number_of_seasons, number_of_episodes,
          genres, primary_genre, status, type
        FROM tv_series
        WHERE ${queryField} = $1`,
        [queryValue]
      )

      if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
      res.json(result.rows[0])
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/tv/:identifier/seasons
  app.get('/api/db/tv/:identifier/seasons', async (req, res) => {
    const identifier = req.params.identifier

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      // Support both numeric IDs and slugs
      const isNumericId = /^\d+$/.test(identifier)
      const queryField = isNumericId ? 'tv.id' : 'tv.slug'
      const queryValue = isNumericId ? parseInt(identifier) : identifier

      // Query seasons with all available fields (name_ar, name_en, overview_ar, overview_en don't exist)
      const result = await query(
        `SELECT 
          s.id, s.season_number,
          s.name,
          s.overview,
          s.episode_count, s.air_date, s.poster_path
        FROM seasons s
        JOIN tv_series tv ON s.series_id = tv.id
        WHERE ${queryField} = $1
        ORDER BY s.season_number ASC`,
        [queryValue]
      )

      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/tv/:identifier/seasons/:seasonNumber/episodes
  app.get('/api/db/tv/:identifier/seasons/:seasonNumber/episodes', async (req, res) => {
    const identifier = req.params.identifier
    const seasonNumber = parseInt(req.params.seasonNumber)

    if (isNaN(seasonNumber)) {
      return res.status(400).json({ error: 'Invalid season number' })
    }

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      // Support both numeric IDs and slugs
      const isNumericId = /^\d+$/.test(identifier)
      const queryField = isNumericId ? 'tv.id' : 'tv.slug'
      const queryValue = isNumericId ? parseInt(identifier) : identifier

      // Query episodes with all available fields (name_ar, name_en, overview_ar, overview_en don't exist)
      const result = await query(
        `SELECT 
          e.id, e.episode_number,
          e.name,
          e.overview,
          e.runtime, e.air_date, e.still_path, e.vote_average
        FROM episodes e
        JOIN seasons s ON e.season_id = s.id
        JOIN tv_series tv ON s.series_id = tv.id
        WHERE ${queryField} = $1 AND s.season_number = $2
        ORDER BY e.episode_number ASC`,
        [queryValue, seasonNumber]
      )

      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/tv/seasons/:id/episodes (Legacy endpoint - kept for backward compatibility)
  app.get('/api/db/tv/seasons/:id/episodes', async (req, res) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query('SELECT * FROM episodes WHERE season_id = $1 ORDER BY episode_number ASC', [id])
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // POST /api/db/tv/search
  app.post('/api/db/tv/search', async (req, res) => {
    const {
      query: q,
      genre,           // Genre filter (Arabic value)
      category,        // Alias for genre (for Islamic content)
      min_rating,
      year,
      sortBy,          // Nullable sort parameter (NULL = no explicit sorting)
      page = 1,
      limit = 20
    } = req.body || {}

    // Validate parameters
    if (year !== undefined && year !== null) {
      const yearNum = parseInt(year)
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
        return res.status(400).json({
          error: 'Invalid year parameter',
          message: 'Year must be between 1900 and 2100'
        })
      }
    }

    if (min_rating !== undefined && min_rating !== null) {
      const ratingNum = parseFloat(min_rating)
      if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 10) {
        return res.status(400).json({
          error: 'Invalid rating parameter',
          message: 'Rating must be between 0 and 10'
        })
      }
    }

    if (sortBy !== undefined && sortBy !== null) {
      const allowedSorts = ['popularity', 'vote_average', 'first_air_date', 'name']
      if (!allowedSorts.includes(sortBy)) {
        return res.status(400).json({
          error: 'Invalid sortBy parameter',
          message: `sortBy must be one of: ${allowedSorts.join(', ')}, or null for no sorting`
        })
      }
    }

    const safeLimit = Math.min(parseInt(limit) || 20, 100)
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit

    // Build WHERE clause with parameterized queries
    const params = []
    const conditions = []

    if (q) {
      params.push(`%${q}%`)
      conditions.push(`(name ILIKE $${params.length} OR overview ILIKE $${params.length})`)
    }

    // Prefer genre over category when both provided
    const genreValue = genre || category
    if (genreValue) {
      params.push(genreValue)
      // Search in both primary_genre AND genres JSONB array
      conditions.push(`(primary_genre = $${params.length} OR genres::text ILIKE '%' || $${params.length} || '%')`)
    }

    if (year) {
      params.push(parseInt(year))
      conditions.push(`EXTRACT(YEAR FROM first_air_date) = $${params.length}`)
    }

    if (min_rating) {
      params.push(parseFloat(min_rating))
      conditions.push(`vote_average >= $${params.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Build ORDER BY clause only when sortBy is not NULL
    let orderByClause = ''
    if (sortBy) {
      const sortMap = {
        'popularity': 'popularity DESC',
        'vote_average': 'vote_average DESC',
        'first_air_date': 'first_air_date DESC',
        'name': 'name ASC'
      }
      orderByClause = `ORDER BY ${sortMap[sortBy]}`
    }

    params.push(safeLimit)
    const limitParam = params.length
    params.push(offset)
    const offsetParam = params.length

    const sql = `
      SELECT id, slug, name, overview, poster_path, backdrop_path,
             first_air_date, vote_average, vote_count, popularity, 
             primary_genre, genres
      FROM tv_series
      ${whereClause}
      ${orderByClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) {
      console.error('[TV Search] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // GET /api/db/search?q=...&type=all|movies|tv
  app.get('/api/db/search', cacheControl(60), async (req, res) => {
    const { q, type = 'all', limit = 20, page = 1 } = req.query
    if (!q) return res.status(400).json({ error: 'Query required' })
    const safeLimit = Math.min(parseInt(limit) || 20, 50)
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const results = []
      if (type === 'all' || type === 'movies') {
        const r = await query(
          'SELECT id, slug, title AS name, overview, poster_path, backdrop_path, ' +
          "release_date AS air_date, vote_average, popularity, genres, 'movie' AS media_type " +
          'FROM movies WHERE title ILIKE $1 OR overview ILIKE $1 ' +
          'ORDER BY popularity DESC LIMIT $2 OFFSET $3',
          ['%' + q + '%', safeLimit, offset]
        )
        results.push(...r.rows)
      }
      if (type === 'all' || type === 'tv') {
        const r = await query(
          'SELECT id, slug, name, overview, poster_path, backdrop_path, ' +
          "first_air_date AS air_date, vote_average, popularity, genres, 'tv' AS media_type " +
          'FROM tv_series WHERE name ILIKE $1 OR overview ILIKE $1 ' +
          'ORDER BY popularity DESC LIMIT $2 OFFSET $3',
          ['%' + q + '%', safeLimit, offset]
        )
        results.push(...r.rows)
      }
      results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      res.json(results.slice(0, safeLimit))
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/health
  app.get('/api/db/health', async (_req, res) => {
    try {
      await query('SELECT 1')
      const movies = await query('SELECT COUNT(*) FROM movies')
      const tv = await query('SELECT COUNT(*) FROM tv_series')
      const software = await query('SELECT COUNT(*) FROM software')
      const actors = await query('SELECT COUNT(*) FROM actors')
      res.json({
        status: 'ok',
        movies: parseInt(movies.rows[0].count),
        tv_series: parseInt(tv.rows[0].count),
        software: parseInt(software.rows[0].count),
        actors: parseInt(actors.rows[0].count),
      })
    } catch (e) {
      console.error('[Health] Error:', e.message, e.stack)
      res.status(503).json({ status: 'error', error: e.message })
    }
  })

  // ==========================================
  // UTILITY ENDPOINTS
  // ==========================================

  // POST /api/db/save-tmdb - Save TMDB content to database with proper slug
  app.post('/api/db/save-tmdb', async (req, res) => {
    const { type, tmdbId, data } = req.body;

    if (!type || !tmdbId || !data) {
      return res.status(400).json({ error: 'Missing required fields: type, tmdbId, data' });
    }

    const validTypes = ['movie', 'tv'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "movie" or "tv"' });
    }

    try {
      if (!(await checkDB())) {
        return res.status(503).json({ error: 'DB unavailable' });
      }

      const title = data.title || data.name || '';
      const releaseDate = data.release_date || data.first_air_date;
      const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

      // Generate slug
      let slug = title
        .toLowerCase()
        .trim()
        .replace(/[\s\W|_]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!slug) slug = 'content-' + tmdbId;

      // Add year for uniqueness
      let baseSlug = year && Number.isFinite(year) ? `${slug}-${year}` : slug;
      let finalSlug = baseSlug;
      let isUnique = false;
      let counter = 1;

      const table = type === 'movie' ? 'movies' : 'tv_series';

      while (!isUnique) {
        const existing = await query(`SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, [finalSlug, tmdbId]);
        if (existing.rows.length === 0) {
          isUnique = true;
        } else {
          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      // Upsert the content
      if (type === 'movie') {
        await query(`
          INSERT INTO movies (id, slug, title, overview, poster_path, backdrop_path, release_date, vote_average, vote_count, popularity, genres)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            slug = EXCLUDED.slug,
            title = EXCLUDED.title,
            overview = EXCLUDED.overview,
            poster_path = EXCLUDED.poster_path,
            backdrop_path = EXCLUDED.backdrop_path,
            release_date = EXCLUDED.release_date,
            vote_average = EXCLUDED.vote_average,
            vote_count = EXCLUDED.vote_count,
            popularity = EXCLUDED.popularity,
            genres = EXCLUDED.genres
        `, [
          tmdbId, finalSlug, title, data.overview || '',
          data.poster_path || null, data.backdrop_path || null,
          releaseDate || null, data.vote_average || 0, data.vote_count || 0,
          data.popularity || 0, data.genres ? JSON.stringify(data.genres) : null
        ]);
      } else {
        await query(`
          INSERT INTO tv_series (id, slug, name, overview, poster_path, backdrop_path, first_air_date, vote_average, vote_count, popularity, genres)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            slug = EXCLUDED.slug,
            name = EXCLUDED.name,
            overview = EXCLUDED.overview,
            poster_path = EXCLUDED.poster_path,
            backdrop_path = EXCLUDED.backdrop_path,
            first_air_date = EXCLUDED.first_air_date,
            vote_average = EXCLUDED.vote_average,
            vote_count = EXCLUDED.vote_count,
            popularity = EXCLUDED.popularity,
            genres = EXCLUDED.genres
        `, [
          tmdbId, finalSlug, title, data.overview || '',
          data.poster_path || null, data.backdrop_path || null,
          releaseDate || null, data.vote_average || 0, data.vote_count || 0,
          data.popularity || 0, data.genres ? JSON.stringify(data.genres) : null
        ]);
      }

      console.log(`[Save TMDB] Saved ${type} ${tmdbId} with slug: ${finalSlug}`);
      res.json({ success: true, slug: finalSlug, id: tmdbId });
    } catch (e) {
      console.error('[Save TMDB] Error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // ==========================================
  // SOFTWARE ENDPOINTS
  // ==========================================

  // GET /api/db/software/trending
  app.get('/api/db/software/trending', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'software-trending-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, title, description, poster_url, backdrop_url, ' +
        'release_date, rating, rating_count, popularity, genres, license_type ' +
        'FROM software ORDER BY popularity DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/software/:identifier
  app.get('/api/db/software/:identifier', async (req, res) => {
    const identifier = req.params.identifier
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      let result;
      if (/^\d+$/.test(identifier)) {
        result = await query('SELECT * FROM software WHERE id = $1', [parseInt(identifier)])
      } else {
        result = await query('SELECT * FROM software WHERE slug = $1', [identifier])
      }
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
      res.json(result.rows[0])
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // POST /api/db/software/search
  app.post('/api/db/software/search', async (req, res) => {
    const {
      query: q,
      genre,           // Genre filter (will search in genres JSONB)
      category,        // Alias for genre
      license_type,
      min_rating,
      sortBy,          // Nullable sort parameter (NULL = no explicit sorting)
      page = 1,
      limit = 20
    } = req.body || {}

    // Validate parameters
    if (min_rating !== undefined && min_rating !== null) {
      const ratingNum = parseFloat(min_rating)
      if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 10) {
        return res.status(400).json({
          error: 'Invalid rating parameter',
          message: 'Rating must be between 0 and 10'
        })
      }
    }

    if (sortBy !== undefined && sortBy !== null) {
      const allowedSorts = ['popularity', 'rating', 'release_date', 'title']
      if (!allowedSorts.includes(sortBy)) {
        return res.status(400).json({
          error: 'Invalid sortBy parameter',
          message: `sortBy must be one of: ${allowedSorts.join(', ')}, or null for no sorting`
        })
      }
    }

    const safeLimit = Math.min(parseInt(limit) || 20, 100)
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit

    // Build WHERE clause with parameterized queries
    const params = []
    const conditions = []

    if (q) {
      params.push(`%${q}%`)
      conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`)
    }

    // Prefer genre over category when both provided
    // Note: software table doesn't have primary_genre, uses genres JSONB
    const genreValue = genre || category
    if (genreValue) {
      params.push(`%${genreValue}%`)
      conditions.push(`genres::text ILIKE $${params.length}`)
    }

    if (license_type) {
      params.push(license_type)
      conditions.push(`license_type = $${params.length}`)
    }

    if (min_rating) {
      params.push(parseFloat(min_rating))
      conditions.push(`rating >= $${params.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Build ORDER BY clause only when sortBy is not NULL
    let orderByClause = ''
    if (sortBy) {
      const sortMap = {
        'popularity': 'popularity DESC',
        'rating': 'rating DESC',
        'release_date': 'release_date DESC',
        'title': 'title ASC'
      }
      orderByClause = `ORDER BY ${sortMap[sortBy]}`
    }

    params.push(safeLimit)
    const limitParam = params.length
    params.push(offset)
    const offsetParam = params.length

    const sql = `
      SELECT id, slug, title, description, poster_url, backdrop_url,
             release_date, rating, rating_count, popularity, 
             genres, license_type
      FROM software
      ${whereClause}
      ${orderByClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) {
      console.error('[Software Search] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // ==========================================
  // ACTORS ENDPOINTS
  // ==========================================

  // GET /api/db/actors/trending
  app.get('/api/db/actors/trending', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'actors-trending-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, tmdb_id, name, profile_path, popularity, known_for_department ' +
        'FROM actors ORDER BY popularity DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/actors/:identifier
  app.get('/api/db/actors/:identifier', async (req, res) => {
    const identifier = req.params.identifier
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      let result;
      if (/^\d+$/.test(identifier)) {
        result = await query('SELECT * FROM actors WHERE id = $1', [parseInt(identifier)])
      } else {
        result = await query('SELECT * FROM actors WHERE slug = $1', [identifier])
      }
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
      res.json(result.rows[0])
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // POST /api/db/actors/search
  app.post('/api/db/actors/search', async (req, res) => {
    const { query: q, page = 1, limit = 20 } = req.body || {}
    const safeLimit = Math.min(parseInt(limit) || 20, 100)
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit

    const params = []
    const conditions = []

    if (q) {
      params.push('%' + q + '%')
      conditions.push('(name ILIKE $' + params.length + ' OR biography ILIKE $' + params.length + ')')
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    params.push(safeLimit, offset)

    const sql = 'SELECT id, slug, tmdb_id, name, profile_path, popularity, known_for_department ' +
      'FROM actors ' + where + ' ORDER BY popularity DESC LIMIT $' + (params.length - 1) + ' OFFSET $' + params.length

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // ==========================================
  // SLUG RESOLUTION ENDPOINTS
  // ==========================================

  // POST /api/db/query - Generic query execution (ADMIN ONLY ideally, but for now open)
  app.post('/api/db/query', async (req, res) => {
    const { query: sql, params = [] } = req.body || {}
    if (!sql) return res.status(400).json({ error: 'Query required' })

    // Basic safety: only allow SELECT/INSERT/UPDATE/DELETE
    const normalized = sql.trim().toLowerCase()
    if (!normalized.startsWith('select') && !normalized.startsWith('insert') &&
      !normalized.startsWith('update') && !normalized.startsWith('delete')) {
      return res.status(403).json({ error: 'Forbidden query type' })
    }

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json({ rows: result.rows, rowCount: result.rowCount })
    } catch (e) {
      console.error('[DB Query] Error:', e.message, 'SQL:', sql)
      res.status(500).json({ error: e.message })
    }
  })

  // POST /api/db/slug/resolve - Resolve single slug to content ID
  app.post('/api/db/slug/resolve', async (req, res) => {
    const { slug, table } = req.body || {}

    if (!slug || !table) {
      return res.status(400).json({ error: 'slug and table are required' })
    }

    // Validate table name to prevent SQL injection
    const validTables = ['movies', 'tv_series', 'actors', 'software', 'cinematics']
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' })
    }

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      // Use parameterized query for security
      const result = await query(
        `SELECT id FROM ${table} WHERE slug = $1 LIMIT 1`,
        [slug]
      )

      if (!result.rows.length) {
        return res.status(404).json({ error: 'Slug not found' })
      }

      res.json({ id: result.rows[0].id })
    } catch (e) {
      console.error('[Slug Resolve] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // POST /api/db/slug/resolve-batch - Resolve multiple slugs to content IDs
  app.post('/api/db/slug/resolve-batch', async (req, res) => {
    const { slugs, table } = req.body || {}

    if (!slugs || !Array.isArray(slugs) || !table) {
      return res.status(400).json({ error: 'slugs (array) and table are required' })
    }

    // Validate table name to prevent SQL injection
    const validTables = ['movies', 'tv_series', 'actors', 'software', 'cinematics']
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' })
    }

    if (slugs.length === 0) {
      return res.json({ results: [] })
    }

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      // Use parameterized query with ANY for batch resolution
      const result = await query(
        `SELECT id, slug FROM ${table} WHERE slug = ANY($1)`,
        [slugs]
      )

      res.json({ results: result.rows })
    } catch (e) {
      console.error('[Slug Resolve Batch] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // POST /api/db/slug/get-by-id - Get slug from content ID (for legacy URL redirects)
  app.post('/api/db/slug/get-by-id', async (req, res) => {
    const { id, table } = req.body || {}

    if (!id || !table) {
      return res.status(400).json({ error: 'id and table are required' })
    }

    // Validate table name to prevent SQL injection
    const validTables = ['movies', 'tv_series', 'actors', 'software', 'cinematics']
    if (!validTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' })
    }

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      // Use parameterized query for security
      const result = await query(
        `SELECT slug FROM ${table} WHERE id = $1 LIMIT 1`,
        [parseInt(id)]
      )

      if (!result.rows.length || !result.rows[0].slug) {
        return res.status(404).json({ error: 'Slug not found for this ID' })
      }

      res.json({ slug: result.rows[0].slug })
    } catch (e) {
      console.error('[Get Slug by ID] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // POST /api/db/slug/generate - Generate slugs for a table
  app.post('/api/db/slug/generate', async (req, res) => {
    const { table, limit = 100 } = req.body || {};
    console.log(`[Slug Generate] Received request for table: ${table}, limit: ${limit}`);
    const validTables = ['movies', 'tv_series', 'software', 'actors'];
    if (!table || !validTables.includes(table)) {
      console.error(`[Slug Generate] Invalid table name: ${table}`);
      return res.status(400).json({ error: 'Invalid or missing table name' });
    }

    const titleColumn = (table === 'tv_series' || table === 'actors') ? 'name' : 'title';

    try {
      if (!(await checkDB())) {
        console.error('[Slug Generate] DB unavailable');
        return res.status(503).json({ error: 'DB unavailable' });
      }

      console.log(`[Slug Generate] Fetching items from ${table} without slugs...`);
      const items = await query(`
        SELECT id, ${titleColumn} as title
        FROM ${table}
        WHERE (slug IS NULL OR slug = '' OR slug = '-1')
        LIMIT $1
      `, [limit]);
      console.log(`[Slug Generate] Found ${items.rows.length} items to update.`);

      if (items.rows.length === 0) {
        return res.json({ count: 0, message: 'No items to update.' });
      }

      let updatedCount = 0;
      for (const item of items.rows) {
        const title = item.title || item.name || '';
        if (!title) continue;

        // Get year from release date
        const releaseDate = item.release_date || item.first_air_date;
        const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

        // Improved slugify for Arabic and other languages
        let slug = title
          .toLowerCase()
          .trim()
          .replace(/[\s\W|_]+/g, '-') // Replace spaces and non-word chars with -
          .replace(/^-+|-+$/g, '');   // Trim - from ends

        if (!slug) slug = 'content-' + item.id;

        // Add year to slug if available for better uniqueness and SEO
        let baseSlug = year && Number.isFinite(year) ? `${slug}-${year}` : slug;
        let finalSlug = baseSlug;
        let isUnique = false;
        let counter = 1;

        while (!isUnique) {
          const existing = await query(`SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, [finalSlug, item.id]);
          if (existing.rows.length === 0) {
            isUnique = true;
          } else {
            finalSlug = `${baseSlug}-${counter}`;
            counter++;
          }
        }

        await query(`UPDATE ${table} SET slug = $1 WHERE id = $2`, [finalSlug, item.id]);
        updatedCount++;
      }

      console.log(`[Slug Generate] Successfully generated ${updatedCount} slugs for ${table}.`);
      res.json({ count: updatedCount });
    } catch (e) {
      console.error(`[Slug Generate - ${table}] Error:`, e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/db/slug/migrate-all - Migrate slugs for ALL tables at once
  app.post('/api/db/slug/migrate-all', async (req, res) => {
    const { limit = 500 } = req.body || {};
    console.log(`[Slug Migrate All] Starting migration for all tables, limit per table: ${limit}`);

    const validTables = ['movies', 'tv_series', 'software', 'actors'];
    const results = {};
    const errors = {};

    for (const table of validTables) {
      try {
        const titleColumn = (table === 'tv_series' || table === 'actors') ? 'name' : 'title';

        if (!(await checkDB())) {
          errors[table] = 'DB unavailable';
          continue;
        }

        const items = await query(`
          SELECT id, ${titleColumn} as title, release_date, first_air_date
          FROM ${table}
          WHERE (slug IS NULL OR slug = '' OR slug = '-1')
          LIMIT $1
        `, [limit]);

        let updatedCount = 0;
        for (const item of items.rows) {
          const title = item.title || item.name || '';
          if (!title) continue;

          const releaseDate = item.release_date || item.first_air_date;
          const year = releaseDate ? new Date(releaseDate).getFullYear() : null;

          let slug = title
            .toLowerCase()
            .trim()
            .replace(/[\s\W|_]+/g, '-')
            .replace(/^-+|-+$/g, '');

          if (!slug) slug = 'content-' + item.id;

          let baseSlug = year && Number.isFinite(year) ? `${slug}-${year}` : slug;
          let finalSlug = baseSlug;
          let isUnique = false;
          let counter = 1;

          while (!isUnique) {
            const existing = await query(`SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, [finalSlug, item.id]);
            if (existing.rows.length === 0) {
              isUnique = true;
            } else {
              finalSlug = `${baseSlug}-${counter}`;
              counter++;
            }
          }

          await query(`UPDATE ${table} SET slug = $1 WHERE id = $2`, [finalSlug, item.id]);
          updatedCount++;
        }

        results[table] = { updated: updatedCount, total: items.rows.length };
        console.log(`[Slug Migrate All] ${table}: ${updatedCount}/${items.rows.length} updated`);
      } catch (e) {
        console.error(`[Slug Migrate All - ${table}] Error:`, e.message);
        errors[table] = e.message;
      }
    }

    res.json({ results, errors, timestamp: new Date().toISOString() });
  });

  // POST /api/db/slug/fix-all - Fix ALL slugs including "content" slugs
  app.post('/api/db/slug/fix-all', async (req, res) => {
    const { limit = 500 } = req.body || {};
    console.log(`[Slug Fix All] Starting to fix ALL slugs for all tables, limit per table: ${limit}`);

    const validTables = ['movies', 'tv_series', 'software', 'actors'];
    const results = {};
    const errors = {};

    for (const table of validTables) {
      try {
        const titleColumn = (table === 'tv_series' || table === 'actors') ? 'name' : 'title';

        // Determine date column based on table
        let dateColumn = null;
        if (table === 'movies') {
          dateColumn = 'release_date';
        } else if (table === 'tv_series') {
          dateColumn = 'first_air_date';
        }
        // software, actors don't have date columns we use for slugs

        if (!(await checkDB())) {
          errors[table] = 'DB unavailable';
          continue;
        }

        // Build SELECT query based on available columns
        let selectQuery = `SELECT id, ${titleColumn} as title, slug`;
        if (dateColumn) {
          selectQuery += `, ${dateColumn}`;
        }
        selectQuery += ` FROM ${table} WHERE slug IS NULL OR slug = '' OR slug = '-1' OR slug LIKE 'content%' LIMIT $1`;

        const items = await query(selectQuery, [limit]);

        let updatedCount = 0;
        for (const item of items.rows) {
          const title = item.title || item.name || '';
          if (!title) continue;

          // Get year from date column if available
          let year = null;
          if (dateColumn) {
            const dateValue = item[dateColumn];
            year = dateValue ? new Date(dateValue).getFullYear() : null;
          }

          let slug = title
            .toLowerCase()
            .trim()
            .replace(/[\s\W|_]+/g, '-')
            .replace(/^-+|-+$/g, '');

          if (!slug) slug = 'content-' + item.id;

          let baseSlug = year && Number.isFinite(year) ? `${slug}-${year}` : slug;
          let finalSlug = baseSlug;
          let isUnique = false;
          let counter = 1;

          while (!isUnique) {
            const existing = await query(`SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, [finalSlug, item.id]);
            if (existing.rows.length === 0) {
              isUnique = true;
            } else {
              finalSlug = `${baseSlug}-${counter}`;
              counter++;
            }
          }

          await query(`UPDATE ${table} SET slug = $1 WHERE id = $2`, [finalSlug, item.id]);
          updatedCount++;
        }

        results[table] = { updated: updatedCount, total: items.rows.length };
        console.log(`[Slug Fix All] ${table}: ${updatedCount}/${items.rows.length} fixed`);
      } catch (e) {
        console.error(`[Slug Fix All - ${table}] Error:`, e.message);
        errors[table] = e.message;
      }
    }

    res.json({ results, errors, timestamp: new Date().toISOString() });
  });

  // GET /api/db/home - Home page aggregated data
  app.get('/api/db/home', cacheControl(300), async (req, res) => {
    const cacheKey = 'home-page-data'
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      const today = new Date().toISOString().split('T')[0]

      // Fetch all home page data in parallel
      const [trending, arabicSeries, kidsMovies, bollywoodMovies] = await Promise.all([
        // Trending movies - filter for valid slugs only
        query(`
          SELECT id, slug, title, poster_path, backdrop_path, vote_average, 
                 overview, release_date, popularity, 'movie' as media_type
          FROM movies 
          WHERE release_date <= $1 
            AND slug IS NOT NULL 
            AND slug != '' 
            AND slug != 'content' 
            AND slug != '-1'
          ORDER BY popularity DESC 
          LIMIT 20
        `, [today]),

        // Arabic series - filter for valid slugs only
        query(`
          SELECT id, slug, name as title, poster_path, backdrop_path, vote_average,
                 overview, first_air_date, popularity, 'tv' as media_type
          FROM tv_series
          WHERE original_language = 'ar'
            AND first_air_date <= $1
            AND slug IS NOT NULL 
            AND slug != '' 
            AND slug != 'content'
          ORDER BY popularity DESC
          LIMIT 50
        `, [today]),

        // Kids movies - filter by genre AND valid slugs
        query(`
          SELECT id, slug, title, poster_path, backdrop_path, vote_average,
                 overview, release_date, popularity, 'movie' as media_type
          FROM movies
          WHERE release_date <= $1
            AND (genres::text ILIKE '%10751%' 
                 OR genres::text ILIKE '%16%' 
                 OR genres::text ILIKE '%Family%' 
                 OR genres::text ILIKE '%Animation%')
            AND slug IS NOT NULL 
            AND slug != '' 
            AND slug != 'content'
          ORDER BY popularity DESC
          LIMIT 50
        `, [today]),

        // Bollywood movies - filter for valid slugs only
        query(`
          SELECT id, slug, title, poster_path, backdrop_path, vote_average,
                 overview, release_date, popularity, 'movie' as media_type
          FROM movies
          WHERE original_language = 'hi'
            AND release_date <= $1
            AND slug IS NOT NULL 
            AND slug != '' 
            AND slug != 'content'
          ORDER BY popularity DESC
          LIMIT 50
        `, [today])
      ])

      const result = {
        trending: trending.rows,
        arabicSeries: arabicSeries.rows,
        kids: kidsMovies.rows,
        bollywood: bollywoodMovies.rows
      }

      setCache(cacheKey, result, 300000) // 5 minutes
      res.json(result)
    } catch (e) {
      console.error('[Home Data] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // ==========================================
  // CATEGORY-SPECIFIC ENDPOINTS
  // ==========================================

  // GET /api/db/tv/korean - Korean series with slugs
  app.get('/api/db/tv/korean', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'tv-korean-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, name, overview, poster_path, backdrop_path, ' +
        "first_air_date, vote_average, vote_count, popularity, genres, 'tv' as media_type " +
        "FROM tv_series WHERE original_language = 'ko' AND slug IS NOT NULL " +
        'ORDER BY first_air_date DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/tv/turkish - Turkish series with slugs
  app.get('/api/db/tv/turkish', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'tv-turkish-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, name, overview, poster_path, backdrop_path, ' +
        "first_air_date, vote_average, vote_count, popularity, genres, 'tv' as media_type " +
        "FROM tv_series WHERE original_language = 'tr' AND slug IS NOT NULL " +
        'ORDER BY first_air_date DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/tv/chinese - Chinese series with slugs
  app.get('/api/db/tv/chinese', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'tv-chinese-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, name, overview, poster_path, backdrop_path, ' +
        "first_air_date, vote_average, vote_count, popularity, genres, 'tv' as media_type " +
        "FROM tv_series WHERE original_language = 'zh' AND slug IS NOT NULL " +
        'ORDER BY first_air_date DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/movies/documentaries - Documentary movies with slugs
  app.get('/api/db/movies/documentaries', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'movies-documentaries-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, title, overview, poster_path, backdrop_path, ' +
        "release_date, vote_average, vote_count, popularity, genres, 'movie' as media_type " +
        "FROM movies WHERE genres::text ILIKE '%99%' AND slug IS NOT NULL " +
        'ORDER BY release_date DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/tv/anime - Anime series with slugs
  app.get('/api/db/tv/anime', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'tv-anime-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, name, overview, poster_path, backdrop_path, ' +
        "first_air_date, vote_average, vote_count, popularity, genres, 'tv' as media_type " +
        "FROM tv_series WHERE (genres::text ILIKE '%16%' OR genres::text ILIKE '%Animation%') " +
        "AND original_language = 'ja' AND slug IS NOT NULL " +
        'ORDER BY first_air_date DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/movies/classics - Classic movies with slugs
  app.get('/api/db/movies/classics', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'movies-classics-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, title, overview, poster_path, backdrop_path, ' +
        "release_date, vote_average, vote_count, popularity, genres, 'movie' as media_type " +
        "FROM movies WHERE release_date <= '1980-01-01' AND slug IS NOT NULL " +
        'ORDER BY popularity DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // POST /api/db/error-reports - Report 404 errors
  app.post('/api/db/error-reports', async (req, res) => {
    try {
      const { url } = req.body

      if (!url) {
        return res.status(400).json({ error: 'URL is required' })
      }

      // Check if error report already exists
      const existing = await query(
        'SELECT url, count FROM error_reports WHERE url = $1',
        [url]
      )

      if (existing.rows.length > 0) {
        // Update count
        await query(
          'UPDATE error_reports SET count = count + 1, updated_at = NOW() WHERE url = $1',
          [url]
        )
      } else {
        // Insert new error report
        await query(
          'INSERT INTO error_reports (url, count, created_at, updated_at) VALUES ($1, 1, NOW(), NOW())',
          [url]
        )
      }

      res.json({ success: true })
    } catch (e) {
      console.error('[Error Reports] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // GET /api/db/movies/:id/similar - Get similar movies by ID
  app.get('/api/db/movies/:id/similar', cacheControl(300), async (req, res) => {
    const id = parseInt(req.params.id)
    const limit = Math.min(parseInt(req.query.limit) || 10, 20)

    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      // First, get the movie's genres
      const movieResult = await query(
        'SELECT genres FROM movies WHERE id = $1',
        [id]
      )

      if (!movieResult.rows.length) {
        return res.status(404).json({ error: 'Movie not found' })
      }

      const genres = movieResult.rows[0].genres

      // If movie has genres, find similar movies by genres
      if (genres && genres.length > 0) {
        const genreIds = genres.map((g) => g.id).join(',')

        // Find movies with overlapping genres
        const result = await query(
          'SELECT id, slug, title, overview, poster_path, backdrop_path, ' +
          "release_date, vote_average, vote_count, popularity, genres, 'movie' as media_type " +
          'FROM movies ' +
          'WHERE id != $1 AND slug IS NOT NULL ' +
          'AND genres::text SIMILAR TO $2 ' +
          'ORDER BY popularity DESC LIMIT $3',
          [id, `%(${genreIds.split(',').join('|')})%`, limit]
        )

        if (result.rows.length > 0) {
          return res.json(result.rows)
        }
      }

      // Fallback: return trending movies
      const fallback = await query(
        'SELECT id, slug, title, overview, poster_path, backdrop_path, ' +
        "release_date, vote_average, vote_count, popularity, genres, 'movie' as media_type " +
        'FROM movies WHERE id != $1 AND slug IS NOT NULL ' +
        'ORDER BY popularity DESC LIMIT $2',
        [id, limit]
      )

      res.json(fallback.rows)
    } catch (e) {
      console.error('[Similar Movies] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // GET /api/db/tv/:id/similar - Get similar TV series by ID
  app.get('/api/db/tv/:id/similar', cacheControl(300), async (req, res) => {
    const id = parseInt(req.params.id)
    const limit = Math.min(parseInt(req.query.limit) || 10, 20)

    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      // First, get the series' genres
      const seriesResult = await query(
        'SELECT genres FROM tv_series WHERE id = $1',
        [id]
      )

      if (!seriesResult.rows.length) {
        return res.status(404).json({ error: 'TV series not found' })
      }

      const genres = seriesResult.rows[0].genres

      // If series has genres, find similar series by genres
      if (genres && genres.length > 0) {
        const genreIds = genres.map((g) => g.id).join(',')

        // Find series with overlapping genres
        const result = await query(
          'SELECT id, slug, name, overview, poster_path, backdrop_path, ' +
          "first_air_date, vote_average, vote_count, popularity, genres, 'tv' as media_type " +
          'FROM tv_series ' +
          'WHERE id != $1 AND slug IS NOT NULL ' +
          'AND genres::text SIMILAR TO $2 ' +
          'ORDER BY popularity DESC LIMIT $3',
          [id, `%(${genreIds.split(',').join('|')})%`, limit]
        )

        if (result.rows.length > 0) {
          return res.json(result.rows)
        }
      }

      // Fallback: return trending series
      const fallback = await query(
        'SELECT id, slug, name, overview, poster_path, backdrop_path, ' +
        "first_air_date, vote_average, vote_count, popularity, genres, 'tv' as media_type " +
        'FROM tv_series WHERE id != $1 AND slug IS NOT NULL ' +
        'ORDER BY popularity DESC LIMIT $2',
        [id, limit]
      )

      res.json(fallback.rows)
    } catch (e) {
      console.error('[Similar TV Series] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // GET /api/db/movies/by-genres - Get movies by genre IDs
  app.get('/api/db/movies/by-genres', cacheControl(300), async (req, res) => {
    const { genres, limit = 10, exclude } = req.query

    if (!genres) {
      return res.status(400).json({ error: 'genres parameter is required' })
    }

    const safeLimit = Math.min(parseInt(limit) || 10, 50)
    const excludeId = exclude ? parseInt(exclude) : null

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      const genreIds = genres.split(',').map(g => g.trim())
      const genrePattern = `%(${genreIds.join('|')})%`

      let sql = 'SELECT id, slug, title, overview, poster_path, backdrop_path, ' +
        "release_date, vote_average, vote_count, popularity, genres, 'movie' as media_type " +
        'FROM movies WHERE slug IS NOT NULL AND genres::text SIMILAR TO $1'

      const params = [genrePattern]

      if (excludeId) {
        sql += ' AND id != $2'
        params.push(excludeId)
        sql += ' ORDER BY popularity DESC LIMIT $3'
        params.push(safeLimit)
      } else {
        sql += ' ORDER BY popularity DESC LIMIT $2'
        params.push(safeLimit)
      }

      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) {
      console.error('[Movies by Genres] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // GET /api/db/tv/by-genres - Get TV series by genre IDs
  app.get('/api/db/tv/by-genres', cacheControl(300), async (req, res) => {
    const { genres, limit = 10, exclude } = req.query

    if (!genres) {
      return res.status(400).json({ error: 'genres parameter is required' })
    }

    const safeLimit = Math.min(parseInt(limit) || 10, 50)
    const excludeId = exclude ? parseInt(exclude) : null

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })

      const genreIds = genres.split(',').map(g => g.trim())
      const genrePattern = `%(${genreIds.join('|')})%`

      let sql = 'SELECT id, slug, name, overview, poster_path, backdrop_path, ' +
        "first_air_date, vote_average, vote_count, popularity, genres, 'tv' as media_type " +
        'FROM tv_series WHERE slug IS NOT NULL AND genres::text SIMILAR TO $1'

      const params = [genrePattern]

      if (excludeId) {
        sql += ' AND id != $2'
        params.push(excludeId)
        sql += ' ORDER BY popularity DESC LIMIT $3'
        params.push(safeLimit)
      } else {
        sql += ' ORDER BY popularity DESC LIMIT $2'
        params.push(safeLimit)
      }

      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) {
      console.error('[TV by Genres] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // ==========================================
  // DAILYMOTION ENDPOINTS
  // ==========================================

  // GET /api/db/dailymotion/trending
  app.get('/api/db/dailymotion/trending', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'dailymotion-trending-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, title, description, thumbnail_url, embed_url, ' +
        'duration, view_count, category, tags, popularity, created_at ' +
        'FROM dailymotion_videos ORDER BY popularity DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/dailymotion/:identifier
  app.get('/api/db/dailymotion/:identifier', async (req, res) => {
    const identifier = req.params.identifier
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      let result;
      // Check if identifier is a slug or ID
      if (identifier.includes('-')) {
        result = await query('SELECT * FROM dailymotion_videos WHERE slug = $1', [identifier])
      } else {
        result = await query('SELECT * FROM dailymotion_videos WHERE id = $1', [identifier])
      }
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
      res.json(result.rows[0])
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // POST /api/db/dailymotion/search
  app.post('/api/db/dailymotion/search', async (req, res) => {
    const { query: q, category, page = 1, limit = 20 } = req.body || {}
    const safeLimit = Math.min(parseInt(limit) || 20, 100)
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit

    const params = []
    const conditions = []

    if (q) {
      params.push('%' + q + '%')
      conditions.push('(title ILIKE $' + params.length + ' OR description ILIKE $' + params.length + ')')
    }

    if (category) {
      params.push('%' + category + '%')
      conditions.push('category ILIKE $' + params.length)
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    params.push(safeLimit, offset)

    const sql = 'SELECT id, slug, title, description, thumbnail_url, embed_url, duration, view_count, category, popularity ' +
      'FROM dailymotion_videos ' + where + ' ORDER BY popularity DESC LIMIT $' + (params.length - 1) + ' OFFSET $' + params.length

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // POST /api/db/anime/search
  app.post('/api/db/anime/search', async (req, res) => {
    const {
      query: q,
      genre,           // Genre filter (will map to category column for anime)
      category,        // Alias for genre
      min_rating,
      sortBy,          // Nullable sort parameter (NULL = no explicit sorting)
      page = 1,
      limit = 20
    } = req.body || {}

    // Validate parameters
    if (min_rating !== undefined && min_rating !== null) {
      const ratingNum = parseFloat(min_rating)
      if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 10) {
        return res.status(400).json({
          error: 'Invalid rating parameter',
          message: 'Rating must be between 0 and 10'
        })
      }
    }

    if (sortBy !== undefined && sortBy !== null) {
      const allowedSorts = ['score', 'title']
      if (!allowedSorts.includes(sortBy)) {
        return res.status(400).json({
          error: 'Invalid sortBy parameter',
          message: `sortBy must be one of: ${allowedSorts.join(', ')}, or null for no sorting`
        })
      }
    }

    const safeLimit = Math.min(parseInt(limit) || 20, 100)
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit

    // Build WHERE clause with parameterized queries
    const params = []
    const conditions = []

    if (q) {
      params.push(`%${q}%`)
      conditions.push(`title ILIKE $${params.length}`)
    }

    // Prefer genre over category when both provided
    // Note: anime table uses 'category' column for genre classification
    const genreValue = genre || category
    if (genreValue) {
      params.push(genreValue)
      conditions.push(`category = $${params.length}`)
    }

    if (min_rating) {
      params.push(parseFloat(min_rating))
      conditions.push(`score >= $${params.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Build ORDER BY clause only when sortBy is not NULL
    let orderByClause = ''
    if (sortBy) {
      const sortMap = {
        'score': 'score DESC NULLS LAST',
        'title': 'title ASC'
      }
      orderByClause = `ORDER BY ${sortMap[sortBy]}`
    }

    params.push(safeLimit)
    const limitParam = params.length
    params.push(offset)
    const offsetParam = params.length

    const sql = `
      SELECT id, title, image_url, category, score
      FROM anime
      ${whereClause}
      ${orderByClause}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `

    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) {
      console.error('[Anime Search] Error:', e.message)
      res.status(500).json({ error: e.message })
    }
  })

  // POST /api/db/software/search

}

export default registerDBRoutes
