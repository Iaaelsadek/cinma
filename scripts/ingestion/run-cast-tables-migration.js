import { createPool } from '../utils/db-connection.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = createPool();

async function runMigration() {
    console.log('🚀 Running cast tables migration...\n');

    try {
        // Read SQL file
        const sqlPath = join(__dirname, '02_create_cast_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute SQL
        await pool.query(sql);

        console.log('✅ Cast tables created successfully!\n');

        // Verify tables
        const result = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_name IN ('movie_cast', 'tv_cast', 'movie_crew', 'tv_crew')
      ORDER BY table_name
    `);

        console.log('📊 Created tables:');
        result.rows.forEach(row => {
            console.log(`   - ${row.table_name}: ${row.column_count} columns`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
