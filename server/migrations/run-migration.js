#!/usr/bin/env node
/**
 * Migration Runner Script
 * Usage: node server/migrations/run-migration.js <migration-file>
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'
import dotenv from 'dotenv'

const { Pool } = pkg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const COCKROACHDB_URL = process.env.COCKROACHDB_URL

if (!COCKROACHDB_URL) {
  console.error('❌ COCKROACHDB_URL not set')
  process.exit(1)
}

async function runMigration(migrationFile) {
  const pool = new Pool({
    connectionString: COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔗 Connecting to CockroachDB...')
    const client = await pool.connect()
    console.log('✅ Connected')
    client.release()

    const migrationPath = path.join(__dirname, migrationFile)
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }

    console.log(`📄 Reading: ${migrationFile}`)
    const sql = fs.readFileSync(migrationPath, 'utf8')

    // Split into individual statements, skip comments
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        if (!s) return false
        const lines = s.split('\n').filter(l => l.trim() && !l.trim().startsWith('--'))
        return lines.length > 0
      })

    console.log(`📊 ${statements.length} statements to execute\n`)

    let success = 0, skipped = 0

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      const match = stmt.match(/CREATE INDEX CONCURRENTLY IF NOT EXISTS (\w+)/i)
      const name = match ? match[1] : `Statement ${i + 1}`

      try {
        console.log(`  [${i+1}/${statements.length}] ${name}...`)
        await pool.query(stmt + ';')
        console.log(`  ✅ Done: ${name}`)
        success++
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`  ⏭️  Skipped: ${name} (already exists)`)
          skipped++
        } else {
          console.error(`  ❌ Failed: ${name} - ${err.message}`)
          throw err
        }
      }
    }

    console.log(`\n✨ Migration complete! Created: ${success}, Skipped: ${skipped}`)

    // Verify
    const result = await pool.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE indexname LIKE 'idx_%genre%' OR indexname LIKE 'idx_%category%'
      ORDER BY tablename, indexname
    `)
    console.log(`\n🔍 Found ${result.rows.length} genre/category indexes:`)
    result.rows.forEach(r => console.log(`   - ${r.tablename}.${r.indexname}`))

  } finally {
    await pool.end()
    console.log('\n🔌 Connection closed')
  }
}

const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('Usage: node server/migrations/run-migration.js <file>')
  process.exit(1)
}

runMigration(migrationFile).catch(err => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})
