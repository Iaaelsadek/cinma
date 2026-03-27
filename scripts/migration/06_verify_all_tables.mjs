#!/usr/bin/env node
// ==========================================
// Verify all tables exist with slug columns
// Checks actors, games, and software tables
// ==========================================

import dotenv from 'dotenv'
import pkg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pkg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env.local') })
dotenv.config({ path: join(__dirname, '../../.env') })

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

async function verifyTable(tableName) {
  console.log(`\n🔍 Verifying table: ${tableName}`)
  console.log('─'.repeat(60))
  
  const client = await pool.connect()
  
  try {
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName])
    
    if (tableCheck.rows.length === 0) {
      console.log(`❌ Table '${tableName}' does NOT exist`)
      return false
    }
    
    console.log(`✅ Table '${tableName}' exists`)
    
    // Get row count
    const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`)
    const count = parseInt(countResult.rows[0].count)
    console.log(`📊 Total rows: ${count.toLocaleString()}`)
    
    // Check slug column
    const slugCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = $1 AND column_name = 'slug'
    `, [tableName])
    
    if (slugCheck.rows.length === 0) {
      console.log(`❌ Slug column does NOT exist`)
      return false
    }
    
    console.log(`✅ Slug column exists (${slugCheck.rows[0].data_type}, nullable: ${slugCheck.rows[0].is_nullable})`)
    
    // Check slug indexes
    const indexCheck = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = $1 AND indexname LIKE '%slug%'
      ORDER BY indexname
    `, [tableName])
    
    if (indexCheck.rows.length === 0) {
      console.log(`⚠️  No slug indexes found`)
    } else {
      console.log(`✅ Slug indexes (${indexCheck.rows.length}):`)
      indexCheck.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`)
      })
    }
    
    // Count rows with slugs
    const slugCountResult = await client.query(`
      SELECT COUNT(*) FROM ${tableName} WHERE slug IS NOT NULL
    `)
    const slugCount = parseInt(slugCountResult.rows[0].count)
    console.log(`📝 Rows with slug: ${slugCount.toLocaleString()} (${count > 0 ? ((slugCount/count)*100).toFixed(1) : 0}%)`)
    
    // Sample data - determine correct column name for each table
    if (count > 0) {
      try {
        let nameColumn = 'title' // default for movies, games, software
        if (tableName === 'actors') nameColumn = 'name'
        if (tableName === 'tv_series') nameColumn = 'name'
        
        const sampleResult = await client.query(`
          SELECT id, ${nameColumn} as display_name, slug 
          FROM ${tableName} 
          ORDER BY id 
          LIMIT 3
        `)
        
        console.log(`\n📋 Sample data (first 3 rows):`)
        sampleResult.rows.forEach(row => {
          console.log(`   ID ${row.id}: ${row.display_name} → slug: ${row.slug || '(null)'}`)
        })
      } catch (sampleError) {
        console.log(`\n⚠️  Could not fetch sample data: ${sampleError.message}`)
      }
    }
    
    return true
    
  } catch (error) {
    console.error(`❌ Error verifying ${tableName}:`, error.message)
    return false
  } finally {
    client.release()
  }
}

async function main() {
  console.log('🚀 Verifying all tables in CockroachDB...')
  console.log('='.repeat(60))
  
  const tables = ['actors', 'games', 'software', 'movies', 'tv_series']
  const results = {}
  
  for (const table of tables) {
    results[table] = await verifyTable(table)
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 Verification Summary:')
  console.log('─'.repeat(60))
  
  for (const [table, success] of Object.entries(results)) {
    const status = success ? '✅' : '❌'
    console.log(`${status} ${table.padEnd(15)} ${success ? 'OK' : 'FAILED'}`)
  }
  
  const successCount = Object.values(results).filter(Boolean).length
  const totalCount = Object.keys(results).length
  
  console.log('─'.repeat(60))
  console.log(`Total: ${successCount}/${totalCount} tables verified`)
  console.log('='.repeat(60))
  
  if (successCount === totalCount) {
    console.log('\n✅ All tables verified successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Generate slugs: node scripts/migration/generate_slugs.mjs')
    console.log('   2. Update API endpoints to support games/software')
    console.log('   3. Update frontend to use CockroachDB API')
  } else {
    console.log('\n⚠️  Some tables failed verification. Check errors above.')
  }
  
  await pool.end()
  process.exit(successCount === totalCount ? 0 : 1)
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
