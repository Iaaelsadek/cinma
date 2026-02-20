
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: tvData, error: tvError } = await supabase.rpc('exec_sql', { 
    query: "SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'tv_series'" 
  });
  if (tvError) {
    console.error('RPC TV Error:', tvError);
  } else {
    console.log('TV Columns:', tvData);
  }

  const { data: episodesData, error: episodesError } = await supabase.rpc('exec_sql', { 
    query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'episodes'" 
  });
  if (episodesError) {
    console.error('RPC Episodes Error:', episodesError);
  } else {
    console.log('Episodes Columns:', episodesData.map(r => r.column_name));
  }
}

check();
