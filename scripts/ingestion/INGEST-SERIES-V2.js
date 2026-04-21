#!/usr/bin/env node
/**
 * INGEST-SERIES-V2.js
 * سحب كل المسلسلات من TMDB باستخدام Daily ID Exports
 * 
 * الميزات:
 * - يستخدم TMDB Daily ID Exports (لا حدود!)
 * - نظام شامل لتسجيل الأخطاء وإعادة المحاولة
 * - سحب المواسم والحلقات تلقائياً
 * - سحب الممثلين تلقائياً
 * - ترجمة تلقائية مع fallback
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { createWriteStream, readFileSync, writeFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { translateContent } from '../services/translation-service.js';
import pLimit from 'p-limit';
import { Readable } from 'stream';

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
    EXPORT_URL: 'https://files.tmdb.org/p/exports',
    MAX_RETRIES: 3,
    CONCURRENCY: 50,
    BATCH_SIZE: 500, // Smaller batch for series (more complex)
    ERROR_THRESHOLD: 10,
};

const limiter = pLimit(CONFIG.CONCURRENCY);

// ══════════════════════════════════════════════
// Stats & Error Tracking
// ══════════════════════════════════════════════
const stats = {
    series: 0,
    seasons: 0,
    episodes: 0,
    skipped: 0,
    filtered: 0,
    errors: 0,
    translationErrors: 0,
    tmdbErrors: 0,
    dbErrors: 0,
    start: Date.now(),
};

const errorLog = {
    translation: new Map(),
    tmdb: new Map(),
    database: new Map(),
    critical: [],
};

// ══════════════════════════════════════════════
// Error Logging
// ══════════════════════════════════════════════
function logError(type, id, error, context = {}) {
    const errorMap = errorLog[type];
    if (!errorMap) {
        errorLog.critical.push({
            id,
            error: error.message,
            type: 'unknown',
            context,
            timestamp: new Date().toISOString()
        });
        return;
    }

    const existing = errorMap.get(id);
    if (existing) {
        existing.attempts++;
        existing.lastAttempt = new Date().toISOString();
        existing.lastError = error.message;

        if (existing.attempts >= CONFIG.ERROR_THRESHOLD) {
            console.error(`\n⚠️  ALERT: ${type} error repeated ${existing.attempts} times for ID ${id}`);
            console.error(`   Error: ${error.message}`);
            errorLog.critical.push({
                id,
                error: error.message,
                type,
                attempts: existing.attempts,
                context,
                timestamp: new Date().toISOString()
            });
        }
    } else {
        errorMap.set(id, {
            ...context,
            error: error.message,
            attempts: 1,
            firstAttempt: new Date().toISOString(),
            lastAttempt: new Date().toISOString()
        });
    }
}

function saveErrorLog() {
    const errorFile = join(__dirname, 'error-log-series.json');
    const report = {
        summary: {
            total: stats.errors,
            translation: stats.translationErrors,
            tmdb: stats.tmdbErrors,
            database: stats.dbErrors,
            critical: errorLog.critical.length
        },
        errors: {
            translation: Array.from(errorLog.translation.entries()).map(([id, data]) => ({ id, ...data })),
            tmdb: Array.from(errorLog.tmdb.entries()).map(([id, data]) => ({ id, ...data })),
            database: Array.from(errorLog.database.entries()).map(([id, data]) => ({ id, ...data })),
            critical: errorLog.critical
        },
        timestamp: new Date().toISOString()
    };

    try {
        writeFileSync(errorFile, JSON.stringify(report, null, 2));
        console.log(`\n📝 Error log saved to: ${errorFile}`);
    } catch (e) {
        console.error(`❌ Failed to save error log: ${e.message}`);
    }
}

// ══════════════════════════════════════════════
// Utilities
// ══════════════════════════════════════════════
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
            await new Promise(r => setTimeout(r, wait));
            return fetchTMDB(endpoint, params, retry);
        }

        if (res.status === 400) {
            throw new Error('HTTP 400 - Bad request');
        }

        if (res.status >= 500) {
            if (retry < CONFIG.MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 1000 * (retry + 1)));
                return fetchTMDB(endpoint, params, retry + 1);
            }
            throw new Error(`HTTP ${res.status} - Server error after ${retry} retries`);
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
// Download Daily ID Export
// ══════════════════════════════════════════════
async function downloadDailyExport() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yyyy = today.getFullYear();

    const filename = `tv_series_ids_${mm}_${dd}_${yyyy}.json.gz`;
    const url = `${CONFIG.EXPORT_URL}/${filename}`;
    const outputPath = join(__dirname, 'tv_series_ids.json');

    console.log(`📥 Downloading daily export: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const gunzip = createGunzip();
        const output = createWriteStream(outputPath);

        await pipeline(
            Readable.fromWeb(response.body),
            gunzip,
            output
        );

        console.log(`✅ Downloaded and extracted to: ${outputPath}`);
        return outputPath;
    } catch (e) {
        console.error(`❌ Failed to download daily export: ${e.message}`);
        throw e;
    }
}

function loadSeriesIds(filePath) {
    console.log(`📂 Loading series IDs from: ${filePath}`);

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const ids = lines.map(line => {
        try {
            const obj = JSON.parse(line);
            return obj.id;
        } catch {
            return null;
        }
    }).filter(id => id !== null);

    console.log(`✅ Loaded ${ids.length} series IDs`);
    return ids;
}

// ══════════════════════════════════════════════
// Translations with retry
// ══════════════════════════════════════════════
function extractTranslations(item) {
    const list = item.translations?.translations || [];
    const ar = list.find(t => t.iso_639_1 === 'ar');
    const en = list.find(t => t.iso_639_1 === 'en');

    let name_ar = ar?.data?.name || null;
    if (!name_ar && item.original_language === 'ar')
        name_ar = item.original_name || null;

    let name_en = en?.data?.name || null;
    if (!name_en && item.original_language === 'en')
        name_en = item.original_name || null;

    let overview_ar = ar?.data?.overview || null;
    if (overview_ar && !isArabic(overview_ar)) overview_ar = null;

    return { name_ar, name_en, overview_ar };
}

async function translateWithRetry(content, seriesId, seriesName, retry = 0) {
    try {
        const result = await translateContent(content);
        return result;
    } catch (e) {
        stats.translationErrors++;
        logError('translation', seriesId, e, { name: seriesName, retry });

        if (retry < CONFIG.MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 2000 * (retry + 1)));
            return translateWithRetry(content, seriesId, seriesName, retry + 1);
        }

        return { title_ar: null, overview_ar: null };
    }
}

// ══════════════════════════════════════════════
// Filters
// ══════════════════════════════════════════════
function shouldSkip(series) {
    if (!series.poster_path) return true;
    const genres = (series.genres || []).map(g => g.name.toLowerCase());
    if (genres.includes('documentary') || genres.includes('news') || genres.includes('talk')) return true;
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

    const existing = await pool.query('SELECT id FROM actors WHERE id = $1', [id]);
    if (existing.rows.length > 0) {
        actorCache.set(id, id);
        return id;
    }

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
        try {
            const t = await translateWithRetry({ title_en: actor.name }, id, actor.name);
            if (t.title_ar) name_ar = t.title_ar;
        } catch (_) { }
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
// Series Insert
// ══════════════════════════════════════════════
async function insertSeries(series) {
    const trans = extractTranslations(series);

    if (!trans.name_ar || !trans.overview_ar) {
        const srcName = trans.name_en || series.name;
        const srcOverview = series.overview;
        const t = await translateWithRetry(
            { title_en: srcName, overview_en: srcOverview },
            series.id,
            series.name
        );
        if (!trans.name_ar && t.title_ar) trans.name_ar = t.title_ar;
        if (!trans.overview_ar && t.overview_ar) trans.overview_ar = t.overview_ar;
    }

    const englishName = trans.name_en || (series.original_language === 'en' ? series.original_name : null) || series.name;
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

    await pool.query(`
    INSERT INTO tv_series (
      id, name, name_ar, name_original,
      overview, overview_ar,
      poster_path, backdrop_path,
      first_air_date, last_air_date,
      number_of_seasons, number_of_episodes,
      vote_average, vote_count, popularity,
      genres, original_language,
      slug, primary_genre,
      status, type,
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
      $20,$21,
      NOW(),NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name_ar = CASE WHEN tv_series.name_ar IS NULL THEN EXCLUDED.name_ar ELSE tv_series.name_ar END,
      overview_ar = CASE WHEN tv_series.overview_ar IS NULL THEN EXCLUDED.overview_ar ELSE tv_series.overview_ar END,
      number_of_seasons = COALESCE(tv_series.number_of_seasons, EXCLUDED.number_of_seasons),
      number_of_episodes = COALESCE(tv_series.number_of_episodes, EXCLUDED.number_of_episodes),
      updated_at = NOW()
    RETURNING id
  `, [
        series.id,
        series.name,
        trans.name_ar,
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
        series.status || null,
        series.type || null,
    ]);

    // Actors
    const cast = (series.credits?.cast || []).slice(0, 8);
    for (let i = 0; i < cast.length; i++) {
        const actor = cast[i];
        try {
            const actorId = await insertActor(actor);
            await pool.query(`
        INSERT INTO tv_cast (series_id, actor_id, character_name, cast_order)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (series_id, actor_id) DO NOTHING
      `, [series.id, actorId, actor.character || null, actor.order ?? i]);
        } catch (_) { }
    }

    return series.id;
}

// ══════════════════════════════════════════════
// Seasons & Episodes
// ══════════════════════════════════════════════
async function insertSeasons(seriesId, numberOfSeasons) {
    for (let seasonNum = 1; seasonNum <= numberOfSeasons; seasonNum++) {
        try {
            const season = await fetchTMDB(`/tv/${seriesId}/season/${seasonNum}`);

            // Check if season exists
            const existing = await pool.query(
                'SELECT id FROM seasons WHERE series_id=$1 AND season_number=$2',
                [seriesId, seasonNum]
            );

            let seasonId;
            if (existing.rows.length > 0) {
                seasonId = existing.rows[0].id;
            } else {
                const result = await pool.query(`
          INSERT INTO seasons (series_id, season_number, name, overview, poster_path, air_date, episode_count, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
          RETURNING id
        `, [
                    seriesId,
                    seasonNum,
                    season.name || `Season ${seasonNum}`,
                    season.overview || null,
                    season.poster_path || null,
                    season.air_date || null,
                    season.episodes?.length || 0
                ]);
                seasonId = result.rows[0].id;
            }

            stats.seasons++;

            // Insert episodes
            const episodes = season.episodes || [];
            for (const ep of episodes) {
                try {
                    await pool.query(`
            INSERT INTO episodes (season_id, episode_number, name, overview, still_path, air_date, runtime, vote_average, vote_count, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
            ON CONFLICT (season_id, episode_number) DO NOTHING
          `, [
                        seasonId,
                        ep.episode_number,
                        ep.name || `Episode ${ep.episode_number}`,
                        ep.overview || null,
                        ep.still_path || null,
                        ep.air_date || null,
                        ep.runtime || null,
                        ep.vote_average || 0,
                        ep.vote_count || 0
                    ]);
                    stats.episodes++;
                } catch (_) { }
            }
        } catch (e) {
            logError('tmdb', `${seriesId}-S${seasonNum}`, e, { type: 'season' });
        }
    }
}

// ══════════════════════════════════════════════
// Process single series
// ══════════════════════════════════════════════
async function processSeries(seriesId) {
    try {
        const existing = await pool.query('SELECT id, name_ar, overview_ar, number_of_seasons FROM tv_series WHERE id=$1', [seriesId]);
        if (existing.rows.length > 0) {
            const row = existing.rows[0];
            if (row.name_ar && row.overview_ar && row.number_of_seasons > 0) {
                stats.skipped++;
                return;
            }
        }

        const series = await fetchTMDB(`/tv/${seriesId}`, { append_to_response: 'credits,translations' });
        if (shouldSkip(series)) { stats.filtered++; return; }

        await insertSeries(series);

        // Insert seasons & episodes
        if (series.number_of_seasons > 0) {
            await insertSeasons(seriesId, series.number_of_seasons);
        }

        stats.series++;

        if (stats.series % 50 === 0) {
            console.log(`   ✅ ${stats.series} series | ${stats.seasons} seasons | ${stats.episodes} episodes`);
        }
    } catch (e) {
        stats.errors++;

        if (e.message.includes('HTTP')) {
            stats.tmdbErrors++;
            logError('tmdb', seriesId, e);
        } else if (e.message.includes('database') || e.message.includes('query')) {
            stats.dbErrors++;
            logError('database', seriesId, e);
        } else {
            logError('tmdb', seriesId, e);
        }
    }
}

// ══════════════════════════════════════════════
// Progress
// ══════════════════════════════════════════════
const progressFile = join(__dirname, 'progress-series-v2.json');

function loadProgress() {
    try { return JSON.parse(readFileSync(progressFile, 'utf-8')); }
    catch (_) { return { lastIndex: 0 }; }
}

function saveProgress(lastIndex) {
    try {
        writeFileSync(progressFile, JSON.stringify({
            lastIndex,
            lastUpdate: new Date().toISOString()
        }, null, 2));
    } catch (_) { }
}

function printStats() {
    const min = ((Date.now() - stats.start) / 60000).toFixed(1);
    console.log('\n' + '═'.repeat(50));
    console.log(`📺 Series: ${stats.series} | Seasons: ${stats.seasons} | Episodes: ${stats.episodes}`);
    console.log(`   skip:${stats.skipped} | filter:${stats.filtered}`);
    console.log(`❌ Errors: ${stats.errors} (tmdb:${stats.tmdbErrors} trans:${stats.translationErrors} db:${stats.dbErrors})`);
    console.log(`⏱ ${min} minutes`);
    console.log('═'.repeat(50) + '\n');
}

// ══════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════
async function main() {
    console.log('🚀 INGEST-SERIES-V2.js starting...\n');

    const idsFile = await downloadDailyExport();
    const allIds = loadSeriesIds(idsFile);
    const progress = loadProgress();
    const remainingIds = allIds.slice(progress.lastIndex);

    console.log(`\n📊 Total: ${allIds.length} | Processed: ${progress.lastIndex} | Remaining: ${remainingIds.length}\n`);

    const interval = setInterval(printStats, 30000);

    for (let i = 0; i < remainingIds.length; i += CONFIG.BATCH_SIZE) {
        const batch = remainingIds.slice(i, i + CONFIG.BATCH_SIZE);
        const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(remainingIds.length / CONFIG.BATCH_SIZE);

        console.log(`\n${'═'.repeat(50)}`);
        console.log(`🔄 Batch ${batchNum}/${totalBatches} (${batch.length} series)`);
        console.log('═'.repeat(50));

        const promises = batch.map(id => limiter(() => processSeries(id)));
        await Promise.all(promises);

        saveProgress(progress.lastIndex + i + batch.length);
    }

    clearInterval(interval);
    printStats();
    saveErrorLog();

    if (errorLog.critical.length > 0) {
        console.log(`\n⚠️  WARNING: ${errorLog.critical.length} critical errors detected!`);
        console.log(`   Check error-log-series.json for details\n`);
    }

    await pool.end();
    console.log('🎉 INGEST-SERIES-V2.js done!');
}

main().catch(e => { console.error('💥', e); saveErrorLog(); process.exit(1); });
