import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDuplicates() {
    try {
        console.log('🔍 Checking for Little Fox duplicates...\n');

        // Check for little-fox series
        const result = await pool.query(`
      SELECT id, name, name_ar, slug, first_air_date, popularity
      FROM tv_series 
      WHERE slug LIKE 'little-fox%'
      ORDER BY slug
    `);

        console.log(`Found ${result.rows.length} series:\n`);
        result.rows.forEach((row, i) => {
            console.log(`${i + 1}. ${row.name}`);
            console.log(`   Slug: ${row.slug}`);
            console.log(`   ID (TMDB): ${row.id}`);
            console.log(`   First Air Date: ${row.first_air_date}`);
            console.log(`   Popularity: ${row.popularity}`);
            console.log('');
        });

        // Check if they have the same ID (TMDB ID is stored in id column)
        if (result.rows.length > 1) {
            const ids = result.rows.map(r => r.id);
            const uniqueIds = [...new Set(ids)];

            if (uniqueIds.length < ids.length) {
                console.log('⚠️  DUPLICATE DETECTED: Same ID with different slugs!');
                console.log('IDs:', ids);
            } else {
                console.log('ℹ️  Different IDs - these are different series');
                console.log('IDs:', ids);
            }
        }

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkDuplicates();
