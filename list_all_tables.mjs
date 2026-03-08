
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://lhpuwupbhpcqkwqugkhh.supabase.co',
  (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "")
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
