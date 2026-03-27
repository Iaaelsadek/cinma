// scripts/tmdb/bulk_import.mjs - Bulk import top 1M content from TMDB
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fetch from 'node-fetch'
import pkg from 'pg'
const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY
const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// Statistics
const stats = {
  movies: { total: 0, added: 0, skipped: 0, errors: 0 },
  tv: { total: 0, added: 0, skipped: 0, errors: 0 },
  startTime: Date.now()
}

// Rate limiting
const REQUESTS_PER_SECOND = 40 // TMDB allows 50/sec, we use 40 to be safe
let requestQueue = []
let lastRequestTime = 0

async function rateLimitedFetch(url) {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  const minDelay = 1000 / REQUESTS_PER_SECOND

  if (timeSinceLastRequest < minDelay) {
    await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest))
  }

  lastRequestTime = Date.now()
  return fetch(url)
}

async function insertMovie(movie) {
  try {
    // STRICT CONTENT RULE: Skip unreleased content
    if (!movie.release_date || new Date(movie.release_date) > new Date()) {
      stats.movies.skipped++
      return
    }

    const title = movie.title || movie.original_title || 'content';
    let baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[\s\W|_]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'content';
    
    // Logic for Pure Slug: Title -> if exists -> Title-Year -> if exists -> Title-Year-ID
    let slug = baseSlug;
    const existing = await pool.query(`SELECT id FROM movies WHERE slug = $1 AND id != $2`, [slug, movie.id]);
    
    if (existing.rows.length > 0) {
      const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
      if (year && !isNaN(year)) {
        slug = `${baseSlug}-${year}`;
        const existingYear = await pool.query(`SELECT id FROM movies WHERE slug = $1 AND id != $2`, [slug, movie.id]);
        if (existingYear.rows.length > 0) {
          slug = `${baseSlug}-${year}-${movie.id}`;
        }
      } else {
        slug = `${baseSlug}-${movie.id}`;
      }
    }

    const query = `
      INSERT INTO movies (
        id, slug, title, original_title, overview, release_date, 
        poster_path, backdrop_path, vote_average, vote_count, 
        popularity, adult, original_language, genres, runtime, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        title = EXCLUDED.title,
        overview = EXCLUDED.overview,
        vote_average = EXCLUDED.vote_average,
        vote_count = EXCLUDED.vote_count,
        popularity = EXCLUDED.popularity
      RETURNING id
    `
    
    const genres = JSON.stringify(movie.genre_ids?.map(id => ({ id })) || [])
    
    await pool.query(query, [
      movie.id,
      slug,
      movie.title || movie.original_title,
      movie.original_title,
      movie.overview || '',
      movie.release_date || null,
      movie.poster_path,
      movie.backdrop_path,
      movie.vote_average || 0,
      movie.vote_count || 0,
      movie.popularity || 0,
      movie.adult || false,
      movie.original_language || 'en',
      genres,
      0, // runtime - will be updated later if needed
      'Released'
    ])
    
    stats.movies.added++
  } catch (error) {
    if (error.code === '23505') { // Duplicate key
      stats.movies.skipped++
    } else {
      console.error(`Error inserting movie ${movie.id}:`, error.message)
      stats.movies.errors++
    }
  }
}

async function insertTV(tv) {
  try {
    // STRICT CONTENT RULE: Skip unreleased content
    if (!tv.first_air_date || new Date(tv.first_air_date) > new Date()) {
      stats.tv.skipped++
      return
    }

    const title = tv.name || tv.original_name || 'content';
    let baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[\s\W|_]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'content';
    
    // Logic for Pure Slug: Title -> if exists -> Title-Year -> if exists -> Title-Year-ID
    let slug = baseSlug;
    const existing = await pool.query(`SELECT id FROM tv_series WHERE slug = $1 AND id != $2`, [slug, tv.id]);
    
    if (existing.rows.length > 0) {
      const year = tv.first_air_date ? new Date(tv.first_air_date).getFullYear() : null;
      if (year && !isNaN(year)) {
        slug = `${baseSlug}-${year}`;
        const existingYear = await pool.query(`SELECT id FROM tv_series WHERE slug = $1 AND id != $2`, [slug, tv.id]);
        if (existingYear.rows.length > 0) {
          slug = `${baseSlug}-${year}-${tv.id}`;
        }
      } else {
        slug = `${baseSlug}-${tv.id}`;
      }
    }

    const query = `
      INSERT INTO tv_series (
        id, slug, name, original_name, overview, first_air_date, 
        poster_path, backdrop_path, vote_average, vote_count, 
        popularity, original_language, genres, status, number_of_seasons, number_of_episodes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        overview = EXCLUDED.overview,
        vote_average = EXCLUDED.vote_average,
        vote_count = EXCLUDED.vote_count,
        popularity = EXCLUDED.popularity
      RETURNING id
    `
    
    const genres = JSON.stringify(tv.genre_ids?.map(id => ({ id })) || [])
    
    await pool.query(query, [
      tv.id,
      slug,
      tv.name || tv.original_name,
      tv.original_name,
      tv.overview || '',
      tv.first_air_date || null,
      tv.poster_path,
      tv.backdrop_path,
      tv.vote_average || 0,
      tv.vote_count || 0,
      tv.popularity || 0,
      tv.original_language || 'en',
      genres,
      'Ended',
      0, // number_of_seasons - will be updated later if needed
      0  // number_of_episodes
    ])
    
    stats.tv.added++
  } catch (error) {
    if (error.code === '23505') { // Duplicate key
      stats.tv.skipped++
    } else {
      console.error(`Error inserting TV ${tv.id}:`, error.message)
      stats.tv.errors++
    }
  }
}

