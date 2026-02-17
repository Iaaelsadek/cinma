
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

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

// ---------------------------------------------------------------------
// 1. Helper: Ramadan Dates
// ---------------------------------------------------------------------
const RAMADAN_DATES = {
  2010: "08-11", 2011: "08-01", 2012: "07-20", 2013: "07-09",
  2014: "06-29", 2015: "06-18", 2016: "06-06", 2017: "05-27",
  2018: "05-16", 2019: "05-06", 2020: "04-24", 2021: "04-13",
  2022: "04-02", 2023: "03-23", 2024: "03-11", 2025: "02-28",
  2026: "02-17"
}

function isDateInRamadanWindow(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const startStr = RAMADAN_DATES[year]
  if (!startStr) return false

  const startDate = new Date(`${year}-${startStr}`)
  // Window: -5 days before to +35 days after start
  const diffTime = d.getTime() - startDate.getTime()
  const diffDays = diffTime / (1000 * 3600 * 24)
  
  return diffDays >= -5 && diffDays <= 35
}

// ---------------------------------------------------------------------
// 2. Tagger Logic
// ---------------------------------------------------------------------
async function tagContent() {
  // await loginAsAdmin()

  console.log('--- Starting Content Tagger ---')

  // --- Tag Series (Ramadan) ---
  console.log('\nScanning Series for Ramadan content...')
  const { data: series, error: sError } = await supabase.from('tv_series').select('id, name, overview, first_air_date, original_language')
  
  if (sError) {
    console.error('Error fetching series:', sError.message)
  } else if (series && series.length > 0) {
    let ramadanCount = 0
    for (const item of series) {
      let isRamadan = false
      const title = item.name // Map name to title for logic

      // Check 1: Date Window AND Language
      if (isDateInRamadanWindow(item.first_air_date)) {
        if (item.original_language === 'ar') {
           isRamadan = true
           console.log(`[RAMADAN DETECTED]: ${title} (${item.first_air_date})`)
        }
      }

      // Check 3: Keywords
      if (!isRamadan) {
         const keywords = ["رمضان", "Ramadan"]
         const text = `${title} ${item.overview || ''}`
         if (keywords.some(k => text.includes(k))) {
            // Also check language or if keyword is Arabic
            if (item.original_language === 'ar' || text.includes("رمضان")) {
               isRamadan = true
               console.log(`[RAMADAN KEYWORD]: ${title}`)
            }
         }
      }

      if (isRamadan) {
        // Try update
        const { error: uError } = await supabase.from('tv_series').update({ is_ramadan: true }).eq('id', item.id)
        if (uError) {
          console.error(`Failed to update ${title}:`, uError.message)
          if (uError.message.includes('column "is_ramadan" does not exist')) {
             console.error("CRITICAL: 'is_ramadan' column missing. Run migration script.")
             break // Stop trying to update series
          }
        } else {
          ramadanCount++
        }
      }
    }
    console.log(`Tagged ${ramadanCount} Ramadan series.`)
  } else {
    console.log('No series found to scan.')
  }

  // --- Tag Movies (Plays) ---
  console.log('\nScanning Movies for Plays...')
  const { data: movies, error: mError } = await supabase.from('movies').select('id, title, overview')

  if (mError) {
    console.error('Error fetching movies:', mError.message)
  } else if (movies && movies.length > 0) {
    let playsCount = 0
    for (const item of movies) {
      let isPlay = false
      const keywords = ["مسرحية", "Play", "theatre", "Theater"]
      const text = `${item.title} ${item.overview || ''}`
      
      if (keywords.some(k => text.includes(k))) {
        isPlay = true
        console.log(`[PLAY DETECTED]: ${item.title}`)
      }

      if (isPlay) {
        const { error: uError } = await supabase.from('movies').update({ is_play: true }).eq('id', item.id)
        if (uError) {
          console.error(`Failed to update ${item.title}:`, uError.message)
          if (uError.message.includes('column "is_play" does not exist')) {
             console.error("CRITICAL: 'is_play' column missing. Run migration script.")
             break 
          }
        } else {
          playsCount++
        }
      }
    }
    console.log(`Tagged ${playsCount} plays.`)
  } else {
    console.log('No movies found to scan.')
  }

  console.log('\n--- Tagging Complete ---')
}

tagContent()
