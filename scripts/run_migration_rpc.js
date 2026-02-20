
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error('Please provide SQL file path');
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), sqlPath);
  console.log(`Reading SQL from ${fullPath}...`);
  
  try {
    const sql = fs.readFileSync(fullPath, 'utf8');
    console.log('Executing SQL via RPC exec_sql...');
    
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    
    if (error) {
      console.error('RPC Error:', error);
      // Fallback: try to split statements if RPC doesn't support multi-statement
      console.log('Retrying with split statements...');
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        console.log(`Executing: ${stmt.substring(0, 50)}...`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { query: stmt });
        if (stmtError) {
             console.error('Statement Error:', stmtError);
        }
      }
    } else {
      console.log('Migration successful!');
    }
  } catch (err) {
    console.error('File Read Error:', err);
  }
}

runMigration();
