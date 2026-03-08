
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function checkEpisodes() {
  const { data, error } = await supabase.from('episodes').select('*, seasons(series_id)').limit(5)
  if (error) {
    console.error('Error fetching episodes:', error)
  } else {
    console.log('Sample episodes:', JSON.stringify(data, null, 2))
  }
}

checkEpisodes()