async function fetchAndImportMovies(targetCount = 700000) {
  console.log(`\n📽️  Starting movie import (target: ${targetCount.toLocaleString()})...`)
  
  let page = 1
  let totalFetched = 0
  
  while (totalFetched < targetCount) {
    try {
      // Fetch popular movies
      const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&page=${page}&include_adult=false`
      const response = await rateLimitedFetch(url)
      
      if (!response.ok) {
        console.error(`Failed to fetch page ${page}: ${response.status}`)
        break
      }
      
      const data = await response.json()
      
      if (!data.results || data.results.length === 0) {
        console.log('No more results')
        break
      }
      
      // Insert movies in parallel (batch of 20)
      const batch = data.results.slice(0, 20)
      await Promise.all(batch.map(movie => insertMovie(movie)))
      
      totalFetched += batch.length
      stats.movies.total = totalFetched
      
      // Progress update every 100 pages
      if (page % 100 === 0) {
        const elapsed = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)
        const rate = (totalFetched / elapsed).toFixed(0)
        console.log(`📊 Movies: ${totalFetched.toLocaleString()} fetched | ${stats.movies.added.toLocaleString()} added | ${stats.movies.skipped.toLocaleString()} skipped | ${rate}/min | ${elapsed}min elapsed`)
      }
      
      page++
      
      // Check if we've reached the last page
      if (page > data.total_pages) {
        console.log('Reached last page of results')
        break
      }
      
    } catch (error) {
      console.error(`Error on page ${page}:`, error.message)
      // Continue to next page
      page++
    }
  }
  
  console.log(`✅ Movie import complete: ${stats.movies.added.toLocaleString()} added, ${stats.movies.skipped.toLocaleString()} skipped`)
}

async function fetchAndImportTV(targetCount = 300000) {
  console.log(`\n📺 Starting TV series import (target: ${targetCount.toLocaleString()})...`)
  
  let page = 1
  let totalFetched = 0
  
  while (totalFetched < targetCount) {
    try {
      // Fetch popular TV series
      const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&page=${page}`
      const response = await rateLimitedFetch(url)
      
      if (!response.ok) {
        console.error(`Failed to fetch page ${page}: ${response.status}`)
        break
      }
      
      const data = await response.json()
      
      if (!data.results || data.results.length === 0) {
        console.log('No more results')
        break
      }
      
      // Insert TV series in parallel (batch of 20)
      const batch = data.results.slice(0, 20)
      await Promise.all(batch.map(tv => insertTV(tv)))
      
      totalFetched += batch.length
      stats.tv.total = totalFetched
      
      // Progress update every 100 pages
      if (page % 100 === 0) {
        const elapsed = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)
        const rate = (totalFetched / elapsed).toFixed(0)
        console.log(`📊 TV: ${totalFetched.toLocaleString()} fetched | ${stats.tv.added.toLocaleString()} added | ${stats.tv.skipped.toLocaleString()} skipped | ${rate}/min | ${elapsed}min elapsed`)
      }
      
      page++
      
      // Check if we've reached the last page
      if (page > data.total_pages) {
        console.log('Reached last page of results')
        break
      }
      
    } catch (error) {
      console.error(`Error on page ${page}:`, error.message)
      // Continue to next page
      page++
    }
  }
  
  console.log(`✅ TV import complete: ${stats.tv.added.toLocaleString()} added, ${stats.tv.skipped.toLocaleString()} skipped`)
}

async function main() {
  console.log('🚀 Starting bulk TMDB import...')
  console.log(`Target: 1,000,000 items (700K movies + 300K TV series)`)
  console.log(`Rate limit: ${REQUESTS_PER_SECOND} requests/second\n`)
  
  try {
    // Import movies first
    await fetchAndImportMovies(700000)
    
    // Then import TV series
    await fetchAndImportTV(300000)
    
    // Final statistics
    const totalTime = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)
    const totalItems = stats.movies.total + stats.tv.total
    const totalAdded = stats.movies.added + stats.tv.added
    const totalSkipped = stats.movies.skipped + stats.tv.skipped
    const totalErrors = stats.movies.errors + stats.tv.errors
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 FINAL STATISTICS')
    console.log('='.repeat(60))
    console.log(`Total items processed: ${totalItems.toLocaleString()}`)
    console.log(`✅ Added: ${totalAdded.toLocaleString()}`)
    console.log(`⏭️  Skipped: ${totalSkipped.toLocaleString()}`)
    console.log(`❌ Errors: ${totalErrors.toLocaleString()}`)
    console.log(`⏱️  Time: ${totalTime} minutes`)
    console.log(`📈 Rate: ${(totalItems / totalTime).toFixed(0)} items/min`)
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await pool.end()
  }
}

main()
