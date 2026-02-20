
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('Missing VITE_TMDB_API_KEY');
  process.exit(1);
}

async function checkTmdb() {
  console.log('--- Checking TMDB API ---');
  
  try {
    // Check Popular Movies (Egypt)
    console.log('Fetching Popular Movies (EG)...');
    const popularAr = await axios.get(`${BASE_URL}/discover/movie`, {
      params: { api_key: TMDB_API_KEY, region: 'EG', sort_by: 'popularity.desc' }
    });
    console.log(`✅ Popular (EG): ${popularAr.data.results.length} items.`);

    // Check Arabic Series
    console.log('Fetching Arabic Series...');
    const arabicSeries = await axios.get(`${BASE_URL}/discover/tv`, {
      params: { api_key: TMDB_API_KEY, with_original_language: 'ar', sort_by: 'popularity.desc' }
    });
    console.log(`✅ Arabic Series: ${arabicSeries.data.results.length} items.`);

    // Check Turkish Series
    console.log('Fetching Turkish Series...');
    const turkishSeries = await axios.get(`${BASE_URL}/discover/tv`, {
      params: { api_key: TMDB_API_KEY, with_original_language: 'tr', sort_by: 'popularity.desc' }
    });
    console.log(`✅ Turkish Series: ${turkishSeries.data.results.length} items.`);

  } catch (error) {
    console.error('❌ TMDB Error:', error.response?.data || error.message);
  }
  console.log('-------------------------');
}

checkTmdb();
