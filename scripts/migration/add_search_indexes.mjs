// Add trigram search indexes for faster ILIKE queries
import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env.local') })

const pool = new pg.Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  const client = await pool.connect()
  try {
    console.log('Adding search indexes...')

    // CockroachDB supports trigram indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON movies USING GIN (title gin_trgm_ops)`,
      `CREATE INDEX IF NOT EXISTS idx_tv_name_trgm ON tv_series USING GIN (name gin_trgm_ops)`,
    ]

    for (const sql of indexes) {
      try {
        await client.query(sql)
        console.log('✓', sql.split('idx_')[1]?.split(' ')[0] || 'index')
      } catch (e) {
        // Trigram might not be available - fall back to regular index
        console.log('Trigram not supported, trying regular index:', e.message)
        if (sql.includes('movies')) {
          await client.query(`CREATE INDEX IF NOT EXISTS idx_movies_title ON movies (title)`)
          console.log('✓ idx_movies_title (regular)')
        } else {
          await client.query(`CREATE INDEX IF NOT EXISTS idx_tv_name ON tv_series (name)`)
          console.log('✓ idx_tv_name (regular)')
        }
      }
    }

    console.log('Done!')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(console.error)
