#!/usr/bin/env node
/**
 * RETRY-FAILED-PAGES.js
 * يعيد تحميل الصفحات الفاشلة مع UPSERT (insert + update للناقص)
 * 
 * الاستخدام:
 *   node scripts/ingestion/RETRY-FAILED-PAGES.js movies
 *   node scripts/ingestion/RETRY-FAILED-PAGES.js series
 *   node scripts/ingestion/RETRY-FAILED-PAGES.js all
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { translateContent } from '../services/translation-service.js';

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

const mode = process.argv[2] || 'all';

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

function generateSlug(title, id) {
    const base = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return base ? `${base}-${id}` : `item-${id}`;
}

// ── UPSERT MOVIE ──────────────────────────────────────────────────────────
async function upsertMovie(movie) {
    if (!movie.poster_path || movie.adult) return false;

    const slug = generateSlug(movie.title, movie.id);

    // Check existing record
    const existing = await pool.query(
        'SELECT id, title_ar, overview_ar FROM movies WHERE id=$1', [movie.id]
    );

    // Try to get Arabic translation if missing
    let title_ar = null;
    let overview_ar = null;

    const needsTranslation = !existing.rows[0]?.title_ar || !existing.rows[0]?.overview_ar;
    if (needsTranslation) {
        try {
            const translated = await translateContent({
                title: movie.title,
                overview: movie.overview || '',
                original_language: movie.original_language
            });
            title_ar = translated?.title_ar || null;
            overview_ar = translated?.overview_ar || null;
        } catch (_) { /* translation optional */ }
    }

    const genres = (movie.genres || []).map(g => g.name);
    const primaryGenre = genres[0]?.toLowerCase() || null;
    const keywords = (movie.keywords?.keywords || []).map(k => k.name);

    if (existing.rows.length > 0) {
        // UPDATE - fill in missing fields only
        await pool.query(`
      UPDATE movies SET
        title = COALESCE(NULLIF(title, ''), $2),
        title_ar = COALESCE(title_ar, $3),
        title_original = COALESCE(NULLIF(title_original, ''), $4),
        overview = COALESCE(NULLIF(overview, ''), $5),
        overview_ar = COALESCE(overview_ar, $6),
        poster_path = COALESCE(NULLIF(poster_path, ''), $7),
        backdrop_path = COALESCE(backdrop_path, $8),
        vote_average = COALESCE(vote_average, $9),
        vote_count = COALESCE(vote_count, $10),
        popularity = COALESCE(popularity, $11),
        primary_genre = COALESCE(primary_genre, $12),
        genres = CASE WHEN genres IS NULL OR array_length(genres,1) IS NULL THEN $13 ELSE genres END,
        keywords = CASE WHEN keywords IS NULL OR array_length(keywords,1) IS NULL THEN $14 ELSE keywords END,
        updated_at = NOW()
      WHERE id = $1
    `, [
            movie.id, movie.title, title_ar, movie.original_title,
            movie.overview, overview_ar,
            movie.poster_path, movie.backdrop_path,
            movie.vote_average, movie.vote_count, movie.popularity,
            primaryGenre, genres, keywords
        ]);
        return 'updated';
    } else {
        // INSERT new
        await pool.query(`
      INSERT INTO movies (
        id, title, title_ar, title_original, overview, overview_ar,
        poster_path, backdrop_path, release_date, runtime,
        vote_average, vote_count, popularity, original_language,
        slug, primary_genre, genres, keywords
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (id) DO NOTHING
    `, [
            movie.id, movie.title, title_ar, movie.original_title,
            movie.overview, overview_ar,
            movie.poster_path, movie.backdrop_path,
            movie.release_date, movie.runtime,
            movie.vote_average, movie.vote_count, movie.popularity,
            movie.original_language, slug, primaryGenre, genres, keywords
        ]);
        return 'inserted';
    }
}

