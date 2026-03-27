// Migration script: Add slug column to tv_series table
// Task 1.2: إضافة عمود slug لجدول tv_series في CockroachDB

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

async function addSlugToTvSeries() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Starting migration: Add slug column to tv_series table\n')
    
    // Step 1: Check if slug column already exists
    console.log('📋 Step 1: Checking if slug column exists...')
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tv_series' AND column_name = 'slug'
    `)
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Slug column already exists, skipping column creation\n')
    } else {
      // Step 2: Add slug column (nullable)
      console.log('📝 Step 2: Adding slug column to tv_series table...')
      await client.query('ALTER TABLE tv_series ADD COLUMN slug TEXT')
      console.log('✅ Slug column added successfully\n')
    }
    
    // Step 3: Check and create unique index on slug
    console.log('📋 Step 3: Checking unique index on slug...')
    const uniqueIndexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'tv_series' AND indexname = 'idx_tv_series_slug'
    `)
    
    if (uniqueIndexCheck.rows.length > 0) {
      console.log('✅ Unique index idx_tv_series_slug already exists\n')
    } else {
      console.log('📝 Creating unique index on slug column...')
      await client.query(`
        CREATE UNIQUE INDEX idx_tv_series_slug 
        ON tv_series(slug) 
        WHERE slug IS NOT NULL
      `)
      console.log('✅ Unique index created successfully\n')
    }
    
    // Step 4: Check and create GIN index for fast search
    console.log('📋 Step 4: Checking GIN index for fast search...')
    const ginIndexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'tv_series' AND indexname = 'idx_tv_series_slug_trgm'
    `)
    
    if (ginIndexCheck.rows.length > 0) {
      console.log('✅ GIN index idx_tv_series_slug_trgm already exists\n')
    } else {
      // First, ensure pg_trgm extension is enabled
      console.log('📝 Ensuring pg_trgm extension is enabled...')
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
      console.log('✅ pg_trgm extension enabled\n')
      
      console.log('📝 Creating GIN index for fast search...')
      await client.query(`
        CREATE INDEX idx_tv_series_slug_trgm 
        ON tv_series USING GIN (slug gin_trgm_ops)
      `)
      console.log('✅ GIN index created successfully\n')
    }
    
    // Step 5: Verify the changes
    console.log('🔍 Step 5: Verifying changes...')
    const verifyColumn = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tv_series' AND column_name = 'slug'
    `)
    
    const verifyIndexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'tv_series' AND indexname LIKE 'idx_tv_series_slug%'
      ORDER BY indexname
    `)
    
    console.log('✅ Column details:')
    verifyColumn.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}, nullable: ${col.is_nullable}`)
    })
    
    console.log('\n✅ Indexes created:')
    verifyIndexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`)
      console.log(`     ${idx.indexdef}`)
    })
    
    // Step 6: Show sample data
    console.log('\n📊 Sample TV series (first 5):')
    const sample = await client.query(`
      SELECT id, name, slug 
      FROM tv_series 
      ORDER BY id 
      LIMIT 5
    `)
    sample.rows.forEach(series => {
      console.log(`   - ID: ${series.id}, Name: ${series.name}, Slug: ${series.slug || '(null)'}`)
    })
    
    console.log('\n✅ Migration completed successfully!')
    console.log('📝 Summary:')
    console.log('   - Added slug column (TEXT, nullable)')
    console.log('   - Created unique index: idx_tv_series_slug')
    console.log('   - Created GIN index: idx_tv_series_slug_trgm')
    console.log('   - Requirements validated: 2.2, 2.6')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run migration
addSlugToTvSeries().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
