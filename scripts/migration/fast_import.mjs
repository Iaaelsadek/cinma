/**
 * Fast Import to CockroachDB - Optimized with larger batches
 */
import pg from 'pg'
import { config } from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../../.env.local') })

const { Pool } = pg
const DATA_DIR = join(__dirname, 'data')
const BATCH = 100 // rows per transaction

function makePool() {
  return new Pool({
    connectionString: process.env.COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 20000,
  })
}

async function importRows(rows, label, buildValues) {
  console.log(`\n📥 Importing ${rows.length.toLocaleString()} ${label}...`)
  let done = 0, errors = 0
  let pool = makePool()

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)

    // Reconnect every 2000 rows to avoid timeout
    if (i > 0 && i % 2000 === 0) {
      await pool.end().catch(() => {})
      pool = makePool()
      await new Promise(r => setTimeout(r, 300))
    }

    let retries = 3
    while (retries > 0) {
      let client = null
      try {
        client = await pool.connect()
        await client.query('BEGIN')
        for (const r of batch) {
          const { sql, params } = buildValues(r)
          await client.query(sql, params)
        }
        await client.query('COMMIT')
        done += batch.length
        process.stdout.write(`  ${done.toLocaleString()}/${rows.length.toLocaleString()} (${Math.round(done/rows.length*100)}%)...\r`)
        retries = 0
      } catch (e) {
        if (client) await client.query('ROLLBACK').catch(() => {})
        retries--
        if (retries === 0) {
          errors += batch.length
          console.error(`\n  ⚠️  Skipped batch at ${i}: ${e.message}`)
        } else {
          await new Promise(r => setTimeout(r, 2000))
        }
      } finally {
        if (client) client.release()
      }
    }
  }

  await pool.end().catch(() => {})
  console.log(`\n  ✅ ${label}: ${done.toLocaleString()} imported, ${errors} errors`)
  return done
}

function movieQuery(r) {
  return {
    sql: `INSERT INTO movies (
      id, title, original_title, overview, poster_path, backdrop_path,
      release_date, vote_average, vote_count, popularity, adult,
      original_language, runtime, status, tagline, budget, revenue,
      genres, cast_data, crew_data, similar_content,
      production_companies, spoken_languages, keywords, videos, images
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
      $18::jsonb,$19::jsonb,$20::jsonb,$21::jsonb,$22::jsonb,$23::jsonb,$24::jsonb,$25::jsonb,$26::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      vote_average = EXCLUDED.vote_average,
      popularity = EXCLUDED.popularity,
      updated_at = NOW()`,
    params: [
      r.id, r.title || '', r.original_title, r.overview,
      r.poster_path, r.backdrop_path, r.release_date || null,
      r.vote_average || 0, r.vote_count || 0, r.popularity || 0,
      r.adult || false, r.original_language,
      r.runtime, r.status, r.tagline,
      r.budget || 0, r.revenue || 0,
      JSON.stringify(r.genres || []),
      JSON.stringify(r.cast_data || []),
      JSON.stringify(r.crew_data || []),
      JSON.stringify(r.similar_content || []),
      JSON.stringify(r.production_companies || []),
      JSON.stringify(r.spoken_languages || []),
      JSON.stringify(r.keywords || []),
      JSON.stringify(r.videos || []),
      JSON.stringify(r.images || []),
    ]
  }
}

function tvQuery(r) {
  return {
    sql: `INSERT INTO tv_series (
      id, name, original_name, overview, poster_path, backdrop_path,
      first_air_date, last_air_date, vote_average, vote_count, popularity,
      adult, original_language, number_of_seasons, number_of_episodes,
      status, tagline, type,
      genres, cast_data, crew_data, similar_content,
      production_companies, spoken_languages, keywords, videos, images,
      networks, seasons
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
      $19::jsonb,$20::jsonb,$21::jsonb,$22::jsonb,$23::jsonb,$24::jsonb,$25::jsonb,$26::jsonb,$27::jsonb,
      $28::jsonb,$29::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      vote_average = EXCLUDED.vote_average,
      popularity = EXCLUDED.popularity,
      updated_at = NOW()`,
    params: [
      r.id, r.name || '', r.original_name, r.overview,
      r.poster_path, r.backdrop_path,
      r.first_air_date || null, r.last_air_date || null,
      r.vote_average || 0, r.vote_count || 0, r.popularity || 0,
      r.adult || false, r.original_language,
      r.number_of_seasons || 0, r.number_of_episodes || 0,
      r.status, r.tagline, r.type,
      JSON.stringify(r.genres || []),
      JSON.stringify(r.cast_data || []),
      JSON.stringify(r.crew_data || []),
      JSON.stringify(r.similar_content || []),
      JSON.stringify(r.production_companies || []),
      JSON.stringify(r.spoken_languages || []),
      JSON.stringify(r.keywords || []),
      JSON.stringify(r.videos || []),
      JSON.stringify(r.images || []),
      JSON.stringify(r.networks || []),
      JSON.stringify(r.seasons || []),
    ]
  }
}

async function verify(pool) {
  const client = await pool.connect()
  try {
    const m = await client.query('SELECT COUNT(*) FROM movies')
    const t = await client.query('SELECT COUNT(*) FROM tv_series')
    const mc = parseInt(m.rows[0].count)
    const tc = parseInt(t.rows[0].count)
    console.log(`\n📊 Verification:`)
    console.log(`   Movies:    ${mc.toLocaleString()} / 30,890`)
    console.log(`   TV Series: ${tc.toLocaleString()} / 17,547`)
    console.log(`   Total:     ${(mc + tc).toLocaleString()} / 48,437`)
    if (mc >= 30000 && tc >= 17000) {
      console.log(`   ✅ Migration successful!`)
    } else {
      console.log(`   ⚠️  Some rows missing - re-run to fill gaps`)
    }
  } finally {
    client.release()
  }
}

async function main() {
  console.log('='.repeat(55))
  console.log('  Cinema Online: Fast Import to CockroachDB')
  console.log('='.repeat(55))

  const moviesFile = join(DATA_DIR, 'movies.json')
  const tvFile = join(DATA_DIR, 'tv_series.json')

  if (!existsSync(moviesFile) || !existsSync(tvFile)) {
    console.error('❌ Data files not found. Run export_and_import.mjs first.')
    process.exit(1)
  }

  console.log('📂 Loading data files...')
  const movies = JSON.parse(readFileSync(moviesFile, 'utf8'))
  const tv = JSON.parse(readFileSync(tvFile, 'utf8'))
  console.log(`   Movies: ${movies.length.toLocaleString()}, TV: ${tv.length.toLocaleString()}`)

  const start = Date.now()

  await importRows(movies, 'movies', movieQuery)
  await importRows(tv, 'tv_series', tvQuery)

  const pool = makePool()
  await verify(pool)
  await pool.end()

  console.log(`\n✅ Done in ${((Date.now() - start) / 60000).toFixed(1)} minutes!`)
}

main().catch(e => {
  console.error('❌ Fatal:', e.message)
  process.exit(1)
})
