import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Determine __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyPolicy() {
  console.log('🔄 Applying error_logs table and RLS policy...');
  
  const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '20260220_create_error_logs_table.sql');
  
  try {
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    console.log('📖 SQL Content loaded from:', sqlPath);

    // Split by semicolon to execute statement by statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n📋 Executing statement ${i + 1}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        // Try to execute via RPC 'exec_sql'
        const { error } = await supabase.rpc('exec_sql', { query: statement });
        
        if (error) {
          console.warn(`⚠️ Failed to execute via RPC: ${error.message}`);
          console.log('If RPC fails, please run the SQL manually in Supabase Dashboard SQL Editor.');
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err);
      }
    }
    
    console.log('\n🎉 Policy application attempt completed!');
  } catch (err) {
    console.error('❌ Failed to read SQL file:', err);
  }
}

applyPolicy();
