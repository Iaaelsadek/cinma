
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env manually
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && rest) {
      let val = rest.join('=').trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      process.env[key.trim()] = val
    }
  })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !TMDB_API_KEY) {
  console.error('Missing ENV variables: SUPABASE_URL/KEY or TMDB_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Ramadan Dates (Approximate Start)
const RAMADAN_DATES = {
  2024: "03-11", 
  2025: "02-28",
  2026: "02-17"
}

const MENA_COUNTRIES = ['EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'LB', 'SY', 'JO', 'PS', 'IQ', 'YE', 'LY', 'TN', 'DZ', 'MA', 'SD']

function isRamadan(dateStr, originCountries = [], originalLanguage) {
  if (!dateStr) return false
  try {
    const year = new Date(dateStr).getFullYear()
    const startStr = RAMADAN_DATES[year]
    if (!startStr) return false // Only check supported years
    
    const startDate = new Date(`${year}-${startStr}`)
    const d = new Date(dateStr)
    const diffTime = d.getTime() - startDate.getTime()
    const diffDays = diffTime / (1000 * 3600 * 24)
    
    // Ramadan window: 5 days before to 35 days after start
    const inWindow = diffDays >= -5 && diffDays <= 35
    const isMena = originalLanguage === 'ar' || originCountries.some(c => MENA_COUNTRIES.includes(c))
    
    return inWindow && isMena
  } catch (e) {
    return false
  }
}

async function fetchTrending(mediaType, timeWindow) {
    console.log(`Fetching Trending ${mediaType} (${timeWindow})...`)
    try {
        const { data } = await axios.get(`https://api.themoviedb.org/3/trending/${mediaType}/${timeWindow}`, {
            params: { api_key: TMDB_API_KEY, language: 'ar-SA' }
        })
        return data.results || []
    } catch (e) {
        console.error(`Error fetching trending:`, e.message)
        return []
    }
}

async function fetchRamadanSeries(year) {
    console.log(`Fetching Ramadan Series for ${year}...`)
    try {
        // Discover Arabic TV shows in Ramadan month
        const startStr = RAMADAN_DATES[year]
        if (!startStr) return []

        const startDate = new Date(`${year}-${startStr}`)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 30)

        const { data } = await axios.get(`https://api.themoviedb.org/3/discover/tv`, {
            params: { 
                api_key: TMDB_API_KEY, 
                language: 'ar-SA',
                with_original_language: 'ar',
                'first_air_date.gte': startDate.toISOString().split('T')[0],
                'first_air_date.lte': endDate.toISOString().split('T')[0],
                sort_by: 'popularity.desc'
            }
        })
        return data.results || []
    } catch (e) {
        console.error(`Error fetching Ramadan ${year}:`, e.message)
        return []
    }
}

async function processItem(item, mediaType) {
    const tmdbId = item.id
    const isMovie = mediaType === 'movie'
    const tableName = isMovie ? 'movies' : 'tv_series'
    
    let originCountry = item.origin_country || []
    const originalLanguage = item.original_language
    const title = isMovie ? item.title : item.name
    const originalTitle = isMovie ? item.original_title : item.original_name
    const releaseDate = isMovie ? item.release_date : item.first_air_date
    
    // Fetch details if needed for country (for movies mainly)
    if (isMovie && originalLanguage === 'ar' && originCountry.length === 0) {
        try {
        const { data: det } = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
            params: { api_key: TMDB_API_KEY }
        })
        if (det.production_countries) {
            originCountry = det.production_countries.map(c => c.iso_3166_1)
        }
        } catch (e) { }
    }

    const isRamadanVal = !isMovie ? isRamadan(releaseDate, originCountry, originalLanguage) : false
    
    const payload = {
        id: tmdbId,
        overview: item.overview,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        rating_color: 'yellow', // Default, logic can be improved
        genres: item.genre_ids,
        origin_country: originCountry,
        updated_at: new Date().toISOString()
    }
    
    if (isMovie) {
        payload.title = title
        payload.arabic_title = title
        payload.release_date = releaseDate || null
        // payload.is_play = ... (Not checking play here, mainly trending)
    } else {
        payload.name = title
        payload.arabic_name = title
        payload.first_air_date = releaseDate || null
        payload.is_ramadan = isRamadanVal
    }

    try {
        const { error } = await supabase.from(tableName).upsert(payload)
        if (error) console.error(`Error upserting ${tmdbId}:`, error.message)
        else console.log(`Processed: ${title}`)
    } catch (e) {
        console.error(`Exception upserting ${tmdbId}:`, e.message)
    }
}

(async () => {
    console.log("🚀 Starting Trending & Ramadan Import...")

    // 1. Trending Movies (Day & Week)
    const trendMoviesDay = await fetchTrending('movie', 'day')
    const trendMoviesWeek = await fetchTrending('movie', 'week')
    await Promise.all([...trendMoviesDay, ...trendMoviesWeek].map(item => processItem(item, 'movie')))

    // 2. Trending TV (Day & Week)
    const trendTvDay = await fetchTrending('tv', 'day')
    const trendTvWeek = await fetchTrending('tv', 'week')
    await Promise.all([...trendTvDay, ...trendTvWeek].map(item => processItem(item, 'tv')))

    // 3. Ramadan 2024 & 2025
    const ramadan24 = await fetchRamadanSeries(2024)
    const ramadan25 = await fetchRamadanSeries(2025)
    await Promise.all([...ramadan24, ...ramadan25].map(item => processItem(item, 'tv')))

    console.log("✅ Trending Import Done.")
})()
