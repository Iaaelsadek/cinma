
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
});

async function purgeUnreleased() {
  const client = await pool.connect();
  try {
    console.log('🧹 Starting database purge of unreleased content...');
    
    // 1. Purge Movies
    const movieRes = await client.query(`
      DELETE FROM movies 
      WHERE release_date > CURRENT_DATE 
      OR status != 'Released'
      OR release_date IS NULL
    `);
    console.log(`✅ Purged ${movieRes.rowCount} unreleased movies.`);

    // 2. Purge TV Series
    const tvRes = await client.query(`
      DELETE FROM tv_series 
      WHERE first_air_date > CURRENT_DATE 
      OR first_air_date IS NULL
    `);
    console.log(`✅ Purged ${tvRes.rowCount} unreleased TV series.`);

    // 3. Cleanup seasons/episodes only if tables exist
    try {
      const seasonRes = await client.query(`
        DELETE FROM seasons 
        WHERE series_id NOT IN (SELECT id FROM tv_series)
      `);
      console.log(`✅ Purged ${seasonRes.rowCount} orphaned seasons.`);
    } catch (e) {
      console.log('⚠️ Skipping seasons cleanup (table may not exist or different structure)');
    }

    try {
      const episodeRes = await client.query(`
        DELETE FROM episodes 
        WHERE series_id NOT IN (SELECT id FROM tv_series)
      `);
      console.log(`✅ Purged ${episodeRes.rowCount} orphaned episodes.`);
    } catch (e) {
      console.log('⚠️ Skipping episodes cleanup (table may not exist or different structure)');
    }

    console.log('\n✨ Database purge complete.');
  } catch (error) {
    console.error('\n❌ Error during purge:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

purgeUnreleased().catch(console.error);
