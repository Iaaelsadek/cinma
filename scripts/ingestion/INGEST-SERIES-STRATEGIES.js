#!/usr/bin/env node
/**
 * INGEST-SERIES-STRATEGIES.js
 * سحب شامل للمسلسلات باستخدام استراتيجيات متعددة لتجاوز حد 500 صفحة
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
  CONCURRENCY: 1, // CRITICAL: Must be 1 to avoid CockroachDB transaction isolation issues
};

const GENRES = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids',
  9648: 'Mystery', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
  10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics', 37: 'Western'
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
      params: { first_air_date_year: year, sort_by: 'popularity.desc' }
    });
  }
  
  // 2. السنوات المتوسطة (2000-2014) - سنة + نوع
  for (let year = 2014; year >= 2000; year--) {
    for (const [genreId, genreName] of Object.entries(GENRES)) {
      strategies.push({
        name: `year-${year}-genre-${genreId}`,
        params: { 
          first_air_date_year: year, 
          with_genres: genreId,
          sort_by: 'popularity.desc'
        }
      });
    }
  }
  
  // 3. السنوات القديمة (1900-1999) - عقود
  for (let decade = 1990; decade >= 1950; decade -= 10) {
    strategies.push({
      name: `decade-${decade}s`,
      params: {
        'first_air_date.gte': `${decade}-01-01`,
        'first_air_date.lte': `${decade + 9}-12-31`,
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
const progressFile = join(__dirname, 'progress-strategies-series.json');

function loadProgress() {
  if (!existsSync(progressFile)) {
    return { strategies: {}, totalSeries: 0, completedStrategies: 0 };
  }
  try {
    return JSON.parse(readFileSync(progressFile, 'utf-8'));
  } catch {
    return { strategies: {}, totalSeries: 0, completedStrategies: 0 };
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
  seasons: 0,
  episodes: 0,
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
function shouldFilter(series) {
  if (!series.poster_path) return true;
  
  const firstAirDate = new Date(series.first_air_date);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  if (firstAirDate > oneMonthAgo) return true;
  
  const genres = (series.genres || []).map(g => g.name);
  if (genres.includes('News') || genres.includes('Talk')) return true;
  
  return false;
}

// ══════════════════════════════════════════════
// Insert Series
// ══════════════════════════════════════════════
async function insertSeries(series) {
  // Check if exists
  const existing = await pool.query('SELECT id, name_ar, overview_ar FROM tv_series WHERE id=$1', [series.id]);
  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    if (row.name_ar && row.overview_ar) {
      stats.skipped++;
      return;
    }
  }
  
  // Fetch full details
  const full = await fetchTMDB(`/tv/${series.id}`, {
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
  
  let name_ar = ar?.data?.name || null;
  let overview_ar = ar?.data?.overview || null;
  let name_en = en?.data?.name || full.name;
  
  // Auto-translate if needed
  if (!name_ar || !overview_ar) {
    try {
      const translated = await translateContent({
        title: full.name,
        overview: full.overview
      });
      if (!name_ar) name_ar = translated.title_ar;
      if (!overview_ar) overview_ar = translated.overview_ar;
    } catch (e) {
      console.error(`   Translation failed for ${series.id}:`, e.message);
    }
  }
  
  let slug = generateSlug(name_en || full.name);
  
  // Handle duplicate slug
  let finalSlug = slug;
  const taken = await pool.query('SELECT id FROM tv_series WHERE slug=$1 AND id!=$2', [slug, full.id]);
  if (taken.rows.length > 0) {
    const year = full.first_air_date ? new Date(full.first_air_date).getFullYear() : Math.random().toString(36).slice(2, 6);
    finalSlug = `${slug}-${year}`;
    const taken2 = await pool.query('SELECT id FROM tv_series WHERE slug=$1 AND id!=$2', [finalSlug, full.id]);
    if (taken2.rows.length > 0) finalSlug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;
  }
  
  const genres = (full.genres || []).map(g => g.name);
  const primary_genre = genres[0] || null;
  const keywords = (full.keywords?.results || []).slice(0, 20).map(k => k.name);
  
  // ✅ CRITICAL FIX: Use SELECT-first approach to avoid null seriesId
  // CockroachDB ON CONFLICT ... RETURNING may not return id on conflict
  let seriesId;
  const existingSeries = await pool.query('SELECT id FROM tv_series WHERE id=$1', [full.id]);
  
  if (existingSeries.rows.length > 0) {
    // Series exists - UPDATE
    seriesId = full.id;  // ✅ Use TMDB ID directly (it's the primary key)
    console.log(`   ℹ️  Series ${full.id} exists, seriesId=${seriesId}`);
    await pool.query(`
      UPDATE tv_series SET
        name_ar = CASE WHEN name_ar IS NULL THEN $1 ELSE name_ar END,
        overview_ar = CASE WHEN overview_ar IS NULL THEN $2 ELSE overview_ar END,
        updated_at = NOW()
      WHERE id = $3
    `, [name_ar, overview_ar, full.id]);
  } else {
    // Series doesn't exist - INSERT
    console.log(`   ℹ️  Series ${full.id} is new, inserting...`);
    const result = await pool.query(`
      INSERT INTO tv_series (
        id, name, name_ar, name_original,
        overview, overview_ar,
        poster_path, backdrop_path,
        first_air_date, last_air_date,
        vote_average, vote_count, popularity,
        number_of_seasons, number_of_episodes,
        genres, original_language, status,
        slug, primary_genre, keywords,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW(),NOW()
      )
      RETURNING id
    `, [
      full.id, full.name, name_ar, full.original_name,
      full.overview, overview_ar,
      full.poster_path, full.backdrop_path,
      full.first_air_date || null, full.last_air_date || null,
      full.vote_average || 0, full.vote_count || 0, full.popularity || 0,
      full.number_of_seasons || 0, full.number_of_episodes || 0,
      genres, full.original_language, full.status || 'Unknown',
      finalSlug, primary_genre, keywords
    ]);
    const insertedId = result.rows[0]?.id;
    seriesId = full.id;  // ✅ Use TMDB ID directly (it's the primary key)
    console.log(`   ℹ️  Inserted series ${full.id}, seriesId=${seriesId}, rawId=${insertedId}`);
  }
  
  if (!seriesId || isNaN(seriesId)) {
    console.error(`   ❌ CRITICAL: seriesId is invalid for series ${full.id}! seriesId=${seriesId}`);
    return;
  }

  
  // Validate seriesId before processing seasons
  if (!seriesId || isNaN(seriesId) || seriesId <= 0) {
    console.error(`   ❌ CRITICAL: Invalid seriesId for series ${full.id}! seriesId=${seriesId}, type=${typeof seriesId}`);
    return;
  }
  
  // Double-check seriesId exists in database
  const verifyResult = await pool.query('SELECT id FROM tv_series WHERE id=$1', [seriesId]);
  if (verifyResult.rows.length === 0) {
    console.error(`   ❌ CRITICAL: seriesId ${seriesId} not found in database for series ${full.id}!`);
    return;
  }
  
  // CRITICAL: Create a local constant copy to prevent race conditions
  const finalSeriesId = seriesId;

  
  // Insert seasons (first 3 only for speed)
  const seasonsToFetch = Math.min(full.number_of_seasons || 0, 3);
  for (let s = 1; s <= seasonsToFetch; s++) {
    try {
      console.log(`   🔍 Processing season ${s} for series ${full.id}, seriesId=${finalSeriesId}, type=${typeof finalSeriesId}`);
      
      // CRITICAL: Validate seriesId before any database operation
      if (!finalSeriesId || isNaN(finalSeriesId) || finalSeriesId <= 0) {
        console.error(`   ❌ SKIP season ${s}: Invalid seriesId=${finalSeriesId}`);
        continue;
      }
      
      const season = await fetchTMDB(`/tv/${full.id}/season/${s}`);
      
      // ✅ CRITICAL FIX: Use SELECT-first approach for seasons too
      let seasonId;
      console.log(`   🔍 Checking if season ${s} exists for seriesId=${finalSeriesId}`);
      const existingSeason = await pool.query(
        'SELECT id FROM seasons WHERE series_id=$1 AND season_number=$2',
        [finalSeriesId, s]
      );
      
      if (existingSeason.rows.length > 0) {
        // Season exists - UPDATE
        seasonId = existingSeason.rows[0].id;
        await pool.query(`
          UPDATE seasons SET
            name_ar = CASE WHEN name_ar IS NULL THEN $1 ELSE name_ar END,
            overview_ar = CASE WHEN overview_ar IS NULL THEN $2 ELSE overview_ar END,
            updated_at = NOW()
          WHERE id = $3
        `, [null, null, seasonId]);
      } else {
        // Season doesn't exist - INSERT
        console.log(`   🔍 About to INSERT season ${s}, seriesId=${finalSeriesId}, type=${typeof finalSeriesId}, isValid=${!isNaN(finalSeriesId) && finalSeriesId > 0}`);
        
        // CRITICAL: Verify seriesId one more time before INSERT
        if (!finalSeriesId || isNaN(finalSeriesId) || finalSeriesId <= 0) {
          console.error(`   ❌ ABORT: Invalid seriesId at INSERT time! seriesId=${finalSeriesId}`);
          continue; // Skip this season
        }
        
        console.log(`   🔍 FINAL CHECK before INSERT: finalSeriesId=${finalSeriesId}, type=${typeof finalSeriesId}, value=${JSON.stringify(finalSeriesId)}`);
        
        // CRITICAL: Retry mechanism for concurrent operations
        let seasonResult;
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
          try {
            // CRITICAL DEBUG: Log the exact value being passed
            console.log(`   🔍 INSERTING season with series_id=${finalSeriesId} (type=${typeof finalSeriesId})`);
            
            seasonResult = await pool.query(`
              INSERT INTO seasons (
                series_id, season_number, name, name_ar,
                overview, overview_ar,
                poster_path, air_date, episode_count, created_at
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
              RETURNING id
            `, [
              finalSeriesId, s, season.name, null,
              season.overview, null,
              season.poster_path, season.air_date || null, season.episodes?.length || 0
            ]);
            
            console.log(`   ✅ Season ${s} inserted successfully! seasonId=${seasonResult.rows[0].id}`);
            break; // Success - exit retry loop
          } catch (insertError) {
            console.error(`   ❌ INSERT failed: ${insertError.message}`);
            console.error(`   📍 Parameters: series_id=${finalSeriesId}, season_number=${s}`);
            
            retries++;
            if (retries >= maxRetries) {
              throw insertError; // Give up after max retries
            }
            // Wait a bit before retry (foreign key might not be visible yet)
            console.log(`   ⚠️ Retry ${retries}/${maxRetries} for season ${s} of series ${full.id}`);
            await new Promise(r => setTimeout(r, 100 * retries)); // 100ms, 200ms, 300ms
          }
        }
        seasonId = seasonResult.rows[0].id;
      }
      
      stats.seasons++;
      
      // Insert episodes (first 5 only for speed)
      const episodesToInsert = (season.episodes || []).slice(0, 5);
      for (const ep of episodesToInsert) {
        await pool.query(`
          INSERT INTO episodes (
            season_id, series_id, episode_number, name, name_ar,
            overview, overview_ar,
            still_path, air_date, runtime
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          ON CONFLICT (season_id, episode_number) DO NOTHING
        `, [
          seasonId, finalSeriesId, ep.episode_number, ep.name, null,
          ep.overview, null,
          ep.still_path, ep.air_date || null, ep.runtime || null
        ]);
        stats.episodes++;
      }
    } catch (e) {
      console.error(`   ❌ Season ${s} error for series ${full.id}:`, e.message);
      console.error(`   📍 Error details: seriesId=${finalSeriesId}, seasonId=${seasonId || 'undefined'}`);
      console.error(`   📍 Stack trace:`, e.stack?.split('\n')[0]);
    }
  }
  
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
      const data = await fetchTMDB('/discover/tv', {
        ...strategy.params,
        include_adult: false,
        page
      });
      
      if (!data.results || data.results.length === 0) {
        console.log(`   ✅ Strategy completed (no more results)`);
        break;
      }
      
      // Process series concurrently
      const promises = data.results.map(s => 
        limiter(() => insertSeries(s).catch(e => {
          stats.errors++;
          console.error(`   ❌ Series ${s.id}: ${e.message}`);
        }))
      );
      await Promise.all(promises);
      
      // Update progress
      strategyProgress.page = page;
      strategyProgress.total = stats.total;
      progress.strategies[strategy.name] = strategyProgress;
      progress.totalSeries = stats.total;
      saveProgress(progress);
      
      // Show progress every 10 pages
      if (page % 10 === 0) {
        const elapsed = (Date.now() - stats.start) / 60000;
        console.log(`   Page ${page}: ${stats.total} series | ${stats.seasons} seasons | ${stats.episodes} episodes | skip:${stats.skipped} | ${elapsed.toFixed(1)}min`);
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
  console.log('🚀 INGEST-SERIES-STRATEGIES.js starting...');
  console.log('══════════════════════════════════════════════════\n');
  
  const strategies = buildStrategies();
  const progress = loadProgress();
  
  console.log(`📊 Total strategies: ${strategies.length}`);
  console.log(`✅ Completed: ${progress.completedStrategies}`);
  console.log(`📝 Total series so far: ${progress.totalSeries}\n`);
  
  for (const strategy of strategies) {
    if (progress.strategies[strategy.name]?.page >= CONFIG.MAX_PAGES_PER_STRATEGY) {
      console.log(`⏭️  Skipping completed strategy: ${strategy.name}`);
      continue;
    }
    
    await processStrategy(strategy, progress);
  }
  
  console.log('\n══════════════════════════════════════════════════');
  console.log('✅ All strategies completed!');
  console.log(`📺 Total series: ${stats.total}`);
  console.log(`📋 Total seasons: ${stats.seasons}`);
  console.log(`🎞️  Total episodes: ${stats.episodes}`);
  console.log(`⏱  Time: ${((Date.now() - stats.start) / 60000).toFixed(1)} minutes`);
  
  await pool.end();
  process.exit(0);
}

main().catch(e => {
  console.error('❌ Fatal error:', e);
  process.exit(1);
});
