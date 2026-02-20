
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let envConfig = {}
try {
  const envPath = path.resolve(__dirname, '../.env')
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      envConfig[key] = val
    }
  })
} catch (e) {}

const supabaseUrl = envConfig.VITE_SUPABASE_URL
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('--- Checking Database Status ---')

  // Check Movies
  const { count: movieCount, error: mError } = await supabase.from('movies').select('*', { count: 'exact', head: true })
  if (mError) console.log('Movies Error:', mError.message)
  else console.log(`Movies Count: ${movieCount}`)

  // Check TV Series
  const { count: seriesCount, error: sError } = await supabase.from('tv_series').select('*', { count: 'exact', head: true })
  if (sError) console.log('Series Error:', sError.message)
  else console.log(`Series Count: ${seriesCount}`)

  // Check Ramadan Content
  const { count: ramadanCount, error: rError } = await supabase.from('tv_series').select('*', { count: 'exact', head: true }).eq('is_ramadan', true)
  if (rError) {
    console.log('Ramadan Series Error Object:', JSON.stringify(rError, null, 2))
  } else {
    console.log(`Ramadan Series Count: ${ramadanCount}`)
  }

  // Check Plays
  const { count: playsCount, error: pError } = await supabase.from('movies').select('*', { count: 'exact', head: true }).eq('is_play', true)
  if (pError) {
    console.log('Plays Error Object:', JSON.stringify(pError, null, 2))
  } else {
    console.log(`Plays Count: ${playsCount}`)
  }

  // Check Videos Distribution
  const { data: videos, error: vError } = await supabase.from('videos').select('category')
  if (vError) {
    console.log('Videos Error:', vError.message)
  } else {
    const counts = {}
    videos.forEach(v => {
      const c = v.category || 'null'
      counts[c] = (counts[c] || 0) + 1
    })
    console.log('Videos Categories:', JSON.stringify(counts, null, 2))
  }

  // Check Anime
  const { count: animeCount, error: aError } = await supabase.from('anime').select('*', { count: 'exact', head: true })
  if (aError) console.log('Anime Error:', aError.message)
  else console.log(`Anime Count: ${animeCount}`)

  // Check Quran Reciters
  const { count: quranCount, error: qError } = await supabase.from('quran_reciters').select('*', { count: 'exact', head: true })
  if (qError) console.log('Quran Reciters Error:', qError.message)
  else console.log(`Quran Reciters Count: ${quranCount}`)

  // Check Quran Image URL format
  const { data: quranItem } = await supabase.from('quran_reciters').select('image').limit(1).single()
  if (quranItem) console.log('Quran Image Example:', quranItem.image)

  // Check Anime Image URL format
  const { data: animeItem } = await supabase.from('anime').select('image_url').limit(1).single()
  if (animeItem) console.log('Anime Image Example:', animeItem.image_url)

  console.log('--------------------------------')
}

check()
