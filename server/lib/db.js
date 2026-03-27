// ✅ Database Helper with Connection Pooling and Error Handling
import pg from 'pg'
const { Pool } = pg

let pool = null

/**
 * Get or create database connection pool
 */
export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.COCKROACHDB_URL,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection not available
      ssl: {
        rejectUnauthorized: false, // For CockroachDB
      },
    })

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('❌ Unexpected database pool error:', err)
    })
}

  return pool
}

/**
 * Execute a database query with error handling
 */
export async function query(text, params = []) {
  const start = Date.now()
  const pool = getPool()

  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start

    // Log slow queries (> 1 second)
    if (duration > 1000) {
      console.warn(`⚠️ Slow query (${duration}ms):`, text.slice(0, 100))
    }

    return result
  } catch (error) {
    console.error('❌ Database query error:', {
      message: error.message,
      query: text.slice(0, 100),
      params: params.slice(0, 5),
    })
    throw error
  }
}

/**
 * Execute a transaction
 */
export async function transaction(callback) {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Close the database pool (for graceful shutdown)
 */
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
}
}

// Graceful shutdown
process.on('SIGTERM', async () => {
await closePool()
  process.exit(0)
})

process.on('SIGINT', async () => {
await closePool()
  process.exit(0)
})
