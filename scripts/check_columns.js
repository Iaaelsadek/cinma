
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env
const envPath = path.join(__dirname, '..', '.env')
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: Missing Environment Variables.")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkColumns() {
  console.log("Checking columns...")
  
  // Check 'is_ramadan' in 'tv_series'
  const { data: seriesData, error: seriesError } = await supabase
    .from('tv_series')
    .select('is_ramadan')
    .limit(1)
  
  if (seriesError) {
    console.error("Error checking 'is_ramadan' in 'tv_series':", seriesError.message)
  } else {
    console.log("Success: 'is_ramadan' column exists in 'tv_series'.")
  }

  // Check 'is_play' in 'movies'
  const { data: moviesData, error: moviesError } = await supabase
    .from('movies')
    .select('is_play')
    .limit(1)

  if (moviesError) {
    console.error("Error checking 'is_play' in 'movies':", moviesError.message)
  } else {
    console.log("Success: 'is_play' column exists in 'movies'.")
  }

  // Check 'origin_country' in 'tv_series'
  const { data: ocSeries, error: ocSeriesError } = await supabase
    .from('tv_series')
    .select('origin_country')
    .limit(1)
    
  if (ocSeriesError) {
    console.error("Error checking 'origin_country' in 'tv_series':", ocSeriesError.message)
  } else {
    console.log("Success: 'origin_country' column exists in 'tv_series'.")
  }

  // Check 'tmdb_id' in 'movies'
  const { data: tmdbMovies, error: tmdbMoviesError } = await supabase
    .from('movies')
    .select('tmdb_id')
    .limit(1)

  if (tmdbMoviesError) {
    console.error("Error checking 'tmdb_id' in 'movies':", tmdbMoviesError.message)
  } else {
    console.log("Success: 'tmdb_id' column exists in 'movies'.")
  }
}

checkColumns()
