// server/api/instant-add.js - Instant Add API with Rate Limiting
import { query } from '../db/cockroach.js'
import fetch from 'node-fetch'

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

// Rate limits
const USER_LIMIT = 20 // per 24 hours
const GLOBAL_LIMIT = 200 // per hour

/**
 * Check and update user rate limit
 */
async function checkUserLimit(ipAddress) {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Get user's request count in last 24 hours
  const result = await query(
    `SELECT COUNT(*) as count FROM rate_limits 
     WHERE ip_address = $1 AND created_at > $2`,
    [ipAddress, oneDayAgo]
  )

  const count = parseInt(result.rows[0]?.count || 0)
  
  if (count >= USER_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  // Record this request
  await query(
    `INSERT INTO rate_limits (ip_address, created_at) VALUES ($1, $2)`,
    [ipAddress, now]
  )

  return { allowed: true, remaining: USER_LIMIT - count - 1 }
}

/**
 * Check and update global rate limit
 */
async function checkGlobalLimit() {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // Get global request count in last hour
  const result = await query(
    `SELECT request_count, window_start FROM global_rate_limits 
     WHERE id = 'global' AND window_start > $1`,
    [oneHourAgo]
  )

  if (result.rows.length === 0) {
    // Create new window
    await query(
      `INSERT INTO global_rate_limits (id, request_count, window_start) 
       VALUES ('global', 1, $1)
       ON CONFLICT (id) DO UPDATE SET request_count = 1, window_start = $1`,
      [now]
    )
    return { allowed: true, remaining: GLOBAL_LIMIT - 1 }
  }

  const currentCount = parseInt(result.rows[0].request_count)
  
  if (currentCount >= GLOBAL_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  // Increment counter
  await query(
    `UPDATE global_rate_limits SET request_count = request_count + 1 
     WHERE id = 'global'`
  )

  return { allowed: true, remaining: GLOBAL_LIMIT - currentCount - 1 }
}

/**
 * Fetch content from TMDB
 */
async function fetchFromTMDB(tmdbId, mediaType) {
  const endpoint = mediaType === 'movie' ? 'movie' : 'tv'
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=ar`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }
  
  return await response.json()
}

/**
 * Normalize and insert content into database
 */
async function insertContent(tmdbData, mediaType) {
  const table = mediaType === 'movie' ? 'movies' : 'tv_series'
  const title = tmdbData.title || tmdbData.name || 'content'
  
  // Clean slugify (Standard SEO pattern)
  let baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[\s\W|_]+/g, '-')
    .replace(/^-+|-+$/g, '');
    
  if (!baseSlug) baseSlug = 'content';
  
  // Logic for Pure Slug: Title -> if exists -> Title-Year -> if exists -> Title-Year-ID
  let slug = baseSlug;
  const existing = await query(`SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, [slug, tmdbData.id]);
  
  if (existing.rows.length > 0) {
    const year = (tmdbData.release_date || tmdbData.first_air_date) ? new Date(tmdbData.release_date || tmdbData.first_air_date).getFullYear() : null;
    if (year && !isNaN(year)) {
      slug = `${baseSlug}-${year}`;
      const existingYear = await query(`SELECT id FROM ${table} WHERE slug = $1 AND id != $2`, [slug, tmdbData.id]);
      if (existingYear.rows.length > 0) {
        slug = `${baseSlug}-${year}-${tmdbData.id}`;
      }
    } else {
      slug = `${baseSlug}-${tmdbData.id}`;
    }
  }
  
  if (mediaType === 'movie') {
    const normalized = {
      id: tmdbData.id,
      slug: slug,
      title: tmdbData.title || '',
      overview: tmdbData.overview || '',
      poster_path: tmdbData.poster_path || '',
      backdrop_path: tmdbData.backdrop_path || '',
      release_date: tmdbData.release_date || null,
      vote_average: tmdbData.vote_average || 0,
      vote_count: tmdbData.vote_count || 0,
      popularity: tmdbData.popularity || 0,
      adult: tmdbData.adult || false,
      original_language: tmdbData.original_language || '',
      original_title: tmdbData.original_title || '',
      genre_ids: JSON.stringify(tmdbData.genres?.map(g => g.id) || []),
      video: tmdbData.video || false,
      runtime: tmdbData.runtime || null,
      budget: tmdbData.budget || null,
      revenue: tmdbData.revenue || null,
      status: tmdbData.status || '',
      tagline: tmdbData.tagline || '',
      homepage: tmdbData.homepage || ''
    }

    await query(
      `INSERT INTO ${table} (
        id, slug, title, overview, poster_path, backdrop_path, release_date,
        vote_average, vote_count, popularity, adult, original_language,
        original_title, genre_ids, video, runtime, budget, revenue,
        status, tagline, homepage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
        adult = EXCLUDED.adult,
        original_language = EXCLUDED.original_language,
        original_title = EXCLUDED.original_title,
        genre_ids = EXCLUDED.genre_ids,
        video = EXCLUDED.video,
        runtime = EXCLUDED.runtime,
        budget = EXCLUDED.budget,
        revenue = EXCLUDED.revenue,
        status = EXCLUDED.status,
        tagline = EXCLUDED.tagline,
        homepage = EXCLUDED.homepage`,
      Object.values(normalized)
    )
  } else {
    const normalized = {
      id: tmdbData.id,
      slug: slug,
      name: tmdbData.name || '',
      overview: tmdbData.overview || '',
      poster_path: tmdbData.poster_path || '',
      backdrop_path: tmdbData.backdrop_path || '',
      first_air_date: tmdbData.first_air_date || null,
      last_air_date: tmdbData.last_air_date || null,
      vote_average: tmdbData.vote_average || 0,
      vote_count: tmdbData.vote_count || 0,
      popularity: tmdbData.popularity || 0,
      original_language: tmdbData.original_language || '',
      original_name: tmdbData.original_name || '',
      genre_ids: JSON.stringify(tmdbData.genres?.map(g => g.id) || []),
      number_of_episodes: tmdbData.number_of_episodes || null,
      number_of_seasons: tmdbData.number_of_seasons || null,
      status: tmdbData.status || '',
      type: tmdbData.type || '',
      tagline: tmdbData.tagline || '',
      homepage: tmdbData.homepage || ''
    }

    await query(
      `INSERT INTO ${table} (
        id, slug, name, overview, poster_path, backdrop_path, first_air_date,
        last_air_date, vote_average, vote_count, popularity, original_language,
        original_name, genre_ids, number_of_episodes, number_of_seasons,
        status, type, tagline, homepage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        overview = EXCLUDED.overview,
        poster_path = EXCLUDED.poster_path,
        backdrop_path = EXCLUDED.backdrop_path,
        first_air_date = EXCLUDED.first_air_date,
        last_air_date = EXCLUDED.last_air_date,
        vote_average = EXCLUDED.vote_average,
        vote_count = EXCLUDED.vote_count,
        popularity = EXCLUDED.popularity,
        original_language = EXCLUDED.original_language,
        original_name = EXCLUDED.original_name,
        genre_ids = EXCLUDED.genre_ids,
        number_of_episodes = EXCLUDED.number_of_episodes,
        number_of_seasons = EXCLUDED.number_of_seasons,
        status = EXCLUDED.status,
        type = EXCLUDED.type,
        tagline = EXCLUDED.tagline,
        homepage = EXCLUDED.homepage`,
      Object.values(normalized)
    )
  }

  return tmdbData.id
}

/**
 * Main handler
 */
export default async function instantAddHandler(req, res) {
  try {
    const { tmdbId, mediaType, title, notes } = req.body

    // Validate input
    if (!tmdbId || !mediaType) {
      return res.status(400).json({ 
        error: 'Missing required fields: tmdbId and mediaType' 
      })
    }

    if (!['movie', 'tv'].includes(mediaType)) {
      return res.status(400).json({ 
        error: 'Invalid mediaType. Must be "movie" or "tv"' 
      })
    }

    // Get IP address
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown'

    // Check user limit
    const userLimit = await checkUserLimit(ipAddress)
    if (!userLimit.allowed) {
      return res.status(429).json({
        error: 'لقد وصلت للحد الأقصى من الطلبات (20 طلب كل 24 ساعة)',
        userLimitReached: true,
        remaining: 0
      })
    }

    // Check global limit
    const globalLimit = await checkGlobalLimit()
    if (!globalLimit.allowed) {
      // Queue the request
      await query(
        `INSERT INTO requests (title, notes, user_id, status, media_type, tmdb_id)
         VALUES ($1, $2, $3, 'pending', $4, $5)`,
        [title || '', notes || '', ipAddress, mediaType, tmdbId]
      )

      return res.status(202).json({
        instant: false,
        message: 'تم استلام طلبك! سيتم إضافته تلقائياً قريباً',
        queued: true,
        userRemaining: userLimit.remaining,
        globalRemaining: 0
      })
    }

    // Process instantly
    const tmdbData = await fetchFromTMDB(tmdbId, mediaType)
    
    // STRICT CONTENT RULE: Ignore unreleased content
    const releaseDate = tmdbData.release_date || tmdbData.first_air_date
    const status = tmdbData.status
    const isFuture = releaseDate && new Date(releaseDate) > new Date()
    const isNotReleased = mediaType === 'movie' && status && status !== 'Released'

    if (isFuture || isNotReleased) {
      return res.status(400).json({
        error: lang === 'ar' ? 'عذراً، لا يمكن إضافة محتوى لم يتم إصداره بعد' : 'Sorry, unreleased content cannot be added',
        isUnreleased: true
      })
    }

    await insertContent(tmdbData, mediaType)

    // We need the slug from the DB after insert to redirect properly
    const table = mediaType === 'movie' ? 'movies' : 'tv_series'
    const slugRes = await query(`SELECT slug FROM ${table} WHERE id = $1`, [tmdbId])
    const finalSlug = slugRes.rows[0]?.slug || tmdbId

    // Record in requests table as processed
    await query(
      `INSERT INTO requests (title, notes, user_id, status, media_type, tmdb_id)
       VALUES ($1, $2, $3, 'processed', $4, $5)`,
      [title || tmdbData.title || tmdbData.name, notes || '', ipAddress, mediaType, tmdbId]
    )

    return res.status(200).json({
      instant: true,
      success: true,
      contentId: tmdbId,
      mediaType,
      redirectUrl: mediaType === 'movie' ? `/movie/${finalSlug}` : `/series/${finalSlug}`,
      userRemaining: userLimit.remaining,
      globalRemaining: globalLimit.remaining
    })

  } catch (error) {
    console.error('Instant add error:', error)
    return res.status(500).json({ 
      error: 'حدث خطأ أثناء معالجة الطلب',
      details: error.message 
    })
  }
}
