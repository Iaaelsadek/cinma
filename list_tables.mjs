
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function listTables() {
  // Supabase doesn't have a direct 'list tables' in the JS client without RPC or postgres functions
  // But we can try to query some common tables to see what works
  const commonTables = ['broken_links_report', 'embed_links', 'movies', 'series', 'episodes', 'reports']
  
  for (const table of commonTables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`Table ${table}: NOT FOUND (${error.message})`)
    } else {
      console.log(`Table ${table}: EXISTS`)
    }
  }
}

listTables()