// ── UPSERT SERIES ─────────────────────────────────────────────────────────
async function upsertSeries(series) {
    if (!series.poster_path || series.adult) return false;

    const slug = generateSlug(series.name, series.id);

    const existing = await pool.query(
        'SELECT id, name_ar, overview_ar FROM tv_series WHERE id=$1', [series.id]
    );

    let name_ar = null;
    let overview_ar = null;

    const needsTranslation = !existing.rows[0]?.name_ar || !existing.rows[0]?.overview_ar;
    if (needsTranslation) {
        try {
            const translated = await translateContent({
                title: series.name,
                overview: series.overview || '',
                original_language: series.original_language
            });
            name_ar = translated?.title_ar || null;
            overview_ar = translated?.overview_ar || null;
        } catch (_) { /* translation optional */ }
    }

    const genres = (series.genres || []).map(g => g.name);
    const primaryGenre = genres[0]?.toLowerCase() || null;

    if (existing.rows.length > 0) {
        await pool.query(`
      UPDATE tv_series SET
        name = COALESCE(NULLIF(name, ''), $2),
        name_ar = COALESCE(name_ar, $3),
        name_original = COALESCE(NULLIF(name_original, ''), $4),
        overview = COALESCE(NULLIF(overview, ''), $5),
        overview_ar = COALESCE(overview_ar, $6),
        poster_path = COALESCE(NULLIF(poster_path, ''), $7),
        backdrop_path = COALESCE(backdrop_path, $8),
        vote_average = COALESCE(vote_average, $9),
        vote_count = COALESCE(vote_count, $10),
        popularity = COALESCE(popularity, $11),
        primary_genre = COALESCE(primary_genre, $12),
        number_of_seasons = COALESCE(number_of_seasons, $13),
        number_of_episodes = COALESCE(number_of_episodes, $14),
        updated_at = NOW()
      WHERE id = $1
    `, [
            series.id, series.name, name_ar, series.original_name,
            series.overview, overview_ar,
            series.poster_path, series.backdrop_path,
            series.vote_average, series.vote_count, series.popularity,
            primaryGenre, series.number_of_seasons || 0, series.number_of_episodes || 0
        ]);
        return 'updated';
    } else {
        await pool.query(`
      INSERT INTO tv_series (
        id, name, name_ar, name_original, overview, overview_ar,
        poster_path, backdrop_path, first_air_date,
        vote_average, vote_count, popularity, original_language,
        slug, primary_genre, genres, number_of_seasons, number_of_episodes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (id) DO NOTHING
    `, [
            series.id, series.name, name_ar, series.original_name,
            series.overview, overview_ar,
            series.poster_path, series.backdrop_path,
            series.first_air_date,
            series.vote_average, series.vote_count, series.popularity,
            series.original_language, slug, primaryGenre, genres,
            series.number_of_seasons || 0, series.number_of_episodes || 0
        ]);
        return 'inserted';
    }
}

