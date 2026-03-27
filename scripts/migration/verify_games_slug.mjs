// Verification script: Check slug column in games table (Supabase)
// Task 1.4: Verify migration for games table

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyGamesSlug() {
  try {
    console.log('🔍 Verifying slug column in games table (Supabase)...\n')
    
    // Get total count
    const { count: totalCount } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 Total games in database: ${totalCount?.toLocaleString() || 0}`)
    
    // Check if slug column exists by querying a sample
    const { data: sample, error } = await supabase
      .from('games')
      .select('id, title, slug')
      .limit(1)
    
    if (error) {
      console.error('❌ Error querying games table:', error.message)
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('📝 Slug column does not exist yet')
        console.log('   Run: node scripts/migration/add_slug_to_games.mjs')
        return false
      }
      throw error
    }
    
    if (!sample || sample.length === 0) {
      console.log('⚠️  No games found in database')
      return false
    }
    
    const hasSlug = 'slug' in sample[0]
    
    if (!hasSlug) {
      console.log('❌ Slug column does not exist in games table')
      console.log('   Run: node scripts/migration/add_slug_to_games.mjs')
      return false
    }
    
    console.log('✅ Slug column exists in games table\n')
    
    // Count games with and without slugs
    const { count: withSlugCount } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .not('slug', 'is', null)
    
    const withoutSlugCount = (totalCount || 0) - (withSlugCount || 0)
    
    console.log('📊 Database statistics:')
    console.log(`   Total games: ${totalCount?.toLocaleString() || 0}`)
    console.log(`   Games with slug: ${withSlugCount?.toLocaleString() || 0}`)
    console.log(`   Games without slug: ${withoutSlugCount.toLocaleString()}`)
    
    // Show sample data
    console.log('\n📊 Sample games (first 5):')
    const { data: samples } = await supabase
      .from('games')
      .select('id, title, slug')
      .order('id')
      .limit(5)
    
    samples?.forEach(game => {
      console.log(`   - ID: ${game.id}, Title: ${game.title}, Slug: ${game.slug || '(null)'}`)
    })
    
    console.log('\n✅ Verification completed!')
    console.log('📝 Summary:')
    console.log('   - Slug column exists: ✅')
    console.log('   - Database: Supabase (not CockroachDB)')
    console.log('   - Requirements validated: 2.4, 2.6')
    
    if (withoutSlugCount > 0) {
      console.log('\n📝 Next steps:')
      console.log('   - Slugs will be generated in Task 15.1 (Migration Script)')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    throw error
  }
}

// Run verification
verifyGamesSlug().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
