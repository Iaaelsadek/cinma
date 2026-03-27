// Check if games table exists in Supabase
// Task 1.4: Verification script for games table in Supabase

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGamesTable() {
  try {
    console.log('🔍 Checking if games table exists in Supabase...\n')
    
    // Try to query the games table
    const { data, error, count } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log('❌ Games table does not exist in Supabase')
        console.log('📝 This task can be skipped (conditional requirement)')
        return false
      }
      throw error
    }
    
    console.log('✅ Games table exists in Supabase!')
    console.log(`📊 Total games in database: ${count?.toLocaleString() || 0}`)
    
    // Get sample data
    if (count && count > 0) {
      const { data: sample } = await supabase
        .from('games')
        .select('id, title, category, rating')
        .order('id')
        .limit(5)
      
      console.log('\n📊 Sample games (first 5):')
      sample?.forEach(game => {
        console.log(`   - ID: ${game.id}, Title: ${game.title}, Category: ${game.category}, Rating: ${game.rating}`)
      })
    }
    
    // Check if slug column exists
    const { data: columns } = await supabase
      .from('games')
      .select('*')
      .limit(1)
    
    if (columns && columns.length > 0) {
      const hasSlug = 'slug' in columns[0]
      console.log(`\n${hasSlug ? '✅' : '📝'} Slug column ${hasSlug ? 'already exists' : 'does not exist yet - migration needed'}`)
    }
    
    console.log('\n📝 Note: Games table is in Supabase, not CockroachDB')
    console.log('   Migration script should use Supabase client instead of pg Pool')
    
    return true
    
  } catch (error) {
    console.error('❌ Error checking games table:', error.message)
    throw error
  }
}

// Run check
checkGamesTable().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
