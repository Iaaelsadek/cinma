// server/workers/auto-process-requests.js - Auto-process pending requests
import { query } from '../lib/db.js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const GLOBAL_LIMIT = 200
const BATCH_SIZE = 10

async function checkGlobalLimit() {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const result = await query(
    `SELECT request_count, window_start FROM global_rate_limits 
     WHERE id = 'global' AND window_start > $1`,
    [oneHourAgo]
  )

  if (result.rows.length === 0) {
    await query(
      `INSERT INTO global_rate_limits (id, request_count, window_start) 
       VALUES ('global', 0, $1)
       ON CONFLICT (id) DO UPDATE SET request_count = 0, window_start = $1`,
      [now]
    )
    return GLOBAL_LIMIT
  }

  const currentCount = parseInt(result.rows[0].request_count)
  return Math.max(0, GLOBAL_LIMIT - currentCount)
}

async function incrementGlobalLimit(count) {
  await query(
    `UPDATE global_rate_limits 
     SET request_count = request_count + $1 
     WHERE id = 'global'`,
    [count]
  )
}

async function fetchFromTMDB(tmdbId, mediaType) {
  const endpoint = mediaType === 'movie' ? 'movie' : 'tv'
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=ar`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`)
  }
  
  return await response.json()
}

async function insertContent(tmdbData, mediaType) {
  const table = mediaType === 'movie' ? 'movies' : 'tv_series'
  
  if (mediaType === 'movie') {
    const normalized = {
      id: tmdbData.id,
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
        id, title, overview, poster_path, backdrop_path, release_date,
        vote_average, vote_count, popularity, adult, original_language,
        original_title, genre_ids, video, runtime, budget, revenue,
        status, tagline, homepage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (id) DO UPDATE SET
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
        id, name, overview, poster_path, backdrop_path, first_air_date,
        last_air_date, vote_average, vote_count, popularity, original_language,
        original_name, genre_ids, number_of_episodes, number_of_seasons,
        status, type, tagline, homepage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
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

async function processRequest(request) {
  try {
    const tmdbData = await fetchFromTMDB(request.tmdb_id, request.media_type)
    await insertContent(tmdbData, request.media_type)
    
    await query(
      `UPDATE requests SET status = 'processed', updated_at = NOW() WHERE id = $1`,
      [request.id]
    )
    
    return true
  } catch (error) {
    console.error(`❌ Failed to process request ${request.id}:`, error.message)
    
    await query(
      `UPDATE requests SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [request.id]
    )
    
    return false
  }
}

async function processPendingRequests() {
  try {
    
    const available = await checkGlobalLimit()
    
    if (available === 0) {
      return
    }
    
    const limit = Math.min(available, BATCH_SIZE)
    
    const result = await query(
      `SELECT * FROM requests 
       WHERE status = 'pending' 
       ORDER BY created_at ASC 
       LIMIT $1`,
      [limit]
    )
    
    if (result.rows.length === 0) {
      return
    }
    
    let successCount = 0
    for (const request of result.rows) {
      const success = await processRequest(request)
      if (success) successCount++
    }
    
    await incrementGlobalLimit(successCount)
    
  } catch (error) {
    console.error('❌ Worker error:', error)
  }
}

async function startWorker() {
  
  await processPendingRequests()
  
  setInterval(async () => {
    await processPendingRequests()
  }, 5 * 60 * 1000)
}

startWorker()
