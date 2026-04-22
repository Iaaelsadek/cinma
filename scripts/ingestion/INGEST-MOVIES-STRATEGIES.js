#!/usr/bin/env node
/**
 * INGEST-MOVIES-STRATEGIES.js
 * سحب شامل للأفلام باستخدام استراتيجيات متعددة لتجاوز حد 500 صفحة
 * 
 * الاستراتيجيات:
 * 1. السنوات الحديثة (2015-2026): كل سنة لوحدها
 * 2. السنوات المتوسطة (2000-2014): سنة + نوع
 * 3. السنوات القديمة (1900-1999): عقود
 * 4. اللغات المختلفة
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { translateContent } from '../services/translation-service.js';
import pLimit from 'p-limit';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ══════════════════════════════════════════════
// Database
// ══════════════════════════════════════════════
const rawUrl = (process.env.COCKROACHDB_URL || '').replace(/^["']|["']$/g, '').trim();
const pool = new Pool({ connectionString: rawUrl, ssl: { rejectUnauthorized: false } });

// ══════════════════════════════════════════════
// Config
// ══════════════════════════════════════════════
const CONFIG = {
  TMDB_KEY: process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY,
  TMDB_URL: 'https://api.themoviedb.org/3',
  MAX_PAGES_PER_STRATEGY: 500,
  PAGES_PER_BATCH: 10,
  MAX_RETRIES: 3,
  CONCURRENCY: 50,
};

const GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

const limiter = pLimit(CONFIG.CONCURRENCY);

// ══════════════════════════════════════════════
// Build Strategies
// ══════════════════════════════════════════════
function buildStrategies() {
  const strategies = [];
  
  // 1. السنوات الحديثة (2015-2026) - كل سنة لوحدها
  for (let year = 2026; year >= 2015; year--) {
    strategies.push({
      name: `year-${year}`,
      params: { primary_release_year: year, sort_by: 'popularity.desc' }
    });
  }
  
  // 2. السنوات المتوسطة (2000-2014) - سنة + نوع
  for (let year = 2014; year >= 2000; year--) {
    for (const [genreId, genreName] of Object.entries(GENRES)) {
      strategies.push({
        name: `year-${year}-genre-${genreId}`,
        params: { 
          primary_release_year: year, 
          with_genres: genreId,
          sort_by: 'popularity.desc'
        }
      });
    }
  }
  
  // 3. السنوات القديمة (1900-1999) - عقود
  for (let decade = 1990; decade >= 1900; decade -= 10) {
    strategies.push({
      name: `decade-${decade}s`,
      params: {
        'primary_release_date.gte': `${decade}-01-01`,
        'primary_release_date.lte': `${decade + 9}-12-31`,
        sort_by: 'popularity.desc'
      }
    });
  }
  
  // 4. اللغات الشائعة
  const languages = ['ar', 'en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh', 'hi'];
  for (const lang of languages) {
    strategies.push({
      name: `lang-${lang}`,
      params: { with_original_language: lang, sort_by: 'popularity.desc' }
    });
  }
  
  return strategies;
}

// ══════════════════════════════════════════════
// Progress Management
// ══════════════════════════════════════════════
const progressFile = join(__dirname, 'progress-strategies-movies.json');

function loadProgress() {
  if (!existsSync(progressFile)) {
    return { strategies: {}, totalMovies: 0, completedStrategies: 0 };
  }
  try {
    return JSON.parse(readFileSync(progressFile, 'utf-8'));
  } catch {
    return { strategies: {}, totalMovies: 0, completedStrategies: 0 };
  }
}

function saveProgress(progress) {
  try {
    writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  } catch (e) {
    console.error('Failed to save progress:', e.message);
  }
}

// ══════════════════════════════════════════════
// Stats
// ══════════════════════════════════════════════
const stats = {
  total: 0,
  skipped: 0,
  filtered: 0,
  errors: 0,
  start: Date.now()
};

// ══════════════════════════════════════════════
// Utilities
// ══════════════════════════════════════════════
function generateSlug(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function isArabic(text) {
  if (!text) return false;
  const clean = text.replace(/\s/g, '');
  if (!clean.length) return false;
  return ((text.match(/[\u0600-\u06FF]/g) || []).length / clean.length) > 0.5;
}

async function fetchTMDB(endpoint, params = {}, retry = 0) {
  const url = new URL(`${CONFIG.TMDB_URL}${endpoint}`);
  url.searchParams.set('api_key', CONFIG.TMDB_KEY);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  
  try {
    const res = await fetch(url.toString());
    
    if (res.status === 429) {
      const wait = parseInt(res.headers.get('Retry-After') || '5') * 1000 + 500;
      await new Promise(r => setTimeout(r, wait));
      return fetchTMDB(endpoint, params, retry);
    }
    
    if (res.status === 400) {
      throw new Error('HTTP 400 - Bad Request');
    }
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    if (retry < CONFIG.MAX_RETRIES && e.message.includes('fetch')) {
      await new Promise(r => setTimeout(r, 1000 * (retry + 1)));
      return fetchTMDB(endpoint, params, retry + 1);
    }
    throw e;
  }
}

// ══════════════════════════════════════════════
// Content Filter
// ══════════════════════════════════════════════
function shouldFilter(movie) {
  if (movie.adult) return true;
  if (!movie.poster_path) return true;
  if ((movie.runtime || 0) < 40) return true;
  
  const releaseDate = new Date(movie.release_date);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  if (releaseDate > oneMonthAgo) return true;
  
  const genres = (movie.genres || []).map(g => g.name);
  if (genres.includes('Documentary') || genres.includes('TV Movie')) return true;
  
  return false;
}

// ══════════════════════════════════════════════
// Insert Movie
// ══════════════════════════════════════════════
async function insertMovie(movie) {
  // Check if exists
  const existing = await pool.query('SELECT id, title_ar, overview_ar FROM movies WHERE id=$1', [movie.id]);
  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (row.title_ar && row.overview_ar) {
      stats.skipped++;
      return;
    }
  }
  
  // Fetch full details
  const full = await fetchTMDB(`/movie/${movie.id}`, {
    append_to_response: 'credits,translations,keywords'
  });
  
  if (shouldFilter(full)) {
    stats.filtered++;
    return;
  }
  
  // Extract translations
  const translations = full.translations?.translations || [];
  const ar = translations.find(t => t.iso_639_1 === 'ar');
  const en = translations.find(t => t.iso_639_1 === 'en');
  
  let title_ar = ar?.data?.title || null;
  let overview_ar = ar?.data?.overview || null;
  let title_en = en?.data?.title || full.title;
  
  // Auto-translate if needed
  if (!title_ar || !overview_ar) {
    try {
      const translated = await translateContent({
        title: full.title,
        overview: full.overview
      });
      if (!title_ar) title_ar = translated.title_ar;
      if (!overview_ar) overview_ar = translated.overview_ar;
    } catch (e) {
      console.error(`   Translation failed for ${movie.id}:`, e.message);
    }
  }
  
  let slug = generateSlug(title_en || full.title);
  if (!slug || slug.length < 2) {
    slug = `movie-${full.id}`;
  }
  
  // ✅ CRITICAL: Ensure slug is NEVER numeric-only
  if (/^\d+$/.test(slug)) {
    slug = `movie-${slug}`;
  }
  
  // Handle duplicate slug
  let finalSlug = slug;
  const taken = await pool.query('SELECT id FROM movies WHERE slug=$1 AND id!=$2', [slug, full.id]);
  if (taken.rows.length > 0) {
    const year = full.release_date ? new Date(full.release_date).getFullYear() : Math.random().toString(36).slice(2, 6);
    finalSlug = `${slug}-${year}`;
    
    // ✅ CRITICAL: Check again if slug with year is numeric-only
    if (/^\d+$/.test(finalSlug)) {
      finalSlug = `movie-${finalSlug}`;
    }
    
    const taken2 = await pool.query('SELECT id FROM movies WHERE slug=$1 AND id!=$2', [finalSlug, full.id]);
    if (taken2.rows.length > 0) finalSlug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;
  }
  
  const genres = (full.genres || []).map(g => g.name);
  const primary_genre = genres[0] || null;
  const keywords = (full.keywords?.keywords || []).slice(0, 20).map(k => k.name);
  
  // Insert movie
  await pool.query(`
    INSERT INTO movies (
      id, title, title_ar, title_original,
      overview, overview_ar,
      poster_path, backdrop_path,
      release_date, runtime,
      vote_average, vote_count, popularity,
      genres, original_language,
      slug, primary_genre, keywords,
      created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title_ar = CASE WHEN movies.title_ar IS NULL THEN EXCLUDED.title_ar ELSE movies.title_ar END,
      overview_ar = CASE WHEN movies.overview_ar IS NULL THEN EXCLUDED.overview_ar ELSE movies.overview_ar END,
      updated_at = NOW()
  `, [
    full.id, full.title, title_ar, full.original_title,
    full.overview, overview_ar,
    full.poster_path, full.backdrop_path,
    full.release_date || null, full.runtime || null,
    full.vote_average || 0, full.vote_count || 0, full.popularity || 0,
    genres, full.original_language,
    finalSlug, primary_genre, keywords
  ]);
  
  stats.total++;
}

// ══════════════════════════════════════════════
// Process Strategy
// ══════════════════════════════════════════════
async function processStrategy(strategy, progress) {
  const strategyProgress = progress.strategies[strategy.name] || { page: 0, total: 0 };
  
  console.log(`\n🎯 Strategy: ${strategy.name}`);
  console.log(`   Starting from page ${strategyProgress.page + 1}`);
  
  for (let page = strategyProgress.page + 1; page <= CONFIG.MAX_PAGES_PER_STRATEGY; page++) {
    try {
      const data = await fetchTMDB('/discover/movie', {
        ...strategy.params,
        include_adult: false,
        page
      });
      
      if (!data.results || data.results.length === 0) {
        console.log(`   ✅ Strategy completed (no more results)`);
        break;
      }
      
      // Process movies concurrently
      const promises = data.results.map(m => 
        limiter(() => insertMovie(m).catch(e => {
          stats.errors++;
          console.error(`   ❌ Movie ${m.id}: ${e.message}`);
        }))
      );
      await Promise.all(promises);
      
      // Update progress
      strategyProgress.page = page;
      strategyProgress.total = stats.total;
      progress.strategies[strategy.name] = strategyProgress;
      progress.totalMovies = stats.total;
      saveProgress(progress);
      
      // Show progress every 10 pages
      if (page % 10 === 0) {
        const elapsed = (Date.now() - stats.start) / 60000;
        console.log(`   Page ${page}: ${stats.total} movies | skip:${stats.skipped} | filter:${stats.filtered} | err:${stats.errors} | ${elapsed.toFixed(1)}min`);
      }
      
    } catch (e) {
      if (e.message.includes('400')) {
        console.log(`   ✅ Strategy completed (reached page limit)`);
        break;
      }
      console.error(`   ❌ Page ${page} error:`, e.message);
    }
  }
  
  progress.completedStrategies++;
  saveProgress(progress);
}

// ══════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════
async function main() {
  console.log('🚀 INGEST-MOVIES-STRATEGIES.js starting...');
  console.log('══════════════════════════════════════════════════\n');
  
  const strategies = buildStrategies();
  const progress = loadProgress();
  
  console.log(`📊 Total strategies: ${strategies.length}`);
  console.log(`✅ Completed: ${progress.completedStrategies}`);
  console.log(`📝 Total movies so far: ${progress.totalMovies}\n`);
  
  for (const strategy of strategies) {
    if (progress.strategies[strategy.name]?.page >= CONFIG.MAX_PAGES_PER_STRATEGY) {
      console.log(`⏭️  Skipping completed strategy: ${strategy.name}`);
      continue;
    }
    
    await processStrategy(strategy, progress);
  }
  
  console.log('\n══════════════════════════════════════════════════');
  console.log('✅ All strategies completed!');
  console.log(`🎬 Total movies: ${stats.total}`);
  console.log(`⏱  Time: ${((Date.now() - stats.start) / 60000).toFixed(1)} minutes`);
  
  await pool.end();
  process.exit(0);
}

main().catch(e => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});
