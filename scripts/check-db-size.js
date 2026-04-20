import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new Pool({
    connectionString: process.env.COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false }
});

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function checkDatabaseSize() {
    try {
        // Get row counts for estimation
        const tables = ['movies', 'tv_series', 'seasons', 'episodes', 'actors',
            'movie_cast', 'tv_cast', 'movie_genres', 'tv_genres'];

        console.log('\n📊 تقدير حجم الجداول:\n');
        console.log('═'.repeat(60));

        let totalEstimatedBytes = 0;

        for (const table of tables) {
            try {
                const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(result.rows[0].count);

                // Estimate average row size based on table type
                let avgRowSize = 1024; // default 1KB per row
                if (table === 'episodes') avgRowSize = 512;
                if (table === 'actors') avgRowSize = 768;
                if (table.includes('cast') || table.includes('genres')) avgRowSize = 128;

                const estimatedBytes = count * avgRowSize;
                totalEstimatedBytes += estimatedBytes;

                const name = table.padEnd(30);
                const size = formatBytes(estimatedBytes).padStart(15);
                const rows = count.toLocaleString().padStart(10);
                console.log(`${name} ${size} (${rows} rows)`);
            } catch (err) {
                // Table might not exist
            }
        }

        console.log('═'.repeat(60));

        const totalGB = (totalEstimatedBytes / (1024 * 1024 * 1024)).toFixed(2);
        const totalMB = (totalEstimatedBytes / (1024 * 1024)).toFixed(2);

        console.log(`\n📦 الحجم التقديري الإجمالي:`);
        console.log(`   ${totalMB} MB (${totalGB} GB)`);
        console.log(`\n⚠️  ملاحظة: هذا تقدير تقريبي بناءً على عدد الصفوف`);
        console.log(`   الحجم الفعلي قد يختلف بناءً على الـ indexes والـ overhead\n`);

        // Get database info
        const dbInfo = await pool.query(`
      SELECT current_database() as database_name
    `);

        console.log('🗄️  معلومات قاعدة البيانات:');
        console.log(`   الاسم: ${dbInfo.rows[0].database_name}`);
        console.log(`   النوع: CockroachDB Cloud\n`);

        await pool.end();
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

checkDatabaseSize();
