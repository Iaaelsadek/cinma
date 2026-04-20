#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const rawUrl = (process.env.COCKROACHDB_URL || '').replace(/^["']|["']$/g, '').trim();
const pool = new Pool({
    connectionString: rawUrl,
    ssl: { rejectUnauthorized: false }
});

async function deleteColumns() {
    console.log('🗑️  حذف الأعمدة غير المستخدمة...\n');

    const columns = [
        'slug_ar',
        'slug_en',
        'content_section',
        'language',
        'category',
        'target_audience'
    ];

    try {
        // Movies
        for (const col of columns) {
            try {
                console.log(`⏳ حذف movies.${col}...`);
                await pool.query(`ALTER TABLE movies DROP COLUMN IF EXISTS ${col}`);
                console.log(`✅ تم حذف movies.${col}`);
            } catch (err) {
                console.log(`⚠️  ${err.message}`);
            }
        }

        // TV Series
        for (const col of columns) {
            try {
                console.log(`⏳ حذف tv_series.${col}...`);
                await pool.query(`ALTER TABLE tv_series DROP COLUMN IF EXISTS ${col}`);
                console.log(`✅ تم حذف tv_series.${col}`);
            } catch (err) {
                console.log(`⚠️  ${err.message}`);
            }
        }

        console.log('\n✅ تم الانتهاء!');
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await pool.end();
    }
}

deleteColumns();
