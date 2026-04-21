#!/usr/bin/env node
/**
 * FIND-MISSING-PAGES.js
 * يكتشف الصفحات الفاشلة من الماضي عن طريق مقارنة TMDB بالـ DB
 * 
 * الاستخدام:
 *   node scripts/ingestion/FIND-MISSING-PAGES.js movies
 *   node scripts/ingestion/FIND-MISSING-PAGES.js series
 * 
 * النتيجة: يكتب الصفحات الناقصة في failed-pages-*.json
 * ثم تشغل: node scripts/ingestion/RETRY-FAILED-PAGES.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rawUrl = (process.env.COCKROACHDB_URL || '').replace(/^["']|["']$/g, '').trim();
const pool = new Pool({ connectionString: rawUrl, ssl: { rejectUnauthorized: false } });

const CONFIG = {
    TMDB_KEY: process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY,
    TMDB_URL: 'https://api.themoviedb.org/3',
};

const mode = process.argv[2] || 'movies';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
        if (retry < 3) { await sleep(2000 * (retry + 1)); return fetchTMDB(endpoint, params, retry + 1); }
        throw e;
    }
}

async function findMissingMoviePages() {
    const progressFile = join(__dirname, 'progress-movies.json');
    const progress = existsSync(progressFile) ? JSON.parse(readFileSync(progressFile, 'utf-8')) : { arabic: 0, foreign: 0 };

    const failedFile = join(__dirname, 'failed-pages-movies.json');
    const existing = existsSync(failedFile) ? JSON.parse(readFileSync(failedFile, 'utf-8')) : { arabic: [], foreign: [] };

    console.log(`📊 Progress: arabic=${progress.arabic}, foreign=${progress.foreign}`);
    console.log(`🔍 Scanning pages 1-${progress.arabic} for arabic, 1-${progress.foreign} for foreign...\n`);

    // Get all movie IDs from DB
    console.log('📥 Loading all movie IDs from DB...');
    const dbResult = await pool.query('SELECT id FROM movies');
    const dbIds = new Set(dbResult.rows.map(r => String(r.id)));
    console.log(`✅ DB has ${dbIds.size} movies\n`);

    const missingPages = { arabic: [...existing.arabic], foreign: [...existing.foreign] };
    const existingArabicPages = new Set(existing.arabic.map(e => e.page));
    const existingForeignPages = new Set(existing.foreign.map(e => e.page));

    // Scan arabic pages
    console.log('🎬 Scanning Arabic movie pages...');
    for (let p = 1; p <= progress.arabic; p++) {
        if (existingArabicPages.has(p)) continue; // already marked as failed
        try {
            const data = await fetchTMDB('/discover/movie', { with_original_language: 'ar', sort_by: 'popularity.desc', include_adult: false, page: p });
            const ids = (data.results || []).map(m => String(m.id));
            const missing = ids.filter(id => !dbIds.has(id));

            if (missing.length > 3) { // More than 3 missing = page likely failed
                console.log(`  ⚠️  Page ${p}: ${missing.length}/${ids.length} movies missing from DB`);
                missingPages.arabic.push({ page: p, reason: `${missing.length} movies missing`, time: new Date().toISOString() });
                existingArabicPages.add(p);
            } else if (p % 50 === 0) {
                console.log(`  ✅ Page ${p}: OK (${missing.length} missing)`);
            }
            await sleep(250); // Rate limit friendly
        } catch (e) {
            console.error(`  ❌ Page ${p}: ${e.message}`);
            missingPages.arabic.push({ page: p, reason: e.message, time: new Date().toISOString() });
            existingArabicPages.add(p);
        }
    }

    // Scan foreign pages
    console.log('\n🌍 Scanning Foreign movie pages...');
    for (let p = 1; p <= progress.foreign; p++) {
        if (existingForeignPages.has(p)) continue;
        try {
            const data = await fetchTMDB('/discover/movie', { without_original_language: 'ar', sort_by: 'popularity.desc', include_adult: false, page: p });
            const ids = (data.results || []).map(m => String(m.id));
            const missing = ids.filter(id => !dbIds.has(id));

            if (missing.length > 3) {
                console.log(`  ⚠️  Page ${p}: ${missing.length}/${ids.length} movies missing from DB`);
                missingPages.foreign.push({ page: p, reason: `${missing.length} movies missing`, time: new Date().toISOString() });
                existingForeignPages.add(p);
            } else if (p % 50 === 0) {
                console.log(`  ✅ Page ${p}: OK (${missing.length} missing)`);
            }
            await sleep(250);
        } catch (e) {
            console.error(`  ❌ Page ${p}: ${e.message}`);
            missingPages.foreign.push({ page: p, reason: e.message, time: new Date().toISOString() });
            existingForeignPages.add(p);
        }
    }

    writeFileSync(failedFile, JSON.stringify(missingPages, null, 2));
    console.log(`\n📋 Results saved to failed-pages-movies.json`);
    console.log(`   Arabic missing pages: ${missingPages.arabic.length}`);
    console.log(`   Foreign missing pages: ${missingPages.foreign.length}`);
    console.log(`\n▶️  Run: node scripts/ingestion/RETRY-FAILED-PAGES.js movies`);
}

async function findMissingSeriesPages() {
    const progressFile = join(__dirname, 'progress-series.json');
    const progress = existsSync(progressFile) ? JSON.parse(readFileSync(progressFile, 'utf-8')) : { tvSeries: 0, animation: 0 };

    const failedFile = join(__dirname, 'failed-pages-series.json');
    const existing = existsSync(failedFile) ? JSON.parse(readFileSync(failedFile, 'utf-8')) : { tvSeries: [], animation: [] };

    console.log(`📊 Progress: tvSeries=${progress.tvSeries}, animation=${progress.animation}`);

    // Get all series IDs from DB
    console.log('📥 Loading all series IDs from DB...');
    const dbResult = await pool.query('SELECT id FROM tv_series');
    const dbIds = new Set(dbResult.rows.map(r => String(r.id)));
    console.log(`✅ DB has ${dbIds.size} series\n`);

    const missingPages = { tvSeries: [...existing.tvSeries], animation: [...existing.animation] };
    const existingTVPages = new Set(existing.tvSeries.map(e => e.page));
    const existingAnimPages = new Set(existing.animation.map(e => e.page));

    console.log('📺 Scanning TV Series pages...');
    for (let p = 1; p <= progress.tvSeries; p++) {
        if (existingTVPages.has(p)) continue;
        try {
            const data = await fetchTMDB('/discover/tv', { sort_by: 'popularity.desc', include_adult: false, page: p });
            const ids = (data.results || []).map(s => String(s.id));
            const missing = ids.filter(id => !dbIds.has(id));

            if (missing.length > 3) {
                console.log(`  ⚠️  Page ${p}: ${missing.length}/${ids.length} series missing`);
                missingPages.tvSeries.push({ page: p, reason: `${missing.length} series missing`, time: new Date().toISOString() });
                existingTVPages.add(p);
            } else if (p % 20 === 0) {
                console.log(`  ✅ Page ${p}: OK`);
            }
            await sleep(250);
        } catch (e) {
            console.error(`  ❌ Page ${p}: ${e.message}`);
            missingPages.tvSeries.push({ page: p, reason: e.message, time: new Date().toISOString() });
            existingTVPages.add(p);
        }
    }

    console.log('\n🎨 Scanning Animation pages...');
    for (let p = 1; p <= progress.animation; p++) {
        if (existingAnimPages.has(p)) continue;
        try {
            const data = await fetchTMDB('/discover/tv', { with_genres: 16, sort_by: 'popularity.desc', include_adult: false, page: p });
            const ids = (data.results || []).map(s => String(s.id));
            const missing = ids.filter(id => !dbIds.has(id));

            if (missing.length > 3) {
                console.log(`  ⚠️  Page ${p}: ${missing.length}/${ids.length} series missing`);
                missingPages.animation.push({ page: p, reason: `${missing.length} series missing`, time: new Date().toISOString() });
                existingAnimPages.add(p);
            } else if (p % 20 === 0) {
                console.log(`  ✅ Page ${p}: OK`);
            }
            await sleep(250);
        } catch (e) {
            console.error(`  ❌ Page ${p}: ${e.message}`);
            missingPages.animation.push({ page: p, reason: e.message, time: new Date().toISOString() });
            existingAnimPages.add(p);
        }
    }

    writeFileSync(failedFile, JSON.stringify(missingPages, null, 2));
    console.log(`\n📋 Results saved to failed-pages-series.json`);
    console.log(`   TV Series missing pages: ${missingPages.tvSeries.length}`);
    console.log(`   Animation missing pages: ${missingPages.animation.length}`);
    console.log(`\n▶️  Run: node scripts/ingestion/RETRY-FAILED-PAGES.js series`);
}

async function main() {
    console.log(`🔍 FIND-MISSING-PAGES.js - mode: ${mode}\n`);
    if (mode === 'movies') await findMissingMoviePages();
    else if (mode === 'series') await findMissingSeriesPages();
    else { await findMissingMoviePages(); await findMissingSeriesPages(); }
    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
