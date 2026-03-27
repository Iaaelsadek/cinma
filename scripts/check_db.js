
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const pool = new Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'movies' AND column_name = 'slug'");
    console.log('Column "slug" exists:', res.rows.length > 0);
    
    if (res.rows.length > 0) {
      const countRes = await pool.query("SELECT count(*) FROM movies WHERE slug IS NOT NULL");
      console.log('Movies with slug:', countRes.rows[0].count);
      
      const sample = await pool.query("SELECT id, title, slug FROM movies WHERE slug IS NOT NULL LIMIT 2");
      console.log('Sample slugs:', sample.rows);
    } else {
        console.log('Slug column missing! Adding it now...');
        await pool.query("ALTER TABLE movies ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE");
        await pool.query("ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE");
        await pool.query("ALTER TABLE games ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE");
        await pool.query("ALTER TABLE software ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE");
        await pool.query("ALTER TABLE actors ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE");
        console.log('Slug columns added.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
