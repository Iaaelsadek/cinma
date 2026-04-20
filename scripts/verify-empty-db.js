import { createPool } from './utils/db-connection.js';

const pool = createPool();

async function verifyEmptyDB() {
    console.log('📊 عدد السجلات في كل جدول:\n');

    const tables = [
        'movies',
        'tv_series',
        'seasons',
        'episodes',
        'actors',
        'anime',
        'games',
        'software',
        'reviews',
        'movie_cast',
        'tv_cast',
        'movie_crew',
        'tv_crew'
    ];

    let totalRecords = 0;

    for (const table of tables) {
        try {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table}`);
            const count = parseInt(result.rows[0].count);
            totalRecords += count;

            const icon = count === 0 ? '✅' : '⚠️';
            console.log(`   ${icon} ${table}: ${count}`);
        } catch (e) {
            console.log(`   ❌ ${table}: خطأ - ${e.message}`);
        }
    }

    console.log(`\n📈 إجمالي السجلات: ${totalRecords}`);

    if (totalRecords === 0) {
        console.log('✅ قاعدة البيانات فاضية تماماً!');
    } else {
        console.log('⚠️ قاعدة البيانات ليست فاضية!');
    }

    await pool.end();
}

verifyEmptyDB();
