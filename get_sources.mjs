
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function getSources() {
  const { data, error } = await supabase
    .from('link_checks')
    .select('source_name')
  
  if (error) {
    console.error('Error:', error)
    return
  }

  const sources = new Set(data.map(r => r.source_name))
  console.log('Unique Sources in link_checks:', Array.from(sources))
  console.log('Total Unique Sources count:', sources.size)
}

getSources()
