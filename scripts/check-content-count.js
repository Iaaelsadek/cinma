import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new Pool({
    connectionString: process.env.COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkContentCount() {
    try {
        const result = await pool.query(`
      SELECT 
        'movies' as content_type,
        COUNT(*) as total_count
      FROM movies
      UNION ALL
      SELECT 
        'tv_series' as content_type,
        COUNT(*) as total_count
      FROM tv_series
      UNION ALL
      SELECT 
        'seasons' as content_type,
        COUNT(*) as total_count
      FROM seasons
      UNION ALL
      SELECT 
        'episodes' as content_type,
        COUNT(*) as total_count
      FROM episodes
      UNION ALL
      SELECT 
        'actors' as content_type,
        COUNT(*) as total_count
      FROM actors
      ORDER BY content_type
    `);

        console.log('\n📊 إحصائيات المحتوى:\n');
        console.log('═'.repeat(40));

        result.rows.forEach(row => {
            const type = row.content_type.padEnd(15);
            const count = parseInt(row.total_count).toLocaleString();
            console.log(`${type} : ${count}`);
        });

        console.log('═'.repeat(40));
        const total = result.rows.reduce((sum, row) => sum + parseInt(row.total_count), 0);
        console.log(`${'المجموع الكلي'.padEnd(15)} : ${total.toLocaleString()}\n`);

        await pool.end();
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

checkContentCount();
