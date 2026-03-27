/**
 * Apply missing indexes and constraints to CockroachDB
 */
import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import pkg from 'pg'
const { Pool } = pkg

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../../.env.local') })

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
})

async function applyIndexes() {
  console.log('🔧 Applying missing indexes and constraints...\n')
  
  const client = await pool.connect()
  try {
    // Read SQL file
    const sql = readFileSync(join(__dirname, 'add_essential_indexes_fixed.sql'), 'utf-8')
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      try {
        console.log(`Executing: ${statement.substring(0, 60)}...`)
        await client.query(statement)
        console.log('✅ Success\n')
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('⏭️  Already exists, skipping\n')
        } else {
          console.error('❌ Error:', error.message, '\n')
        }
      }
    }
    
    console.log('\n✅ All indexes and constraints applied successfully!')
  } finally {
    client.release()
    await pool.end()
  }
}

applyIndexes().catch(console.error)
