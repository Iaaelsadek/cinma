import dotenv from 'dotenv'
import pkg from 'pg'
const { Pool } = pkg

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

async function testConnection() {
  console.log('🔍 Testing CockroachDB connection...')
  console.log('URL:', process.env.COCKROACHDB_URL ? 'Set ✅' : 'Missing ❌')
  
  try {
    const client = await pool.connect()
    console.log('✅ Connected to CockroachDB')
    
    const result = await client.query('SELECT 1 as test')
    console.log('✅ Query executed:', result.rows[0])
    
    const movies = await client.query('SELECT COUNT(*) FROM movies')
    console.log('✅ Movies count:', movies.rows[0].count)
    
    const tv = await client.query('SELECT COUNT(*) FROM tv_series')
    console.log('✅ TV Series count:', tv.rows[0].count)
    
    const games = await client.query('SELECT COUNT(*) FROM games')
    console.log('✅ Games count:', games.rows[0].count)
    
    const software = await client.query('SELECT COUNT(*) FROM software')
    console.log('✅ Software count:', software.rows[0].count)
    
    const actors = await client.query('SELECT COUNT(*) FROM actors')
    console.log('✅ Actors count:', actors.rows[0].count)
    
    client.release()
    await pool.end()
    
    console.log('\n✅ All tests passed!')
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

testConnection()
