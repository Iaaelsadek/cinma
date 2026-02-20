
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: gamesData, error: gamesError } = await supabase.rpc('exec_sql', { 
    query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'games'" 
  });
  if (gamesError) {
    console.error('RPC Games Error:', gamesError);
  } else {
    // If data is null, assume void. But exec_sql should return rows for SELECT.
    if (!gamesData) {
      console.log('Games Columns: (no data returned)');
    } else {
      console.log('Games Columns:', gamesData.map(r => r.column_name));
    }
  }

  // Try inserting a dummy row
  try {
    const { error } = await supabase.from('games').insert({
      id: 999999,
      title: 'Test Game',
      poster_path: 'test.jpg'
    });
    if (error) {
      console.error('INSERT Error:', error);
    } else {
      console.log('INSERT Success!');
      // Cleanup
      await supabase.from('games').delete().eq('id', 999999);
    }
  } catch (err) {
    console.error('INSERT Exception:', err);
  }
}

check();
