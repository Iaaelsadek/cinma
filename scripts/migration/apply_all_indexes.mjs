
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const pool = new pg.Pool({
  connectionString: process.env.COCKROACHDB_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('🚀 Applying database indexes from .kiro/database_indexes.sql...');
    
    const sqlFile = path.join(__dirname, '../../.kiro/database_indexes.sql');
    if (!fs.existsSync(sqlFile)) {
      console.error('❌ SQL file not found at:', sqlFile);
      return;
    }
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    
    // Remove comments
    const cleanSql = sql.replace(/--.*$/gm, '');
    
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📑 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const statement of statements) {
      try {
        await client.query(statement);
        successCount++;
        console.log('✅ Applied:', statement.substring(0, 50).replace(/\s+/g, ' ') + '...');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          skipCount++;
          console.log('⏭️  Skipped (already exists):', statement.substring(0, 50).replace(/\s+/g, ' ') + '...');
        } else {
          failCount++;
          console.error('❌ Failed:', statement.substring(0, 50).replace(/\s+/g, ' ') + '...', error.message);
        }
      }
    }

    console.log(`\n📊 Index Application Summary:
   - Successfully Applied: ${successCount}
   - Skipped (Existing): ${skipCount}
   - Failed: ${failCount}
   - Total: ${statements.length}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
