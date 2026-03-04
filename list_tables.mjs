
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkyODgsImV4cCI6MjA4NjQ4NTI4OH0.QCYzJaWo0mmFQwZjwaNjIJR1jR4wOb4CbqTKxTAaO2w'
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
