#!/usr/bin/env node
/**
 * INGEST-MOVIES-V2.js
 * سحب كل الأفلام من TMDB باستخدام Daily ID Exports
 * 
 * الميزات:
 * - يستخدم TMDB Daily ID Exports (لا حدود!)
 * - نظام شامل لتسجيل الأخطاء وإعادة المحاولة
 * - تنبيهات للأخطاء المتكررة
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
    BATCH_SIZE: 1000,
    ERROR_THRESHOLD: 10, // Alert after 10 repeated errors
};

const limiter = pLimit(CONFIG.CONCURRENCY);

// ══════════════════════════════════════════════
// Stats & Error Tracking
// ══════════════════════════════════════════════
const stats = {
    total: 0,
    skipped: 0,
    filtered: 0,
    errors: 0,
    translationErrors: 0,
    tmdbErrors: 0,
    dbErrors: 0,
    start: Date.now(),
};

const errorLog = {
    translation: new Map(), // id -> { title, error, attempts, lastAttempt }
    tmdb: new Map(),        // id -> { error, attempts, lastAttempt }
    database: new Map(),    // id -> { error, attempts, lastAttempt }
    critical: [],           // [{ id, error, type, timestamp }]
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

        // Alert on repeated failures
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
    const errorFile = join(__dirname, 'error-log-movies.json');
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
    
    // Try today first, then yesterday if today fails
    for (let daysAgo = 0; daysAgo <= 1; daysAgo++) {
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const yyyy = date.getFullYear();

        const filename = `movie_ids_${mm}_${dd}_${yyyy}.json.gz`;
        const url = `${CONFIG.EXPORT_URL}/${filename}`;
        const outputPath = join(__dirname, 'movie_ids.json');

        console.log(`📥 Downloading daily export (${daysAgo === 0 ? 'today' : 'yesterday'}): ${url}`);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (daysAgo === 0) {
                    console.log(`   ⚠️ Today's export not available yet, trying yesterday...`);
                    continue;
                }
                throw new Error(`HTTP ${response.status}`);
            }

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
            if (daysAgo === 1) {
                console.error(`❌ Failed to download daily export: ${e.message}`);
                throw e;
            }
        }
    }
}

function loadMovieIds(filePath) {
    console.log(`📂 Loading movie IDs from: ${filePath}`);

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

    console.log(`✅ Loaded ${ids.length} movie IDs`);
    return ids;
}

// ══════════════════════════════════════════════
// Translations with retry
// ══════════════════════════════════════════════
function extractTranslations(item) {
    const list = item.translations?.translations || [];
    const ar = list.find(t => t.iso_639_1 === 'ar');
    const en = list.find(t => t.iso_639_1 === 'en');

    let title_ar = ar?.data?.title || null;
    if (!title_ar && item.original_language === 'ar')
        title_ar = item.original_title || null;

    let title_en = en?.data?.title || null;
    if (!title_en && item.original_language === 'en')
        title_en = item.original_title || null;

    let overview_ar = ar?.data?.overview || null;
    if (overview_ar && !isArabic(overview_ar)) overview_ar = null;

    return { title_ar, title_en, overview_ar };
}

async function translateWithRetry(content, movieId, movieTitle, retry = 0) {
    try {
        const result = await translateContent(content);
        return result;
    } catch (e) {
        stats.translationErrors++;
        logError('translation', movieId, e, { title: movieTitle, retry });

        if (retry < CONFIG.MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 2000 * (retry + 1)));
            return translateWithRetry(content, movieId, movieTitle, retry + 1);
        }

        // Return empty on final failure
        return { title_ar: null, overview_ar: null };
    }
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
    if (!biography_ar && biography) {
        try {
            const t = await translateWithRetry({ overview_en: biography.substring(0, 500) }, id, actor.name);
            if (t.overview_ar) biography_ar = t.overview_ar;
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
// Movie Insert
// ══════════════════════════════════════════════
async function insertMovie(movie) {
    const trans = extractTranslations(movie);

    if (!trans.title_ar || !trans.overview_ar) {
        const srcTitle = trans.title_en || movie.title;
        const srcOverview = movie.overview;
        const t = await translateWithRetry(
            { title_en: srcTitle, overview_en: srcOverview },
            movie.id,
            movie.title
        );
        if (!trans.title_ar && t.title_ar) trans.title_ar = t.title_ar;
        if (!trans.overview_ar && t.overview_ar) trans.overview_ar = t.overview_ar;
    }

    const englishTitle = trans.title_en || (movie.original_language === 'en' ? movie.original_title : null) || movie.title;
    let slug = generateSlug(englishTitle);
    if (!slug || slug.length < 2) {
        slug = `movie-${movie.id}`;
    }

    // ✅ CRITICAL: Ensure slug is NEVER numeric-only
    if (/^\d+$/.test(slug)) {
        slug = `movie-${slug}`;
    }

    let finalSlug = slug;
    const taken = await pool.query('SELECT id FROM movies WHERE slug=$1 AND id!=$2', [slug, movie.id]);
    if (taken.rows.length > 0) {
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : Math.random().toString(36).slice(2, 6);
        finalSlug = `${slug}-${year}`;
        
        // ✅ CRITICAL: Check again if slug with year is numeric-only
        if (/^\d+$/.test(finalSlug)) {
            finalSlug = `movie-${finalSlug}`;
        }
        
        const taken2 = await pool.query('SELECT id FROM movies WHERE slug=$1 AND id!=$2', [finalSlug, movie.id]);
        if (taken2.rows.length > 0) {
            finalSlug = `${slug}-${Math.random().toString(36).slice(2, 8)}`;
        }
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
async function processMovie(movieId) {
    try {
        const existing = await pool.query('SELECT id, title_ar, overview_ar FROM movies WHERE id=$1', [movieId]);
        if (existing.rows.length > 0) {
            const row = existing.rows[0];
            if (row.title_ar && row.overview_ar) {
                stats.skipped++;
                return;
            }
        }

        const movie = await fetchTMDB(`/movie/${movieId}`, { append_to_response: 'credits,translations,keywords' });
        if (shouldSkip(movie)) { stats.filtered++; return; }

        await insertMovie(movie);
        stats.total++;

        if (stats.total % 100 === 0) {
            console.log(`   ✅ ${stats.total} movies (skip:${stats.skipped} filter:${stats.filtered} err:${stats.errors})`);
        }
    } catch (e) {
        stats.errors++;

        if (e.message.includes('HTTP')) {
            stats.tmdbErrors++;
            logError('tmdb', movieId, e);
        } else if (e.message.includes('database') || e.message.includes('query')) {
            stats.dbErrors++;
            logError('database', movieId, e);
        } else {
            logError('tmdb', movieId, e);
        }
    }
}

// ══════════════════════════════════════════════
// Progress
// ══════════════════════════════════════════════
const progressFile = join(__dirname, 'progress-movies-v2.json');

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
    console.log(`🎬 Movies: ${stats.total} | skip:${stats.skipped} | filter:${stats.filtered}`);
    console.log(`❌ Errors: ${stats.errors} (tmdb:${stats.tmdbErrors} trans:${stats.translationErrors} db:${stats.dbErrors})`);
    console.log(`⏱ ${min} minutes`);
    console.log('═'.repeat(50) + '\n');
}

// ══════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════
async function main() {
    console.log('🚀 INGEST-MOVIES-V2.js starting...\n');

    const idsFile = await downloadDailyExport();
    const allIds = loadMovieIds(idsFile);
    const progress = loadProgress();
    const remainingIds = allIds.slice(progress.lastIndex);

    console.log(`\n📊 Total: ${allIds.length} | Processed: ${progress.lastIndex} | Remaining: ${remainingIds.length}\n`);

    const interval = setInterval(printStats, 30000);

    for (let i = 0; i < remainingIds.length; i += CONFIG.BATCH_SIZE) {
        const batch = remainingIds.slice(i, i + CONFIG.BATCH_SIZE);
        const batchNum = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(remainingIds.length / CONFIG.BATCH_SIZE);

        console.log(`\n${'═'.repeat(50)}`);
        console.log(`🔄 Batch ${batchNum}/${totalBatches} (${batch.length} movies)`);
        console.log('═'.repeat(50));

        const promises = batch.map(id => limiter(() => processMovie(id)));
        await Promise.all(promises);

        saveProgress(progress.lastIndex + i + batch.length);
    }

    clearInterval(interval);
    printStats();
    saveErrorLog();

    if (errorLog.critical.length > 0) {
        console.log(`\n⚠️  WARNING: ${errorLog.critical.length} critical errors detected!`);
        console.log(`   Check error-log-movies.json for details\n`);
    }

    await pool.end();
    console.log('🎉 INGEST-MOVIES-V2.js done!');
}

main().catch(e => { console.error('💥', e); saveErrorLog(); process.exit(1); });
