#!/usr/bin/env node
/**
 * Run Remove Unused Columns Migration
 * 
 * يحذف الأعمدة غير المستخدمة من جداول movies و tv_series
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database connection
const rawUrl = (process.env.COCKROACHDB_URL || '').replace(/^["']|["']$/g, '').trim();
const pool = new Pool({
    connectionString: rawUrl,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('\n🗑️  بدء حذف الأعمدة غير المستخدمة...\n');

    try {
        // Read SQL file
        const sqlPath = join(__dirname, 'remove-unused-columns.sql');
        const sql = readFileSync(sqlPath, 'utf8');

        // Split by semicolon and filter out comments and empty lines
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

        console.log(`📝 تم العثور على ${statements.length} عملية...\n`);

        // Execute each statement
        for (const statement of statements) {
            if (!statement) continue;

            try {
                // Extract operation type for logging
                const operation = statement.split(' ')[0].toUpperCase();
                const match = statement.match(/(?:TABLE|INDEX)\s+(\w+)/i);
                const target = match ? match[1] : '';

                console.log(`⏳ ${operation} ${target}...`);
                await pool.query(statement);
                console.log(`✅ ${operation} ${target} - تم بنجاح\n`);
            } catch (error) {
                // Ignore "does not exist" errors
                if (error.message.includes('does not exist')) {
                    console.log(`⏭️  تم التخطي (غير موجود)\n`);
                } else {
                    throw error;
                }
            }
        }

        // Verify columns
        console.log('═'.repeat(60));
        console.log('🔍 التحقق من الأعمدة المتبقية...\n');

        const moviesColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'movies' 
      ORDER BY ordinal_position
    `);

        console.log('📽️  أعمدة جدول movies:');
        moviesColumns.rows.forEach(row => {
            console.log(`   - ${row.column_name}`);
        });

        console.log('\n📺 أعمدة جدول tv_series:');
        const seriesColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tv_series' 
      ORDER BY ordinal_position
    `);

        seriesColumns.rows.forEach(row => {
            console.log(`   - ${row.column_name}`);
        });

        console.log('\n' + '═'.repeat(60));
        console.log('✅ تم حذف الأعمدة غير المستخدمة بنجاح!\n');

    } catch (error) {
        console.error('\n❌ خطأ:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
