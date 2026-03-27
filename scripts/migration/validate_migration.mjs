#!/usr/bin/env node
/**
 * validate_migration.mjs
 * Validates CockroachDB migration completeness and data integrity
 * Usage: node scripts/migration/validate_migration.mjs
 */

import pkg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env.local') })

const { Pool } = pkg

const EXPECTED_MOVIES = 30890
const EXPECTED_TV = 17547

const crdb = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
})

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_ANON_KEY || ''
)

let passed = 0
let failed = 0

function ok(msg) { console.log(`  ✅ ${msg}`); passed++ }
function fail(msg) { console.log(`  ❌ ${msg}`); failed++ }
function section(title) { console.log(`\n📋 ${title}`) }

async function q(sql, params = []) {
  const r = await crdb.query(sql, params)
  return r.rows
}

async function main() {
  console.log('🔍 Cinema Migration Validator\n')

  // ── 1. Row counts ──────────────────────────────────────────────
  section('Row Counts')
  const [{ count: movieCount }] = await q('SELECT COUNT(*) FROM movies')
  const [{ count: tvCount }] = await q('SELECT COUNT(*) FROM tv_series')
  const movies = parseInt(movieCount)
  const tv = parseInt(tvCount)

  console.log(`  Movies:    ${movies.toLocaleString()} / ${EXPECTED_MOVIES.toLocaleString()} (${Math.round(movies / EXPECTED_MOVIES * 100)}%)`)
  console.log(`  TV Series: ${tv.toLocaleString()} / ${EXPECTED_TV.toLocaleString()} (${Math.round(tv / EXPECTED_TV * 100)}%)`)

  if (movies >= EXPECTED_MOVIES) ok(`Movies complete (${movies})`)
  else fail(`Movies incomplete: ${movies} / ${EXPECTED_MOVIES} (${EXPECTED_MOVIES - movies} missing)`)

  if (tv >= EXPECTED_TV) ok(`TV series complete (${tv})`)
  else fail(`TV series incomplete: ${tv} / ${EXPECTED_TV} (${EXPECTED_TV - tv} missing)`)

  // ── 2. NULL checks on critical columns ────────────────────────
  section('NULL Value Checks')
  const nullChecks = [
    ['movies', 'title', 'movies.title'],
    ['movies', 'poster_path', 'movies.poster_path'],
    ['tv_series', 'name', 'tv_series.name'],
    ['tv_series', 'poster_path', 'tv_series.poster_path'],
  ]
  for (const [table, col, label] of nullChecks) {
    const [{ count }] = await q(`SELECT COUNT(*) FROM ${table} WHERE ${col} IS NULL`)
    const n = parseInt(count)
    if (n === 0) ok(`No NULLs in ${label}`)
    else fail(`${n} NULLs in ${label}`)
  }

  // ── 3. JSONB genres validation ─────────────────────────────────
  section('JSONB Genres Validation')
  const [{ count: badMovieGenres }] = await q(
    `SELECT COUNT(*) FROM movies WHERE genres IS NOT NULL AND jsonb_typeof(genres) != 'array'`
  )
  const [{ count: badTvGenres }] = await q(
    `SELECT COUNT(*) FROM tv_series WHERE genres IS NOT NULL AND jsonb_typeof(genres) != 'array'`
  )
  if (parseInt(badMovieGenres) === 0) ok('movies.genres is valid JSONB array')
  else fail(`${badMovieGenres} movies have invalid genres JSONB`)
  if (parseInt(badTvGenres) === 0) ok('tv_series.genres is valid JSONB array')
  else fail(`${badTvGenres} TV series have invalid genres JSONB`)

  // ── 4. Random sample spot-check ───────────────────────────────
  section('Random Sample Spot-Check (10 records each)')
  const sampleMovies = await q(
    `SELECT id, title, vote_average, popularity FROM movies ORDER BY RANDOM() LIMIT 10`
  )
  const sampleTV = await q(
    `SELECT id, name, vote_average, popularity FROM tv_series ORDER BY RANDOM() LIMIT 10`
  )

  const validMovies = sampleMovies.filter(m => m.title && m.vote_average >= 0 && m.popularity >= 0)
  const validTV = sampleTV.filter(t => t.name && t.vote_average >= 0 && t.popularity >= 0)

  if (validMovies.length === 10) ok('All 10 sampled movies have valid data')
  else fail(`Only ${validMovies.length}/10 sampled movies have valid data`)
  if (validTV.length === 10) ok('All 10 sampled TV series have valid data')
  else fail(`Only ${validTV.length}/10 sampled TV series have valid data`)

  // ── 5. Index existence ────────────────────────────────────────
  section('Index Checks')
  const indexes = await q(
    `SELECT index_name FROM [SHOW INDEXES FROM movies] WHERE index_name LIKE 'idx_%'`
  ).catch(() => [])
  const tvIndexes = await q(
    `SELECT index_name FROM [SHOW INDEXES FROM tv_series] WHERE index_name LIKE 'idx_%'`
  ).catch(() => [])

  const allIndexNames = [...indexes, ...tvIndexes].map(r => r.index_name)
  const requiredIndexes = ['idx_movies_popularity', 'idx_tv_popularity', 'idx_movies_title_trgm', 'idx_tv_name_trgm']
  for (const idx of requiredIndexes) {
    if (allIndexNames.includes(idx)) ok(`Index exists: ${idx}`)
    else fail(`Missing index: ${idx}`)
  }

  // ── 6. API health check ───────────────────────────────────────
  section('API Health Check')
  try {
    const res = await fetch('http://localhost:3001/api/db/health').catch(() => null)
    if (res && res.ok) {
      const data = await res.json()
      ok(`API healthy - movies: ${data.movies}, tv: ${data.tv_series}`)
    } else {
      console.log('  ⚠️  API server not running (start with: npm run server)')
    }
  } catch {
    console.log('  ⚠️  API server not running (start with: npm run server)')
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(40)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (failed === 0) {
    console.log('🎉 Migration validation PASSED!')
  } else {
    console.log('⚠️  Migration validation has issues. Check above.')
  }

  await crdb.end()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error(e.message); process.exit(1) })
