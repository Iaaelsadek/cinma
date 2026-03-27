// ✅ Content Request Processing API - Process pending requests with TMDB metadata
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import pkg from 'pg'
const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original'

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Initialize CockroachDB pool for movies/tv_series tables
const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY not found in environment variables')
}

// ============================================================================
// TMDB Normalization Functions (inlined from tmdbNormalizer.ts)
// ============================================================================

function normalizeImagePath(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${TMDB_IMAGE_BASE_URL}${path}`
}

function localizeField(arabicValue, englishValue) {
  const arabic = arabicValue?.trim()
  const english = englishValue?.trim()
  
  if (arabic && arabic.length > 0) return arabic
  if (english && english.length > 0) return english
  return ''
}

function extractCastData(credits) {
  if (!credits?.cast || credits.cast.length === 0) return '[]'
  
  const cast = credits.cast.slice(0, 20).map(member => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profile_path: normalizeImagePath(member.profile_path),
    order: member.order
  }))
  
  return JSON.stringify(cast)
}

function extractCrewData(credits) {
  if (!credits?.crew || credits.crew.length === 0) return '[]'
  
  const crew = credits.crew
    .filter(member => ['Director', 'Writer', 'Producer', 'Executive Producer'].includes(member.job))
    .slice(0, 20)
    .map(member => ({
      id: member.id,
      name: member.name,
      job: member.job,
      department: member.department,
      profile_path: normalizeImagePath(member.profile_path)
    }))
  
  return JSON.stringify(crew)
}

function extractVideos(videos) {
  if (!videos?.results || videos.results.length === 0) return '[]'
  
  const videoList = videos.results
    .filter(video => video.site === 'YouTube')
    .slice(0, 10)
    .map(video => ({
      id: video.id,
      key: video.key,
      name: video.name,
      site: video.site,
      type: video.type,
      official: video.official
    }))
  
  return JSON.stringify(videoList)
}

function extractGenres(genres) {
  if (!genres || genres.length === 0) return '[]'
  
  const genreList = genres.map(genre => ({
    id: genre.id,
    name: genre.name
  }))
  
  return JSON.stringify(genreList)
}

function extractKeywords(keywords) {
  if (!keywords) return '[]'
  
  const keywordList = keywords.keywords || keywords.results || []
  
  if (keywordList.length === 0) return '[]'
  
  const formatted = keywordList.slice(0, 20).map(kw => ({
    id: kw.id,
    name: kw.name
  }))
  
  return JSON.stringify(formatted)
}

function extractSeasons(seasons) {
  if (!seasons || seasons.length === 0) return '[]'
  
  const seasonList = seasons
    .filter(season => season.season_number >= 0)
    .map(season => ({
      id: season.id,
      season_number: season.season_number,
      name: season.name,
      overview: season.overview,
      poster_path: normalizeImagePath(season.poster_path),
      air_date: season.air_date || '',
      episode_count: season.episode_count
    }))
  
  return JSON.stringify(seasonList)
}

function normalizeMovie(tmdbMovie, arabicData) {
  if (!tmdbMovie.id || tmdbMovie.id <= 0) {
    throw new Error('Invalid TMDB movie: missing or invalid id')
  }
  
  return {
    id: tmdbMovie.id,
    title: localizeField(arabicData?.title, tmdbMovie.title),
    original_title: tmdbMovie.original_title || tmdbMovie.title,
    overview: localizeField(arabicData?.overview, tmdbMovie.overview),
    poster_path: normalizeImagePath(tmdbMovie.poster_path),
    backdrop_path: normalizeImagePath(tmdbMovie.backdrop_path),
    release_date: tmdbMovie.release_date || null,
    vote_average: tmdbMovie.vote_average || 0,
    vote_count: tmdbMovie.vote_count || 0,
    popularity: tmdbMovie.popularity || 0,
    runtime: tmdbMovie.runtime || null,
    genres: extractGenres(tmdbMovie.genres),
    original_language: tmdbMovie.original_language || 'en',
    status: tmdbMovie.status || 'Released',
    tagline: localizeField(arabicData?.tagline, tmdbMovie.tagline),
    budget: tmdbMovie.budget || 0,
    revenue: tmdbMovie.revenue || 0,
    cast_data: extractCastData(tmdbMovie.credits),
    crew_data: extractCrewData(tmdbMovie.credits),
    videos: extractVideos(tmdbMovie.videos),
    keywords: extractKeywords(tmdbMovie.keywords)
  }
}

function normalizeTvSeries(tmdbTv, arabicData) {
  if (!tmdbTv.id || tmdbTv.id <= 0) {
    throw new Error('Invalid TMDB TV series: missing or invalid id')
  }
  
  return {
    id: tmdbTv.id,
    name: localizeField(arabicData?.name, tmdbTv.name),
    original_name: tmdbTv.original_name || tmdbTv.name,
    overview: localizeField(arabicData?.overview, tmdbTv.overview),
    poster_path: normalizeImagePath(tmdbTv.poster_path),
    backdrop_path: normalizeImagePath(tmdbTv.backdrop_path),
    first_air_date: tmdbTv.first_air_date || null,
    last_air_date: tmdbTv.last_air_date || null,
    vote_average: tmdbTv.vote_average || 0,
    vote_count: tmdbTv.vote_count || 0,
    popularity: tmdbTv.popularity || 0,
    number_of_seasons: tmdbTv.number_of_seasons || 0,
    number_of_episodes: tmdbTv.number_of_episodes || 0,
    genres: extractGenres(tmdbTv.genres),
    original_language: tmdbTv.original_language || 'en',
    status: tmdbTv.status || 'Ended',
    tagline: localizeField(arabicData?.tagline, tmdbTv.tagline),
    type: tmdbTv.type || null,
    seasons: extractSeasons(tmdbTv.seasons),
    cast_data: extractCastData(tmdbTv.credits),
    crew_data: extractCrewData(tmdbTv.credits),
    videos: extractVideos(tmdbTv.videos),
    keywords: extractKeywords(tmdbTv.keywords)
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Process Content Request API
 * 
 * POST /api/admin/process-request
 * 
 * Body: {
 *   request_id: string,
 *   media_type: 'movie' | 'tv',
 *   tmdb_id: number (optional - if not provided, will search by title)
 * }
 * 
 * Flow:
 * 1. Validate admin authentication
 * 2. Fetch request details from Supabase
 * 3. Search/fetch TMDB metadata (with Arabic localization)
 * 4. Check if tmdb_id already exists (duplicate prevention)
 * 5. Normalize TMDB data to database schema
 * 6. Upsert to CockroachDB movies/tv_series table
 * 7. Update request status to 'processed' in Supabase
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Validate admin authentication
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !['admin', 'supervisor'].includes(profile.role)) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' })
    }

    // 2. Parse request body
    const { request_id, media_type, tmdb_id } = req.body

    if (!request_id) {
      return res.status(400).json({ error: 'Missing request_id' })
    }

    if (!media_type || !['movie', 'tv'].includes(media_type)) {
      return res.status(400).json({ error: 'Invalid media_type (must be "movie" or "tv")' })
    }

    // 3. Fetch request details from CockroachDB
    const requestResult = await pool.query('SELECT * FROM requests WHERE id = $1', [request_id])

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' })
    }
    const request = requestResult.rows[0]

    // 4. Fetch TMDB metadata
    let tmdbData
    let tmdbId = tmdb_id

    // If tmdb_id not provided, search by title
    if (!tmdbId) {
      const searchUrl = `${TMDB_BASE_URL}/search/${media_type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(request.title)}&language=ar`
      const searchResponse = await fetch(searchUrl)
      
      if (!searchResponse.ok) {
        return res.status(500).json({ error: 'TMDB search failed' })
      }

      const searchData = await searchResponse.json()
      
      if (!searchData.results || searchData.results.length === 0) {
        return res.status(404).json({ error: 'Content not found on TMDB' })
      }

      // Use first result
      tmdbId = searchData.results[0].id
    }

    // Fetch complete metadata with Arabic localization
    const endpoint = media_type === 'movie' ? 'movie' : 'tv'
    const detailsUrl = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=ar&append_to_response=credits,videos,keywords${media_type === 'tv' ? ',seasons' : ''}`
    
    const detailsResponse = await fetch(detailsUrl)
    
    if (!detailsResponse.ok) {
      return res.status(500).json({ error: 'TMDB details fetch failed' })
    }

    tmdbData = await detailsResponse.json()

    // Fetch English data as fallback
    const englishUrl = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en&append_to_response=credits,videos,keywords${media_type === 'tv' ? ',seasons' : ''}`
    const englishResponse = await fetch(englishUrl)
    const englishData = englishResponse.ok ? await englishResponse.json() : null

    // 5. Check if content already exists (duplicate prevention)
    const table = media_type === 'movie' ? 'movies' : 'tv_series'
    const checkQuery = `SELECT id FROM ${table} WHERE id = $1`
    const checkResult = await pool.query(checkQuery, [tmdbId])

    const exists = checkResult.rows.length > 0

    // 6. Normalize TMDB data
    const normalized = media_type === 'movie' 
      ? normalizeMovie(tmdbData, englishData)
      : normalizeTvSeries(tmdbData, englishData)

    // 7. Upsert to CockroachDB
    if (exists) {
      // Update existing record
      const updateFields = Object.keys(normalized)
        .filter(key => key !== 'id')
        .map((key, idx) => `${key} = $${idx + 2}`)
        .join(', ')
      
      const updateQuery = `UPDATE ${table} SET ${updateFields}, updated_at = NOW() WHERE id = $1`
      const updateValues = [tmdbId, ...Object.values(normalized).filter((_, idx) => Object.keys(normalized)[idx] !== 'id')]
      
      await pool.query(updateQuery, updateValues)
    } else {
      // Insert new record
      const insertFields = Object.keys(normalized).join(', ')
      const insertPlaceholders = Object.keys(normalized)
        .map((_, idx) => `$${idx + 1}`)
        .join(', ')
      
      const insertQuery = `INSERT INTO ${table} (${insertFields}) VALUES (${insertPlaceholders})`
      const insertValues = Object.values(normalized)
      
      await pool.query(insertQuery, insertValues)
    }

    // 8. Update request status to 'processed' in CockroachDB
    try {
      await pool.query(
        `UPDATE requests SET status = 'processed', processed_at = NOW(), processed_by = $1 WHERE id = $2`,
        [user.id, request_id]
      )
    } catch (updateError) {
      console.error('Failed to update request status:', updateError)
      // Don't fail the request if status update fails
    }

    // 9. Return success response
    res.status(200).json({
      success: true,
      message: exists ? 'Content updated successfully' : 'Content added successfully',
      id: tmdbId,
      media_type,
      title: media_type === 'movie' ? normalized.title : normalized.name
    })

  } catch (error) {
    console.error('Process request error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
