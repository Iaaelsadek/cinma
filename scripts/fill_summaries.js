import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SUMMARIES = [
  {
    id: 's1',
    title: 'ملخص فيلم Interstellar',
    thumbnail: 'https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
    url: 'https://www.youtube.com/watch?v=eFy80hOZKFA',
    category: 'summary',
    year: 2014,
    duration: 1200
  },
  {
    id: 's2',
    title: 'ملخص فيلم Inception',
    thumbnail: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    url: 'https://www.youtube.com/watch?v=H9mMeKO-hNE',
    category: 'summary',
    year: 2010,
    duration: 900
  },
  {
    id: 's3',
    title: 'ملخص فيلم The Dark Knight',
    thumbnail: 'https://image.tmdb.org/t/p/w500/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    url: 'https://www.youtube.com/watch?v=jb73btFccYk',
    thumbnail: 'https://image.tmdb.org/t/p/w500/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    category: 'summary',
    year: 2008,
    duration: 1100
  },
  {
    id: 's4',
    title: 'ملخص فيلم Oppenheimer',
    thumbnail: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    url: 'https://www.youtube.com/watch?v=s-0kR1gR_HQ',
    category: 'summary',
    year: 2023,
    duration: 1500
  },
  {
    id: 's5',
    title: 'ملخص فيلم Dune: Part Two',
    thumbnail: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    url: 'https://www.youtube.com/watch?v=n5wuxdJ6mhs',
    category: 'summary',
    year: 2024,
    duration: 1300
  },
  {
    id: 's6',
    title: 'ملخص ثلاثية العراب The Godfather',
    thumbnail: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    url: 'https://www.youtube.com/watch?v=U1CuVDKBDtU',
    category: 'summary',
    year: 1972,
    duration: 3600
  },
  {
    id: 's7',
    title: 'ملخص سلسلة هاري بوتر كاملة',
    thumbnail: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
    url: 'https://www.youtube.com/watch?v=qV3gOLrn6e4',
    category: 'summary',
    year: 2011,
    duration: 5400
  }
];

function getYoutubeId(url) {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
}

async function fillSummaries() {
  console.log('Filling summaries...');
  
  for (const item of SUMMARIES) {
    const ytId = getYoutubeId(item.url);
    
    // Upsert using ID
    const { data, error } = await supabase
      .from('videos')
      .upsert({
        id: item.id, // Use explicit ID 's1', 's2' etc so links work
        source: 'youtube',
        source_id: ytId,
        title: item.title,
        thumbnail: item.thumbnail,
        url: item.url,
        category: item.category,
        year: item.year,
        duration: item.duration,
        views: Math.floor(Math.random() * 10000)
      })
      .select();
    
    if (error) {
      console.error(`Error inserting ${item.title}:`, error.message);
    } else {
      console.log(`Successfully added/updated: ${item.title}`);
    }
  }
}

fillSummaries();
