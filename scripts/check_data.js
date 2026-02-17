
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

let envConfig = {}
try {
  const envPath = path.resolve('.env')
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

  console.log('--------------------------------')
}

check()
