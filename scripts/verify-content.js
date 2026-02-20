
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('⚠️  .env file not found!');
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TMDB_KEY = process.env.VITE_TMDB_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !TMDB_KEY) {
  console.error('❌ Missing API keys in .env');
  console.log('VITE_SUPABASE_URL:', !!SUPABASE_URL);
  console.log('VITE_SUPABASE_ANON_KEY:', !!SUPABASE_KEY);
  console.log('VITE_TMDB_API_KEY:', !!TMDB_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifySupabase() {
  console.log('\n🔍 Verifying Supabase Content...');
  
  // Check distinct categories
  const { data: categories, error: catError } = await supabase
    .from('videos')
    .select('category');

  if (catError) {
    console.error('❌ Error fetching categories:', catError.message);
  } else {
    const uniqueCats = [...new Set(categories.map(c => c.category))];
    console.log('✅ Available Categories in DB:', uniqueCats);
  }

  const checkCats = ['play', 'plays', 'masrahiyat', 'golden_era', 'recaps'];
  
  for (const cat of checkCats) {
    const { count, error } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('category', cat);
      
    if (error) {
      console.error(`❌ Error checking category '${cat}':`, error.message);
    } else {
      console.log(`✅ Category '${cat}': ${count} items`);
    }
  }

  // Check Anime
  const { count: animeCount, error: animeError } = await supabase
    .from('anime')
    .select('*', { count: 'exact', head: true });
  
  if (animeError) console.error('❌ Error checking anime:', animeError.message);
  else console.log(`✅ Anime: ${animeCount} items`);

  // Check Quran
  const { count: quranCount, error: quranError } = await supabase
    .from('quran_reciters')
    .select('*', { count: 'exact', head: true });

  // Check Movies table for is_play
  const { count: moviesPlayCount, error: moviesPlayError } = await supabase
    .from('movies')
    .select('*', { count: 'exact', head: true })
    .eq('is_play', true);

  if (moviesPlayError) console.error('❌ Error checking movies (is_play):', moviesPlayError.message);
  else console.log(`✅ Movies (is_play=true): ${moviesPlayCount} items`);
}

async function verifyTmdb() {
  console.log('\n🔍 Verifying TMDB Content...');
  
  const fetchTmdb = async (endpoint, params = {}) => {
    const url = new URL(`https://api.themoviedb.org/3${endpoint}`);
    url.searchParams.append('api_key', TMDB_KEY);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.append(k, v);
    }
    
    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      return data;
    } catch (e) {
      console.error(`❌ TMDB Error ${endpoint}:`, e.message);
      return null;
    }
  };

  // Trending Movies
  const trending = await fetchTmdb('/trending/movie/week');
  console.log(`✅ Trending Movies: ${trending?.results?.length || 0} items`);

  // Top Rated Movies
  const topRated = await fetchTmdb('/movie/top_rated');
  console.log(`✅ Top Rated Movies: ${topRated?.results?.length || 0} items`);

  // Arabic Series
  const arabicSeries = await fetchTmdb('/discover/tv', { with_original_language: 'ar', sort_by: 'popularity.desc' });
  console.log(`✅ Arabic Series: ${arabicSeries?.results?.length || 0} items`);

  // Turkish Series
  const turkishSeries = await fetchTmdb('/discover/tv', { with_original_language: 'tr', sort_by: 'popularity.desc' });
  console.log(`✅ Turkish Series: ${turkishSeries?.results?.length || 0} items`);
  
  // Popular in Egypt
  const popularEg = await fetchTmdb('/discover/movie', { region: 'EG', sort_by: 'popularity.desc' });
  console.log(`✅ Popular in Egypt: ${popularEg?.results?.length || 0} items`);
}

async function run() {
  try {
    await verifySupabase();
    await verifyTmdb();
  } catch (e) {
    console.error('Unexpected error:', e);
  }
}

run();
