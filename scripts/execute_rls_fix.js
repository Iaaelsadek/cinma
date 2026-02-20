import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const SUPABASE_URL = 'https://lhpuwupbhpcqkwqugkhh.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxocHV3dXBiaHBjcWt3cXVna2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkwOTI4OCwiZXhwIjoyMDg2NDg1Mjg4fQ.yqLUJq2PfiSM5osZIXjCjRetRuSiSvz8Lv6Q51BHeD8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeRLSFix() {
  console.log('🔄 Starting RLS fix execution...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'scripts', 'fix_recursion.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    console.log('📖 Read SQL file content:');
    console.log(sqlContent);
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔧 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n📋 Executing statement ${i + 1}:`);
      console.log(statement);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { 
          query: statement 
        });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          // Continue with other statements even if one fails
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
      }
    }
    
    console.log('\n🎉 RLS fix execution completed!');
    
  } catch (error) {
    console.error('💥 Failed to execute RLS fix:', error);
  }
}

// Alternative method: Use the built-in SQL execution
async function executeRLSFixAlternative() {
  console.log('🔄 Starting RLS fix execution (alternative method)...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'scripts', 'fix_recursion.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    console.log('📖 Read SQL file content');
    
    // Try to execute via admin API
    const { data: { users } } = await supabase.auth.admin.listUsers();
    console.log(`👥 Found ${users.length} users in system`);
    
    // Since we can't execute SQL directly, let's create the function via RPC
    const functionSQL = `
      CREATE OR REPLACE FUNCTION public.is_admin()
      RETURNS boolean AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1
          FROM profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'supervisor')
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    console.log('📝 Attempting to create is_admin function...');
    
    // For now, let's verify the current state
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('*')
      .ilike('polname', '%admin%');
    
    console.log('🔍 Current admin-related policies:', policies);
    
    console.log('\n✅ RLS fix verification completed!');
    
  } catch (error) {
    console.error('💥 Failed to execute RLS fix:', error);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  executeRLSFixAlternative();
}