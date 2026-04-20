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

async function drop() {
    try {
        console.log('Dropping category and target_audience...');

        await pool.query('ALTER TABLE movies DROP COLUMN IF EXISTS category');
        console.log('✅ movies.category dropped');

        await pool.query('ALTER TABLE movies DROP COLUMN IF EXISTS target_audience');
        console.log('✅ movies.target_audience dropped');

        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS category');
        console.log('✅ tv_series.category dropped');

        await pool.query('ALTER TABLE tv_series DROP COLUMN IF EXISTS target_audience');
        console.log('✅ tv_series.target_audience dropped');

        console.log('\n✅ All done!');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

drop();
