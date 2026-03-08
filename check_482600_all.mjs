
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function checkMovie482600All() {
  const { data, error } = await supabase
    .from('link_checks')
    .select('source_name, status_code')
    .eq('content_id', 482600)
  
  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Movie 482600 reports in DB:`, data)
}

checkMovie482600All()
