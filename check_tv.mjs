
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function checkTvReports() {
  const { data, error } = await supabase.from('link_checks').select('*').eq('content_type', 'tv').limit(5)
  if (error) {
    console.error('Error fetching tv reports:', error)
  } else {
    console.log('Sample tv reports:', data)
  }
}

checkTvReports()
