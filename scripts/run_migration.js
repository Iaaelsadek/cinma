import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node scripts/run_migration.js <sql_file>');
    process.exit(1);
  }

  const sqlPath = path.resolve(process.cwd(), sqlFile);
  console.log(`Reading SQL file: ${sqlPath}`);

  try {
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    // Split by semicolon but ignore comments/strings (simple split for now)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} statements.`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`Executing statement ${i + 1}...`);
      
      // Try using exec_sql RPC first
      const { error } = await supabase.rpc('exec_sql', { query: stmt });
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error);
        // If exec_sql doesn't exist, try direct query via rest? No, rest doesn't support raw sql.
        // We rely on exec_sql function being present.
      } else {
        console.log(`Statement ${i + 1} success.`);
      }
    }

  } catch (err) {
    console.error('Migration failed:', err);
  }
}

runMigration();
