/**
 * Home Page API - Mixed Movies + TV Series (60% movies, 40% tv)
 */

import express from 'express';
import NodeCache from 'node-cache';
import pool from '../../src/db/pool.js';

const router = express.Router();

const cache = new NodeCache({ stdTTL: 300 });
const FALLBACK_IMAGE = 'https://via.placeholder.com/500x750?text=No+Image';

const BASE_FIELDS_MOVIES = `
  id, slug, title, title_ar, title_original as original_title,
  poster_path, backdrop_path, vote_average, release_date,
  overview, overview_ar, original_language, primary_genre,
  'movie' as content_type
`;

const BASE_FIELDS_TV = `
  id, slug, name as title, name_ar as title_ar, name_original as original_title,
  poster_path, backdrop_path, vote_average, first_air_date as release_date,
  overview, overview_ar, original_language, primary_genre,
  'tv' as content_type
`;

const BASE_WHERE = `slug IS NOT NULL AND slug != '' AND slug != 'content'`;

function mapRow(row) {
  // Add TMDB image URLs
  const poster_url = row.poster_path
    ? `https://image.tmdb.org/t/p/w500${row.poster_path}`
    : FALLBACK_IMAGE;

  const backdrop_url = row.backdrop_path
    ? `https://image.tmdb.org/t/p/original${row.backdrop_path}`
    : (poster_url || FALLBACK_IMAGE);

  return {
    ...row,
    poster_url,
    backdrop_url
  };
}

// Interleave movies and tv: for every 3 movies, add 2 tv
function interleave(movies, tv) {
  const result = [];
  let mi = 0, ti = 0;
  while (mi < movies.length || ti < tv.length) {
    // 3 movies
    for (let i = 0; i < 3 && mi < movies.length; i++, mi++) result.push(movies[mi]);
    // 2 tv
    for (let i = 0; i < 2 && ti < tv.length; i++, ti++) result.push(tv[ti]);
  }
  return result;
}

async function fetchHomeData() {
  const movieLimit = 12;
  const tvLimit = 8;

  const [latestMovies, latestTv, topMovies, topTv, popularMovies, popularTv] = await Promise.all([
    pool.query(`SELECT ${BASE_FIELDS_MOVIES} FROM movies WHERE ${BASE_WHERE} AND release_date IS NOT NULL ORDER BY release_date DESC LIMIT $1`, [movieLimit]),
    pool.query(`SELECT ${BASE_FIELDS_TV} FROM tv_series WHERE ${BASE_WHERE} AND first_air_date IS NOT NULL ORDER BY first_air_date DESC LIMIT $1`, [tvLimit]),
    pool.query(`SELECT ${BASE_FIELDS_MOVIES} FROM movies WHERE ${BASE_WHERE} ORDER BY vote_average DESC LIMIT $1`, [movieLimit]),
    pool.query(`SELECT ${BASE_FIELDS_TV} FROM tv_series WHERE ${BASE_WHERE} ORDER BY vote_average DESC LIMIT $1`, [tvLimit]),
    pool.query(`SELECT ${BASE_FIELDS_MOVIES} FROM movies WHERE ${BASE_WHERE} ORDER BY popularity DESC LIMIT $1`, [movieLimit]),
    pool.query(`SELECT ${BASE_FIELDS_TV} FROM tv_series WHERE ${BASE_WHERE} ORDER BY popularity DESC LIMIT $1`, [tvLimit]),
  ]);

  const latest = interleave(latestMovies.rows.map(mapRow), latestTv.rows.map(mapRow));
  const latestIds = new Set(latest.map(r => r.id));

  // Exclude IDs already in latest
  const topRatedFiltered = interleave(
    topMovies.rows.filter(r => !latestIds.has(r.id)).map(mapRow),
    topTv.rows.filter(r => !latestIds.has(r.id)).map(mapRow)
  );
  const topRatedIds = new Set([...latestIds, ...topRatedFiltered.map(r => r.id)]);

  // Exclude IDs already in latest + topRated
  const popularFiltered = interleave(
    popularMovies.rows.filter(r => !topRatedIds.has(r.id)).map(mapRow),
    popularTv.rows.filter(r => !topRatedIds.has(r.id)).map(mapRow)
  );

  return {
    latest,
    topRated: topRatedFiltered,
    popular: popularFiltered,
    meta: { cached: false }
  };
}

router.get('/home', async (req, res) => {
  const startTime = Date.now();
  const cached = cache.get('home:aggregated');
  if (cached) {
    return res.json({ ...cached, _cache: { hit: true, responseTime: Date.now() - startTime } });
  }

  try {
    const data = await fetchHomeData();
    cache.set('home:aggregated', data);
    res.json({ ...data, _cache: { hit: false, responseTime: Date.now() - startTime } });
  } catch (error) {
    console.error('[Home API] Error:', error);
    res.status(500).json({ error: 'Failed to fetch home content' });
  }
});

export default router;

// Warm cache on startup
async function warmCache() {
  try {
    const data = await fetchHomeData();
    cache.set('home:aggregated', data);
  } catch { /* silent */ }
}

warmCache();
setInterval(warmCache, 4 * 60 * 1000);
