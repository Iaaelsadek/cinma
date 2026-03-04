
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  const { data, error } = await supabase
    .from('link_checks')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error fetching link_checks:', error)
  } else {
    if (data && data.length > 0) {
      console.log('Columns found in link_checks:', Object.keys(data[0]))
    } else {
      console.log('No rows found in link_checks table.')
    }
  }
}

checkColumns()
