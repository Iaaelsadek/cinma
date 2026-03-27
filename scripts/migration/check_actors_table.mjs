// Verification script: Check if actors table exists
// Task 1.3: إضافة عمود slug لجدول actors في CockroachDB (إن وجد)

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

async function checkActorsTable() {
  const client = await pool.connect()
  
  try {
    console.log('🔍 Checking if actors table exists in CockroachDB...\n')
    
    // Check if actors table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'actors'
    `)
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Actors table does NOT exist in the database')
      console.log('\n📋 Task 1.3 Status: SKIPPED')
      console.log('   Reason: The actors table does not exist in the current schema')
      console.log('   Note: Task 1.3 is conditional ("إن وجد" - if exists)')
      console.log('\n✅ This is expected behavior - no action needed')
      
      // List existing tables for reference
      console.log('\n📊 Existing tables in database:')
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `)
      tables.rows.forEach(table => {
        console.log(`   - ${table.table_name}`)
      })
      
      return false
    } else {
      console.log('✅ Actors table EXISTS in the database')
      console.log('   Migration can proceed with adding slug column')
      return true
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message)
    console.error('Stack trace:', error.stack)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run check
checkActorsTable()
  .then(exists => {
    process.exit(exists ? 0 : 0) // Exit with 0 in both cases (not an error)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
