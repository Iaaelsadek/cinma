import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixDuplicate() {
    try {
        console.log('🔍 Analyzing Little Fox duplicates...\n');

        // Get both series with full details
        const result = await pool.query(`
      SELECT 
        id, name, name_ar, slug, 
        first_air_date, popularity, 
        overview, poster_path,
        number_of_seasons, number_of_episodes
      FROM tv_series 
      WHERE slug LIKE 'little-fox%'
      ORDER BY popularity DESC
    `);

        console.log('Found series:\n');
        result.rows.forEach((row, i) => {
            console.log(`${i + 1}. ${row.name} (${row.slug})`);
            console.log(`   ID: ${row.id}`);
            console.log(`   First Air Date: ${row.first_air_date || 'NULL'}`);
            console.log(`   Popularity: ${row.popularity}`);
            console.log(`   Seasons: ${row.number_of_seasons || 0}`);
            console.log(`   Episodes: ${row.number_of_episodes || 0}`);
            console.log(`   Has Overview: ${row.overview ? 'Yes' : 'No'}`);
            console.log(`   Has Poster: ${row.poster_path ? 'Yes' : 'No'}`);
            console.log('');
        });

        // Identify which one to delete (the one with less data)
        if (result.rows.length === 2) {
            const [better, worse] = result.rows;

            console.log('📊 Analysis:');
            console.log(`Better: ${better.slug} (ID: ${better.id})`);
            console.log(`Worse: ${worse.slug} (ID: ${worse.id})`);
            console.log('');

            // Check if worse has any seasons/episodes
            const seasonsCheck = await pool.query(
                'SELECT COUNT(*) as count FROM seasons WHERE series_id = $1',
                [worse.id]
            );

            const episodesCheck = await pool.query(
                'SELECT COUNT(*) as count FROM episodes WHERE series_id = $1',
                [worse.id]
            );

            console.log(`${worse.slug} has:`);
            console.log(`  - ${seasonsCheck.rows[0].count} seasons`);
            console.log(`  - ${episodesCheck.rows[0].count} episodes`);
            console.log('');

            if (seasonsCheck.rows[0].count === '0' && episodesCheck.rows[0].count === '0') {
                console.log('✅ Safe to delete (no seasons/episodes)');
                console.log('');
                console.log('🗑️  Deleting:', worse.slug);

                // Delete the worse one
                await pool.query('DELETE FROM tv_series WHERE id = $1', [worse.id]);

                console.log('✅ Deleted successfully!');
            } else {
                console.log('⚠️  Has data - manual review needed');
            }
        }

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

fixDuplicate();
