
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log('Checking profiles table schema...')
  
  // Try to insert a dummy row to get column error? No, just select one row
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error fetching profiles:', error)
  } else {
    if (data && data.length > 0) {
      console.log('Columns found:', Object.keys(data[0]))
    } else {
      console.log('No rows found in profiles table.')
      // Try to get structure via RPC or just assumption
    }
  }
}

checkSchema()
