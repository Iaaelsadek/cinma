
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkyODgsImV4cCI6MjA4NjQ4NTI4OH0.QCYzJaWo0mmFQwZjwaNjIJR1jR4wOb4CbqTKxTAaO2w'
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
