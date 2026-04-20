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
    try {
        console.log('🗑️  Cleaning up all unused columns...\n');

        // Movies - drop target_audience only
        console.log('⏳ Dropping movies.target_audience...');
        await pool.query('ALTER TABLE movies DROP COLUMN IF EXISTS target_audience');
        console.log('✅ Done\n');

        // TV Series - drop all unused columns
        console.log('⏳ Dropping tv_series unused columns...');
        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS slug_ar');
        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS slug_en');
        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS content_section');
        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS language');
        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS category');
        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS target_audience');
        console.log('✅ Done\n');

        console.log('✅ All unused columns removed!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

cleanup();
