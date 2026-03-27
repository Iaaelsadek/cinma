// Check if games table exists in CockroachDB
// Task 1.4: Verification script for games table

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

async function checkGamesTable() {
  const client = await pool.connect()
  
  try {
    console.log('🔍 Checking if games table exists in CockroachDB...\n')
    
    // Check if games table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'games'
    `)
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Games table does not exist in the database')
      console.log('📝 This task can be skipped (conditional requirement)')
      return false
    }
    
    console.log('✅ Games table exists!')
    
    // Get table structure
    console.log('\n📋 Table structure:')
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'games'
      ORDER BY ordinal_position
    `)
    
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })
    
    // Check if slug column already exists
    const slugCheck = columns.rows.find(col => col.column_name === 'slug')
    if (slugCheck) {
      console.log('\n✅ Slug column already exists in games table')
    } else {
      console.log('\n📝 Slug column does not exist yet - migration needed')
    }
    
    // Get row count
    const countResult = await client.query('SELECT COUNT(*) as count FROM games')
    const count = parseInt(countResult.rows[0].count)
    console.log(`\n📊 Total games in database: ${count.toLocaleString()}`)
    
    // Show sample data
    if (count > 0) {
      console.log('\n📊 Sample games (first 5):')
      const sample = await client.query(`
        SELECT id, title, category, rating 
        FROM games 
        ORDER BY id 
        LIMIT 5
      `)
      sample.rows.forEach(game => {
        console.log(`   - ID: ${game.id}, Title: ${game.title}, Category: ${game.category}, Rating: ${game.rating}`)
      })
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error checking games table:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run check
checkGamesTable().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
