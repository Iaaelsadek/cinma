
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
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || process.env.TMDB_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !TMDB_API_KEY) {
  console.error('Missing ENV variables:', { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_KEY: !!SUPABASE_KEY, TMDB_API_KEY: !!TMDB_API_KEY })
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const RAMADAN_DATES = {
  2010: "08-11", 2011: "08-01", 2012: "07-20", 2013: "07-09",
  2014: "06-29", 2015: "06-18", 2016: "06-06", 2017: "05-27",
  2018: "05-16", 2019: "05-06", 2020: "04-24", 2021: "04-13",
  2022: "04-02", 2023: "03-23", 2024: "03-11", 2025: "02-28",
  2026: "02-17"
}

const MENA_COUNTRIES = ['EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'LB', 'SY', 'JO', 'PS', 'IQ', 'YE', 'LY', 'TN', 'DZ', 'MA', 'SD']

function isRamadan(dateStr, originCountries = [], originalLanguage) {
  if (!dateStr) return false
  try {
    const year = new Date(dateStr).getFullYear()
    const startStr = RAMADAN_DATES[year]
    if (!startStr) return false
    
    const startDate = new Date(`${year}-${startStr}`)
    const d = new Date(dateStr)
    const diffTime = d.getTime() - startDate.getTime()
    const diffDays = diffTime / (1000 * 3600 * 24)
    
    const inWindow = diffDays >= -5 && diffDays <= 35
    const isMena = originalLanguage === 'ar' || originCountries.some(c => MENA_COUNTRIES.includes(c))
    
    return inWindow && isMena
  } catch (e) {
    return false
  }
}

function isPlay(title, originalTitle) {
  const t1 = (title || "").toLowerCase()
  const t2 = (originalTitle || "").toLowerCase()
  const keywords = ['مسرحية', 'play', 'masrahiyat']
  return keywords.some(k => t1.includes(k) || t2.includes(k))
}

async function fetchDiscover(endpoint, params, maxPages = 5, startPage = 1) {
  console.log(`--- Fetching ${endpoint} (Start: ${startPage}, Max Pages: ${maxPages}) ---`)
  
  let processed = 0
  const endPage = startPage + maxPages - 1
  
  for (let page = startPage; page <= endPage; page++) {
    try {
      const { data } = await axios.get(`https://api.themoviedb.org/3/discover/${endpoint}`, {
        params: { ...params, api_key: TMDB_API_KEY, page }
      })
      
      const results = data.results || []
      if (results.length === 0) break
      
      // Process batch
      await Promise.all(results.map(item => processItem(item, endpoint)))
      
      processed += results.length
      console.log(`Page ${page} done. Total processed: ${processed}`)
      
      // Simple rate limit wait
      await new Promise(r => setTimeout(r, 200))
      
    } catch (e) {
      if (e.response && e.response.status === 400) {
        console.warn(`Page ${page} limit reached (TMDB 500 limit). Stopping this batch.`)
        break
      }
      console.error(`Error on page ${page}:`, e.message)
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

async function fetchByYear(endpoint, startYear, endYear, pagesPerYear = 20) {
    console.log(`=== Fetching ${endpoint} by Year (${startYear} -> ${endYear}) ===`)
    for (let year = startYear; year >= endYear; year--) {
        console.log(`\n>>> Processing Year: ${year}`)
        const params = {
            sort_by: 'popularity.desc',
            'primary_release_year': year, // for movies
            'first_air_date_year': year, // for tv
        }
        
        // Adjust param key based on endpoint
        const yearParam = endpoint === 'movie' ? { primary_release_year: year } : { first_air_date_year: year }
        
        await fetchDiscover(endpoint, {
            sort_by: 'popularity.desc',
            ...yearParam
        }, pagesPerYear)
    }
}

async function processItem(item, endpoint) {
  const tmdbId = item.id
  const isMovie = endpoint === 'movie'
  const tableName = isMovie ? 'movies' : 'tv_series'
  
  let originCountry = item.origin_country || []
  const originalLanguage = item.original_language
  const title = isMovie ? item.title : item.name
  const originalTitle = isMovie ? item.original_title : item.original_name
  const releaseDate = isMovie ? item.release_date : item.first_air_date
  
  // Fetch details only for Arabic movies to get country
  if (isMovie && originalLanguage === 'ar') {
    try {
      const { data: det } = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}`, {
        params: { api_key: TMDB_API_KEY }
      })
      if (det.production_countries) {
        originCountry = det.production_countries.map(c => c.iso_3166_1)
      }
    } catch (e) {
      // ignore
    }
  }

  const isPlayVal = isMovie ? isPlay(title, originalTitle) : false
  const isRamadanVal = !isMovie ? isRamadan(releaseDate, originCountry, originalLanguage) : false
  
  const payload = {
    id: tmdbId,
    overview: item.overview,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    rating_color: 'yellow',
    genres: item.genre_ids, // Store IDs directly. Supabase handles JSON/Text[] conversion usually if column is correct type.
    origin_country: originCountry,
    updated_at: new Date().toISOString()
  }
  
  if (isMovie) {
    payload.title = title
    payload.arabic_title = title // simplistic
    payload.release_date = releaseDate || null
    payload.is_play = isPlayVal
  } else {
    payload.name = title
    payload.arabic_name = title
    payload.first_air_date = releaseDate || null
    payload.is_ramadan = isRamadanVal
  }

  try {
    const { error } = await supabase.from(tableName).upsert(payload)
    if (error) console.error(`Error upserting ${tmdbId}:`, error.message)
  } catch (e) {
    console.error(`Exception upserting ${tmdbId}:`, e.message)
  }
}

// Run
(async () => {
  const args = process.argv.slice(2)
  const pagesArg = args.find(a => a.startsWith('--pages='))
  const startArg = args.find(a => a.startsWith('--start='))
  const yearArg = args.find(a => a.startsWith('--year='))
  
  const pages = pagesArg ? parseInt(pagesArg.split('=')[1]) : 5
  const startPage = startArg ? parseInt(startArg.split('=')[1]) : 1
  const startYear = yearArg ? parseInt(yearArg.split('=')[1]) : 2024

  console.log("🚀 Starting Mega Import (Node.js) - Aggressive Mode for 100k+ Items...")
  
  if (yearArg) {
      console.log(`Mode: Year-based Fetch (Starting ${startYear})`)
      
      // Phase 1: Modern Era (2024 -> 2005) - High Volume (50 pages/year)
      // 20 years * 50 pages * 20 items * 2 types = ~40,000 items
      console.log("\n=== Phase 1: Modern Era (2024-2005) - High Volume ===")
      await fetchByYear('movie', startYear, 2005, 50)
      await fetchByYear('tv', startYear, 2005, 50)

      // Phase 2: Blockbuster Era (2004 -> 1990) - Popular (30 pages/year)
      // 15 years * 30 pages * 20 items * 2 types = ~18,000 items
      console.log("\n=== Phase 2: Blockbuster Era (2004-1990) - Popular ===")
      for (let year = 2004; year >= 1990; year--) {
          console.log(`\n>>> Processing Blockbuster Year: ${year}`)
           const yearParamMovie = { primary_release_year: year }
           const yearParamTv = { first_air_date_year: year }
           
           await fetchDiscover('movie', {
               sort_by: 'popularity.desc',
               'vote_count.gte': 100, // Less strict
               'vote_average.gte': 5.0, // Include average movies too
               ...yearParamMovie
           }, 30)

           await fetchDiscover('tv', {
               sort_by: 'popularity.desc',
               'vote_count.gte': 50,
               'vote_average.gte': 5.0,
               ...yearParamTv
           }, 30)
      }

      // Phase 3: Golden Era (1989 -> 1970) - Classics (20 pages/year)
      // 20 years * 20 pages * 20 items * 2 types = ~16,000 items
      console.log("\n=== Phase 3: Golden Era (1989-1970) - Classics ===")
      for (let year = 1989; year >= 1970; year--) {
          console.log(`\n>>> Processing Golden Year: ${year}`)
           const yearParamMovie = { primary_release_year: year }
           const yearParamTv = { first_air_date_year: year }
           
           await fetchDiscover('movie', {
               sort_by: 'vote_average.desc',
               'vote_count.gte': 50, // Allow hidden gems
               'vote_average.gte': 6.0,
               ...yearParamMovie
           }, 20) 

           await fetchDiscover('tv', {
               sort_by: 'vote_average.desc',
               'vote_count.gte': 30,
               'vote_average.gte': 6.0,
               ...yearParamTv
           }, 20)
      }

      // Phase 4: Ancient Era (1969 -> 1950) - Oldies (10 pages/year)
      // 20 years * 10 pages * 20 items * 2 types = ~8,000 items
      console.log("\n=== Phase 4: Ancient Era (1969-1950) - Oldies ===")
      for (let year = 1969; year >= 1950; year--) {
          console.log(`\n>>> Processing Ancient Year: ${year}`)
           const yearParamMovie = { primary_release_year: year }
           const yearParamTv = { first_air_date_year: year }
           
           await fetchDiscover('movie', {
               sort_by: 'popularity.desc',
               ...yearParamMovie
           }, 10) 

           await fetchDiscover('tv', {
               sort_by: 'popularity.desc',
               ...yearParamTv
           }, 10)
      }

  } else {
      console.log(`Mode: Global Popularity (Pages=${pages}, Start=${startPage})`)
      // 1. Arabic Movies
      await fetchDiscover('movie', {
        with_original_language: 'ar',
        sort_by: 'popularity.desc'
      }, pages, startPage)
      
      // 2. Arabic TV
      await fetchDiscover('tv', {
        with_original_language: 'ar',
        sort_by: 'popularity.desc'
      }, pages, startPage)

      // 3. Global Popular
      await fetchDiscover('movie', {
        sort_by: 'popularity.desc'
      }, Math.ceil(pages / 2), startPage)

      await fetchDiscover('tv', {
        sort_by: 'popularity.desc'
      }, Math.ceil(pages / 2), startPage)
  }

  console.log("✅ Mega Import Done.")
})()
