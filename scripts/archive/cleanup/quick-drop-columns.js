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

async function dropColumns() {
    try {
        // Drop all unused columns in one transaction
        await pool.query(`
            ALTER TABLE movies 
            DROP COLUMN IF EXISTS language,
            DROP COLUMN IF EXISTS content_section,
            DROP COLUMN IF EXISTS category,
            DROP COLUMN IF EXISTS target_audience
        `);
        console.log('✅ Movies columns dropped');

        await pool.query(`
            ALTER TABLE tv_series 
            DROP COLUMN IF EXISTS language,
            DROP COLUMN IF EXISTS content_section,
            DROP COLUMN IF EXISTS category,
            DROP COLUMN IF EXISTS target_audience
        `);
        console.log('✅ TV Series columns dropped');

        console.log('\n✅ Done!');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

dropColumns();
