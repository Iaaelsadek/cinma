import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

const BACKUP_DIR = './backups';

// Get backup date from command line argument
const backupDate = process.argv[2];

if (!backupDate) {
    console.error('\n❌ الرجاء تحديد تاريخ النسخة الاحتياطية');
    console.log('\nالاستخدام:');
    console.log('  node scripts/restore-database.js 2026-04-20\n');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false }
});

async function restoreDatabase() {
    try {
        console.log('\n🔄 بدء عملية الاستعادة...\n');
        console.log(`📅 النسخة الاحتياطية: ${backupDate}\n`);

        // Read metadata
        const metadataFile = path.join(BACKUP_DIR, `metadata_${backupDate}.json`);
        if (!fs.existsSync(metadataFile)) {
            throw new Error(`لم يتم العثور على النسخة الاحتياطية: ${backupDate}`);
        }

        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        console.log(`📊 الجداول: ${metadata.tables.length}`);
        console.log(`📦 الحجم: ${metadata.total_size_mb.toFixed(2)} MB\n`);

        // Confirm before proceeding
        console.log('⚠️  تحذير: هذا سيحذف جميع البيانات الحالية!');
        console.log('   اضغط Ctrl+C للإلغاء، أو انتظر 5 ثواني للمتابعة...\n');

        await new Promise(resolve => setTimeout(resolve, 5000));

        for (const table of metadata.tables) {
            try {
                const filename = path.join(BACKUP_DIR, `${table}_${backupDate}.json`);

                if (!fs.existsSync(filename)) {
                    console.log(`⚠️  تخطي: ${table} (الملف غير موجود)`);
                    continue;
                }

                console.log(`📦 استعادة جدول: ${table}...`);

                // Read backup data
                const data = JSON.parse(fs.readFileSync(filename, 'utf8'));

                if (data.length === 0) {
                    console.log(`   ⚠️  فارغ: ${table}`);
                    continue;
                }

                // Clear existing data
                await pool.query(`TRUNCATE TABLE ${table} CASCADE`);

                // Insert data in batches
                const batchSize = 100;
                let inserted = 0;

                for (let i = 0; i < data.length; i += batchSize) {
                    const batch = data.slice(i, i + batchSize);

                    for (const row of batch) {
                        const columns = Object.keys(row);
                        const values = Object.values(row);
                        const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');

                        const query = `
              INSERT INTO ${table} (${columns.join(', ')})
              VALUES (${placeholders})
            `;

                        await pool.query(query, values);
                        inserted++;
                    }

                    // Progress indicator
                    if (i % 1000 === 0 && i > 0) {
                        console.log(`   📊 ${inserted.toLocaleString()} / ${data.length.toLocaleString()}`);
                    }
                }

                console.log(`   ✅ تم: ${inserted.toLocaleString()} صف`);
            } catch (err) {
                console.log(`   ❌ خطأ في ${table}: ${err.message}`);
            }
        }

        console.log('\n═'.repeat(60));
        console.log('✅ اكتملت عملية الاستعادة!\n');

        await pool.end();
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

restoreDatabase();
