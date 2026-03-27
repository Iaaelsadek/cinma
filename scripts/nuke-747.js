// Database Deletion Script for TV Series Record 747
// This script deletes the problematic tv_series record (id: 747) that cannot be deleted using standard SQL DELETE
// Uses proper connection pooling and transaction management to avoid locks and timeouts

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pkg from 'pg'

const { Pool } = pkg

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

dotenv.config({ path: join(rootDir, '.env.local') })
dotenv.config({ path: join(rootDir, '.env') })

// Validate environment variables
if (!process.env.COCKROACHDB_URL) {
  console.error('❌ Error: COCKROACHDB_URL environment variable is not set')
  console.error('   Please configure .env.local or .env with your CockroachDB connection string')
  process.exit(1)
}

// Configure connection pool
const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 1, // Single connection to avoid connection overhead
  statement_timeout: 10000, // 10 seconds timeout
})

/**
 * Delete tv_series record 747 using explicit transaction
 */
async function deleteRecord747() {
  console.log('=' .repeat(70))
  console.log('🗑️  TV SERIES 747 DELETION SCRIPT')
  console.log('=' .repeat(70))
  console.log('Target: tv_series record with id = 747')
  console.log('Method: Explicit transaction with connection pooling')
  console.log('Timeout: 10 seconds')
  console.log('=' .repeat(70))
  console.log()

  let client
  
  try {
    // Get a client from the pool
    client = await pool.connect()
    console.log('✅ Database connection established')
    
    // Check if record exists before deletion
    console.log('🔍 Checking if record 747 exists...')
    const checkResult = await client.query(
      'SELECT id, name, original_name FROM tv_series WHERE id = $1',
      [747]
    )
    
    if (checkResult.rows.length === 0) {
      console.log('⚠️  Record 747 does not exist in database')
      console.log('   Nothing to delete. Exiting.')
      return { success: true, alreadyDeleted: true }
    }
    
    const record = checkResult.rows[0]
    console.log(`✅ Record 747 found: "${record.name}" (${record.original_name})`)
    console.log()
    
    // Begin explicit transaction
    console.log('🔄 Starting transaction...')
    await client.query('BEGIN')
    console.log('✅ Transaction started')
    
    // Execute DELETE
    console.log('🗑️  Executing DELETE FROM tv_series WHERE id = 747...')
    const startTime = Date.now()
    
    const deleteResult = await client.query(
      'DELETE FROM tv_series WHERE id = $1',
      [747]
    )
    
    const duration = Date.now() - startTime
    console.log(`✅ DELETE completed in ${duration}ms`)
    console.log(`   Rows affected: ${deleteResult.rowCount}`)
    
    // Commit transaction
    console.log('💾 Committing transaction...')
    await client.query('COMMIT')
    console.log('✅ Transaction committed')
    console.log()
    
    return { success: true, duration, rowsAffected: deleteResult.rowCount }
    
  } catch (error) {
    console.log()
    console.error('❌ Error during deletion:')
    console.error(`   Message: ${error.message}`)
    console.error(`   Code: ${error.code || 'N/A'}`)
    
    // Attempt to rollback transaction
    if (client) {
      try {
        console.log('🔄 Attempting to rollback transaction...')
        await client.query('ROLLBACK')
        console.log('✅ Transaction rolled back')
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError.message)
      }
    }
    
    return { success: false, error: error.message, code: error.code }
    
  } finally {
    // Release client back to pool
    if (client) {
      client.release()
      console.log('✅ Database connection released')
    }
  }
}

/**
 * Verify deletion was successful
 */
async function verifyDeletion() {
  console.log()
  console.log('🔍 Verifying deletion...')
  
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM tv_series WHERE id = $1',
      [747]
    )
    
    const count = parseInt(result.rows[0].count)
    
    if (count === 0) {
      console.log('✅ Verification successful: Record 747 does not exist')
      return { verified: true, recordExists: false }
    } else {
      console.log('⚠️  Verification failed: Record 747 still exists')
      console.log(`   Count: ${count}`)
      return { verified: false, recordExists: true, count }
    }
    
  } catch (error) {
    console.error('❌ Verification error:', error.message)
    return { verified: false, error: error.message }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Execute deletion
    const deleteResult = await deleteRecord747()
    
    // Verify deletion (skip if record was already deleted)
    let verifyResult
    if (!deleteResult.alreadyDeleted) {
      verifyResult = await verifyDeletion()
    } else {
      verifyResult = { verified: true, recordExists: false, skipped: true }
    }
    
    // Print summary
    console.log()
    console.log('=' .repeat(70))
    console.log('📊 SUMMARY')
    console.log('=' .repeat(70))
    
    if (deleteResult.success && verifyResult.verified && !verifyResult.recordExists) {
      console.log('✅ SUCCESS: Record 747 deleted successfully')
      if (deleteResult.duration) {
        console.log(`   Duration: ${deleteResult.duration}ms`)
      }
      if (deleteResult.rowsAffected) {
        console.log(`   Rows affected: ${deleteResult.rowsAffected}`)
      }
      console.log('   Record 747 no longer exists in database')
      console.log('=' .repeat(70))
      process.exit(0)
      
    } else if (deleteResult.alreadyDeleted) {
      console.log('✅ SUCCESS: Record 747 was already deleted')
      console.log('   No action needed')
      console.log('=' .repeat(70))
      process.exit(0)
      
    } else {
      console.log('❌ FAILURE: Deletion or verification failed')
      if (deleteResult.error) {
        console.log(`   Error: ${deleteResult.error}`)
      }
      if (deleteResult.code) {
        console.log(`   Code: ${deleteResult.code}`)
      }
      if (verifyResult.recordExists) {
        console.log('   ⚠️  Record 747 still exists after deletion attempt')
      }
      console.log('=' .repeat(70))
      process.exit(1)
    }
    
  } catch (error) {
    console.error()
    console.error('=' .repeat(70))
    console.error('❌ FATAL ERROR')
    console.error('=' .repeat(70))
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    console.error('=' .repeat(70))
    process.exit(1)
    
  } finally {
    // Close pool connection
    try {
      await pool.end()
      console.log('✅ Connection pool closed')
    } catch (error) {
      console.error('⚠️  Error closing pool:', error.message)
    }
  }
}

// Run the script
console.log('⚠️  Prerequisites:')
console.log('   - CockroachDB connection configured in .env.local or .env')
console.log('   - COCKROACHDB_URL environment variable set')
console.log('   - Database accessible and credentials valid')
console.log()

main()
