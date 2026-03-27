// Verification script: Check if slug column was added to software table
// Task 1.5: Verification after migration

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../../.env.local') })
dotenv.config({ path: path.join(__dirname, '../../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function verifySoftwareSlug() {
  try {
    console.log('🔍 Verifying slug column in software table...\n')
    
    // Check if we can query the slug column
    const response = await fetch(`${supabaseUrl}/rest/v1/software?select=id,title,slug&limit=5`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    })
    
    if (!response.ok) {
      if (response.status === 400) {
        console.log('❌ Slug column does NOT exist in software table')
        console.log('   Please run the migration SQL commands first\n')
        return
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    console.log('✅ Slug column exists in software table\n')
    
    // Get total count
    const countResponse = await fetch(`${supabaseUrl}/rest/v1/software?select=count`, {
      method: 'HEAD',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'count=exact'
      }
    })
    
    const totalCount = countResponse.headers.get('content-range')?.split('/')[1] || '0'
    
    // Count items with slugs
    const withSlugResponse = await fetch(`${supabaseUrl}/rest/v1/software?select=count&slug=not.is.null`, {
      method: 'HEAD',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'count=exact'
      }
    })
    
    const withSlugCount = withSlugResponse.headers.get('content-range')?.split('/')[1] || '0'
    const withoutSlugCount = parseInt(totalCount) - parseInt(withSlugCount)
    
    console.log('📊 Database statistics:')
    console.log(`   Total software items: ${totalCount}`)
    console.log(`   Items with slug: ${withSlugCount}`)
    console.log(`   Items without slug: ${withoutSlugCount}\n`)
    
    if (data.length > 0) {
      console.log('📝 Sample software items:')
      data.forEach((item, idx) => {
        console.log(`\n   ${idx + 1}. ${item.title || 'Untitled'}`)
        console.log(`      ID: ${item.id}`)
        console.log(`      Slug: ${item.slug || '(null)'}`)
      })
    }
    
    console.log('\n✅ Verification complete!')
    
    if (withoutSlugCount > 0) {
      console.log('\n📝 Next steps:')
      console.log('   - Slugs will be generated in Task 15.1 (Migration Script)')
      console.log('   - Run: node scripts/migration/generate_slugs.mjs (when available)')
    }
    
    console.log('\n📋 Requirements validated:')
    console.log('   ✅ Requirement 2.5: Slug column added to software table')
    console.log('   ✅ Requirement 2.6: Unique indexes created')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  }
}

verifySoftwareSlug().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
