#!/usr/bin/env node
/**
 * INGEST-SERIES.js
 * سحب مسلسلات وأنمي من TMDB مع ترجمة عربية تلقائية
 *
 * Schema المستخدم (tv_series):
 *   id, name, name_ar, name_original, overview, overview_ar,
 *   poster_path, backdrop_path, first_air_date, last_air_date,
 *   number_of_seasons, number_of_episodes,
 *   vote_average, vote_count, popularity,
 *   genres(ARRAY), original_language,
 *   slug, primary_genre,
 *   keywords(ARRAY)
 *
 * Schema المستخدم (seasons):
 *   id(auto), series_id, season_number, name, name_ar,
 *   overview, overview_ar, poster_path, air_date, episode_count
 *
 * Schema المستخدم (episodes):
 *   id(auto), season_id, series_id, episode_number,
 *   name, name_ar, overview, overview_ar,
 *   still_path, air_date, runtime, vote_average, vote_count
 *
 * Schema المستخدم (actors):
 *   id, name, name_ar, biography, biography_ar,
 *   profile_path, birthday, place_of_birth, popularity, slug
 *
 * Schema المستخدم (tv_cast):
 *   series_id, actor_id, character_name, cast_order
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
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
// Config (uses second TMDB key for series)
// ══════════════════════════════════════════════
const CONFIG = {
  TMDB_KEY: '1298554bf3b09eee57972f0876ad096e',
  TMDB_URL: 'https://api.themoviedb.org/3',
  PAGES_PER_ROUND: 10,
  TARGETS: { tvSeries: 250000, animation: 250000 },
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
  tvSeries: { total: 0, skipped: 0, errors: 0, seasonErrors: 0 },
  animation: { total: 0, skipped: 0, errors: 0, seasonErrors: 0 },
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
function shouldSkip(series) {
  if (!series.poster_path) return true;
  const genres = (series.genres || []).map(g => g.name.toLowerCase());
  if (genres.includes('documentary') || genres.includes('news') || genres.includes('talk')) return true;
  if (series.episode_run_time?.length) {
    const avg = series.episode_run_time.reduce((a, b) => a + b, 0) / series.episode_run_time.length;
    if (avg < 25) return true;
  }
  if (series.first_air_date) {
    const d = new Date(series.first_air_date);
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

  const existing = await pool.query('SELECT id FROM actors WHERE id=$1', [id]);
  if (existing.rows.length > 0) { actorCache.set(id, id); return id; }

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

  if (!name_ar) {
    try { const t = await translateContent({ title_en: actor.name }); if (t.title_ar) name_ar = t.title_ar; } catch (_) { }
  }
  if (!biography_ar && biography) {
    try { const t = await translateContent({ overview_en: biography.substring(0, 500) }); if (t.overview_ar) biography_ar = t.overview_ar; } catch (_) { }
  }

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
// Season + Episodes Insert
// ══════════════════════════════════════════════
async function insertSeason(tmdbSeriesId, seasonNum, seriesId) {
  try {
    const season = await fetchTMDB(`/tv/${tmdbSeriesId}/season/${seasonNum}`);
    if (!season?.season_number && season?.season_number !== 0) return null;

    // Check if season exists
    const existingSeason = await pool.query(
      'SELECT id FROM seasons WHERE series_id=$1 AND season_number=$2',
      [seriesId, season.season_number]
    );

    let seasonId;
    if (existingSeason.rows.length > 0) {
      seasonId = existingSeason.rows[0].id;
      await pool.query(
        'UPDATE seasons SET name=$1, overview=$2, poster_path=$3, air_date=$4, episode_count=$5 WHERE id=$6',
        [season.name || `Season ${seasonNum}`, season.overview || null, season.poster_path || null, season.air_date || null, season.episodes?.length || 0, seasonId]
      );
    } else {
      const r = await pool.query(`
        INSERT INTO seasons (series_id, season_number, name, overview, poster_path, air_date, episode_count, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING id
      `, [seriesId, season.season_number, season.name || `Season ${seasonNum}`, season.overview || null, season.poster_path || null, season.air_date || null, season.episodes?.length || 0]);
      seasonId = r.rows[0].id;
    }

    // Episodes
    let epCount = 0;
    for (const ep of (season.episodes || [])) {
      try {
        const existingEp = await pool.query(
          'SELECT id FROM episodes WHERE season_id=$1 AND episode_number=$2',
          [seasonId, ep.episode_number]
        );
        if (existingEp.rows.length > 0) {
          await pool.query(
            'UPDATE episodes SET name=$1, overview=$2, still_path=$3, air_date=$4, runtime=$5, vote_average=$6, vote_count=$7 WHERE id=$8',
            [ep.name || `Episode ${ep.episode_number}`, ep.overview || null, ep.still_path || null, ep.air_date || null, ep.runtime || null, ep.vote_average || 0, ep.vote_count || 0, existingEp.rows[0].id]
          );
        } else {
          await pool.query(`
            INSERT INTO episodes (series_id, season_id, episode_number, name, overview, still_path, air_date, runtime, vote_average, vote_count, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
          `, [seriesId, seasonId, ep.episode_number, ep.name || `Episode ${ep.episode_number}`, ep.overview || null, ep.still_path || null, ep.air_date || null, ep.runtime || null, ep.vote_average || 0, ep.vote_count || 0]);
        }
        epCount++;
      } catch (e) { console.log(`   ⚠️ Episode ${ep.episode_number}: ${e.message}`); }
    }

    console.log(`   ✅ Season ${seasonNum}: ${epCount}/${season.episodes?.length || 0} episodes`);
    return seasonId;
  } catch (e) {
    console.log(`   ❌ Season ${seasonNum}: ${e.message}`);
    return null;
  }
}

// ══════════════════════════════════════════════
// Series Insert
// ══════════════════════════════════════════════
async function insertSeries(series, section) {
  const trans = extractTranslations(series);

  if (!trans.title_ar || !trans.overview_ar) {
    try {
      const t = await translateContent({
        title_en: trans.title_en || series.name,
        overview_en: series.overview,
      });
      if (!trans.title_ar && t.title_ar) trans.title_ar = t.title_ar;
      if (!trans.overview_ar && t.overview_ar) trans.overview_ar = t.overview_ar;
    } catch (_) { }
  }

  const englishName = trans.title_en || (series.original_language === 'en' ? series.original_name : null) || series.name;
  const slug = generateSlug(englishName);
  if (!slug) return null;

  let finalSlug = slug;
  const taken = await pool.query('SELECT id FROM tv_series WHERE slug=$1 AND id!=$2', [slug, series.id]);
  if (taken.rows.length > 0) {
    const year = series.first_air_date ? new Date(series.first_air_date).getFullYear() : Math.random().toString(36).slice(2, 6);
    finalSlug = `${slug}-${year}`;
    const taken2 = await pool.query('SELECT id FROM tv_series WHERE slug=$1 AND id!=$2', [finalSlug, series.id]);
    if (taken2.rows.length > 0) finalSlug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;
  }

  const genres = (series.genres || []).map(g => g.name);
  const primary_genre = genres[0] || null;
  const keywords = (series.keywords?.results || []).slice(0, 20).map(k => k.name);

  const r = await pool.query(`
    INSERT INTO tv_series (
      id, name, name_ar, name_original,
      overview, overview_ar,
      poster_path, backdrop_path,
      first_air_date, last_air_date,
      number_of_seasons, number_of_episodes,
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
      $11,$12,
      $13,$14,$15,
      $16,$17,
      $18,$19,
      $20,
      NOW(),NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name_ar = CASE WHEN tv_series.name_ar IS NULL THEN EXCLUDED.name_ar ELSE tv_series.name_ar END,
      overview_ar = CASE WHEN tv_series.overview_ar IS NULL THEN EXCLUDED.overview_ar ELSE tv_series.overview_ar END,
      poster_path = COALESCE(tv_series.poster_path, EXCLUDED.poster_path),
      vote_average = COALESCE(tv_series.vote_average, EXCLUDED.vote_average),
      vote_count = COALESCE(tv_series.vote_count, EXCLUDED.vote_count),
      popularity = COALESCE(tv_series.popularity, EXCLUDED.popularity),
      primary_genre = COALESCE(tv_series.primary_genre, EXCLUDED.primary_genre),
      number_of_seasons = COALESCE(tv_series.number_of_seasons, EXCLUDED.number_of_seasons),
      number_of_episodes = COALESCE(tv_series.number_of_episodes, EXCLUDED.number_of_episodes),
      updated_at = NOW()
    RETURNING id
  `, [
    series.id,
    trans.title_en || series.name,
    trans.title_ar,
    series.original_name,
    series.overview,
    trans.overview_ar,
    series.poster_path,
    series.backdrop_path,
    series.first_air_date || null,
    series.last_air_date || null,
    series.number_of_seasons || 0,
    series.number_of_episodes || 0,
    series.vote_average || 0,
    series.vote_count || 0,
    series.popularity || 0,
    genres,
    series.original_language,
    finalSlug,
    primary_genre,
    keywords,
  ]);

  const seriesId = r.rows[0].id;
  console.log(`   ✅ ${series.name}${trans.title_ar ? ` | ${trans.title_ar}` : ''} (${section})`);

  // Seasons
  if (series.number_of_seasons > 0) {
    console.log(`   📋 ${series.number_of_seasons} seasons...`);
    for (let s = 1; s <= series.number_of_seasons; s++) {
      await insertSeason(series.id, s, seriesId);
    }
  }

  // Actors - استخدام order للترتيب الصحيح (الأبطال الأوائل)
  const cast = (series.aggregate_credits?.cast || []).slice(0, 8);
  for (let i = 0; i < cast.length; i++) {
    const actor = cast[i];
    try {
      const actorId = await insertActor(actor);
      await pool.query(`
        INSERT INTO tv_cast (series_id, actor_id, character_name, cast_order)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (series_id, actor_id) DO NOTHING
      `, [seriesId, actorId, actor.roles?.[0]?.character || null, actor.order ?? i]);
    } catch (_) { }
  }

  return seriesId;
}

// ══════════════════════════════════════════════
// Process single series
// ══════════════════════════════════════════════
async function processSeries(seriesId, section) {
  try {
    const series = await fetchTMDB(`/tv/${seriesId}`, { append_to_response: 'aggregate_credits,translations,keywords' });
    if (shouldSkip(series)) { stats[section].skipped++; return; }

    // Check if exists - if yes, only update if missing key fields
    const existing = await pool.query('SELECT id, name_ar, overview_ar FROM tv_series WHERE id=$1', [seriesId]);
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      // Skip if already has full data
      if (row.name_ar && row.overview_ar) { stats[section].skipped++; return; }
      // Otherwise fall through to insertSeries which does ON CONFLICT UPDATE
    }

    await insertSeries(series, section);
    stats[section].total++;
  } catch (e) {
    console.error(`   ❌ Series ${seriesId}: ${e.message}`);
    stats[section].errors++;
  }
}

// ══════════════════════════════════════════════
// Progress
// ══════════════════════════════════════════════
const progressFile = join(__dirname, 'progress-series.json');
const failedPagesFile = join(__dirname, 'failed-pages-series.json');

function loadProgress() {
  try { return JSON.parse(readFileSync(progressFile, 'utf-8')); }
  catch (_) { return { tvSeries: 0, animation: 0 }; }
}
function saveProgress(p) {
  try { writeFileSync(progressFile, JSON.stringify(p, null, 2)); } catch (_) { }
}

function loadFailedPages() {
  try { return JSON.parse(readFileSync(failedPagesFile, 'utf-8')); }
  catch (_) { return { tvSeries: [], animation: [] }; }
}
function saveFailedPage(section, page, reason) {
  const failed = loadFailedPages();
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
    console.log(`${cat === 'tvSeries' ? '📺' : '🎨'} ${cat}: ${s.total}/${CONFIG.TARGETS[cat]} (${pct}%) | skip:${s.skipped} err:${s.errors} seasonErr:${s.seasonErrors}`);
  }
  console.log(`⏱ ${min} minutes`);
  console.log('═'.repeat(50) + '\n');
}

// ══════════════════════════════════════════════
// Main Loop
// ══════════════════════════════════════════════
async function main() {
  console.log('🚀 INGEST-SERIES.js starting...\n');
  const progress = loadProgress();
  let pages = { tvSeries: progress.tvSeries + 1, animation: progress.animation + 1 };
  const interval = setInterval(printStats, 30000);

  let round = 1;
  while (true) {
    const doneTV = stats.tvSeries.total >= CONFIG.TARGETS.tvSeries;
    const doneAnim = stats.animation.total >= CONFIG.TARGETS.animation;
    if (doneTV && doneAnim) break;

    console.log(`\n${'═'.repeat(50)}\n🔄 ROUND ${round}\n${'═'.repeat(50)}`);

    // TV Series
    if (!doneTV) {
      const end = pages.tvSeries + CONFIG.PAGES_PER_ROUND - 1;
      console.log(`\n📺 TV Series (pages ${pages.tvSeries}-${end})`);
      for (let p = pages.tvSeries; p <= end; p++) {
        let success = false;
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          try {
            if (attempt > 0) { console.log(`  ↩️ Retry page ${p} (attempt ${attempt + 1})`); await sleep(3000 * attempt); }
            const data = await fetchTMDB('/discover/tv', { sort_by: 'popularity.desc', include_adult: false, page: p });

            // Process series concurrently (50 at a time)
            const promises = [];
            for (const s of (data.results || [])) {
              promises.push(limiter(() => processSeries(s.id, 'tvSeries')));
            }
            await Promise.all(promises);

            success = true;
          } catch (e) {
            if (attempt === 2) {
              console.error(`Page ${p}:`, e.message);
              saveFailedPage('tvSeries', p, e.message);
            }
          }
        }
      }
      pages.tvSeries = end + 1;
    }

    // Animation
    if (!doneAnim) {
      const end = pages.animation + CONFIG.PAGES_PER_ROUND - 1;
      console.log(`\n🎨 Animation (pages ${pages.animation}-${end})`);
      for (let p = pages.animation; p <= end; p++) {
        let success = false;
        for (let attempt = 0; attempt < 3 && !success; attempt++) {
          try {
            if (attempt > 0) { console.log(`  ↩️ Retry page ${p} (attempt ${attempt + 1})`); await sleep(3000 * attempt); }
            const data = await fetchTMDB('/discover/tv', { with_genres: 16, sort_by: 'popularity.desc', include_adult: false, page: p });

            // Process series concurrently (50 at a time)
            const promises = [];
            for (const s of (data.results || [])) {
              promises.push(limiter(() => processSeries(s.id, 'animation')));
            }
            await Promise.all(promises);

            success = true;
          } catch (e) {
            if (attempt === 2) {
              console.error(`Page ${p}:`, e.message);
              saveFailedPage('animation', p, e.message);
            }
          }
        }
      }
      pages.animation = end + 1;
    }

    saveProgress({ tvSeries: pages.tvSeries - 1, animation: pages.animation - 1 });
    round++;
  }

  clearInterval(interval);
  printStats();
  await pool.end();
  console.log('🎉 INGEST-SERIES.js done!');
}

main().catch(e => { console.error('💥', e); process.exit(1); });
