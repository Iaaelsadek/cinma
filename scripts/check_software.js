
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env manually
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && rest) {
      let val = rest.join('=').trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      process.env[key.trim()] = val
    }
  })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing ENV variables: SUPABASE_URL/KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkSoftware() {
    console.log("Checking 'software' table...")
    const { data, error } = await supabase.from('software').select('*')
    if (error) {
        console.error("Error:", error.message)
    } else {
        console.log(`Found ${data.length} software items.`)
        data.forEach(item => {
            console.log(`- ${item.title}: ${item.poster_url}`)
        })
    }
}

checkSoftware()
