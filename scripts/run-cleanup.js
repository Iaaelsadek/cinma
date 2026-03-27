// ✅ Cleanup Script Runner: Remove Malformed Records
import pkg from 'pg'
const { Pool } = pkg
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })
dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

async function runCleanup() {
  console.log('🧹 Starting cleanup of malformed records...\n')

  try {
    // Step 1: Count before cleanup
    console.log('📊 BEFORE CLEANUP:')
    const beforeMovies = await pool.query('SELECT COUNT(*) FROM movies WHERE tmdb_id IS NULL OR tmdb_id <= 0')
    const beforeTV = await pool.query('SELECT COUNT(*) FROM tv_series WHERE tmdb_id IS NULL OR tmdb_id <= 0')
    const totalMovies = await pool.query('SELECT COUNT(*) FROM movies')
    const totalTV = await pool.query('SELECT COUNT(*) FROM tv_series')

    console.log(`  Malformed Movies: ${beforeMovies.rows[0].count}`)
    console.log(`  Malformed TV Series: ${beforeTV.rows[0].count}`)
    console.log(`  Total Movies: ${totalMovies.rows[0].count}`)
    console.log(`  Total TV Series: ${totalTV.rows[0].count}\n`)

    // Step 2: Delete malformed movies
    console.log('🗑️  Deleting malformed movies...')
    const deleteMoviesResult = await pool.query('DELETE FROM movies WHERE tmdb_id IS NULL OR tmdb_id <= 0')
    console.log(`  ✅ Deleted ${deleteMoviesResult.rowCount} malformed movies\n`)

    // Step 3: Delete malformed TV series
    console.log('🗑️  Deleting malformed TV series...')
    const deleteTVResult = await pool.query('DELETE FROM tv_series WHERE tmdb_id IS NULL OR tmdb_id <= 0')
    console.log(`  ✅ Deleted ${deleteTVResult.rowCount} malformed TV series\n`)

    // Step 4: Count after cleanup
    console.log('📊 AFTER CLEANUP:')
    const afterMovies = await pool.query('SELECT COUNT(*) FROM movies WHERE tmdb_id IS NULL OR tmdb_id <= 0')
    const afterTV = await pool.query('SELECT COUNT(*) FROM tv_series WHERE tmdb_id IS NULL OR tmdb_id <= 0')
    const finalMovies = await pool.query('SELECT COUNT(*) FROM movies')
    const finalTV = await pool.query('SELECT COUNT(*) FROM tv_series')

    console.log(`  Malformed Movies: ${afterMovies.rows[0].count}`)
    console.log(`  Malformed TV Series: ${afterTV.rows[0].count}`)
    console.log(`  Total Movies: ${finalMovies.rows[0].count}`)
    console.log(`  Total TV Series: ${finalTV.rows[0].count}\n`)

    // Step 5: Show sample
    console.log('📋 SAMPLE REMAINING RECORDS:')
    const sampleMovies = await pool.query('SELECT id, tmdb_id, title FROM movies ORDER BY id DESC LIMIT 3')
    console.log('  Movies:')
    sampleMovies.rows.forEach(m => console.log(`    - ID: ${m.id}, TMDB: ${m.tmdb_id}, Title: ${m.title}`))

    const sampleTV = await pool.query('SELECT id, tmdb_id, name FROM tv_series ORDER BY id DESC LIMIT 3')
    console.log('  TV Series:')
    sampleTV.rows.forEach(t => console.log(`    - ID: ${t.id}, TMDB: ${t.tmdb_id}, Name: ${t.name}`))

    console.log('\n✅ Cleanup completed successfully!')

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    throw error
  } finally {
    await pool.end()
  }
}

runCleanup().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
