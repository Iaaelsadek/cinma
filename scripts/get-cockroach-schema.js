import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new Pool({
    connectionString: process.env.COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false }
});

async function getSchema() {
    try {
        const tables = ['movies', 'tv_series', 'seasons', 'episodes', 'actors', 'movie_cast', 'tv_cast'];

        const schemas = {};

        for (const table of tables) {
            const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

            schemas[table] = result.rows;

            console.log(`\n${table}:`);
            result.rows.forEach(col => {
                console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
            });
        }

        fs.writeFileSync('cockroach-schema.json', JSON.stringify(schemas, null, 2));
        console.log('\n✅ Schema saved to cockroach-schema.json');

        await pool.end();
    } catch (error) {
        console.error('❌ خطأ:', error.message);
        process.exit(1);
    }
}

getSchema();
