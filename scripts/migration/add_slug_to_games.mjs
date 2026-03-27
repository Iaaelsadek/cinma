// Migration script: Add slug column to games table in Supabase
// Task 1.4: إضافة عمود slug لجدول games في Supabase

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

async function executeSQL(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SQL execution failed: ${error}`)
  }
  
  return response.json()
}

async function addSlugToGames() {
  try {
    console.log('🚀 Starting migration: Add slug column to games table in Supabase\n')
    console.log('⚠️  Note: This migration requires manual execution via Supabase Dashboard')
    console.log('   Reason: Supabase REST API does not support DDL operations directly\n')
    
    console.log('📋 Step 1: Add slug column to games table')
    console.log('   Execute this SQL in Supabase SQL Editor:\n')
    console.log('   ```sql')
    console.log('   ALTER TABLE games ADD COLUMN IF NOT EXISTS slug TEXT;')
    console.log('   ```\n')
    
    console.log('📋 Step 2: Create unique index on slug column')
    console.log('   Execute this SQL in Supabase SQL Editor:\n')
    console.log('   ```sql')
    console.log('   CREATE UNIQUE INDEX IF NOT EXISTS idx_games_slug')
    console.log('   ON games(slug)')
    console.log('   WHERE slug IS NOT NULL;')
    console.log('   ```\n')
    
    console.log('📋 Step 3: Enable pg_trgm extension (if not already enabled)')
    console.log('   Execute this SQL in Supabase SQL Editor:\n')
    console.log('   ```sql')
    console.log('   CREATE EXTENSION IF NOT EXISTS pg_trgm;')
    console.log('   ```\n')
    
    console.log('📋 Step 4: Create GIN index for fast search')
    console.log('   Execute this SQL in Supabase SQL Editor:\n')
    console.log('   ```sql')
    console.log('   CREATE INDEX IF NOT EXISTS idx_games_slug_trgm')
    console.log('   ON games USING GIN (slug gin_trgm_ops);')
    console.log('   ```\n')
    
    console.log('📝 Summary of SQL commands:')
    console.log('   ----------------------------------------')
    console.log('   -- Step 1: Add slug column')
    console.log('   ALTER TABLE games ADD COLUMN IF NOT EXISTS slug TEXT;')
    console.log('')
    console.log('   -- Step 2: Create unique index')
    console.log('   CREATE UNIQUE INDEX IF NOT EXISTS idx_games_slug')
    console.log('   ON games(slug)')
    console.log('   WHERE slug IS NOT NULL;')
    console.log('')
    console.log('   -- Step 3: Enable pg_trgm extension')
    console.log('   CREATE EXTENSION IF NOT EXISTS pg_trgm;')
    console.log('')
    console.log('   -- Step 4: Create GIN index')
    console.log('   CREATE INDEX IF NOT EXISTS idx_games_slug_trgm')
    console.log('   ON games USING GIN (slug gin_trgm_ops);')
    console.log('   ----------------------------------------\n')
    
    console.log('📖 Instructions:')
    console.log('   1. Go to Supabase Dashboard: https://supabase.com/dashboard')
    console.log('   2. Select your project')
    console.log('   3. Navigate to SQL Editor')
    console.log('   4. Copy and paste the SQL commands above')
    console.log('   5. Execute the commands')
    console.log('   6. Run verification script: node scripts/migration/verify_games_slug.mjs\n')
    
    console.log('✅ Migration instructions generated successfully!')
    console.log('📝 Requirements to be validated: 2.4, 2.6')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Stack trace:', error.stack)
    throw error
  }
}

// Run migration
addSlugToGames().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
