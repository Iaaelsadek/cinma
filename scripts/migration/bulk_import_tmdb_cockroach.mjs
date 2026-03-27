/**
 * Bulk Import from TMDB API to CockroachDB to reach target movies + TV series
 * Strategy: Import popular content + discover by year/genre (1900-1980)
 */
import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fetch from 'node-fetch'
import pkg from 'pg'
const { Pool } = pkg

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../../.env.local') })

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY
const TMDB_BASE = 'https://api.themoviedb.org/3'

// Rate limiting: 50 requests per second max
const DELAY_MS = 25 // 40 requests/second to be safe
const BATCH_SIZE = 50 // Smaller batches for CockroachDB

let totalImported = 0
let totalSkipped = 0
let totalErrors = 0

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchTMDB(endpoint) {
  await sleep(DELAY_MS)
  const url = `${TMDB_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
  }
  return await response.json()
}

async function getExistingIds() {
  console.log('📊 Fetching existing movie IDs from CockroachDB...')
  const client = await pool.connect()
  try {
    const result = await client.query('SELECT id FROM movies')
    const ids = new Set(result.rows.map(m => m.id))
    console.log(`   Found ${ids.size.toLocaleString()} existing movies\n`)
    return ids
  } finally {
    client.release()
  }
}

async function getExistingTVIds() {
  console.log('📊 Fetching existing TV series IDs from CockroachDB...')
  const client = await pool.connect()
  try {
    const result = await client.query('SELECT id FROM tv_series')
    const ids = new Set(result.rows.map(m => m.id))
    console.log(`   Found ${ids.size.toLocaleString()} existing TV series\n`)
    return ids
  } finally {
    client.release()
  }
}

async function importBatch(movies) {
  if (movies.length === 0) return
  
  const client = await pool.connect()
  try {
    // Build INSERT query with ON CONFLICT
    const values = []
    const placeholders = []
    
    movies.forEach((movie, idx) => {
      const offset = idx * 11
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`)
      values.push(
        movie.id,
        movie.title,
        movie.original_title,
        movie.overview,
        movie.poster_path,
        movie.backdrop_path,
        movie.release_date,
        movie.vote_average,
        movie.vote_count,
        movie.popularity,
        movie.original_language
      )
    })
    
    const query = `
      INSERT INTO movies (id, title, original_title, overview, poster_path, backdrop_path, release_date, vote_average, vote_count, popularity, original_language)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO NOTHING
    `
    
    await client.query(query, values)
    totalImported += movies.length
  } catch (error) {
    console.error('   ❌ Batch import error:', error.message)
    totalErrors += movies.length
  } finally {
    client.release()
  }
}

function transformMovie(movie) {
  return {
    id: movie.id,
    title: movie.title || movie.original_title || 'Untitled',
    original_title: movie.original_title || movie.title || 'Untitled',
    overview: movie.overview || '',
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    release_date: movie.release_date || null,
    vote_average: movie.vote_average || 0,
    vote_count: movie.vote_count || 0,
    popularity: movie.popularity || 0,
    original_language: movie.original_language || 'en',
  }
}

function transformTV(tv) {
  return {
    id: tv.id,
    name: tv.name || tv.original_name || 'Untitled',
    original_name: tv.original_name || tv.name || 'Untitled',
    overview: tv.overview || '',
    poster_path: tv.poster_path,
    backdrop_path: tv.backdrop_path,
    first_air_date: tv.first_air_date || null,
    vote_average: tv.vote_average || 0,
    vote_count: tv.vote_count || 0,
    popularity: tv.popularity || 0,
    original_language: tv.original_language || 'en',
  }
}

