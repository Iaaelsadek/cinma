// Verification script: Check slug column and indexes on movies table
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import pkg from 'pg'
const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
})

async function verifyMoviesSlug() {
  try {
    console.log('🔍 Verifying slug column and indexes on movies table\n')
    
    // Check column
    const columnResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'movies' AND column_name = 'slug'
    `)
    
    if (columnResult.rows.length === 0) {
      console.log('❌ Slug column does not exist!')
      return
    }
    
    console.log('✅ Slug column exists:')
    columnResult.rows.forEach(col => {
      console.log(`   Column: ${col.column_name}`)
      console.log(`   Type: ${col.data_type}`)
      console.log(`   Nullable: ${col.is_nullable}`)
      console.log(`   Default: ${col.column_default || 'NULL'}`)
    })
    
    // Check indexes
    console.log('\n🔍 Checking indexes...')
    const indexResult = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'movies' AND indexname LIKE 'idx_movies_slug%'
      ORDER BY indexname
    `)
    
    if (indexResult.rows.length === 0) {
      console.log('❌ No slug indexes found!')
      return
    }
    
    console.log(`✅ Found ${indexResult.rows.length} indexes:`)
    indexResult.rows.forEach(idx => {
      console.log(`\n   Index: ${idx.indexname}`)
      console.log(`   Definition: ${idx.indexdef}`)
    })
    
    // Check pg_trgm extension
    console.log('\n🔍 Checking pg_trgm extension...')
    const extResult = await pool.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'pg_trgm'
    `)
    
    if (extResult.rows.length > 0) {
      console.log(`✅ pg_trgm extension is enabled (version: ${extResult.rows[0].extversion})`)
    } else {
      console.log('❌ pg_trgm extension is not enabled!')
    }
    
    // Count movies
    console.log('\n📊 Database statistics...')
    const countResult = await pool.query('SELECT COUNT(*) as total FROM movies')
    const slugCountResult = await pool.query('SELECT COUNT(*) as with_slug FROM movies WHERE slug IS NOT NULL')
    
    console.log(`   Total movies: ${countResult.rows[0].total}`)
    console.log(`   Movies with slug: ${slugCountResult.rows[0].with_slug}`)
    console.log(`   Movies without slug: ${countResult.rows[0].total - slugCountResult.rows[0].with_slug}`)
    
    // Sample movies
    console.log('\n📋 Sample movies (first 10):')
    const sampleResult = await pool.query(`
      SELECT id, title, slug 
      FROM movies 
      ORDER BY id 
      LIMIT 10
    `)
    
    sampleResult.rows.forEach(movie => {
      const slugStatus = movie.slug ? `"${movie.slug}"` : '(null)'
      console.log(`   ${movie.id}. ${movie.title} → ${slugStatus}`)
    })
    
    console.log('\n✅ Verification complete!')
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
  } finally {
    await pool.end()
  }
}

verifyMoviesSlug()
