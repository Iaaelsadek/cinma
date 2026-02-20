
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAnon() {
  console.log('--- Checking Anonymous Access (RLS) ---')
  
  // Try to read videos
  const { data: videos, error: vError } = await supabase.from('videos').select('id').limit(5)
  if (vError) {
    console.log('❌ Videos Table Access Failed:', vError.message)
    console.log('   Hint: Check RLS policies for "videos" table.')
  } else {
    console.log(`✅ Videos Table Access OK. Read ${videos.length} items.`)
  }

  // Try to read movies
  const { data: movies, error: mError } = await supabase.from('movies').select('id').limit(5)
  if (mError) {
    console.log('❌ Movies Table Access Failed:', mError.message)
  } else {
    console.log(`✅ Movies Table Access OK. Read ${movies.length} items.`)
  }

    // Try to read anime
  const { data: anime, error: aError } = await supabase.from('anime').select('id').limit(5)
  if (aError) {
    console.log('❌ Anime Table Access Failed:', aError.message)
  } else {
    console.log(`✅ Anime Table Access OK. Read ${anime.length} items.`)
  }

  console.log('---------------------------------------')
}

checkAnon()
