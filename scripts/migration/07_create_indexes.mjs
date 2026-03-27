#!/usr/bin/env node
// ==========================================
// Create indexes for actors, games, and software tables
// Must run AFTER tables are created
// ==========================================

import dotenv from 'dotenv'
import pkg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pkg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../../.env.local') })
dotenv.config({ path: join(__dirname, '../../.env') })

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

async function createIndexes() {
  console.log('🚀 Creating indexes for all tables...')
  console.log('='.repeat(60))
  
  const client = await pool.connect()
  
  try {
    // Enable pg_trgm extension first
    console.log('\n📦 Enabling pg_trgm extension...')
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
    console.log('✅ pg_trgm extension enabled')
    
    // Actors indexes
    console.log('\n👤 Creating indexes for actors table...')
    await client.query('CREATE INDEX IF NOT EXISTS idx_actors_tmdb_id ON actors(tmdb_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_actors_name ON actors(name)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_actors_popularity ON actors(popularity DESC)')
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_actors_slug ON actors(slug) WHERE slug IS NOT NULL')
    await client.query('CREATE INDEX IF NOT EXISTS idx_actors_slug_trgm ON actors USING GIN (slug gin_trgm_ops)')
    console.log('✅ Actors indexes created (5 indexes)')
    
    // Games indexes
    console.log('\n🎮 Creating indexes for games table...')
    await client.query('CREATE INDEX IF NOT EXISTS idx_games_title ON games(title)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_games_rating ON games(rating DESC)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_games_popularity ON games(popularity DESC)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_games_category ON games(category)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_games_release_date ON games(release_date DESC)')
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_games_slug ON games(slug) WHERE slug IS NOT NULL')
    await client.query('CREATE INDEX IF NOT EXISTS idx_games_slug_trgm ON games USING GIN (slug gin_trgm_ops)')
    console.log('✅ Games indexes created (7 indexes)')
    
    // Software indexes
    console.log('\n💻 Creating indexes for software table...')
    await client.query('CREATE INDEX IF NOT EXISTS idx_software_title ON software(title)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_software_rating ON software(rating DESC)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_software_popularity ON software(popularity DESC)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_software_category ON software(category)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_software_license_type ON software(license_type)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_software_release_date ON software(release_date DESC)')
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_software_slug ON software(slug) WHERE slug IS NOT NULL')
    await client.query('CREATE INDEX IF NOT EXISTS idx_software_slug_trgm ON software USING GIN (slug gin_trgm_ops)')
    console.log('✅ Software indexes created (8 indexes)')
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ All indexes created successfully!')
    console.log('   Total: 20 indexes (5 actors + 7 games + 8 software)')
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('\n❌ Error creating indexes:', error.message)
    throw error
  } finally {
    client.release()
  }
}

async function main() {
  try {
    await createIndexes()
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Fatal error:', error)
    await pool.end()
    process.exit(1)
  }
}

main()
