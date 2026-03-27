// Check pg_trgm extension status
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import pkg from 'pg'
const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
})

async function checkPgTrgm() {
  try {
    console.log('🔍 Checking pg_trgm extension status\n')
    
    // Method 1: Check in pg_extension
    const ext1 = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'pg_trgm'
    `)
    console.log('Method 1 (pg_extension):')
    console.log(ext1.rows.length > 0 ? '✅ Found' : '❌ Not found')
    if (ext1.rows.length > 0) {
      console.log('Details:', ext1.rows[0])
    }
    
    // Method 2: Check available extensions
    console.log('\n🔍 Checking available extensions...')
    const ext2 = await pool.query(`
      SELECT * FROM pg_available_extensions WHERE name = 'pg_trgm'
    `)
    console.log('Method 2 (pg_available_extensions):')
    console.log(ext2.rows.length > 0 ? '✅ Available' : '❌ Not available')
    if (ext2.rows.length > 0) {
      console.log('Details:', ext2.rows[0])
    }
    
    // Method 3: Try to use trigram function
    console.log('\n🔍 Testing trigram similarity function...')
    try {
      const test = await pool.query(`
        SELECT similarity('test', 'text') as sim
      `)
      console.log('✅ Trigram functions work!')
      console.log('Similarity result:', test.rows[0])
    } catch (err) {
      console.log('❌ Trigram functions not available:', err.message)
    }
    
    // Method 4: Check if GIN index uses pg_trgm
    console.log('\n🔍 Checking GIN index definition...')
    const idx = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'movies' AND indexname = 'idx_movies_slug_trgm'
    `)
    if (idx.rows.length > 0) {
      console.log('✅ GIN index exists:')
      console.log(idx.rows[0].indexdef)
      if (idx.rows[0].indexdef.includes('gin_trgm_ops')) {
        console.log('✅ Index uses gin_trgm_ops (pg_trgm is working!)')
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkPgTrgm()
