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
  const client = await currentPool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
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
      let result;
      if (/^\d+$/.test(identifier)) {
        result = await query('SELECT * FROM movies WHERE id = $1', [parseInt(identifier)])
      } else {
        result = await query('SELECT * FROM movies WHERE slug = $1', [identifier])
      }
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
      res.json(result.rows[0])
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // POST /api/db/movies/search
  app.post('/api/db/movies/search', async (req, res) => {
    const { query: q, genre, min_rating, year, page = 1, limit = 20 } = req.body || {}
    const safeLimit = Math.min(parseInt(limit) || 20, 100)
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit
    const { sql, params } = buildSearchSQL('movies', 'title', 'release_date', { q, genre, min_rating, year, safeLimit, offset })
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
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
      let result;
      if (/^\d+$/.test(identifier)) {
        result = await query('SELECT * FROM tv_series WHERE id = $1', [parseInt(identifier)])
      } else {
        result = await query('SELECT * FROM tv_series WHERE slug = $1', [identifier])
      }
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
      res.json(result.rows[0])
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/tv/:id/seasons
  app.get('/api/db/tv/:id/seasons', async (req, res) => {
    const id = parseInt(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' })
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query('SELECT * FROM seasons WHERE series_id = $1 ORDER BY season_number ASC', [id])
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/tv/seasons/:id/episodes
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
    const { query: q, genre, min_rating, year, page = 1, limit = 20 } = req.body || {}
    const safeLimit = Math.min(parseInt(limit) || 20, 100)
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit
    const { sql, params } = buildSearchSQL('tv_series', 'name', 'first_air_date', { q, genre, min_rating, year, safeLimit, offset })
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
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
      console.log('[Health] Starting health check...')
      await query('SELECT 1')
      console.log('[Health] SELECT 1 passed')
      const movies = await query('SELECT COUNT(*) FROM movies')
      console.log('[Health] Movies count:', movies.rows[0].count)
      const tv = await query('SELECT COUNT(*) FROM tv_series')
      const games = await query('SELECT COUNT(*) FROM games')
      const software = await query('SELECT COUNT(*) FROM software')
      const actors = await query('SELECT COUNT(*) FROM actors')
      res.json({
        status: 'ok',
        movies: parseInt(movies.rows[0].count),
        tv_series: parseInt(tv.rows[0].count),
        games: parseInt(games.rows[0].count),
        software: parseInt(software.rows[0].count),
        actors: parseInt(actors.rows[0].count),
      })
    } catch (e) {
      console.error('[Health] Error:', e.message, e.stack)
      res.status(503).json({ status: 'error', error: e.message })
    }
  })

  // ==========================================
  // GAMES ENDPOINTS
  // ==========================================

  // GET /api/db/games/trending
  app.get('/api/db/games/trending', cacheControl(300), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100)
    const cacheKey = 'games-trending-' + limit
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(
        'SELECT id, slug, title, description, poster_url, backdrop_url, ' +
        'release_date, rating, rating_count, popularity, category, genres ' +
        'FROM games ORDER BY popularity DESC LIMIT $1',
        [limit]
      )
      setCache(cacheKey, result.rows)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // GET /api/db/games/:identifier
  app.get('/api/db/games/:identifier', async (req, res) => {
    const identifier = req.params.identifier
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      let result;
      if (/^\d+$/.test(identifier)) {
        result = await query('SELECT * FROM games WHERE id = $1', [parseInt(identifier)])
      } else {
        result = await query('SELECT * FROM games WHERE slug = $1', [identifier])
      }
      if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
      res.json(result.rows[0])
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

  // POST /api/db/games/search
  app.post('/api/db/games/search', async (req, res) => {
    const { query: q, category, min_rating, page = 1, limit = 20 } = req.body || {}
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
    if (min_rating) {
      params.push(parseFloat(min_rating))
      conditions.push('rating >= $' + params.length)
    }
    
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    params.push(safeLimit, offset)
    
    const sql = 'SELECT id, title, description, poster_url, backdrop_url, release_date, rating, popularity, category, genres ' +
      'FROM games ' + where + ' ORDER BY popularity DESC LIMIT $' + (params.length - 1) + ' OFFSET $' + params.length
    
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
  })

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
        'release_date, rating, rating_count, popularity, category, license_type ' +
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
    const { query: q, category, license_type, min_rating, page = 1, limit = 20 } = req.body || {}
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
    if (license_type) {
      params.push(license_type)
      conditions.push('license_type = $' + params.length)
    }
    if (min_rating) {
      params.push(parseFloat(min_rating))
      conditions.push('rating >= $' + params.length)
    }
    
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    params.push(safeLimit, offset)
    
    const sql = 'SELECT id, title, description, poster_url, backdrop_url, release_date, rating, popularity, category, license_type ' +
      'FROM software ' + where + ' ORDER BY popularity DESC LIMIT $' + (params.length - 1) + ' OFFSET $' + params.length
    
    try {
      if (!(await checkDB())) return res.status(503).json({ error: 'DB unavailable' })
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (e) { res.status(500).json({ error: e.message }) }
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
    const validTables = ['movies', 'tv_series', 'actors', 'games', 'software', 'cinematics']
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
    const validTables = ['movies', 'tv_series', 'actors', 'games', 'software', 'cinematics']
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
    const validTables = ['movies', 'tv_series', 'actors', 'games', 'software', 'cinematics']
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
    const validTables = ['movies', 'tv_series', 'games', 'software', 'actors'];
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
        
        // Improved slugify for Arabic and other languages
        let slug = title
          .toLowerCase()
          .trim()
          .replace(/[\s\W|_]+/g, '-') // Replace spaces and non-word chars with -
          .replace(/^-+|-+$/g, '');   // Trim - from ends
          
        if (!slug) slug = 'content-' + item.id;
        
        let finalSlug = slug;
        let isUnique = false;
        let counter = 1;

        while (!isUnique) {
          const existing = await query(`SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, [finalSlug, item.id]);
          if (existing.rows.length === 0) {
            isUnique = true;
          } else {
            finalSlug = `${slug}-${counter}`;
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
}
