/**
 * Re-export movies from Supabase with proper pagination (no duplicates)
 * Uses cursor-based pagination via id ordering
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../../.env.local') })

const DATA_DIR = join(__dirname, 'data')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

const PAGE = 1000
let all = []
let lastId = 0
let page = 0

console.log('📤 Re-exporting movies from Supabase (cursor-based)...')

while (true) {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .gt('id', lastId)
    .order('id', { ascending: true })
    .limit(PAGE)

  if (error) { console.error('Error:', error.message); process.exit(1) }
  if (!data || data.length === 0) break

  all.push(...data)
  lastId = data[data.length - 1].id
  page++
  process.stdout.write(`  Page ${page}: ${all.length.toLocaleString()} rows (last id: ${lastId})...\r`)

  if (data.length < PAGE) break
}

console.log(`\n✅ Exported ${all.length.toLocaleString()} unique movies`)

// Verify uniqueness
const ids = new Set(all.map(m => m.id))
console.log(`   Unique IDs: ${ids.size.toLocaleString()}`)

writeFileSync(join(DATA_DIR, 'movies.json'), JSON.stringify(all, null, 0), 'utf8')
console.log('💾 Saved to scripts/migration/data/movies.json')
