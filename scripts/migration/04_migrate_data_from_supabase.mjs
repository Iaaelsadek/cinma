#!/usr/bin/env node
// ==========================================
// Migrate games and software data from Supabase to CockroachDB
// This script moves data to the correct database
// ==========================================

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import pkg from 'pg'
const { Pool } = pkg

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

// Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

// CockroachDB pool
const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

async function migrateGames() {
  console.log('\n🎮 Migrating games from Supabase to CockroachDB...')
  
  try {
    // Fetch all games from Supabase
    const { data: games, error } = await supabase
      .from('games')
      .select('*')
      .order('id')
    
    if (error) {
      console.log('⚠️  No games found in Supabase (this is OK if table doesn\'t exist)')
      return 0
    }
    
    if (!games || games.length === 0) {
      console.log('✅ No games to migrate')
      return 0
    }
    
    console.log(`📦 Found ${games.length} games in Supabase`)
    
    const client = await pool.connect()
    let migrated = 0
    
    try {
      for (const game of games) {
        await client.query(`
          INSERT INTO games (
            id, title, description, poster_url, backdrop_url, release_date,
            rating, rating_count, popularity, category, platform, developer,
            publisher, genres, tags, system_requirements, screenshots, videos,
            website, steam_id, metacritic_score, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            updated_at = NOW()
        `, [
          game.id, game.title, game.description, game.poster_url, game.backdrop_url,
          game.release_date, game.rating || 0, game.rating_count || 0, game.popularity || 0,
          game.category, JSON.stringify(game.platform || []), game.developer, game.publisher,
          JSON.stringify(game.genres || []), JSON.stringify(game.tags || []),
          JSON.stringify(game.system_requirements || {}), JSON.stringify(game.screenshots || []),
          JSON.stringify(game.videos || []), game.website, game.steam_id, game.metacritic_score,
          game.created_at || new Date(), game.updated_at || new Date()
        ])
        migrated++
      }
    } finally {
      client.release()
    }
    
    console.log(`✅ Migrated ${migrated} games to CockroachDB`)
    return migrated
    
  } catch (error) {
    console.error('❌ Error migrating games:', error.message)
    return 0
  }
}

async function migrateSoftware() {
  console.log('\n💻 Migrating software from Supabase to CockroachDB...')
  
  try {
    // Fetch all software from Supabase
    const { data: software, error } = await supabase
      .from('software')
      .select('*')
      .order('id')
    
    if (error) {
      console.log('⚠️  No software found in Supabase (this is OK if table doesn\'t exist)')
      return 0
    }
    
    if (!software || software.length === 0) {
      console.log('✅ No software to migrate')
      return 0
    }
    
    console.log(`📦 Found ${software.length} software items in Supabase`)
    
    const client = await pool.connect()
    let migrated = 0
    
    try {
      for (const item of software) {
        await client.query(`
          INSERT INTO software (
            id, title, description, poster_url, backdrop_url, release_date,
            rating, rating_count, popularity, category, platform, developer,
            publisher, version, license_type, price, features, screenshots,
            videos, website, download_url, system_requirements, file_size,
            languages, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            updated_at = NOW()
        `, [
          item.id, item.title, item.description, item.poster_url, item.backdrop_url,
          item.release_date, item.rating || 0, item.rating_count || 0, item.popularity || 0,
          item.category, JSON.stringify(item.platform || []), item.developer, item.publisher,
          item.version, item.license_type, item.price || 0, JSON.stringify(item.features || []),
          JSON.stringify(item.screenshots || []), JSON.stringify(item.videos || []),
          item.website, item.download_url, JSON.stringify(item.system_requirements || {}),
          item.file_size, JSON.stringify(item.languages || []),
          item.created_at || new Date(), item.updated_at || new Date()
        ])
        migrated++
      }
    } finally {
      client.release()
    }
    
    console.log(`✅ Migrated ${migrated} software items to CockroachDB`)
    return migrated
    
  } catch (error) {
    console.error('❌ Error migrating software:', error.message)
    return 0
  }
}

async function main() {
  console.log('🚀 Starting data migration from Supabase to CockroachDB...')
  console.log('=' .repeat(60))
  
  const gamesCount = await migrateGames()
  const softwareCount = await migrateSoftware()
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary:')
  console.log(`   Games migrated: ${gamesCount}`)
  console.log(`   Software migrated: ${softwareCount}`)
  console.log(`   Total: ${gamesCount + softwareCount}`)
  console.log('=' .repeat(60))
  
  await pool.end()
  process.exit(0)
}

main().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
