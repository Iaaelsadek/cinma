import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new Pool({
    connectionString: process.env.COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false }
});

const BACKUP_DIR = './backups';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];

async function backupDatabase() {
    try {
        // Create backup directory
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        console.log('\n🔄 بدء عملية النسخ الاحتياطي...\n');

        const tables = [
            'movies',
            'tv_series',
            'seasons',
            'episodes',
            'actors',
            'movie_cast',
            'tv_cast',
            'movie_genres',
            'tv_genres'
        ];

        for (const table of tables) {
            try {
                console.log(`📦 نسخ جدول: ${table}...`);

                // Get all data
                const result = await pool.query(`SELECT * FROM ${table}`);
                const data = result.rows;

                // Save as JSON
                const filename = path.join(BACKUP_DIR, `${table}_${timestamp}.json`);
                fs.writeFileSync(filename, JSON.stringify(data, null, 2));

                const size = (fs.statSync(filename).size / (1024 * 1024)).toFixed(2);
                console.log(`   ✅ تم: ${data.length.toLocaleString()} صف (${size} MB)`);
            } catch (err) {
                console.log(`   ⚠️  تخطي: ${table} (${err.message})`);
            }
        }

        // Create metadata file
        const metadata = {
            backup_date: new Date().toISOString(),
            database: 'CockroachDB',
            tables: tables,
            total_size_mb: 0
        };

        // Calculate total size
        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.includes(timestamp));
        files.forEach(file => {
            const size = fs.statSync(path.join(BACKUP_DIR, file)).size;
            metadata.total_size_mb += size / (1024 * 1024);
        });

        fs.writeFileSync(
            path.join(BACKUP_DIR, `metadata_${timestamp}.json`),
            JSON.stringify(metadata, null, 2)
        );

        console.log('\n═'.repeat(60));
        console.log(`✅ اكتمل النسخ الاحتياطي!`);
        console.log(`📁 المجلد: ${BACKUP_DIR}`);
        console.log(`📊 الحجم الإجمالي: ${metadata.total_size_mb.toFixed(2)} MB`);
        console.log(`📅 التاريخ: ${timestamp}\n`);

        await pool.end();
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

backupDatabase();
