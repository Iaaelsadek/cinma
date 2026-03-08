
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function checkLinkChecks() {
  const { data, error } = await supabase.from('link_checks').select('*').limit(5)
  if (error) {
    console.error('Error fetching link_checks:', error)
  } else {
    console.log('Sample data from link_checks:', data)
  }
}

checkLinkChecks()
