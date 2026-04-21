#!/usr/bin/env node
/**
 * RETRY-FAILED-ITEMS.js
 * إعادة محاولة معالجة العناصر الفاشلة من error logs
 * 
 * الميزات:
 * - يقرأ error-log-movies.json و error-log-series.json
 * - يحاول معالجة كل عنصر فاشل
 * - يحذف العناصر الناجحة من القائمة
 * - يحدّث ملف الأخطاء بالعناصر المتبقية
 * - يعرض تقرير نهائي
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
    MAX_RETRIES: 3,
    CONCURRENCY: 20, // أقل من السكريبت الأساسي
};

const limiter = pLimit(CONFIG.CONCURRENCY);

// ══════════════════════════════════════════════
// Stats
// ══════════════════════════════════════════════
const stats = {
    movies: { total: 0, success: 0, failed: 0 },
    series: { total: 0, success: 0, failed: 0 },
    start: Date.now(),
};

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

        if (res.status === 400 || res.status === 404) {
            throw new Error(`HTTP ${res.status} - Not found or bad request`);
        }

        if (res.status >= 500) {
            if (retry < CONFIG.MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 1000 * (retry + 1)));
                return fetchTMDB(endpoint, params, retry + 1);
            }
            throw new Error(`HTTP ${res.status} - Server error`);
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
// Translation Retry
// ══════════════════════════════════════════════
function extractTranslations(item, type = 'movie') {
    const list = item.translations?.translations || [];
    const ar = list.find(t => t.iso_639_1 === 'ar');
    const en = list.find(t => t.iso_639_1 === 'en');

    if (type === 'movie') {
        let title_ar = ar?.data?.title || null;
        if (!title_ar && item.original_language === 'ar')
            title_ar = item.original_title || null;

        let title_en = en?.data?.title || null;
        if (!title_en && item.original_language === 'en')
            title_en = item.original_title || null;

        let overview_ar = ar?.data?.overview || null;
        if (overview_ar && !isArabic(overview_ar)) overview_ar = null;

        return { title_ar, title_en, overview_ar };
    } else {
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
}

async function translateWithRetry(content, retry = 0) {
    try {
        return await translateContent(content);
    } catch (e) {
        if (retry < CONFIG.MAX_RETRIES) {
            await new Promise(r => setTimeout(r, 2000 * (retry + 1)));
            return translateWithRetry(content, retry + 1);
        }
        throw e;
    }
}

// ══════════════════════════════════════════════
// Retry Translation Errors
// ══════════════════════════════════════════════
async function retryTranslationError(error, type) {
    const id = error.id;

    try {
        // Fetch item from TMDB
        const endpoint = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;
        const item = await fetchTMDB(endpoint, { append_to_response: 'translations' });

        // Extract translations
        const trans = extractTranslations(item, type);

        // Try to translate if missing
        if (type === 'movie') {
            if (!trans.title_ar || !trans.overview_ar) {
                const srcTitle = trans.title_en || item.title;
                const srcOverview = item.overview;
                const t = await translateWithRetry({
                    title_en: srcTitle,
                    overview_en: srcOverview
                });
                if (!trans.title_ar && t.title_ar) trans.title_ar = t.title_ar;
                if (!trans.overview_ar && t.overview_ar) trans.overview_ar = t.overview_ar;
            }

            // Update database
            await pool.query(`
        UPDATE movies 
        SET title_ar = COALESCE(title_ar, $1),
            overview_ar = COALESCE(overview_ar, $2),
            updated_at = NOW()
        WHERE id = $3
      `, [trans.title_ar, trans.overview_ar, id]);
        } else {
            if (!trans.name_ar || !trans.overview_ar) {
                const srcName = trans.name_en || item.name;
                const srcOverview = item.overview;
                const t = await translateWithRetry({
                    title_en: srcName,
                    overview_en: srcOverview
                });
                if (!trans.name_ar && t.title_ar) trans.name_ar = t.title_ar;
                if (!trans.overview_ar && t.overview_ar) trans.overview_ar = t.overview_ar;
            }

            // Update database
            await pool.query(`
        UPDATE tv_series 
        SET name_ar = COALESCE(name_ar, $1),
            overview_ar = COALESCE(overview_ar, $2),
            updated_at = NOW()
        WHERE id = $3
      `, [trans.name_ar, trans.overview_ar, id]);
        }

        return true;
    } catch (e) {
        console.error(`   ❌ Failed to retry ${type} ${id}: ${e.message}`);
        return false;
    }
}

// ══════════════════════════════════════════════
// Retry TMDB Errors
// ══════════════════════════════════════════════
async function retryTMDBError(error, type) {
    const id = error.id;

    try {
        // Try to fetch again
        const endpoint = type === 'movie' ? `/movie/${id}` : `/tv/${id}`;
        const item = await fetchTMDB(endpoint, { append_to_response: 'credits,translations,keywords' });

        // Check if exists in DB
        const table = type === 'movie' ? 'movies' : 'tv_series';
        const existing = await pool.query(`SELECT id FROM ${table} WHERE id=$1`, [id]);

        if (existing.rows.length === 0) {
            // Item doesn't exist - need full insert
            // This would require importing the full insert logic
            // For now, just mark as success if we can fetch it
            console.log(`   ℹ️  ${type} ${id} needs full insert - skipping for now`);
            return false;
        }

        // Item exists - just update what we can
        const trans = extractTranslations(item, type);

        if (type === 'movie') {
            await pool.query(`
        UPDATE movies 
        SET title_ar = COALESCE(title_ar, $1),
            overview_ar = COALESCE(overview_ar, $2),
            vote_average = COALESCE(vote_average, $3),
            vote_count = COALESCE(vote_count, $4),
            updated_at = NOW()
        WHERE id = $5
      `, [trans.title_ar, trans.overview_ar, item.vote_average, item.vote_count, id]);
        } else {
            await pool.query(`
        UPDATE tv_series 
        SET name_ar = COALESCE(name_ar, $1),
            overview_ar = COALESCE(overview_ar, $2),
            vote_average = COALESCE(vote_average, $3),
            vote_count = COALESCE(vote_count, $4),
            updated_at = NOW()
        WHERE id = $5
      `, [trans.name_ar, trans.overview_ar, item.vote_average, item.vote_count, id]);
        }

        return true;
    } catch (e) {
        // If 404, item doesn't exist in TMDB - can remove from errors
        if (e.message.includes('404')) {
            console.log(`   ℹ️  ${type} ${id} not found in TMDB - removing from errors`);
            return true;
        }
        console.error(`   ❌ Failed to retry ${type} ${id}: ${e.message}`);
        return false;
    }
}

// ══════════════════════════════════════════════
// Retry Database Errors
// ══════════════════════════════════════════════
async function retryDatabaseError(error, type) {
    const id = error.id;

    try {
        // Check if item now exists
        const table = type === 'movie' ? 'movies' : 'tv_series';
        const existing = await pool.query(`SELECT id FROM ${table} WHERE id=$1`, [id]);

        if (existing.rows.length > 0) {
            // Item exists now - error resolved
            return true;
        }

        // Item still doesn't exist - try to insert
        // This would require full insert logic
        console.log(`   ℹ️  ${type} ${id} needs full insert - skipping for now`);
        return false;
    } catch (e) {
        console.error(`   ❌ Failed to retry ${type} ${id}: ${e.message}`);
        return false;
    }
}

// ══════════════════════════════════════════════
// Process Error Log
// ══════════════════════════════════════════════
async function processErrorLog(logFile, type) {
    if (!existsSync(logFile)) {
        console.log(`   ℹ️  No error log found: ${logFile}`);
        return;
    }

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🔄 Processing ${type} errors from: ${logFile}`);
    console.log('═'.repeat(50));

    const log = JSON.parse(readFileSync(logFile, 'utf-8'));
    const errors = log.errors || {};

    const stillFailing = {
        translation: [],
        tmdb: [],
        database: [],
        critical: []
    };

    // Process translation errors
    if (errors.translation && errors.translation.length > 0) {
        console.log(`\n📝 Retrying ${errors.translation.length} translation errors...`);
        stats[type].total += errors.translation.length;

        const promises = errors.translation.map(error =>
            limiter(async () => {
                const success = await retryTranslationError(error, type);
                if (success) {
                    stats[type].success++;
                    console.log(`   ✅ ${type} ${error.id} - translation fixed`);
                } else {
                    stats[type].failed++;
                    stillFailing.translation.push(error);
                }
            })
        );
        await Promise.all(promises);
    }

    // Process TMDB errors
    if (errors.tmdb && errors.tmdb.length > 0) {
        console.log(`\n🌐 Retrying ${errors.tmdb.length} TMDB errors...`);
        stats[type].total += errors.tmdb.length;

        const promises = errors.tmdb.map(error =>
            limiter(async () => {
                const success = await retryTMDBError(error, type);
                if (success) {
                    stats[type].success++;
                    console.log(`   ✅ ${type} ${error.id} - TMDB error fixed`);
                } else {
                    stats[type].failed++;
                    stillFailing.tmdb.push(error);
                }
            })
        );
        await Promise.all(promises);
    }

    // Process database errors
    if (errors.database && errors.database.length > 0) {
        console.log(`\n💾 Retrying ${errors.database.length} database errors...`);
        stats[type].total += errors.database.length;

        const promises = errors.database.map(error =>
            limiter(async () => {
                const success = await retryDatabaseError(error, type);
                if (success) {
                    stats[type].success++;
                    console.log(`   ✅ ${type} ${error.id} - database error fixed`);
                } else {
                    stats[type].failed++;
                    stillFailing.database.push(error);
                }
            })
        );
        await Promise.all(promises);
    }

    // Update error log with remaining errors
    const updatedLog = {
        summary: {
            total: stillFailing.translation.length + stillFailing.tmdb.length + stillFailing.database.length,
            translation: stillFailing.translation.length,
            tmdb: stillFailing.tmdb.length,
            database: stillFailing.database.length,
            critical: stillFailing.critical.length
        },
        errors: stillFailing,
        lastRetry: new Date().toISOString(),
        previousTotal: log.summary?.total || 0
    };

    writeFileSync(logFile, JSON.stringify(updatedLog, null, 2));
    console.log(`\n📝 Updated error log: ${logFile}`);
    console.log(`   Before: ${log.summary?.total || 0} errors`);
    console.log(`   After: ${updatedLog.summary.total} errors`);
    console.log(`   Fixed: ${stats[type].success} ✅`);
}

// ══════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════
async function main() {
    console.log('🚀 RETRY-FAILED-ITEMS.js starting...\n');

    const moviesLog = join(__dirname, 'error-log-movies.json');
    const seriesLog = join(__dirname, 'error-log-series.json');

    // Process movies
    await processErrorLog(moviesLog, 'movies');

    // Process series
    await processErrorLog(seriesLog, 'series');

    // Final stats
    const elapsed = ((Date.now() - stats.start) / 60000).toFixed(1);
    console.log('\n' + '═'.repeat(50));
    console.log('📊 FINAL STATS');
    console.log('═'.repeat(50));
    console.log(`🎬 Movies: ${stats.movies.success}/${stats.movies.total} fixed`);
    console.log(`📺 Series: ${stats.series.success}/${stats.series.total} fixed`);
    console.log(`⏱  Time: ${elapsed} minutes`);
    console.log('═'.repeat(50) + '\n');

    await pool.end();
    console.log('🎉 RETRY-FAILED-ITEMS.js done!');
}

main().catch(e => {
    console.error('💥', e);
    process.exit(1);
});
