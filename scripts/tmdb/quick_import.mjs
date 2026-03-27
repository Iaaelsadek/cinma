// scripts/tmdb/quick_import.mjs - Quick import for testing (10K items)
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
  max: 10,
})

const stats = {
  movies: { added: 0, skipped: 0 },
  tv: { added: 0, skipped: 0 },
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
      ON CONFLICT (id) DO NOTHING
    `
    
    const genres = JSON.stringify(movie.genre_ids?.map(id => ({ id })) || [])
    
    const result = await pool.query(query, [
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
    
    if (result.rowCount > 0) stats.movies.added++
    else stats.movies.skipped++
  } catch (error) {
    console.error(`Error inserting movie ${movie.id}:`, error.message)
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
      ON CONFLICT (id) DO NOTHING
    `
    
    const genres = JSON.stringify(tv.genre_ids?.map(id => ({ id })) || [])
    
    const result = await pool.query(query, [
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
    
    if (result.rowCount > 0) stats.tv.added++
    else stats.tv.skipped++
  } catch (error) {
    console.error(`Error inserting TV ${tv.id}:`, error.message)
  }
}

async function main() {
  console.log('🚀 Quick import: 10,000 items (7K movies + 3K TV)\n')
  
  // Import 7000 movies (350 pages × 20 items)
  console.log('📽️  Importing movies...')
  for (let page = 1; page <= 350; page++) {
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${page}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.results) {
      await Promise.all(data.results.map(insertMovie))
    }
    
    if (page % 50 === 0) {
      console.log(`  Progress: ${page * 20} movies processed...`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 25)) // Rate limiting
  }
  
  // Import 3000 TV series (150 pages × 20 items)
  console.log('\n📺 Importing TV series...')
  for (let page = 1; page <= 150; page++) {
    const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${page}`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.results) {
      await Promise.all(data.results.map(insertTV))
    }
    
    if (page % 50 === 0) {
      console.log(`  Progress: ${page * 20} TV series processed...`)
    }
    
    await new Promise(resolve => setTimeout(resolve, 25)) // Rate limiting
  }
  
  console.log('\n✅ Import complete!')
  console.log(`Movies: ${stats.movies.added} added, ${stats.movies.skipped} skipped`)
  console.log(`TV: ${stats.tv.added} added, ${stats.tv.skipped} skipped`)
  
  await pool.end()
}

main()