async function importTVBatch(tvSeries) {
  if (tvSeries.length === 0) return
  
  const client = await pool.connect()
  try {
    const values = []
    const placeholders = []
    
    tvSeries.forEach((tv, idx) => {
      const offset = idx * 11
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`)
      values.push(
        tv.id,
        tv.name,
        tv.original_name,
        tv.overview,
        tv.poster_path,
        tv.backdrop_path,
        tv.first_air_date,
        tv.vote_average,
        tv.vote_count,
        tv.popularity,
        tv.original_language
      )
    })
    
    const query = `
      INSERT INTO tv_series (id, name, original_name, overview, poster_path, backdrop_path, first_air_date, vote_average, vote_count, popularity, original_language)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (id) DO NOTHING
    `
    
    await client.query(query, values)
    totalImported += tvSeries.length
  } catch (error) {
    console.error('   ❌ TV batch import error:', error.message)
    totalErrors += tvSeries.length
  } finally {
    client.release()
  }
}

async function importPopularTV(existingIds, targetCount) {
  console.log('📺 Importing popular TV series...\n')
  
  const batch = []
  let imported = 0
  
  for (let page = 1; page <= 500; page++) {
    if (totalImported + existingIds.size >= targetCount) break
    
    try {
      const data = await fetchTMDB(`/tv/popular?page=${page}`)
      
      if (!data.results || data.results.length === 0) break
      
      for (const tv of data.results) {
        if (existingIds.has(tv.id)) {
          totalSkipped++
          continue
        }
        
        existingIds.add(tv.id)
        batch.push(transformTV(tv))
        imported++
        
        if (batch.length >= BATCH_SIZE) {
          await importTVBatch(batch)
          batch.length = 0
          process.stdout.write(
            `  Page ${page}: ${imported.toLocaleString()} imported, ` +
            `${totalSkipped.toLocaleString()} skipped, ` +
            `Total: ${(totalImported + existingIds.size).toLocaleString()}...\r`
          )
        }
      }
    } catch (error) {
      console.error(`\n   ❌ Error on page ${page}:`, error.message)
    }
  }
  
  if (batch.length > 0) {
    await importTVBatch(batch)
  }
  
  console.log(`\n\n✅ Popular TV series: ${imported.toLocaleString()} imported`)
}

async function discoverTV(existingIds, targetCount) {
  console.log(`🔍 Discovering TV series to reach ${targetCount.toLocaleString()} total...\n`)
  
  const batch = []
  const years = []
  for (let y = 1980; y >= 1950; y--) years.push(y)
  
  const genres = [10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766, 10767, 10768, 37]
  
  let discovered = 0
  
  for (const year of years) {
    if (totalImported + existingIds.size >= targetCount) break
    
    for (const genre of genres) {
      if (totalImported + existingIds.size >= targetCount) break
      
      try {
        for (let page = 1; page <= 20; page++) {
          if (totalImported + existingIds.size >= targetCount) break
          
          const data = await fetchTMDB(
            `/discover/tv?first_air_date_year=${year}&with_genres=${genre}&page=${page}&sort_by=popularity.desc`
          )
          
          if (!data.results || data.results.length === 0) break
          
          for (const tv of data.results) {
            if (existingIds.has(tv.id)) {
              totalSkipped++
              continue
            }
            
            existingIds.add(tv.id)
            batch.push(transformTV(tv))
            discovered++
            
            if (batch.length >= BATCH_SIZE) {
              await importTVBatch(batch)
              batch.length = 0
              process.stdout.write(
                `  Year ${year}, Genre ${genre}: ${discovered.toLocaleString()} discovered, ` +
                `${totalImported.toLocaleString()} imported, ` +
                `${totalSkipped.toLocaleString()} skipped, ` +
                `Total: ${(totalImported + existingIds.size).toLocaleString()}...\r`
              )
            }
          }
          
          if (data.page >= data.total_pages) break
        }
      } catch (error) {
        console.error(`\n   ❌ Error for year ${year}, genre ${genre}:`, error.message)
      }
    }
  }
  
  if (batch.length > 0) {
    await importTVBatch(batch)
  }
  
  console.log(`\n\n✅ TV Discovery complete: ${discovered.toLocaleString()} new TV series found`)
}

async function discoverMovies(existingIds, targetCount) {
  console.log(`🔍 Discovering movies to reach ${targetCount.toLocaleString()} total...\n`)
  
  const batch = []
  const years = []
  for (let y = 1980; y >= 1900; y--) years.push(y)
  
  const genres = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37]
  
  let discovered = 0
  
  for (const year of years) {
    if (totalImported + existingIds.size >= targetCount) break
    
    for (const genre of genres) {
      if (totalImported + existingIds.size >= targetCount) break
      
      try {
        // Discover by year and genre
        for (let page = 1; page <= 20; page++) {
          if (totalImported + existingIds.size >= targetCount) break
          
          const data = await fetchTMDB(
            `/discover/movie?primary_release_year=${year}&with_genres=${genre}&page=${page}&sort_by=popularity.desc`
          )
          
          if (!data.results || data.results.length === 0) break
          
          for (const movie of data.results) {
            if (existingIds.has(movie.id)) {
              totalSkipped++
              continue
            }
            
            existingIds.add(movie.id)
            batch.push(transformMovie(movie))
            discovered++
            
            if (batch.length >= BATCH_SIZE) {
              await importBatch(batch)
              batch.length = 0
              process.stdout.write(
                `  Year ${year}, Genre ${genre}: ${discovered.toLocaleString()} discovered, ` +
                `${totalImported.toLocaleString()} imported, ` +
                `${totalSkipped.toLocaleString()} skipped, ` +
                `Total: ${(totalImported + existingIds.size).toLocaleString()}...\r`
              )
            }
          }
          
          if (data.page >= data.total_pages) break
        }
      } catch (error) {
        console.error(`\n   ❌ Error for year ${year}, genre ${genre}:`, error.message)
      }
    }
  }
  
  // Import remaining batch
  if (batch.length > 0) {
    await importBatch(batch)
  }
  
  console.log(`\n\n✅ Discovery complete: ${discovered.toLocaleString()} new movies found`)
}

async function importPopularMovies(existingIds, targetCount) {
  console.log('🔥 Importing popular movies...\n')
  
  const batch = []
  let imported = 0
  
  for (let page = 1; page <= 500; page++) {
    if (totalImported + existingIds.size >= targetCount) break
    
    try {
      const data = await fetchTMDB(`/movie/popular?page=${page}`)
      
      if (!data.results || data.results.length === 0) break
      
      for (const movie of data.results) {
        if (existingIds.has(movie.id)) {
          totalSkipped++
          continue
        }
        
        existingIds.add(movie.id)
        batch.push(transformMovie(movie))
        imported++
        
        if (batch.length >= BATCH_SIZE) {
          await importBatch(batch)
          batch.length = 0
          process.stdout.write(
            `  Page ${page}: ${imported.toLocaleString()} imported, ` +
            `${totalSkipped.toLocaleString()} skipped, ` +
            `Total: ${(totalImported + existingIds.size).toLocaleString()}...\r`
          )
        }
      }
    } catch (error) {
      console.error(`\n   ❌ Error on page ${page}:`, error.message)
    }
  }
  
  // Import remaining batch
  if (batch.length > 0) {
    await importBatch(batch)
  }
  
  console.log(`\n\n✅ Popular movies: ${imported.toLocaleString()} imported`)
}

async function main() {
  console.log('='.repeat(60))
  console.log('  Bulk Import from TMDB to CockroachDB (1M movies + TV)')
  console.log('='.repeat(60))
  console.log()
  
  const TARGET = 1000000
  const existingMovieIds = await getExistingIds()
  const existingTVIds = await getExistingTVIds()
  const totalExisting = existingMovieIds.size + existingTVIds.size
  
  if (totalExisting >= TARGET) {
    console.log(`✅ Already have ${totalExisting.toLocaleString()} items (target: ${TARGET.toLocaleString()})`)
    await pool.end()
    process.exit(0)
  }
  
  console.log(`🎯 Target: ${TARGET.toLocaleString()} total items`)
  console.log(`📊 Current Movies: ${existingMovieIds.size.toLocaleString()}`)
  console.log(`📊 Current TV: ${existingTVIds.size.toLocaleString()}`)
  console.log(`📊 Total Current: ${totalExisting.toLocaleString()}`)
  console.log(`📈 Need: ${(TARGET - totalExisting).toLocaleString()} more items\n`)
  
  const startTime = Date.now()
  
  // Reset counters
  totalImported = 0
  totalSkipped = 0
  totalErrors = 0
  
  // Step 1: Import popular movies
  console.log('🎬 PHASE 1: MOVIES\n')
  await importPopularMovies(existingMovieIds, TARGET / 2)
  
  // Step 2: Discover movies by year and genre
  if (totalImported + existingMovieIds.size < TARGET / 2) {
    await discoverMovies(existingMovieIds, TARGET / 2)
  }
  
  const moviesImported = totalImported
  
  // Reset for TV
  totalImported = 0
  totalSkipped = 0
  
  // Step 3: Import popular TV series
  console.log('\n📺 PHASE 2: TV SERIES\n')
  await importPopularTV(existingTVIds, TARGET / 2)
  
  // Step 4: Discover TV by year and genre
  if (totalImported + existingTVIds.size < TARGET / 2) {
    await discoverTV(existingTVIds, TARGET / 2)
  }
  
  const tvImported = totalImported
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 FINAL SUMMARY')
  console.log('='.repeat(60))
  console.log(`🎬 Movies Imported: ${moviesImported.toLocaleString()}`)
  console.log(`📺 TV Series Imported: ${tvImported.toLocaleString()}`)
  console.log(`✅ Total Imported: ${(moviesImported + tvImported).toLocaleString()}`)
  console.log(`⏭️  Skipped: ${totalSkipped.toLocaleString()} duplicates`)
  console.log(`❌ Errors: ${totalErrors.toLocaleString()}`)
  console.log(`📊 Total Movies in DB: ${(existingMovieIds.size + moviesImported).toLocaleString()}`)
  console.log(`📊 Total TV in DB: ${(existingTVIds.size + tvImported).toLocaleString()}`)
  console.log(`📊 Grand Total: ${(existingMovieIds.size + moviesImported + existingTVIds.size + tvImported).toLocaleString()}`)
  console.log(`⏱️  Time: ${elapsed} minutes`)
  console.log('='.repeat(60))
  
  await pool.end()
}

main().catch(error => {
  console.error('Fatal error:', error)
  pool.end()
  process.exit(1)
})
