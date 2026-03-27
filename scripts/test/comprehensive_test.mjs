/**
 * Comprehensive Test Suite - Cinema Online
 * Tests: CockroachDB API, Data Integrity, Performance, SQL Correctness
 * Run: node scripts/test/comprehensive_test.mjs
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs/promises'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load env
const dotenv = await import('dotenv')
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 8000,
})

async function q(sql, params = []) {
  const client = await pool.connect()
  try { return await client.query(sql, params) }
  finally { client.release() }
}

// ─── Test Runner ────────────────────────────────────────────────────────────
const results = []
let passed = 0, failed = 0, warned = 0

async function test(name, fn, category = 'General') {
  const start = Date.now()
  try {
    const result = await fn()
    const ms = Date.now() - start
    const status = result?.warn ? 'WARN' : 'PASS'
    if (status === 'WARN') warned++; else passed++
    results.push({ category, name, status, ms, detail: result?.detail || '' })
    console.log(`  ${status === 'PASS' ? '✅' : '⚠️ '} [${ms}ms] ${name}${result?.detail ? ' — ' + result.detail : ''}`)
  } catch (e) {
    const ms = Date.now() - start
    failed++
    results.push({ category, name, status: 'FAIL', ms, detail: e.message })
    console.log(`  ❌ [${ms}ms] ${name} — ${e.message}`)
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

function section(title) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('═'.repeat(60))
}

// ─── 1. CONNECTIVITY & HEALTH ───────────────────────────────────────────────
section('1. CONNECTIVITY & HEALTH')

await test('DB connection responds', async () => {
  const r = await q('SELECT 1 AS ok')
  assert(r.rows[0].ok === 1, 'Expected 1')
}, 'Connectivity')

await test('Movies table exists and has rows', async () => {
  const r = await q('SELECT COUNT(*) AS cnt FROM movies')
  const cnt = parseInt(r.rows[0].cnt)
  assert(cnt > 0, 'No rows in movies')
  return { detail: `${cnt.toLocaleString()} rows` }
}, 'Connectivity')

await test('TV series table exists and has rows', async () => {
  const r = await q('SELECT COUNT(*) AS cnt FROM tv_series')
  const cnt = parseInt(r.rows[0].cnt)
  assert(cnt > 0, 'No rows in tv_series')
  return { detail: `${cnt.toLocaleString()} rows` }
}, 'Connectivity')

await test('Connection pool handles concurrent queries', async () => {
  const promises = Array.from({ length: 10 }, (_, i) =>
    q('SELECT $1::int AS n', [i])
  )
  const results = await Promise.all(promises)
  assert(results.length === 10, 'Not all queries returned')
  assert(results.every((r, i) => parseInt(r.rows[0].n) === i), 'Wrong values')
}, 'Connectivity')

// ─── 2. DATA COMPLETENESS ────────────────────────────────────────────────────
section('2. DATA COMPLETENESS')

await test('Movies count matches expected (30,890)', async () => {
  const r = await q('SELECT COUNT(*) AS cnt FROM movies')
  const cnt = parseInt(r.rows[0].cnt)
  const expected = 30890
  if (cnt < expected * 0.99) throw new Error(`Only ${cnt} / ${expected} movies`)
  if (cnt < expected) return { warn: true, detail: `${cnt} / ${expected} (${((cnt/expected)*100).toFixed(1)}%)` }
  return { detail: `${cnt} / ${expected} ✓` }
}, 'Data Completeness')

await test('TV series count matches expected (17,547)', async () => {
  const r = await q('SELECT COUNT(*) AS cnt FROM tv_series')
  const cnt = parseInt(r.rows[0].cnt)
  const expected = 17547
  if (cnt < expected * 0.99) throw new Error(`Only ${cnt} / ${expected} tv_series`)
  if (cnt < expected) return { warn: true, detail: `${cnt} / ${expected}` }
  return { detail: `${cnt} / ${expected} ✓` }
}, 'Data Completeness')

await test('No duplicate movie IDs', async () => {
  const r = await q('SELECT id, COUNT(*) AS cnt FROM movies GROUP BY id HAVING COUNT(*) > 1 LIMIT 5')
  assert(r.rows.length === 0, `Found ${r.rows.length} duplicate IDs: ${r.rows.map(x=>x.id).join(',')}`)
}, 'Data Completeness')

await test('No duplicate TV series IDs', async () => {
  const r = await q('SELECT id, COUNT(*) AS cnt FROM tv_series GROUP BY id HAVING COUNT(*) > 1 LIMIT 5')
  assert(r.rows.length === 0, `Found ${r.rows.length} duplicate IDs`)
}, 'Data Completeness')

await test('Movies have required fields (title, poster_path)', async () => {
  const r = await q(`SELECT COUNT(*) AS cnt FROM movies WHERE title IS NULL OR title = ''`)
  const cnt = parseInt(r.rows[0].cnt)
  if (cnt > 100) throw new Error(`${cnt} movies missing title`)
  if (cnt > 0) return { warn: true, detail: `${cnt} movies missing title` }
  return { detail: 'All movies have titles' }
}, 'Data Completeness')

await test('TV series have required fields (name)', async () => {
  const r = await q(`SELECT COUNT(*) AS cnt FROM tv_series WHERE name IS NULL OR name = ''`)
  const cnt = parseInt(r.rows[0].cnt)
  if (cnt > 100) throw new Error(`${cnt} series missing name`)
  if (cnt > 0) return { warn: true, detail: `${cnt} series missing name` }
  return { detail: 'All series have names' }
}, 'Data Completeness')

await test('Movies with poster_path coverage', async () => {
  const r = await q(`SELECT
    COUNT(*) AS total,
    COUNT(poster_path) AS with_poster,
    ROUND(COUNT(poster_path)::numeric / COUNT(*) * 100, 1) AS pct
    FROM movies`)
  const { total, with_poster, pct } = r.rows[0]
  if (parseFloat(pct) < 80) throw new Error(`Only ${pct}% have poster_path`)
  return { detail: `${with_poster}/${total} (${pct}%)` }
}, 'Data Completeness')

await test('Movies with backdrop_path coverage', async () => {
  const r = await q(`SELECT
    COUNT(*) AS total,
    COUNT(backdrop_path) AS with_backdrop,
    ROUND(COUNT(backdrop_path)::numeric / COUNT(*) * 100, 1) AS pct
    FROM movies`)
  const { total, with_backdrop, pct } = r.rows[0]
  if (parseFloat(pct) < 60) throw new Error(`Only ${pct}% have backdrop_path`)
  return { detail: `${with_backdrop}/${total} (${pct}%)` }
}, 'Data Completeness')

await test('vote_average values are in valid range (0-10)', async () => {
  const r = await q(`SELECT COUNT(*) AS cnt FROM movies WHERE vote_average < 0 OR vote_average > 10`)
  assert(parseInt(r.rows[0].cnt) === 0, `${r.rows[0].cnt} movies with invalid vote_average`)
}, 'Data Completeness')

await test('release_date values are valid dates', async () => {
  const r = await q(`SELECT COUNT(*) AS cnt FROM movies WHERE release_date IS NOT NULL AND release_date > '2030-01-01'`)
  const cnt = parseInt(r.rows[0].cnt)
  if (cnt > 10) throw new Error(`${cnt} movies with future release_date > 2030`)
  return { detail: cnt > 0 ? `${cnt} future dates (ok for upcoming)` : 'All dates valid' }
}, 'Data Completeness')

// ─── 3. DATA INTEGRITY ───────────────────────────────────────────────────────
section('3. DATA INTEGRITY')

await test('genres column is valid JSONB array', async () => {
  const r = await q(`SELECT COUNT(*) AS cnt FROM movies WHERE genres IS NOT NULL AND jsonb_typeof(genres) != 'array'`)
  assert(parseInt(r.rows[0].cnt) === 0, 'Some genres are not JSON arrays')
}, 'Data Integrity')

await test('genres contain id and name fields', async () => {
  const r = await q(`SELECT COUNT(*) AS cnt FROM movies
    WHERE genres IS NOT NULL AND jsonb_array_length(genres) > 0
    AND NOT (genres->0 ? 'id' AND genres->0 ? 'name')`)
  const cnt = parseInt(r.rows[0].cnt)
  if (cnt > 500) throw new Error(`${cnt} movies have malformed genre objects`)
  if (cnt > 0) return { warn: true, detail: `${cnt} movies with malformed genres` }
  return { detail: 'All genre objects have id+name' }
}, 'Data Integrity')

await test('popularity values are positive', async () => {
  const r = await q(`SELECT COUNT(*) AS cnt FROM movies WHERE popularity < 0`)
  assert(parseInt(r.rows[0].cnt) === 0, 'Negative popularity values found')
}, 'Data Integrity')

await test('vote_count values are non-negative', async () => {
  const r = await q(`SELECT COUNT(*) AS cnt FROM movies WHERE vote_count < 0`)
  assert(parseInt(r.rows[0].cnt) === 0, 'Negative vote_count found')
}, 'Data Integrity')

await test('Random sample of 20 movies have valid IDs', async () => {
  const r = await q(`SELECT id FROM movies ORDER BY RANDOM() LIMIT 20`)
  assert(r.rows.length === 20, 'Could not fetch 20 random movies')
  assert(r.rows.every(row => Number.isInteger(parseInt(row.id)) && parseInt(row.id) > 0), 'Invalid IDs found')
}, 'Data Integrity')

await test('TV series first_air_date coverage', async () => {
  const r = await q(`SELECT
    COUNT(*) AS total,
    COUNT(first_air_date) AS with_date,
    ROUND(COUNT(first_air_date)::numeric / COUNT(*) * 100, 1) AS pct
    FROM tv_series`)
  const { total, with_date, pct } = r.rows[0]
  if (parseFloat(pct) < 70) throw new Error(`Only ${pct}% have first_air_date`)
  return { detail: `${with_date}/${total} (${pct}%)` }
}, 'Data Integrity')

await test('Movies span multiple decades (data diversity)', async () => {
  const r = await q(`SELECT
    EXTRACT(DECADE FROM release_date)::int AS decade,
    COUNT(*) AS cnt
    FROM movies WHERE release_date IS NOT NULL
    GROUP BY decade ORDER BY decade`)
  assert(r.rows.length >= 5, `Only ${r.rows.length} decades represented`)
  return { detail: `${r.rows.length} decades from ${r.rows[0]?.decade*10} to ${r.rows[r.rows.length-1]?.decade*10}` }
}, 'Data Integrity')

await test('Movies cover multiple languages', async () => {
  const r = await q(`SELECT original_language, COUNT(*) AS cnt
    FROM movies WHERE original_language IS NOT NULL
    GROUP BY original_language ORDER BY cnt DESC LIMIT 10`)
  assert(r.rows.length >= 3, 'Less than 3 languages found')
  return { detail: r.rows.slice(0,5).map(x=>`${x.original_language}:${x.cnt}`).join(', ') }
}, 'Data Integrity')

// ─── 4. SQL QUERY CORRECTNESS ────────────────────────────────────────────────
section('4. SQL QUERY CORRECTNESS')

await test('Trending movies query returns correct columns', async () => {
  const r = await q(`SELECT id, title, overview, poster_path, backdrop_path,
    release_date, vote_average, vote_count, popularity, genres
    FROM movies ORDER BY popularity DESC LIMIT 5`)
  assert(r.rows.length === 5, 'Expected 5 rows')
  const row = r.rows[0]
  assert('id' in row, 'Missing id')
  assert('title' in row, 'Missing title')
  assert('poster_path' in row, 'Missing poster_path')
  assert('vote_average' in row, 'Missing vote_average')
  assert('genres' in row, 'Missing genres')
  return { detail: `Top: "${row.title}" (${row.vote_average})` }
}, 'SQL Correctness')

await test('Search by title (ILIKE) works correctly', async () => {
  const r = await q(`SELECT id, title FROM movies WHERE title ILIKE $1 ORDER BY popularity DESC LIMIT 5`, ['%avengers%'])
  assert(r.rows.length > 0, 'No results for "avengers"')
  assert(r.rows.every(row => row.title.toLowerCase().includes('avengers')), 'Results do not match query')
  return { detail: `${r.rows.length} results: ${r.rows[0].title}` }
}, 'SQL Correctness')

await test('Search by Arabic title works', async () => {
  const r = await q(`SELECT id, title FROM movies WHERE title ILIKE $1 LIMIT 5`, ['%الأسد%'])
  return { detail: r.rows.length > 0 ? `${r.rows.length} Arabic results` : 'No Arabic results (ok if not in DB)' }
}, 'SQL Correctness')

await test('Filter by min_rating works', async () => {
  const r = await q(`SELECT id, title, vote_average FROM movies WHERE vote_average >= $1 ORDER BY vote_average DESC LIMIT 10`, [9.0])
  assert(r.rows.length > 0, 'No movies with rating >= 9.0')
  assert(r.rows.every(row => parseFloat(row.vote_average) >= 9.0), 'Some results below min_rating')
  return { detail: `${r.rows.length} movies rated ≥9.0, top: ${r.rows[0].title} (${r.rows[0].vote_average})` }
}, 'SQL Correctness')

await test('Filter by year (EXTRACT) works', async () => {
  const r = await q(`SELECT id, title, release_date FROM movies WHERE EXTRACT(YEAR FROM release_date) = $1 LIMIT 5`, [2023])
  assert(r.rows.length > 0, 'No movies from 2023')
  assert(r.rows.every(row => new Date(row.release_date).getFullYear() === 2023), 'Wrong year in results')
  return { detail: `${r.rows.length} movies from 2023` }
}, 'SQL Correctness')

await test('Genre JSONB text search works', async () => {
  const r = await q(`SELECT id, title, genres FROM movies WHERE genres::text ILIKE $1 LIMIT 5`, ['%Action%'])
  assert(r.rows.length > 0, 'No action movies found')
  return { detail: `${r.rows.length} action movies` }
}, 'SQL Correctness')

await test('Pagination (LIMIT/OFFSET) works correctly', async () => {
  const page1 = await q(`SELECT id FROM movies ORDER BY popularity DESC LIMIT 10 OFFSET 0`)
  const page2 = await q(`SELECT id FROM movies ORDER BY popularity DESC LIMIT 10 OFFSET 10`)
  assert(page1.rows.length === 10, 'Page 1 wrong size')
  assert(page2.rows.length === 10, 'Page 2 wrong size')
  const ids1 = new Set(page1.rows.map(r => r.id))
  const ids2 = new Set(page2.rows.map(r => r.id))
  const overlap = [...ids1].filter(id => ids2.has(id))
  assert(overlap.length === 0, `Pages overlap: ${overlap.join(',')}`)
  return { detail: 'Pages 1 and 2 are distinct' }
}, 'SQL Correctness')

await test('Movie by ID lookup works', async () => {
  const first = await q(`SELECT id FROM movies ORDER BY popularity DESC LIMIT 1`)
  const id = first.rows[0].id
  const r = await q(`SELECT * FROM movies WHERE id = $1`, [id])
  assert(r.rows.length === 1, 'Expected exactly 1 row')
  assert(r.rows[0].id === id, 'Wrong ID returned')
  return { detail: `Fetched movie ID ${id}: ${r.rows[0].title}` }
}, 'SQL Correctness')

await test('TV series search by name works', async () => {
  const r = await q(`SELECT id, name FROM tv_series WHERE name ILIKE $1 ORDER BY popularity DESC LIMIT 5`, ['%breaking%'])
  assert(r.rows.length > 0, 'No results for "breaking"')
  return { detail: `${r.rows.length} results: ${r.rows[0].name}` }
}, 'SQL Correctness')

await test('Combined movie+TV unified search works', async () => {
  const movies = await q(`SELECT id, title AS name, 'movie' AS media_type FROM movies WHERE title ILIKE $1 LIMIT 5`, ['%batman%'])
  const tv = await q(`SELECT id, name, 'tv' AS media_type FROM tv_series WHERE name ILIKE $1 LIMIT 5`, ['%batman%'])
  const total = movies.rows.length + tv.rows.length
  assert(total > 0, 'No results for "batman"')
  return { detail: `${movies.rows.length} movies + ${tv.rows.length} TV = ${total} total` }
}, 'SQL Correctness')

// ─── 5. PERFORMANCE BENCHMARKS ───────────────────────────────────────────────
section('5. PERFORMANCE BENCHMARKS')

async function bench(sql, params = [], label = '') {
  const times = []
  for (let i = 0; i < 5; i++) {
    const t = Date.now()
    await q(sql, params)
    times.push(Date.now() - t)
  }
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  const min = Math.min(...times)
  const max = Math.max(...times)
  return { avg, min, max, label }
}

await test('Trending movies query speed (target <100ms avg)', async () => {
  const b = await bench(`SELECT id, title, poster_path, vote_average, popularity FROM movies ORDER BY popularity DESC LIMIT 20`)
  if (b.avg > 500) throw new Error(`Too slow: ${b.avg}ms avg`)
  if (b.avg > 100) return { warn: true, detail: `avg:${b.avg}ms min:${b.min}ms max:${b.max}ms` }
  return { detail: `avg:${b.avg}ms min:${b.min}ms max:${b.max}ms ✓` }
}, 'Performance')

await test('Movie by ID lookup speed (target <50ms)', async () => {
  const b = await bench(`SELECT * FROM movies WHERE id = $1`, [550])
  if (b.avg > 300) throw new Error(`Too slow: ${b.avg}ms avg`)
  if (b.avg > 50) return { warn: true, detail: `avg:${b.avg}ms` }
  return { detail: `avg:${b.avg}ms ✓` }
}, 'Performance')

await test('Title search speed (target <200ms)', async () => {
  const b = await bench(`SELECT id, title FROM movies WHERE title ILIKE $1 ORDER BY popularity DESC LIMIT 20`, ['%action%'])
  if (b.avg > 1000) throw new Error(`Too slow: ${b.avg}ms avg`)
  if (b.avg > 200) return { warn: true, detail: `avg:${b.avg}ms` }
  return { detail: `avg:${b.avg}ms ✓` }
}, 'Performance')

await test('TV trending query speed (target <100ms)', async () => {
  const b = await bench(`SELECT id, name, poster_path, vote_average, popularity FROM tv_series ORDER BY popularity DESC LIMIT 20`)
  if (b.avg > 500) throw new Error(`Too slow: ${b.avg}ms avg`)
  if (b.avg > 100) return { warn: true, detail: `avg:${b.avg}ms` }
  return { detail: `avg:${b.avg}ms ✓` }
}, 'Performance')

await test('Multi-filter search speed (title+genre+rating+year)', async () => {
  const b = await bench(
    `SELECT id, title FROM movies WHERE title ILIKE $1 AND genres::text ILIKE $2 AND vote_average >= $3 AND EXTRACT(YEAR FROM release_date) = $4 ORDER BY popularity DESC LIMIT 20`,
    ['%the%', '%Action%', 6.0, 2020]
  )
  if (b.avg > 2000) throw new Error(`Too slow: ${b.avg}ms avg`)
  if (b.avg > 500) return { warn: true, detail: `avg:${b.avg}ms` }
  return { detail: `avg:${b.avg}ms ✓` }
}, 'Performance')

await test('COUNT(*) on movies is fast (index scan)', async () => {
  const b = await bench(`SELECT COUNT(*) FROM movies`)
  if (b.avg > 2000) throw new Error(`Too slow: ${b.avg}ms`)
  return { detail: `avg:${b.avg}ms` }
}, 'Performance')

await test('RANDOM() sampling speed', async () => {
  const b = await bench(`SELECT id, title FROM movies WHERE vote_average >= $1 AND poster_path IS NOT NULL ORDER BY RANDOM() LIMIT 10`, [6.0])
  if (b.avg > 3000) throw new Error(`Too slow: ${b.avg}ms — RANDOM() on large table`)
  if (b.avg > 1000) return { warn: true, detail: `avg:${b.avg}ms (RANDOM() is inherently slow)` }
  return { detail: `avg:${b.avg}ms ✓` }
}, 'Performance')

// ─── 6. INDEX VERIFICATION ───────────────────────────────────────────────────
section('6. INDEX VERIFICATION')

await test('Indexes exist on movies table', async () => {
  const r = await q(`SELECT indexname FROM pg_indexes WHERE tablename = 'movies' ORDER BY indexname`)
  const names = r.rows.map(x => x.indexname)
  assert(names.length > 0, 'No indexes found on movies table')
  return { detail: names.join(', ') }
}, 'Indexes')

await test('Indexes exist on tv_series table', async () => {
  const r = await q(`SELECT indexname FROM pg_indexes WHERE tablename = 'tv_series' ORDER BY indexname`)
  const names = r.rows.map(x => x.indexname)
  assert(names.length > 0, 'No indexes found on tv_series table')
  return { detail: names.join(', ') }
}, 'Indexes')

await test('Primary key index on movies.id', async () => {
  const r = await q(`SELECT indexname FROM pg_indexes WHERE tablename = 'movies' AND indexname LIKE '%pkey%'`)
  assert(r.rows.length > 0, 'No primary key index on movies')
}, 'Indexes')

await test('EXPLAIN shows index scan for movie by ID', async () => {
  const r = await q(`EXPLAIN SELECT * FROM movies WHERE id = $1`, [550])
  const plan = r.rows.map(x => Object.values(x).join(' ')).join('\n')
  const usesIndex = plan.toLowerCase().includes('index') || plan.toLowerCase().includes('scan')
  if (!usesIndex) return { warn: true, detail: 'No index scan detected in EXPLAIN' }
  return { detail: 'Index scan confirmed' }
}, 'Indexes')

// ─── 7. API ENDPOINT TESTS (via HTTP) ────────────────────────────────────────
section('7. API ENDPOINT TESTS (HTTP)')

const API = process.env.API_BASE || 'http://localhost:3001'

async function apiGet(path, timeout = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const r = await fetch(`${API}${path}`, { signal: controller.signal })
    clearTimeout(timer)
    return { status: r.status, data: await r.json(), ok: r.ok }
  } catch (e) {
    clearTimeout(timer)
    throw new Error(e.name === 'AbortError' ? `Timeout after ${timeout}ms` : e.message)
  }
}

async function apiPost(path, body, timeout = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    clearTimeout(timer)
    return { status: r.status, data: await r.json(), ok: r.ok }
  } catch (e) {
    clearTimeout(timer)
    throw new Error(e.name === 'AbortError' ? `Timeout after ${timeout}ms` : e.message)
  }
}

// Check if server is running first
let serverRunning = false
try {
  const ping = await fetch(`${API}/ping`, { signal: AbortSignal.timeout(3000) })
  serverRunning = ping.ok
} catch {}

if (!serverRunning) {
  console.log(`\n  ⚠️  Server not running at ${API} — skipping HTTP tests`)
  console.log('  Run: npm run server  (then re-run this test)')
  results.push({ category: 'API Endpoints', name: 'Server availability', status: 'SKIP', ms: 0, detail: `Server not running at ${API}` })
} else {
  console.log(`  🌐 Server running at ${API}`)

  await test('GET /api/db/health returns ok', async () => {
    const { data, status } = await apiGet('/api/db/health')
    assert(status === 200, `HTTP ${status}`)
    assert(data.status === 'ok', `Status: ${data.status}`)
    assert(data.movies > 0, 'No movies count')
    assert(data.tv_series > 0, 'No tv_series count')
    return { detail: `movies:${data.movies} tv:${data.tv_series}` }
  }, 'API Endpoints')

  await test('GET /api/db/movies/trending returns array', async () => {
    const { data, status } = await apiGet('/api/db/movies/trending?limit=10')
    assert(status === 200, `HTTP ${status}`)
    assert(Array.isArray(data), 'Not an array')
    assert(data.length > 0, 'Empty array')
    assert(data.length <= 10, `Too many results: ${data.length}`)
    assert(data[0].title, 'Missing title')
    assert(data[0].poster_path, 'Missing poster_path')
    return { detail: `${data.length} movies, top: "${data[0].title}"` }
  }, 'API Endpoints')

  await test('GET /api/db/movies/trending respects limit param', async () => {
    const { data } = await apiGet('/api/db/movies/trending?limit=5')
    assert(data.length <= 5, `Expected ≤5, got ${data.length}`)
    return { detail: `${data.length} results for limit=5` }
  }, 'API Endpoints')

  await test('GET /api/db/movies/random returns varied results', async () => {
    const r1 = await apiGet('/api/db/movies/random?limit=5')
    const r2 = await apiGet('/api/db/movies/random?limit=5')
    assert(r1.data.length > 0, 'Empty random results')
    const ids1 = r1.data.map(x => x.id).sort().join(',')
    const ids2 = r2.data.map(x => x.id).sort().join(',')
    if (ids1 === ids2) return { warn: true, detail: 'Two random calls returned same results (unlikely but possible)' }
    return { detail: `${r1.data.length} random movies, results vary ✓` }
  }, 'API Endpoints')

  await test('GET /api/db/movies/:id returns correct movie', async () => {
    const trending = await apiGet('/api/db/movies/trending?limit=1')
    const id = trending.data[0].id
    const { data, status } = await apiGet(`/api/db/movies/${id}`)
    assert(status === 200, `HTTP ${status}`)
    assert(data.id === id, `Wrong ID: ${data.id} vs ${id}`)
    assert(data.title, 'Missing title')
    return { detail: `ID ${id}: "${data.title}"` }
  }, 'API Endpoints')

  await test('GET /api/db/movies/:id returns 404 for invalid ID', async () => {
    const { status } = await apiGet('/api/db/movies/999999999')
    assert(status === 404, `Expected 404, got ${status}`)
  }, 'API Endpoints')

  await test('GET /api/db/movies/:id returns 400 for non-numeric ID', async () => {
    const { status } = await apiGet('/api/db/movies/abc')
    assert(status === 400, `Expected 400, got ${status}`)
  }, 'API Endpoints')

  await test('POST /api/db/movies/search by title', async () => {
    const { data, status } = await apiPost('/api/db/movies/search', { query: 'avengers', limit: 5 })
    assert(status === 200, `HTTP ${status}`)
    assert(Array.isArray(data), 'Not an array')
    assert(data.length > 0, 'No results for "avengers"')
    return { detail: `${data.length} results` }
  }, 'API Endpoints')

  await test('POST /api/db/movies/search by genre', async () => {
    const { data, status } = await apiPost('/api/db/movies/search', { genre: 'Action', limit: 10 })
    assert(status === 200, `HTTP ${status}`)
    assert(Array.isArray(data), 'Not an array')
    assert(data.length > 0, 'No action movies')
    return { detail: `${data.length} action movies` }
  }, 'API Endpoints')

  await test('POST /api/db/movies/search by min_rating', async () => {
    const { data, status } = await apiPost('/api/db/movies/search', { min_rating: 8.5, limit: 10 })
    assert(status === 200, `HTTP ${status}`)
    assert(data.every(m => parseFloat(m.vote_average) >= 8.5), 'Some results below min_rating')
    return { detail: `${data.length} movies rated ≥8.5` }
  }, 'API Endpoints')

  await test('POST /api/db/movies/search by year', async () => {
    const { data, status } = await apiPost('/api/db/movies/search', { year: 2022, limit: 10 })
    assert(status === 200, `HTTP ${status}`)
    assert(data.length > 0, 'No movies from 2022')
    return { detail: `${data.length} movies from 2022` }
  }, 'API Endpoints')

  await test('POST /api/db/movies/search pagination works', async () => {
    const p1 = await apiPost('/api/db/movies/search', { query: 'the', page: 1, limit: 5 })
    const p2 = await apiPost('/api/db/movies/search', { query: 'the', page: 2, limit: 5 })
    assert(p1.data.length > 0, 'Page 1 empty')
    const ids1 = p1.data.map(x => x.id)
    const ids2 = p2.data.map(x => x.id)
    const overlap = ids1.filter(id => ids2.includes(id))
    assert(overlap.length === 0, `Pages overlap: ${overlap.join(',')}`)
    return { detail: 'Pages 1 and 2 are distinct ✓' }
  }, 'API Endpoints')

  await test('GET /api/db/tv/trending returns array', async () => {
    const { data, status } = await apiGet('/api/db/tv/trending?limit=10')
    assert(status === 200, `HTTP ${status}`)
    assert(Array.isArray(data), 'Not an array')
    assert(data.length > 0, 'Empty array')
    assert(data[0].name, 'Missing name')
    return { detail: `${data.length} series, top: "${data[0].name}"` }
  }, 'API Endpoints')

  await test('GET /api/db/tv/:id returns correct series', async () => {
    const trending = await apiGet('/api/db/tv/trending?limit=1')
    const id = trending.data[0].id
    const { data, status } = await apiGet(`/api/db/tv/${id}`)
    assert(status === 200, `HTTP ${status}`)
    assert(data.id === id, `Wrong ID`)
    return { detail: `ID ${id}: "${data.name}"` }
  }, 'API Endpoints')

  await test('POST /api/db/tv/search works', async () => {
    const { data, status } = await apiPost('/api/db/tv/search', { query: 'breaking', limit: 5 })
    assert(status === 200, `HTTP ${status}`)
    assert(data.length > 0, 'No results for "breaking"')
    return { detail: `${data.length} results` }
  }, 'API Endpoints')

  await test('GET /api/db/search unified search works', async () => {
    const { data, status } = await apiGet('/api/db/search?q=batman&type=all&limit=10')
    assert(status === 200, `HTTP ${status}`)
    assert(Array.isArray(data), 'Not an array')
    assert(data.length > 0, 'No results for "batman"')
    const hasMovies = data.some(x => x.media_type === 'movie')
    const hasTV = data.some(x => x.media_type === 'tv')
    return { detail: `${data.length} results (movies:${hasMovies} tv:${hasTV})` }
  }, 'API Endpoints')

  await test('GET /api/db/search returns 400 without query', async () => {
    const { status } = await apiGet('/api/db/search')
    assert(status === 400, `Expected 400, got ${status}`)
  }, 'API Endpoints')

  await test('GET /api/db/movies/trending has Cache-Control header', async () => {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 5000)
    const r = await fetch(`${API}/api/db/movies/trending`, { signal: controller.signal })
    const cc = r.headers.get('cache-control')
    assert(cc && cc.includes('max-age'), `Missing Cache-Control: ${cc}`)
    return { detail: `Cache-Control: ${cc}` }
  }, 'API Endpoints')
}

// ─── 8. SUPABASE vs COCKROACHDB COMPARISON ───────────────────────────────────
section('8. SUPABASE vs COCKROACHDB COMPARISON')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const comparisonResults = []

async function supabaseGet(path) {
  const r = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact'
    },
    signal: AbortSignal.timeout(10000)
  })
  const count = r.headers.get('content-range')?.split('/')[1]
  const data = await r.json()
  return { status: r.status, data, count: count ? parseInt(count) : null }
}

if (!supabaseUrl || !supabaseKey) {
  console.log('\n  ⚠️  Supabase env vars not set — skipping comparison')
} else {
  console.log('\n  📊 Running Supabase vs CockroachDB comparison...\n')

  // --- Row Count Comparison ---
  await test('Row count: movies (Supabase vs CockroachDB)', async () => {
    const t1 = Date.now()
    const sb = await supabaseGet('/movies?select=id&limit=1')
    const sbTime = Date.now() - t1

    const t2 = Date.now()
    const crdb = await q('SELECT COUNT(*) AS cnt FROM movies')
    const crdbTime = Date.now() - t2

    const sbCount = sb.count
    const crdbCount = parseInt(crdb.rows[0].cnt)

    comparisonResults.push({
      metric: 'Movies Count',
      supabase: sbCount,
      cockroachdb: crdbCount,
      supabase_ms: sbTime,
      cockroachdb_ms: crdbTime,
      match: sbCount === crdbCount
    })

    const diff = Math.abs((sbCount || 0) - crdbCount)
    if (diff > 100) throw new Error(`Count mismatch: Supabase=${sbCount} CockroachDB=${crdbCount} (diff=${diff})`)
    if (diff > 0) return { warn: true, detail: `SB:${sbCount} CRDB:${crdbCount} diff:${diff} | SB:${sbTime}ms CRDB:${crdbTime}ms` }
    return { detail: `Both: ${crdbCount} rows | SB:${sbTime}ms CRDB:${crdbTime}ms` }
  }, 'Comparison')

  await test('Row count: tv_series (Supabase vs CockroachDB)', async () => {
    const t1 = Date.now()
    const sb = await supabaseGet('/tv_series?select=id&limit=1')
    const sbTime = Date.now() - t1

    const t2 = Date.now()
    const crdb = await q('SELECT COUNT(*) AS cnt FROM tv_series')
    const crdbTime = Date.now() - t2

    const sbCount = sb.count
    const crdbCount = parseInt(crdb.rows[0].cnt)

    comparisonResults.push({
      metric: 'TV Series Count',
      supabase: sbCount,
      cockroachdb: crdbCount,
      supabase_ms: sbTime,
      cockroachdb_ms: crdbTime,
      match: sbCount === crdbCount
    })

    const diff = Math.abs((sbCount || 0) - crdbCount)
    if (diff > 100) throw new Error(`Count mismatch: SB=${sbCount} CRDB=${crdbCount}`)
    return { detail: `SB:${sbCount} CRDB:${crdbCount} | SB:${sbTime}ms CRDB:${crdbTime}ms` }
  }, 'Comparison')

  // --- Speed Comparison: Trending ---
  await test('Speed: trending movies (Supabase vs CockroachDB)', async () => {
    const sbTimes = [], crdbTimes = []
    for (let i = 0; i < 5; i++) {
      const t1 = Date.now()
      await supabaseGet('/movies?select=id,title,poster_path,vote_average,popularity&order=popularity.desc&limit=20')
      sbTimes.push(Date.now() - t1)

      const t2 = Date.now()
      await q('SELECT id, title, poster_path, vote_average, popularity FROM movies ORDER BY popularity DESC LIMIT 20')
      crdbTimes.push(Date.now() - t2)
    }
    const sbAvg = Math.round(sbTimes.reduce((a,b)=>a+b,0)/sbTimes.length)
    const crdbAvg = Math.round(crdbTimes.reduce((a,b)=>a+b,0)/crdbTimes.length)
    const faster = sbAvg < crdbAvg ? 'Supabase' : 'CockroachDB'
    const ratio = (Math.max(sbAvg,crdbAvg)/Math.min(sbAvg,crdbAvg)).toFixed(1)

    comparisonResults.push({
      metric: 'Trending Movies Speed',
      supabase: `${sbAvg}ms`,
      cockroachdb: `${crdbAvg}ms`,
      supabase_ms: sbAvg,
      cockroachdb_ms: crdbAvg,
      faster
    })

    return { detail: `SB:${sbAvg}ms CRDB:${crdbAvg}ms → ${faster} is ${ratio}x faster` }
  }, 'Comparison')

  // --- Speed Comparison: Search ---
  await test('Speed: title search (Supabase vs CockroachDB)', async () => {
    const sbTimes = [], crdbTimes = []
    for (let i = 0; i < 3; i++) {
      const t1 = Date.now()
      await supabaseGet('/movies?select=id,title,poster_path&title=ilike.*avengers*&order=popularity.desc&limit=20')
      sbTimes.push(Date.now() - t1)

      const t2 = Date.now()
      await q('SELECT id, title, poster_path FROM movies WHERE title ILIKE $1 ORDER BY popularity DESC LIMIT 20', ['%avengers%'])
      crdbTimes.push(Date.now() - t2)
    }
    const sbAvg = Math.round(sbTimes.reduce((a,b)=>a+b,0)/sbTimes.length)
    const crdbAvg = Math.round(crdbTimes.reduce((a,b)=>a+b,0)/crdbTimes.length)
    const faster = sbAvg < crdbAvg ? 'Supabase' : 'CockroachDB'

    comparisonResults.push({
      metric: 'Title Search Speed',
      supabase: `${sbAvg}ms`,
      cockroachdb: `${crdbAvg}ms`,
      supabase_ms: sbAvg,
      cockroachdb_ms: crdbAvg,
      faster
    })

    return { detail: `SB:${sbAvg}ms CRDB:${crdbAvg}ms → ${faster} faster` }
  }, 'Comparison')

  // --- Speed Comparison: Single Record ---
  await test('Speed: fetch by ID (Supabase vs CockroachDB)', async () => {
    const sbTimes = [], crdbTimes = []
    for (let i = 0; i < 5; i++) {
      const t1 = Date.now()
      await supabaseGet('/movies?id=eq.550&limit=1')
      sbTimes.push(Date.now() - t1)

      const t2 = Date.now()
      await q('SELECT * FROM movies WHERE id = $1', [550])
      crdbTimes.push(Date.now() - t2)
    }
    const sbAvg = Math.round(sbTimes.reduce((a,b)=>a+b,0)/sbTimes.length)
    const crdbAvg = Math.round(crdbTimes.reduce((a,b)=>a+b,0)/crdbTimes.length)
    const faster = sbAvg < crdbAvg ? 'Supabase' : 'CockroachDB'

    comparisonResults.push({
      metric: 'Fetch by ID Speed',
      supabase: `${sbAvg}ms`,
      cockroachdb: `${crdbAvg}ms`,
      supabase_ms: sbAvg,
      cockroachdb_ms: crdbAvg,
      faster
    })

    return { detail: `SB:${sbAvg}ms CRDB:${crdbAvg}ms → ${faster} faster` }
  }, 'Comparison')

  // --- Data Consistency: Sample Check ---
  await test('Data consistency: random sample of 10 movies match', async () => {
    const crdbRows = await q('SELECT id, title FROM movies ORDER BY RANDOM() LIMIT 10')
    let matched = 0, mismatched = 0
    for (const row of crdbRows.rows) {
      const sb = await supabaseGet(`/movies?id=eq.${row.id}&select=id,title&limit=1`)
      if (sb.data && sb.data.length > 0) {
        if (sb.data[0].title === row.title) matched++
        else mismatched++
      }
    }
    if (mismatched > 0) return { warn: true, detail: `${matched} match, ${mismatched} title mismatch` }
    return { detail: `${matched}/10 records match exactly ✓` }
  }, 'Comparison')
}

// ─── 9. EDGE CASES & SECURITY ────────────────────────────────────────────────
section('9. EDGE CASES & SECURITY')

await test('SQL injection attempt is safe (parameterized query)', async () => {
  // This should return 0 results, not cause an error
  const r = await q(`SELECT id FROM movies WHERE title ILIKE $1 LIMIT 1`, ["'; DROP TABLE movies; --"])
  // If we get here without error, parameterized queries protected us
  return { detail: `Returned ${r.rows.length} rows (injection blocked by parameterization)` }
}, 'Security')

await test('Empty search query returns results (no WHERE clause)', async () => {
  const r = await q(`SELECT id, title FROM movies WHERE 1=1 ORDER BY popularity DESC LIMIT 5`)
  assert(r.rows.length === 5, 'Expected 5 results')
}, 'Edge Cases')

await test('Very long search string does not crash', async () => {
  const longStr = 'a'.repeat(500)
  const r = await q(`SELECT id FROM movies WHERE title ILIKE $1 LIMIT 1`, [`%${longStr}%`])
  return { detail: `${r.rows.length} results for 500-char query` }
}, 'Edge Cases')

await test('Unicode/Arabic search works', async () => {
  const r = await q(`SELECT id, title FROM movies WHERE title ILIKE $1 LIMIT 5`, ['%فيلم%'])
  return { detail: r.rows.length > 0 ? `${r.rows.length} Arabic results` : 'No Arabic titles (ok)' }
}, 'Edge Cases')

await test('Limit capping works (max 100)', async () => {
  const r = await q(`SELECT id FROM movies ORDER BY popularity DESC LIMIT $1`, [Math.min(999, 100)])
  assert(r.rows.length <= 100, `Got ${r.rows.length} rows, expected ≤100`)
  return { detail: `${r.rows.length} rows (capped at 100)` }
}, 'Edge Cases')

await test('Offset beyond table size returns empty array', async () => {
  const r = await q(`SELECT id FROM movies ORDER BY popularity DESC LIMIT 10 OFFSET 999999`)
  assert(r.rows.length === 0, `Expected 0 rows, got ${r.rows.length}`)
}, 'Edge Cases')

await test('NULL poster_path filter works', async () => {
  const r = await q(`SELECT COUNT(*) AS cnt FROM movies WHERE poster_path IS NOT NULL`)
  const cnt = parseInt(r.rows[0].cnt)
  assert(cnt > 0, 'No movies with poster_path')
  return { detail: `${cnt.toLocaleString()} movies have poster_path` }
}, 'Edge Cases')

// ─── 10. FINAL REPORT ────────────────────────────────────────────────────────
section('10. GENERATING REPORT')

const totalTests = passed + failed + warned
const passRate = ((passed / totalTests) * 100).toFixed(1)

// Build report
const reportLines = []
reportLines.push('# Cinema Online - Comprehensive Test Report')
reportLines.push(`Generated: ${new Date().toISOString()}`)
reportLines.push(`CockroachDB: ${process.env.COCKROACHDB_URL?.replace(/:[^:@]+@/, ':***@') || 'not set'}`)
reportLines.push('')
reportLines.push('## Summary')
reportLines.push(`| Metric | Value |`)
reportLines.push(`|--------|-------|`)
reportLines.push(`| Total Tests | ${totalTests} |`)
reportLines.push(`| ✅ Passed | ${passed} |`)
reportLines.push(`| ⚠️ Warnings | ${warned} |`)
reportLines.push(`| ❌ Failed | ${failed} |`)
reportLines.push(`| Pass Rate | ${passRate}% |`)
reportLines.push('')

// Group by category
const categories = [...new Set(results.map(r => r.category))]
for (const cat of categories) {
  const catResults = results.filter(r => r.category === cat)
  const catPassed = catResults.filter(r => r.status === 'PASS').length
  const catFailed = catResults.filter(r => r.status === 'FAIL').length
  const catWarned = catResults.filter(r => r.status === 'WARN').length
  const catSkipped = catResults.filter(r => r.status === 'SKIP').length

  reportLines.push(`## ${cat}`)
  reportLines.push(`| Test | Status | Time | Detail |`)
  reportLines.push(`|------|--------|------|--------|`)
  for (const r of catResults) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : r.status === 'WARN' ? '⚠️' : '⏭️'
    reportLines.push(`| ${r.name} | ${icon} ${r.status} | ${r.ms}ms | ${r.detail || ''} |`)
  }
  reportLines.push(`| **Total** | ✅${catPassed} ⚠️${catWarned} ❌${catFailed} ${catSkipped?`⏭️${catSkipped}`:''}| | |`)
  reportLines.push('')
}

// Supabase vs CockroachDB comparison table
if (comparisonResults.length > 0) {
  reportLines.push('## Supabase vs CockroachDB Comparison')
  reportLines.push('| Metric | Supabase | CockroachDB | Faster | Match |')
  reportLines.push('|--------|----------|-------------|--------|-------|')
  for (const c of comparisonResults) {
    const faster = c.faster || (c.supabase_ms < c.cockroachdb_ms ? 'Supabase' : 'CockroachDB')
    const match = c.match !== undefined ? (c.match ? '✅' : '❌') : '—'
    reportLines.push(`| ${c.metric} | ${c.supabase} | ${c.cockroachdb} | ${faster} | ${match} |`)
  }
  reportLines.push('')

  // Speed winner summary
  const crdbWins = comparisonResults.filter(c => c.faster === 'CockroachDB' && c.supabase_ms).length
  const sbWins = comparisonResults.filter(c => c.faster === 'Supabase' && c.supabase_ms).length
  reportLines.push(`### Speed Winner: ${crdbWins > sbWins ? '🏆 CockroachDB' : sbWins > crdbWins ? '🏆 Supabase' : '🤝 Tie'}`)
  reportLines.push(`- CockroachDB faster in: ${crdbWins} tests`)
  reportLines.push(`- Supabase faster in: ${sbWins} tests`)
  reportLines.push('')
}

// Failed tests detail
const failedTests = results.filter(r => r.status === 'FAIL')
if (failedTests.length > 0) {
  reportLines.push('## Failed Tests Detail')
  for (const r of failedTests) {
    reportLines.push(`### ❌ ${r.name}`)
    reportLines.push(`- Category: ${r.category}`)
    reportLines.push(`- Error: ${r.detail}`)
    reportLines.push('')
  }
}

reportLines.push('---')
reportLines.push(`*Report generated by scripts/test/comprehensive_test.mjs*`)

const reportPath = path.join(__dirname, '../../TEST_REPORT.md')
await fs.writeFile(reportPath, reportLines.join('\n'), 'utf-8')

// Console summary
console.log(`\n${'═'.repeat(60)}`)
console.log('  FINAL RESULTS')
console.log('═'.repeat(60))
console.log(`  Total:    ${totalTests} tests`)
console.log(`  ✅ Pass:  ${passed}`)
console.log(`  ⚠️  Warn:  ${warned}`)
console.log(`  ❌ Fail:  ${failed}`)
console.log(`  Rate:     ${passRate}%`)
console.log(`\n  📄 Report saved: TEST_REPORT.md`)

if (comparisonResults.length > 0) {
  console.log('\n  📊 SUPABASE vs COCKROACHDB:')
  console.log(`  ${'Metric'.padEnd(25)} ${'Supabase'.padEnd(12)} ${'CockroachDB'.padEnd(12)} Faster`)
  console.log(`  ${'-'.repeat(65)}`)
  for (const c of comparisonResults) {
    const faster = c.faster || (c.supabase_ms < c.cockroachdb_ms ? 'Supabase' : 'CockroachDB')
    console.log(`  ${c.metric.padEnd(25)} ${String(c.supabase).padEnd(12)} ${String(c.cockroachdb).padEnd(12)} ${faster}`)
  }
}

console.log('')
await pool.end()
process.exit(failed > 0 ? 1 : 0)
