
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
)

async function checkIds() {
  const ids = [482600, 560821]
  console.log('Checking broken reports for IDs:', ids)

  for (const id of ids) {
    const { data, count, error } = await supabase
      .from('broken_links_report')
      .select('*', { count: 'exact' })
      .eq('tmdb_id', id)

    if (error) {
      console.error(`Error checking ID ${id}:`, error)
      continue
    }

    console.log(`Movie ID ${id}: ${count} broken reports`)
    
    if (data && data.length > 0) {
      const servers = new Set(data.map(r => r.server_id))
      console.log(`- Unique broken servers: ${servers.size}`)
      console.log(`- Server IDs: ${Array.from(servers).join(', ')}`)
    }
  }
}

checkIds()
