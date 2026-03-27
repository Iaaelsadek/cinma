import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load exactly like server does
dotenv.config({ path: path.join(__dirname, '../.env.local') })
dotenv.config({ path: path.join(__dirname, '../.env') })

console.log('COCKROACHDB_URL:', process.env.COCKROACHDB_URL ? 'Set ✅' : 'Missing ❌')

import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

async function query(text, params) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}

async function checkDB() {
  try { 
    await query('SELECT 1')
    return true
  }
  catch (err) { 
    console.error('❌ checkDB failed:', err.message)
    return false
  }
}

async function test() {
  console.log('Testing checkDB()...')
  const available = await checkDB()
  console.log('DB Available:', available)
  
  if (available) {
    const movies = await query('SELECT COUNT(*) FROM movies')
    console.log('Movies:', movies.rows[0].count)
  }
  
  await pool.end()
}

test()
