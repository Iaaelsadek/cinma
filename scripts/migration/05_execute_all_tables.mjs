#!/usr/bin/env node
// ==========================================
// Execute all table creation scripts
// Creates actors, games, and software tables in CockroachDB
// ==========================================

import dotenv from 'dotenv'
import pkg from 'pg'
import { readFileSync } from 'fs'
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

async function executeSQLFile(filename, description) {
  console.log(`\n📄 Executing: ${description}`)
  console.log(`   File: ${filename}`)
  
  try {
    const sql = readFileSync(join(__dirname, filename), 'utf8')
    const client = await pool.connect()
    
    try {
      await client.query(sql)
      console.log(`✅ Success: ${description}`)
      return true
    } finally {
      client.release()
    }
  } catch (error) {
    console.error(`❌ Error in ${filename}:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Creating all tables in CockroachDB...')
  console.log('=' .repeat(60))
  
  const tasks = [
    { file: '01_create_actors_table.sql', desc: 'Create actors table with slug support' },
    { file: '02_create_games_table.sql', desc: 'Create games table with slug support' },
    { file: '03_create_software_table.sql', desc: 'Create software table with slug support' },
  ]
  
  let successCount = 0
  
  for (const task of tasks) {
    const success = await executeSQLFile(task.file, task.desc)
    if (success) successCount++
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 Execution Summary:')
  console.log(`   Successful: ${successCount}/${tasks.length}`)
  console.log(`   Failed: ${tasks.length - successCount}/${tasks.length}`)
  
  if (successCount === tasks.length) {
    console.log('\n✅ All tables created successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Run: node scripts/migration/04_migrate_data_from_supabase.mjs')
    console.log('   2. Verify tables: node scripts/migration/06_verify_all_tables.mjs')
  } else {
    console.log('\n⚠️  Some tables failed to create. Check errors above.')
  }
  
  console.log('=' .repeat(60))
  
  await pool.end()
  process.exit(successCount === tasks.length ? 0 : 1)
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
