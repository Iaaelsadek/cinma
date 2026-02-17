
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env
const envPath = path.join(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=')
    if (key && value) {
      process.env[key.trim()] = value.trim()
    }
  })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !TMDB_API_KEY) {
  console.error("ERROR: Missing Environment Variables.")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TMDB_BASE_URL = "https://api.themoviedb.org/3"

function fetchTMDB(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    params.api_key = TMDB_API_KEY
    params.language = 'ar-SA'
    
    const queryString = Object.keys(params).map(key => `${key}=${params[key]}`).join('&')
    const url = `${TMDB_BASE_URL}${endpoint}?${queryString}`
    
    https.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', (e) => reject(e))
  })
}

async function processMovies(movieList) {
  console.log(`Processing ${movieList.length} movies...`)
  for (const tmdbMovie of movieList) {
    const tmdbId = tmdbMovie.id
    const title = tmdbMovie.title
    
    try {
      // Check existing
      const { data: existing } = await supabase.from('movies').select('id').eq('tmdb_id', tmdbId)
      let movieId = existing && existing.length > 0 ? existing[0].id : null
      
      // Fetch details
      let details = await fetchTMDB(`/movie/${tmdbId}`)
      if (!details) details = tmdbMovie
      
      const movieData = {
        tmdb_id: tmdbId,
        title: title,
        original_title: details.original_title || tmdbMovie.original_title,
        overview: details.overview || tmdbMovie.overview,
        poster_path: details.poster_path || tmdbMovie.poster_path,
        backdrop_path: details.backdrop_path || tmdbMovie.backdrop_path,
        release_date: details.release_date || tmdbMovie.release_date,
        vote_average: details.vote_average || tmdbMovie.vote_average,
        original_language: details.original_language || tmdbMovie.original_language,
        origin_country: details.origin_country || (details.production_countries && details.production_countries.map(c => c.iso_3166_1)) || tmdbMovie.origin_country || [],
        is_published: true,
        is_active: true
      }

      if (movieId) {
        console.log(`Updating Movie: ${title} (${tmdbId})...`)
        await supabase.from('movies').update(movieData).eq('id', movieId)
      } else {
        console.log(`Inserting Movie: ${title} (${tmdbId})...`)
        await supabase.from('movies').insert(movieData)
      }
    } catch (e) {
      console.error(`Error processing movie ${title}:`, e.message)
    }
  }
}

async function processSeries(seriesList) {
  console.log(`Processing ${seriesList.length} series...`)
  for (const tmdbSeries of seriesList) {
    const tmdbId = tmdbSeries.id
    const name = tmdbSeries.name
    
    try {
      // Check existing
      const { data: existing } = await supabase.from('tv_series').select('id').eq('tmdb_id', tmdbId)
      let seriesId = existing && existing.length > 0 ? existing[0].id : null
      
      // Fetch details
      let details = await fetchTMDB(`/tv/${tmdbId}`)
      if (!details) details = tmdbSeries
      
      const seriesData = {
        tmdb_id: tmdbId,
        name: name,
        original_name: details.original_name || tmdbSeries.original_name,
        overview: details.overview || tmdbSeries.overview,
        poster_path: details.poster_path || tmdbSeries.poster_path,
        backdrop_path: details.backdrop_path || tmdbSeries.backdrop_path,
        first_air_date: details.first_air_date || tmdbSeries.first_air_date,
        vote_average: details.vote_average || tmdbSeries.vote_average,
        original_language: details.original_language || tmdbSeries.original_language,
        origin_country: details.origin_country || (details.production_countries && details.production_countries.map(c => c.iso_3166_1)) || tmdbSeries.origin_country || [],
        is_published: true,
        is_active: true
      }

      if (seriesId) {
        console.log(`Updating Series: ${name} (${tmdbId})...`)
        await supabase.from('tv_series').update(seriesData).eq('id', seriesId)
      } else {
        console.log(`Inserting Series: ${name} (${tmdbId})...`)
        await supabase.from('tv_series').insert(seriesData)
      }
    } catch (e) {
      console.error(`Error processing series ${name}:`, e.message)
    }
  }
}

async function main() {
  console.log("Starting Content Engine...")
  
  // 1. Fetch Movies
  try {
    const movies = await fetchTMDB('/movie/popular', { page: 1 })
    if (movies && movies.results) {
      await processMovies(movies.results)
    }
  } catch (e) {
    console.error("Error fetching movies:", e.message)
  }

  // 2. Fetch Series
  try {
    const series = await fetchTMDB('/tv/popular', { page: 1 })
    if (series && series.results) {
      await processSeries(series.results)
    }
  } catch (e) {
    console.error("Error fetching series:", e.message)
  }
  
  console.log("Content Engine Finished.")
}

main()
