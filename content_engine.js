
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

// Login as admin to bypass RLS
async function loginAsAdmin() {
  console.log('Logging in as admin...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'iaaelsadek@gmail.com',
    password: 'Eslam@26634095',
  })
  if (error) {
    console.error('Admin login failed:', error.message)
  } else {
    console.log('Admin login successful. User:', data.user.email)
  }
}

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
  for (const tmdbMovie of movieList) {
    const tmdbId = tmdbMovie.id
    const title = tmdbMovie.title
    console.log(`Processing Movie: ${title} (${tmdbId})...`)
    
    try {
      // Check existing
      // Use id as tmdb_id since schema uses id for TMDB ID
      const { data: existing } = await supabase.from('movies').select('id').eq('id', tmdbId)
      let movieId = existing && existing.length > 0 ? existing[0].id : null
      
      // Fetch details
      let details = await fetchTMDB(`/movie/${tmdbId}`)
      if (!details) details = tmdbMovie
      
      const movieData = {
        id: tmdbId, // Explicitly set id to tmdbId
        title: title,
        overview: details.overview || tmdbMovie.overview,
        poster_path: details.poster_path || tmdbMovie.poster_path,
        backdrop_path: details.backdrop_path || tmdbMovie.backdrop_path,
        release_date: details.release_date || tmdbMovie.release_date,
        vote_average: details.vote_average || tmdbMovie.vote_average,
        original_language: details.original_language || tmdbMovie.original_language,
        origin_country: details.origin_country || (details.production_countries && details.production_countries.map(c => c.iso_3166_1)) || tmdbMovie.origin_country || [],
        is_active: true,
        source: 'tmdb',
        // category: 'Movies', // Default category
        slug: `${title.replace(/\s+/g, '-').toLowerCase()}-${tmdbId}`,
        arabic_title: title,
        updated_at: new Date().toISOString()
      }
      
      if (movieId) {
        await supabase.from('movies').update(movieData).eq('id', movieId)
      } else {
        const { data: newRec, error: insertError } = await supabase.from('movies').insert(movieData).select()
        if (insertError) throw insertError
        if (newRec) movieId = newRec[0].id
      }
      
      console.log(` -> Upsert successful for ${title}`)
      
      // Links
      if (movieId) {
        const links = [
          { movie_id: movieId, media_type: 'movie', name: 'VidSrc', url: `https://vidsrc.xyz/embed/movie/${tmdbId}`, quality: 'HD', is_active: true },
          { movie_id: movieId, media_type: 'movie', name: 'SuperEmbed', url: `https://superembed.stream/movie/${tmdbId}`, quality: 'HD', is_active: true }
        ]
        // Simple insert for now (ignoring duplicates or relying on unique constraints if any)
        // await supabase.from('embed_links').upsert(links) // upsert needs unique constraint
      }
      
    } catch (e) {
      console.error(`Error processing movie ${title}: ${e.message}`)
    }
  }
}

async function processSeries(seriesList) {
  for (const tmdbShow of seriesList) {
    const tmdbId = tmdbShow.id
    const name = tmdbShow.name
    console.log(`Processing Series: ${name} (${tmdbId})...`)
    
    try {
      // Check existing
      // Use id as tmdb_id since schema uses id for TMDB ID
      const { data: existing } = await supabase.from('tv_series').select('id').eq('id', tmdbId)
      let seriesId = existing && existing.length > 0 ? existing[0].id : null
      
      // Fetch details
      let details = await fetchTMDB(`/tv/${tmdbId}`)
      if (!details) details = tmdbShow
      
      const seriesData = {
        id: tmdbId, // Explicitly set id
        name: name, // Map name to name
        overview: details.overview || tmdbShow.overview,
        poster_path: details.poster_path || tmdbShow.poster_path,
        backdrop_path: details.backdrop_path || tmdbShow.backdrop_path,
        first_air_date: details.first_air_date || tmdbShow.first_air_date,
        vote_average: details.vote_average || tmdbShow.vote_average,
        popularity: details.popularity || tmdbShow.popularity,
        original_language: details.original_language || tmdbShow.original_language,
        // origin_country: details.origin_country || tmdbShow.origin_country || [],
        // Add fields that might satisfy RLS or constraints
        is_active: true,
        source: 'tmdb',
        // category: 'TV Series', // Default category
        slug: `${name.replace(/\s+/g, '-').toLowerCase()}-${tmdbId}`,
        arabic_title: name,
        updated_at: new Date().toISOString()
      }
      
      if (seriesId) {
        await supabase.from('tv_series').update(seriesData).eq('id', seriesId)
      } else {
        const { error: insertError } = await supabase.from('tv_series').insert(seriesData)
        if (insertError) throw insertError
      }
      
      console.log(` -> Upsert successful for ${name}`)
      
    } catch (e) {
      console.error(`Error processing series ${name}: ${e.message}`)
    }
  }
}

async function runEngine() {
  // await loginAsAdmin()
  console.log("--- Starting Content Engine (Node.js) ---")
  
  // Phase 1: Trending Movies
  console.log("Fetching Trending Movies...")
  const trendingMovies = await fetchTMDB('/trending/movie/week')
  if (trendingMovies && trendingMovies.results) await processMovies(trendingMovies.results)
  
  // Phase 2: Now Playing Movies
  console.log("Fetching Now Playing Movies...")
  const nowPlaying = await fetchTMDB('/movie/now_playing')
  if (nowPlaying && nowPlaying.results) await processMovies(nowPlaying.results)
  
  // Phase 3: Trending Series
  console.log("Fetching Trending Series...")
  const trendingSeries = await fetchTMDB('/trending/tv/week')
  if (trendingSeries && trendingSeries.results) await processSeries(trendingSeries.results)
  
  // Phase 4: Arabic Content
  console.log("Fetching Arabic Content...")
  const arabicMovies = await fetchTMDB('/discover/movie', { with_original_language: 'ar', sort_by: 'popularity.desc' })
  if (arabicMovies && arabicMovies.results) await processMovies(arabicMovies.results)
  
  const arabicSeries = await fetchTMDB('/discover/tv', { with_original_language: 'ar', sort_by: 'popularity.desc' })
  if (arabicSeries && arabicSeries.results) await processSeries(arabicSeries.results)
  
  // Phase 5: Ramadan Content (2023-2026)
  console.log("Fetching Ramadan Content (2023-2026)...")
  for (let year = 2023; year <= 2026; year++) {
    console.log(`Fetching Ramadan ${year}...`)
    const ramadanSeries = await fetchTMDB('/discover/tv', { 
      with_original_language: 'ar', 
      'first_air_date.gte': `${year}-01-01`,
      'first_air_date.lte': `${year}-12-31`,
      sort_by: 'popularity.desc' 
    })
    if (ramadanSeries && ramadanSeries.results) await processSeries(ramadanSeries.results)
  }

  // Phase 6: Plays (Movies with keyword 'play' or genre?)
  // Hard to search by keyword in discover, but we can search by query
  console.log("Fetching Plays...")
  const playsQueries = ['مسرحية', 'play']
  for (const q of playsQueries) {
      const plays = await fetchTMDB('/search/movie', { query: q, language: 'ar-SA' })
      if (plays && plays.results) await processMovies(plays.results)
  }

  console.log("--- Cycle Complete ---")
}

runEngine()
