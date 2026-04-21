import { createPool } from './utils/db-connection.js';

const pool = createPool();

async function checkContent() {
    try {
        console.log('🔍 Checking database content...\n');

        // Check movies
        const movies = await pool.query('SELECT COUNT(*) as count FROM movies');
        console.log(`📽️  Movies: ${movies.rows[0].count}`);

        // Check TV series
        const series = await pool.query('SELECT COUNT(*) as count FROM tv_series');
        console.log(`📺 TV Series: ${series.rows[0].count}`);

        // Check actors
        const actors = await pool.query('SELECT COUNT(*) as count FROM actors');
        console.log(`🎭 Actors: ${actors.rows[0].count}`);

        // Check latest movies
        const latest = await pool.query('SELECT title, title_ar, created_at FROM movies ORDER BY created_at DESC LIMIT 5');
        console.log('\n📋 Latest 5 movies:');
        latest.rows.forEach((m, i) => {
            console.log(`${i + 1}. ${m.title} | ${m.title_ar || 'N/A'}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkContent();
