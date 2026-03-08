
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function checkSeries() {
  const { data, error } = await supabase.from('series').select('*').limit(5)
  if (error) {
    console.error('Error fetching series:', error)
  } else {
    console.log('Sample series:', JSON.stringify(data, null, 2))
  }
}

checkSeries()
