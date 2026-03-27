// Quick script to check database counts
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import pkg from 'pg'
const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env.local') })
dotenv.config({ path: path.join(__dirname, '../.env') })

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
})

async function checkCounts() {
  try {
    const moviesResult = await pool.query('SELECT COUNT(*) FROM movies')
    const tvResult = await pool.query('SELECT COUNT(*) FROM tv_series')
    
    console.log('📊 Database Statistics:')
    console.log('Movies:', moviesResult.rows[0].count)
    console.log('TV Series:', tvResult.rows[0].count)
    console.log('Total:', parseInt(moviesResult.rows[0].count) + parseInt(tvResult.rows[0].count))
    
    // Sample some movies
    const sampleMovies = await pool.query('SELECT title, release_date, original_language FROM movies ORDER BY popularity DESC LIMIT 10')
    console.log('\n🎬 Top 10 Movies by Popularity:')
    sampleMovies.rows.forEach((movie, i) => {
      console.log(`${i + 1}. ${movie.title} (${movie.release_date?.substring(0, 4) || 'N/A'}) - ${movie.original_language}`)
    })
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkCounts()
