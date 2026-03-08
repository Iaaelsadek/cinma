
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function checkEmbedLinks() {
  const { data, error } = await supabase.from('embed_links').select('*').limit(5)
  if (error) {
    console.error('Error fetching embed_links:', error)
  } else {
    console.log('Sample data from embed_links:', data)
  }
}

checkEmbedLinks()
