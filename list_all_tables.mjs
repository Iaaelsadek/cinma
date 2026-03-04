
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDkyODgsImV4cCI6MjA4NjQ4NTI4OH0.QCYzJaWo0mmFQwZjwaNjIJR1jR4wOb4CbqTKxTAaO2w'
)

async function listAllTables() {
  const { data, error } = await supabase.rpc('get_tables')
  if (error) {
    // If RPC doesn't exist, try a different way
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
    
    if (tablesError) {
      console.error('Error listing tables:', tablesError)
    } else {
      console.log('Tables in public schema:', tables.map(t => t.tablename))
    }
  } else {
    console.log('Tables:', data)
  }
}

listAllTables()
