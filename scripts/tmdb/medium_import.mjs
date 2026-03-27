// scripts/tmdb/medium_import.mjs - Medium import (300K items: 200K movies + 100K TV)
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
const REQUESTS_PER_SECOND = 40
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
    const slug = `${baseSlug}-${movie.id}`;

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
      0,
      'Released'
    ])
    
    stats.movies.added++
  } catch (error) {
    if (error.code === '23505') {
      stats.movies.skipped++
    } else {
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
    const slug = `${baseSlug}-${tv.id}`;

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
      0,
      0
    ])
    
    stats.tv.added++
  } catch (error) {
    if (error.code === '23505') {
      stats.tv.skipped++
    } else {
      stats.tv.errors++
    }
  }
}

async function fetchAndImportMovies(targetCount = 200000) {
  console.log(`\n📽️  Starting movie import (target: ${targetCount.toLocaleString()})...`)
  
  const endpoints = [
    'discover/movie?sort_by=popularity.desc',
    'discover/movie?sort_by=vote_average.desc&vote_count.gte=1000',
    'discover/movie?sort_by=revenue.desc',
    'movie/popular',
    'movie/top_rated',
    'discover/movie?sort_by=release_date.desc',
  ]
  
  let totalFetched = 0
  
  for (const endpoint of endpoints) {
    if (totalFetched >= targetCount) break
    
    console.log(`\n🔍 Fetching from: ${endpoint}`)
    let page = 1
    
    while (totalFetched < targetCount && page <= 500) {
      try {
        const url = `https://api.themoviedb.org/3/${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}&language=en-US&page=${page}&include_adult=false`
        const response = await rateLimitedFetch(url)
        
        if (!response.ok) {
          if (response.status === 400) {
            console.log(`Reached end of ${endpoint} at page ${page}`)
            break
          }
          console.error(`Failed to fetch page ${page}: ${response.status}`)
          break
        }
        
        const data = await response.json()
        
        if (!data.results || data.results.length === 0) break
        
        await Promise.all(data.results.slice(0, 20).map(movie => insertMovie(movie)))
        
        totalFetched += data.results.length
        stats.movies.total = totalFetched
        
        if (page % 50 === 0) {
          const elapsed = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)
          const rate = (totalFetched / elapsed).toFixed(0)
          console.log(`📊 Movies: ${totalFetched.toLocaleString()} | Added: ${stats.movies.added.toLocaleString()} | Skipped: ${stats.movies.skipped.toLocaleString()} | ${rate}/min | ${elapsed}min`)
        }
        
        page++
        
        if (page > data.total_pages) break
        
      } catch (error) {
        console.error(`Error on page ${page}:`, error.message)
        page++
      }
    }
  }
  
  console.log(`✅ Movie import complete: ${stats.movies.added.toLocaleString()} added, ${stats.movies.skipped.toLocaleString()} skipped`)
}

async function fetchAndImportTV(targetCount = 100000) {
  console.log(`\n📺 Starting TV series import (target: ${targetCount.toLocaleString()})...`)
  
  const endpoints = [
    'discover/tv?sort_by=popularity.desc',
    'discover/tv?sort_by=vote_average.desc&vote_count.gte=500',
    'tv/popular',
    'tv/top_rated',
    'discover/tv?sort_by=first_air_date.desc',
  ]
  
  let totalFetched = 0
  
  for (const endpoint of endpoints) {
    if (totalFetched >= targetCount) break
    
    console.log(`\n🔍 Fetching from: ${endpoint}`)
    let page = 1
    
    while (totalFetched < targetCount && page <= 500) {
      try {
        const url = `https://api.themoviedb.org/3/${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
        const response = await rateLimitedFetch(url)
        
        if (!response.ok) {
          if (response.status === 400) {
            console.log(`Reached end of ${endpoint} at page ${page}`)
            break
          }
          console.error(`Failed to fetch page ${page}: ${response.status}`)
          break
        }
        
        const data = await response.json()
        
        if (!data.results || data.results.length === 0) break
        
        await Promise.all(data.results.slice(0, 20).map(tv => insertTV(tv)))
        
        totalFetched += data.results.length
        stats.tv.total = totalFetched
        
        if (page % 50 === 0) {
          const elapsed = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(1)
          const rate = (totalFetched / elapsed).toFixed(0)
          console.log(`📊 TV: ${totalFetched.toLocaleString()} | Added: ${stats.tv.added.toLocaleString()} | Skipped: ${stats.tv.skipped.toLocaleString()} | ${rate}/min | ${elapsed}min`)
        }
        
        page++
        
        if (page > data.total_pages) break
        
      } catch (error) {
        console.error(`Error on page ${page}:`, error.message)
        page++
      }
    }
  }
  
  console.log(`✅ TV import complete: ${stats.tv.added.toLocaleString()} added, ${stats.tv.skipped.toLocaleString()} skipped`)
}

async function main() {
  console.log('🚀 Starting medium TMDB import...')
  console.log(`Target: 300,000 items (200K movies + 100K TV series)`)
  console.log(`Rate limit: ${REQUESTS_PER_SECOND} requests/second`)
  console.log(`Estimated time: 3-4 hours\n`)
  
  try {
    await fetchAndImportMovies(200000)
    await fetchAndImportTV(100000)
    
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
    console.log(`⏱️  Time: ${totalTime} minutes (${(totalTime / 60).toFixed(1)} hours)`)
    console.log(`📈 Rate: ${(totalItems / totalTime).toFixed(0)} items/min`)
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await pool.end()
  }
}

main()
