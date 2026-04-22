#!/usr/bin/env node
/**
 * INGEST-MOVIES.js
 * سحب أفلام عربية وأجنبية من TMDB مع ترجمة عربية تلقائية
 * 
 * Schema المستخدم (movies):
 *   id, title, title_ar, title_original, overview, overview_ar,
 *   poster_path, backdrop_path, release_date, runtime,
 *   vote_average, vote_count, popularity,
 *   genres(ARRAY), original_language,
 *   slug, primary_genre, keywords(ARRAY)
 *
 * Schema المستخدم (actors):
 *   id, name, name_ar, biography, biography_ar,
 *   profile_path, birthday, place_of_birth, popularity, slug
 *
 * Schema المستخدم (movie_cast):
 *   movie_id, actor_id, character_name, cast_order
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { translateContent } from '../../services/translation-service.js';
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
  PAGES_PER_ROUND: 10,
  TARGETS: { arabic: 50000, foreign: 200000 },
  MAX_RETRIES: 3,
  CONCURRENCY: 50, // 50 concurrent requests for speed
};

// ══════════════════════════════════════════════
// Concurrency Limiter
// ══════════════════════════════════════════════
const limiter = pLimit(CONFIG.CONCURRENCY);

// ══════════════════════════════════════════════
// Stats
// ══════════════════════════════════════════════
const stats = {
  arabic: { total: 0, skipped: 0, errors: 0 },
  foreign: { total: 0, skipped: 0, errors: 0 },
  start: Date.now(),
};

// ══════════════════════════════════════════════
// Utilities
// ══════════════════════════════════════════════
const sleep = ms => new Promise(r => setTimeout(r, ms));

function generateSlug(text) {
  if (!text) return '';
  const map = {
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
    'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
    'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
    'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
    'ة': 'h', 'ء': 'a'
  };
  return text.split('').map(c => map[c] || c).join('')
    .toLowerCase()
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
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  try {
    const res = await fetch(url.toString());
    if (res.status === 429) {
      const wait = parseInt(res.headers.get('Retry-After') || '5') * 1000 + 500;
      await sleep(wait);
      return fetchTMDB(endpoint, params, retry);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    if (retry < CONFIG.MAX_RETRIES) { await sleep(1000 * (retry + 1)); return fetchTMDB(endpoint, params, retry + 1); }
    throw e;
  }
}

// ══════════════════════════════════════════════
// Translations from TMDB
// ══════════════════════════════════════════════
function extractTranslations(item) {
  const list = item.translations?.translations || [];
  const ar = list.find(t => t.iso_639_1 === 'ar');
  const en = list.find(t => t.iso_639_1 === 'en');

  let title_ar = ar?.data?.title || ar?.data?.name || null;
  if (!title_ar && item.original_language === 'ar')
    title_ar = item.original_title || item.original_name || null;

  let title_en = en?.data?.title || en?.data?.name || null;
  if (!title_en && item.original_language === 'en')
    title_en = item.original_title || item.original_name || null;

  let overview_ar = ar?.data?.overview || null;
  if (overview_ar && !isArabic(overview_ar)) overview_ar = null;

  return { title_ar, title_en, overview_ar };
}

// ══════════════════════════════════════════════
// Filters
// ══════════════════════════════════════════════
function shouldSkip(movie) {
  if (movie.adult) return true;
  if (!movie.poster_path) return true;
  if (movie.runtime && movie.runtime < 40) return true;
  const genres = (movie.genres || []).map(g => g.name.toLowerCase());
  if (genres.includes('documentary') || genres.includes('tv movie')) return true;
  if (movie.release_date) {
    const d = new Date(movie.release_date);
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    if (d > monthAgo) return true;
  }
  return false;
}

// ══════════════════════════════════════════════
// Actor Insert
// ══════════════════════════════════════════════
const actorCache = new Map();

async function insertActor(actor) {
  const id = actor.id;
  if (actorCache.has(id)) return actorCache.get(id);

  // Check DB
  const existing = await pool.query('SELECT id FROM actors WHERE id = $1', [id]);
  if (existing.rows.length > 0) {
    actorCache.set(id, id);
    return id;
  }

  // Fetch details + translations
  let name_ar = null, biography_ar = null, biography = null, birthday = null, place_of_birth = null;
  try {
    const details = await fetchTMDB(`/person/${id}`, { append_to_response: 'translations' });
    const ar = (details.translations?.translations || []).find(t => t.iso_639_1 === 'ar');
    const arName = ar?.data?.name || null;
    if (arName && isArabic(arName)) name_ar = arName;
    const arBio = ar?.data?.biography || null;
    if (arBio && isArabic(arBio)) biography_ar = arBio;
    biography = details.biography || null;
    birthday = details.birthday || null;
    place_of_birth = details.place_of_birth || null;
  } catch (_) { }

  // Translate if missing
  if (!name_ar) {
    try {
      const t = await translateContent({ title_en: actor.name });
      if (t.title_ar) name_ar = t.title_ar;
    } catch (_) { }
  }
  if (!biography_ar && biography) {
    try {
      const t = await translateContent({ overview_en: biography.substring(0, 500) });
      if (t.overview_ar) biography_ar = t.overview_ar;
    } catch (_) { }
  }

  // Generate unique slug
  const base = generateSlug(actor.name || `actor-${id}`);
  let slug = base, attempt = 1;
  while (attempt <= 10) {
    try {
      await pool.query(`
        INSERT INTO actors (id, name, name_ar, biography, biography_ar, profile_path, birthday, place_of_birth, popularity, slug, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
        ON CONFLICT (id) DO UPDATE SET name_ar=EXCLUDED.name_ar, biography_ar=EXCLUDED.biography_ar, updated_at=NOW()
      `, [id, actor.name, name_ar, biography, biography_ar, actor.profile_path || null, birthday, place_of_birth, actor.popularity || 0, slug]);
      actorCache.set(id, id);
      return id;
    } catch (e) {
      if (e.message.includes('slug')) { attempt++; slug = `${base}-${attempt}`; }
      else throw e;
    }
  }
}

// ══════════════════════════════════════════════
// Movie Insert
// ══════════════════════════════════════════════
async function insertMovie(movie, section) {
  const trans = extractTranslations(movie);

  // Auto-translate if missing
  if (!trans.title_ar || !trans.overview_ar) {
    try {
      const srcTitle = trans.title_en || movie.title;
      const srcOverview = movie.overview;
      const t = await translateContent({ title_en: srcTitle, overview_en: srcOverview });
      if (!trans.title_ar && t.title_ar) trans.title_ar = t.title_ar;
      if (!trans.overview_ar && t.overview_ar) trans.overview_ar = t.overview_ar;
    } catch (_) { }
  }

  const englishTitle = trans.title_en || (movie.original_language === 'en' ? movie.original_title : null) || movie.title;
  const slug = generateSlug(englishTitle);
  if (!slug) return;

  // Unique slug check
  let finalSlug = slug;
  const taken = await pool.query('SELECT id FROM movies WHERE slug=$1 AND id!=$2', [slug, movie.id]);
  if (taken.rows.length > 0) {
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : Math.random().toString(36).slice(2, 6);
    finalSlug = `${slug}-${year}`;
    const taken2 = await pool.query('SELECT id FROM movies WHERE slug=$1 AND id!=$2', [finalSlug, movie.id]);
    if (taken2.rows.length > 0) finalSlug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const genres = (movie.genres || []).map(g => g.name);
  const primary_genre = genres[0] || null;
  const keywords = (movie.keywords?.keywords || []).slice(0, 20).map(k => k.name);

  await pool.query(`
    INSERT INTO movies (
      id, title, title_ar, title_original,
      overview, overview_ar,
      poster_path, backdrop_path,
      release_date, runtime,
      vote_average, vote_count, popularity,
      genres, original_language,
      slug, primary_genre,
      keywords,
      created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,
      $5,$6,
      $7,$8,
      $9,$10,
      $11,$12,$13,
      $14,$15,
      $16,$17,
      $18,
      NOW(),NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title_ar = CASE WHEN movies.title_ar IS NULL THEN EXCLUDED.title_ar ELSE movies.title_ar END,
      overview_ar = CASE WHEN movies.overview_ar IS NULL THEN EXCLUDED.overview_ar ELSE movies.overview_ar END,
      poster_path = COALESCE(movies.poster_path, EXCLUDED.poster_path),
      vote_average = COALESCE(movies.vote_average, EXCLUDED.vote_average),
      vote_count = COALESCE(movies.vote_count, EXCLUDED.vote_count),
      popularity = COALESCE(movies.popularity, EXCLUDED.popularity),
      primary_genre = COALESCE(movies.primary_genre, EXCLUDED.primary_genre),
      keywords = CASE WHEN movies.keywords IS NULL OR array_length(movies.keywords,1) IS NULL THEN EXCLUDED.keywords ELSE movies.keywords END,
      updated_at = NOW()
  `, [
    movie.id,
    movie.title,
    trans.title_ar,
    movie.original_title,
    movie.overview,
    trans.overview_ar,
    movie.poster_path,
    movie.backdrop_path,
    movie.release_date || null,
    movie.runtime || null,
    movie.vote_average || 0,
    movie.vote_count || 0,
    movie.popularity || 0,
    genres,
    movie.original_language,
    finalSlug,
    primary_genre,
    keywords,
  ]);

  console.log(`   ✅ ${movie.title}${trans.title_ar ? ` | ${trans.title_ar}` : ''}`);

  // Actors - استخدام order للترتيب الصحيح (الأبطال الأوائل)
  const cast = (movie.credits?.cast || []).slice(0, 8);
  for (let i = 0; i < cast.length; i++) {
    const actor = cast[i];
    try {
      const actorId = await insertActor(actor);
      await pool.query(`
        INSERT INTO movie_cast (movie_id, actor_id, character_name, cast_order)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (movie_id, actor_id) DO NOTHING
      `, [movie.id, actorId, actor.character || null, actor.order ?? i]);
    } catch (_) { }
  }
}

// ══════════════════════════════════════════════
// Process single movie
// ══════════════════════════════════════════════
async function processMovie(movieId, section) {
  try {
    const movie = await fetchTMDB(`/movie/${movieId}`, { append_to_response: 'credits,translations,keywords' });
    if (shouldSkip(movie)) { stats[section].skipped++; return; }

    // Check if exists - if yes, only update if missing key fields
    const existing = await pool.query('SELECT id, title_ar, overview_ar FROM movies WHERE id=$1', [movieId]);
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      // Skip if already has full data
      if (row.title_ar && row.overview_ar) { stats[section].skipped++; return; }
      // Otherwise fall through to insertMovie which does ON CONFLICT UPDATE
    }

    await insertMovie(movie, section);
    stats[section].total++;
  } catch (e) {
    console.error(`   ❌ Movie ${movieId}: ${e.message}`);
    stats[section].errors++;
  }
}

// ══════════════════════════════════════════════
// Progress
// ══════════════════════════════════════════════
const progressFile = join(__dirname, 'progress-movies.json');
const failedPagesFile = join(__dirname, 'failed-pages-movies.json');

function loadProgress() {
  try { return JSON.parse(readFileSync(progressFile, 'utf-8')); }
  catch (_) { return { arabic: 0, foreign: 0 }; }
}
function saveProgress(p) {
  try { writeFileSync(progressFile, JSON.stringify(p, null, 2)); } catch (_) { }
}

// Failed pages tracking
function loadFailedPages() {
  try { return JSON.parse(readFileSync(failedPagesFile, 'utf-8')); }
  catch (_) { return { arabic: [], foreign: [] }; }
}
function saveFailedPage(section, page, reason) {
  const failed = loadFailedPages();
  // Avoid duplicates
  const exists = failed[section]?.find(e => e.page === page);
  if (!exists) {
    if (!failed[section]) failed[section] = [];
    failed[section].push({ page, reason, time: new Date().toISOString() });
    try { writeFileSync(failedPagesFile, JSON.stringify(failed, null, 2)); } catch (_) { }
  }
}

// ══════════════════════════════════════════════
// Print Stats
// ══════════════════════════════════════════════
function printStats() {
  const min = ((Date.now() - stats.start) / 60000).toFixed(1);
  console.log('\n' + '═'.repeat(50));
  for (const [cat, s] of Object.entries(stats)) {
    if (cat === 'start') continue;
    const pct = ((s.total / CONFIG.TARGETS[cat]) * 100).toFixed(2);
    console.log(`${cat === 'arabic' ? '🎬' : '🌍'} ${cat}: ${s.total}/${CONFIG.TARGETS[cat]} (${pct}%) | skip:${s.skipped} err:${s.errors}`);
  }
  console.log(`⏱ ${min} minutes`);
  console.log('═'.repeat(50) + '\n');
}

// ══════════════════════════════════════════════
// Main Loop
// ══════════════════════════════════════════════
async function main() {
  console.log('🚀 INGEST-MOVIES.js starting...\n');
  const progress = loadProgress();
  let pages = { arabic: progress.arabic + 1, foreign: progress.foreign + 1 };
  const interval = setInterval(printStats, 30000);

  let round = 1;
  while (true) {
    const doneArabic = stats.arabic.total >= CONFIG.TARGETS.arabic;
    const doneForeign = stats.foreign.total >= CONFIG.TARGETS.foreign;
    if (doneArabic && doneForeign) break;

    console.log(`\n${'═'.repeat(50)}\n🔄 ROUND ${round}\n${'═'.repeat(50)}`);

    // Arabic movies
    if (!doneArabic) {
      const end = pages.arabic + CONFIG.PAGES_PER_ROUND - 1;
      console.log(`\n🎬 Arabic Movies (pages ${pages.arabic}-${end})`);
      for (let p = pages.arabic; p <= end; p++) {
        let success = false;
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          try {
            if (attempt > 0) { console.log(`  ↩️ Retry page ${p} (attempt ${attempt + 1})`); await sleep(3000 * attempt); }
            const data = await fetchTMDB('/discover/movie', { with_original_language: 'ar', sort_by: 'popularity.desc', include_adult: false, page: p });

            // Process movies concurrently (50 at a time)
            const promises = [];
            for (const m of (data.results || [])) {
              promises.push(limiter(() => processMovie(m.id, 'arabic')));
            }
            await Promise.all(promises);

            success = true;
          } catch (e) {
            if (attempt === 2) {
              console.error(`Page ${p} error:`, e.message);
              saveFailedPage('arabic', p, e.message);
              // ✅ Skip this page and continue to next
              success = true; // Mark as "done" to move on
            }
          }
        }
      }
      pages.arabic = end + 1;
    }

    // Foreign movies
    if (!doneForeign) {
      const end = pages.foreign + CONFIG.PAGES_PER_ROUND - 1;
      console.log(`\n🌍 Foreign Movies (pages ${pages.foreign}-${end})`);
      for (let p = pages.foreign; p <= end; p++) {
        let success = false;
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          try {
            if (attempt > 0) { console.log(`  ↩️ Retry page ${p} (attempt ${attempt + 1})`); await sleep(3000 * attempt); }
            const data = await fetchTMDB('/discover/movie', { without_original_language: 'ar', sort_by: 'popularity.desc', include_adult: false, page: p });

            // Process movies concurrently (50 at a time)
            const promises = [];
            for (const m of (data.results || [])) {
              promises.push(limiter(() => processMovie(m.id, 'foreign')));
            }
            await Promise.all(promises);

            success = true;
          } catch (e) {
            if (attempt === 2) {
              console.error(`Page ${p} error:`, e.message);
              saveFailedPage('foreign', p, e.message);
              // ✅ Skip this page and continue to next
              success = true; // Mark as "done" to move on
            }
          }
        }
      }
      pages.foreign = end + 1;
    }

    saveProgress({ arabic: pages.arabic - 1, foreign: pages.foreign - 1 });
    round++;
  }

  clearInterval(interval);
  printStats();
  await pool.end();
  console.log('🎉 INGEST-MOVIES.js done!');
}

main().catch(e => { console.error('💥', e); process.exit(1); });
