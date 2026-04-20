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

async function cleanup() {
    console.log('🗑️  حذف الأعمدة غير المستخدمة النهائية...\n');

    try {
        // Movies - حذف الأعمدة غير المستخدمة
        console.log('⏳ حذف movies.language...');
        await pool.query('ALTER TABLE movies DROP COLUMN IF EXISTS language');
        console.log('✅ تم\n');

        console.log('⏳ حذف movies.content_section...');
        await pool.query('ALTER TABLE movies DROP COLUMN IF EXISTS content_section');
        console.log('✅ تم\n');

        console.log('⏳ حذف movies.category...');
        await pool.query('ALTER TABLE movies DROP COLUMN IF EXISTS category');
        console.log('✅ تم\n');

        console.log('⏳ حذف movies.target_audience...');
        await pool.query('ALTER TABLE movies DROP COLUMN IF EXISTS target_audience');
        console.log('✅ تم\n');

        // TV Series - حذف الأعمدة غير المستخدمة
        console.log('⏳ حذف tv_series.language...');
        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS language');
        console.log('✅ تم\n');

        console.log('⏳ حذف tv_series.content_section...');
        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS content_section');
        console.log('✅ تم\n');

        console.log('⏳ حذف tv_series.category...');
        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS category');
        console.log('✅ تم\n');

        console.log('⏳ حذف tv_series.target_audience...');
        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS target_audience');
        console.log('✅ تم\n');

        console.log('✅ تم حذف جميع الأعمدة غير المستخدمة!');
    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await pool.end();
    }
}

cleanup();
