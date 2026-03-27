// Check if software table exists in Supabase
// Task 1.5: Verification script

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

async function checkSoftwareTable() {
  try {
    console.log('🔍 Checking if software table exists in Supabase...\n')
    
    // Query software table
    const response = await fetch(`${supabaseUrl}/rest/v1/software?select=count`, {
      method: 'HEAD',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'count=exact'
      }
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('❌ Software table does NOT exist in Supabase')
        console.log('   The table needs to be created first\n')
        return
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const count = response.headers.get('content-range')?.split('/')[1] || '0'
    
    console.log('✅ Software table exists in Supabase!')
    console.log(`📊 Total software items in database: ${count}\n`)
    
    // Get sample data
    const dataResponse = await fetch(`${supabaseUrl}/rest/v1/software?select=*&limit=3`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    })
    
    if (dataResponse.ok) {
      const data = await dataResponse.json()
      if (data.length > 0) {
        console.log('📝 Sample software items:')
        data.forEach((item, idx) => {
          console.log(`\n   ${idx + 1}. ${item.title || 'Untitled'}`)
          console.log(`      ID: ${item.id}`)
          console.log(`      Category: ${item.category || 'N/A'}`)
          console.log(`      Rating: ${item.rating || 'N/A'}`)
          console.log(`      Platform: ${item.platform || 'N/A'}`)
        })
      }
    }
    
    console.log('\n✅ Verification complete!')
    console.log('📝 Next step: Run add_slug_to_software.mjs to see migration instructions')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  }
}

checkSoftwareTable().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
