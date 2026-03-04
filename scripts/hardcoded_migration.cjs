
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://lhpuwupbhpcqkwqugkhh.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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
    
    // Split by semicolons but handle comments and empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      console.log(`Executing: ${stmt.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { query: stmt });
      if (error) {
        console.error('Statement Error:', error.message);
        // Continue to next statement even if one fails (e.g. table already exists)
      } else {
        console.log('Success.');
      }
    }
    console.log('Migration complete.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

runMigration();
