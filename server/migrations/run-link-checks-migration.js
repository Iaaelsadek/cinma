// Run link_checks migration
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import pool from '../../src/db/pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigration() {
  console.log('🚀 Starting link_checks migration...')
  
  try {
    // Read SQL file
    const sqlPath = join(__dirname, 'create-link-checks-table.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    
    // Execute migration
    await pool.query(sql)
    
    console.log('✅ Migration completed successfully!')
    console.log('✅ Tables created: link_checks, embed_sources')
    console.log('✅ Indexes created for better performance')
    
    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('link_checks', 'embed_sources')
    `)
    
    console.log('\n📊 Verification:')
    result.rows.forEach(row => {
      console.log(`  ✓ Table '${row.table_name}' exists`)
    })
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
