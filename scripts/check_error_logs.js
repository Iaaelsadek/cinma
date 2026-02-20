
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  console.log('🔍 Checking error_logs table...');

  const testId = 'test-' + Date.now();
  const testError = {
    id: testId,
    message: 'Test error from check script',
    severity: 'low',
    category: 'system',
    timestamp: new Date().toISOString()
  };

  // 1. Try Admin Insert
  console.log('1️⃣  Testing Admin Insert...');
  const { error: adminError } = await adminClient
    .from('error_logs')
    .insert(testError);

  if (adminError) {
    console.error('❌ Admin Insert failed:', adminError.message);
    // If table doesn't exist, this will fail
    if (adminError.message.includes('relation "public.error_logs" does not exist')) {
      console.error('   Table does not exist!');
      return;
    }
  } else {
    console.log('✅ Admin Insert successful');
    
    // Clean up
    await adminClient.from('error_logs').delete().eq('id', testId);
  }

  // 2. Try Anon Insert (RLS check)
  console.log('2️⃣  Testing Anon Insert (RLS)...');
  const testIdAnon = 'test-anon-' + Date.now();
  const testErrorAnon = {
    id: testIdAnon,
    message: 'Test error from check script (anon)',
    severity: 'low',
    category: 'system',
    timestamp: new Date().toISOString()
  };

  const { error: anonError } = await anonClient
    .from('error_logs')
    .insert(testErrorAnon);

  if (anonError) {
    console.error('❌ Anon Insert failed:', anonError.message);
    if (anonError.message.includes('new row violates row-level security policy')) {
      console.error('   RLS Policy blocking insert! You need to apply the policy.');
    }
  } else {
    console.log('✅ Anon Insert successful');
    // Clean up (admin has to do it)
    await adminClient.from('error_logs').delete().eq('id', testIdAnon);
  }
}

check().catch(console.error);