// ── RETRY MOVIES ──────────────────────────────────────────────────────────
async function retryMoviesPages(failedFile) {
    if (!existsSync(failedFile)) { console.log('No failed-pages-movies.json found'); return; }
    const failed = JSON.parse(readFileSync(failedFile, 'utf-8'));
    const resolved = { arabic: [], foreign: [] };

    for (const section of ['arabic', 'foreign']) {
        const pages = failed[section] || [];
        if (pages.length === 0) { console.log(`✅ No failed ${section} movie pages`); continue; }
        console.log(`\n🔄 Retrying ${pages.length} failed ${section} movie pages...`);

        for (const entry of pages) {
            const { page } = entry;
            console.log(`  📄 Page ${page} (${section})`);
            try {
                const params = section === 'arabic'
                    ? { with_original_language: 'ar', sort_by: 'popularity.desc', include_adult: false, page }
                    : { without_original_language: 'ar', sort_by: 'popularity.desc', include_adult: false, page };
                const data = await fetchTMDB('/discover/movie', params);
                let inserted = 0, updated = 0;

                for (const m of (data.results || [])) {
                    try {
                        const movie = await fetchTMDB(`/movie/${m.id}`, { append_to_response: 'credits,translations,keywords' });
                        const result = await upsertMovie(movie);
                        if (result === 'inserted') inserted++;
                        else if (result === 'updated') updated++;
                        await sleep(200);
                    } catch (e) { /* skip individual errors */ }
                }

                console.log(`  ✅ Page ${page}: +${inserted} inserted, ~${updated} updated`);
                resolved[section].push(page);
            } catch (e) {
                console.error(`  ❌ Page ${page} still failing:`, e.message);
            }
        }
    }

    const updated = {
        arabic: (failed.arabic || []).filter(e => !resolved.arabic.includes(e.page)),
        foreign: (failed.foreign || []).filter(e => !resolved.foreign.includes(e.page)),
    };
    writeFileSync(failedFile, JSON.stringify(updated, null, 2));
    const remaining = updated.arabic.length + updated.foreign.length;
    console.log(`\n📊 Done. Resolved: ${resolved.arabic.length + resolved.foreign.length} | Still failing: ${remaining}`);
}

// ── RETRY SERIES ──────────────────────────────────────────────────────────
async function retrySeriesPages(failedFile) {
    if (!existsSync(failedFile)) { console.log('No failed-pages-series.json found'); return; }
    const failed = JSON.parse(readFileSync(failedFile, 'utf-8'));
    const resolved = { tvSeries: [], animation: [] };

    for (const section of ['tvSeries', 'animation']) {
        const pages = failed[section] || [];
        if (pages.length === 0) { console.log(`✅ No failed ${section} pages`); continue; }
        console.log(`\n🔄 Retrying ${pages.length} failed ${section} pages...`);

        for (const entry of pages) {
            const { page } = entry;
            console.log(`  📄 Page ${page} (${section})`);
            try {
                const params = section === 'animation'
                    ? { with_genres: 16, sort_by: 'popularity.desc', include_adult: false, page }
                    : { sort_by: 'popularity.desc', include_adult: false, page };
                const data = await fetchTMDB('/discover/tv', params);
                let inserted = 0, updated = 0;

                for (const s of (data.results || [])) {
                    try {
                        const series = await fetchTMDB(`/tv/${s.id}`, { append_to_response: 'credits,translations,keywords' });
                        const result = await upsertSeries(series);
                        if (result === 'inserted') inserted++;
                        else if (result === 'updated') updated++;
                        await sleep(200);
                    } catch (e) { /* skip individual errors */ }
                }

                console.log(`  ✅ Page ${page}: +${inserted} inserted, ~${updated} updated`);
                resolved[section].push(page);
            } catch (e) {
                console.error(`  ❌ Page ${page} still failing:`, e.message);
            }
        }
    }

    const updated = {
        tvSeries: (failed.tvSeries || []).filter(e => !resolved.tvSeries.includes(e.page)),
        animation: (failed.animation || []).filter(e => !resolved.animation.includes(e.page)),
    };
    writeFileSync(failedFile, JSON.stringify(updated, null, 2));
    const remaining = updated.tvSeries.length + updated.animation.length;
    console.log(`\n📊 Done. Resolved: ${resolved.tvSeries.length + resolved.animation.length} | Still failing: ${remaining}`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
    console.log(`🔄 RETRY-FAILED-PAGES.js - mode: ${mode}\n`);
    if (mode === 'movies' || mode === 'all') {
        await retryMoviesPages(join(__dirname, 'failed-pages-movies.json'));
    }
    if (mode === 'series' || mode === 'all') {
        await retrySeriesPages(join(__dirname, 'failed-pages-series.json'));
    }
    await pool.end();
    console.log('\n✅ Retry complete!');
}

main().catch(e => { console.error(e); process.exit(1); });
