
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE column_name = 'slug' 
      AND table_name IN ('movies', 'tv_series', 'games', 'software', 'actors')
    `);
    console.log('Columns found:', res.rows);
    
    const views = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_type = 'VIEW' AND table_name LIKE 'mv_%'
    `);
    console.log('Views found:', views.rows);
    
    const trending = await pool.query("SELECT count(*) FROM mv_home_trending");
    console.log('Trending count:', trending.rows[0].count);
    
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

run();
