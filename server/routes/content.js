/**
 * Content API Routes - Cinema.online (Schema-Compatible Version)
 * 
 * Compatible with NEW Schema (01_create_content_tables.sql)
 * - No is_published column
 * - No tmdb_id column (uses id directly)
 * - No views_count column
 * - Column names: title, title_ar, title_original (not title_en)
 * 
 * Database: CockroachDB ONLY
 */

import express from 'express';
import NodeCache from 'node-cache';
import pool from '../../src/db/pool.js';

const router = express.Router();

// In-Memory Caching - 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

// Broken Image Placeholder
const FALLBACK_IMAGE = 'https://via.placeholder.com/500x750?text=No+Image';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Helper: Build full image URL
 */
function buildImageUrl(path, size = 'w500') {
    if (!path) return FALLBACK_IMAGE;
    if (path.startsWith('http')) return path;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Helper: Truncate overview for lists
 */
function truncateOverview(text, maxLength = 150) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

/**
 * GET /api/movies - List movies with filters
 */
router.get('/movies', async (req, res) => {
    const startTime = Date.now();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const genre = req.query.genre;
    const language = req.query.language;
    const yearFrom = req.query.yearFrom ? parseInt(req.query.yearFrom) : null;
    const yearTo = req.query.yearTo ? parseInt(req.query.yearTo) : null;
    const ratingFrom = req.query.ratingFrom ? parseFloat(req.query.ratingFrom) : null;
    const ratingTo = req.query.ratingTo ? parseFloat(req.query.ratingTo) : null;
    const sortBy = req.query.sortBy || 'popularity';

    const cacheKey = `movies:${page}:${limit}:${genre || 'all'}:${language || 'all'}:${yearFrom || 'all'}:${yearTo || 'all'}:${ratingFrom || 'all'}:${ratingTo || 'all'}:${sortBy}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        return res.json({ ...cached, _cache: { hit: true, responseTime: Date.now() - startTime } });
    }

    let query = `
    SELECT id, slug, title, title_ar, title_original, poster_path, backdrop_path,
           vote_average, release_date, popularity, original_language, overview, primary_genre
    FROM movies
    WHERE slug IS NOT NULL AND slug != $1 AND slug != $2
  `;

    const params = ['', 'content'];
    let paramIndex = 3;

    if (genre) {
        query += ` AND primary_genre = $${paramIndex}`;
        params.push(genre.toLowerCase());
        paramIndex++;
    }

    if (yearFrom) {
        query += ` AND EXTRACT(YEAR FROM release_date) >= $${paramIndex}`;
        params.push(yearFrom);
        paramIndex++;
    }

    if (yearTo) {
        query += ` AND EXTRACT(YEAR FROM release_date) <= $${paramIndex}`;
        params.push(yearTo);
        paramIndex++;
    }

    if (ratingFrom !== null) {
        query += ` AND vote_average >= $${paramIndex}`;
        params.push(ratingFrom);
        paramIndex++;
    }

    if (ratingTo !== null) {
        query += ` AND vote_average <= $${paramIndex}`;
        params.push(ratingTo);
        paramIndex++;
    }

    if (language) {
        query += ` AND original_language = $${paramIndex}`;
        params.push(language);
        paramIndex++;
    }

    const sortColumn = sortBy === 'vote_average' ? 'vote_average' :
        sortBy === 'release_date' ? 'release_date' : 'popularity';
    query += ` ORDER BY ${sortColumn} DESC NULLS LAST`;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    try {
        const result = await pool.query(query, params);

        const data = result.rows.map(row => ({
            id: row.id,
            tmdb_id: row.id, // For backward compatibility
            slug: row.slug,
            title: row.title,
            title_ar: row.title_ar,
            title_en: row.title, // For backward compatibility
            original_title: row.title_original,
            poster_path: row.poster_path,
            poster_url: buildImageUrl(row.poster_path),
            backdrop_path: row.backdrop_path,
            backdrop_url: buildImageUrl(row.backdrop_path, 'w1280'),
            vote_average: row.vote_average,
            release_date: row.release_date,
            popularity: row.popularity,
            original_language: row.original_language,
            overview: truncateOverview(row.overview),
            primary_genre: row.primary_genre,
            media_type: 'movie' // CRITICAL: Always set media_type for movies
        }));

        let countQuery = "SELECT COUNT(*) FROM movies WHERE slug IS NOT NULL AND slug != $1 AND slug != $2";
        const countParams = ['', 'content'];
        let countParamIndex = 3;

        if (genre) {
            countQuery += ` AND primary_genre = $${countParamIndex}`;
            countParams.push(genre.toLowerCase());
            countParamIndex++;
        }

        if (yearFrom) {
            countQuery += ` AND EXTRACT(YEAR FROM release_date) >= $${countParamIndex}`;
            countParams.push(yearFrom);
            countParamIndex++;
        }

        if (yearTo) {
            countQuery += ` AND EXTRACT(YEAR FROM release_date) <= $${countParamIndex}`;
            countParams.push(yearTo);
            countParamIndex++;
        }

        if (ratingFrom !== null) {
            countQuery += ` AND vote_average >= $${countParamIndex}`;
            countParams.push(ratingFrom);
            countParamIndex++;
        }

        if (ratingTo !== null) {
            countQuery += ` AND vote_average <= $${countParamIndex}`;
            countParams.push(ratingTo);
            countParamIndex++;
        }

        if (language) {
            countQuery += ` AND original_language = $${countParamIndex}`;
            countParams.push(language);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        const response = {
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            _cache: { hit: false, responseTime: Date.now() - startTime }
        };

        cache.set(cacheKey, response);
        res.json(response);
    } catch (error) {
        console.error('[Movies API] Error:', error);
        res.status(500).json({ error: 'Failed to fetch movies', details: error.message });
    }
});

/**
 * GET /api/movies/:slug - Movie details
 */
router.get('/movies/:slug', async (req, res) => {
    const { slug } = req.params;
    const cacheKey = `movie:${slug}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        const query = `
      SELECT id, slug, title, title_ar, title_original, 
             poster_path, backdrop_path,
             vote_average, vote_count, release_date, runtime, popularity, 
             original_language, overview, overview_ar,
             primary_genre, genres, 
             created_at, updated_at
      FROM movies 
      WHERE slug = $1
    `;
        const result = await pool.query(query, [slug]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        const movie = result.rows[0];

        // Convert genres array to objects format expected by frontend
        const genresArray = movie.genres || [];
        const genresObjects = genresArray.map((genreName, index) => ({
            id: index + 1,
            name: genreName
        }));

        const response = {
            id: movie.id,
            tmdb_id: movie.id, // For backward compatibility
            slug: movie.slug,
            title: movie.title,
            title_ar: movie.title_ar,
            title_en: movie.title, // For backward compatibility
            original_title: movie.title_original,
            poster_path: movie.poster_path,
            poster_url: buildImageUrl(movie.poster_path),
            backdrop_path: movie.backdrop_path,
            backdrop_url: buildImageUrl(movie.backdrop_path, 'w1280'),
            vote_average: movie.vote_average ? parseFloat(movie.vote_average) : null, // Convert to number
            vote_count: movie.vote_count ? parseInt(movie.vote_count) : null, // Convert to number
            release_date: movie.release_date,
            runtime: movie.runtime,
            popularity: movie.popularity,
            original_language: movie.original_language,
            overview: movie.overview,
            overview_ar: movie.overview_ar,
            primary_genre: movie.primary_genre,
            genres: genresObjects, // Convert to objects format
            media_type: 'movie', // CRITICAL: Always set media_type for movies
            created_at: movie.created_at,
            updated_at: movie.updated_at
        };

        cache.set(cacheKey, response);
        res.json(response);
    } catch (error) {
        console.error('[Movie Details] Error:', error);
        res.status(500).json({ error: 'Failed to fetch movie', details: error.message });
    }
});

/**
 * GET /api/movies/:slug/cast - Movie cast
 */
router.get('/movies/:slug/cast', async (req, res) => {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 12;

    try {
        const movieQuery = "SELECT id FROM movies WHERE slug = $1";
        const movieResult = await pool.query(movieQuery, [slug]);

        if (movieResult.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        const movieId = movieResult.rows[0].id;

        const query = `
      SELECT a.id, a.slug, a.name, a.name_ar, a.profile_path,
             mc.character_name, mc.cast_order
      FROM movie_cast mc
      JOIN actors a ON mc.actor_id = a.id
      WHERE mc.movie_id = $1
      ORDER BY mc.cast_order ASC
      LIMIT $2
    `;

        const result = await pool.query(query, [movieId, limit]);

        const data = result.rows.map(row => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            name_ar: row.name_ar,
            profile_path: row.profile_path,
            profile_url: buildImageUrl(row.profile_path, 'w185'),
            character_name: row.character_name
        }));

        res.json({ data });
    } catch (error) {
        console.error('[Movie Cast] Error:', error);
        res.status(500).json({ error: 'Failed to fetch cast' });
    }
});

/**
 * GET /api/movies/:slug/crew - Movie crew
 */
router.get('/movies/:slug/crew', async (req, res) => {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const movieQuery = "SELECT id FROM movies WHERE slug = $1";
        const movieResult = await pool.query(movieQuery, [slug]);

        if (movieResult.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        const movieId = movieResult.rows[0].id;

        const query = `
      SELECT a.id, a.name, mc.job, mc.department
      FROM movie_crew mc
      JOIN actors a ON mc.actor_id = a.id
      WHERE mc.movie_id = $1
      ORDER BY 
        CASE mc.job
          WHEN 'Director' THEN 1
          WHEN 'Producer' THEN 2
          WHEN 'Writer' THEN 3
          ELSE 4
        END,
        mc.job
      LIMIT $2
    `;

        const result = await pool.query(query, [movieId, limit]);

        const data = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            job: row.job,
            department: row.department
        }));

        res.json({ data });
    } catch (error) {
        console.error('[Movie Crew] Error:', error);
        res.status(500).json({ error: 'Failed to fetch crew' });
    }
});

/**
 * GET /api/movies/:slug/keywords - Movie keywords
 */
router.get('/movies/:slug/keywords', async (req, res) => {
    const { slug } = req.params;

    try {
        const movieQuery = "SELECT keywords FROM movies WHERE slug = $1";
        const movieResult = await pool.query(movieQuery, [slug]);

        if (movieResult.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        const keywords = movieResult.rows[0].keywords || [];

        const data = keywords.map((keyword, index) => ({
            id: index + 1,
            name: keyword
        }));

        res.json({ data });
    } catch (error) {
        console.error('[Movie Keywords] Error:', error);
        res.status(500).json({ error: 'Failed to fetch keywords' });
    }
});

/**
 * GET /api/movies/:slug/similar - Similar movies
 */
router.get('/movies/:slug/similar', async (req, res) => {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const movieQuery = "SELECT primary_genre FROM movies WHERE slug = $1";
        const movieResult = await pool.query(movieQuery, [slug]);

        if (movieResult.rows.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        const primaryGenre = movieResult.rows[0].primary_genre;

        const query = `
      SELECT id, slug, title, title_ar, title_original, poster_path, vote_average, release_date, primary_genre
      FROM movies
      WHERE slug != $1 AND primary_genre = $2
      ORDER BY popularity DESC
      LIMIT $3
    `;

        const result = await pool.query(query, [slug, primaryGenre, limit]);

        const data = result.rows.map(row => ({
            ...row,
            title_en: row.title, // For backward compatibility
            poster_url: buildImageUrl(row.poster_path),
            media_type: 'movie' // CRITICAL: Always set media_type
        }));

        res.json({ data });
    } catch (error) {
        console.error('[Similar Movies] Error:', error);
        res.status(500).json({ error: 'Failed to fetch similar movies' });
    }
});

/**
 * GET /api/tv - List TV series with filters
 */
router.get('/tv', async (req, res) => {
    const startTime = Date.now();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const genre = req.query.genre;
    const language = req.query.language;
    const yearFrom = req.query.yearFrom ? parseInt(req.query.yearFrom) : null;
    const yearTo = req.query.yearTo ? parseInt(req.query.yearTo) : null;
    const ratingFrom = req.query.ratingFrom ? parseFloat(req.query.ratingFrom) : null;
    const ratingTo = req.query.ratingTo ? parseFloat(req.query.ratingTo) : null;
    const sortBy = req.query.sortBy || 'popularity';

    const cacheKey = `tv:${page}:${limit}:${genre || 'all'}:${language || 'all'}:${yearFrom || 'all'}:${yearTo || 'all'}:${ratingFrom || 'all'}:${ratingTo || 'all'}:${sortBy}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        return res.json({ ...cached, _cache: { hit: true, responseTime: Date.now() - startTime } });
    }

    let query = `
    SELECT id, slug, name, name_ar, name_original, poster_path, backdrop_path,
           vote_average, first_air_date, popularity, original_language, overview, primary_genre
    FROM tv_series
    WHERE slug IS NOT NULL AND slug != $1 AND slug != $2
  `;

    const params = ['', 'content'];
    let paramIndex = 3;

    if (genre) {
        query += ` AND primary_genre = $${paramIndex}`;
        params.push(genre.toLowerCase());
        paramIndex++;
    }

    if (yearFrom) {
        query += ` AND EXTRACT(YEAR FROM first_air_date) >= $${paramIndex}`;
        params.push(yearFrom);
        paramIndex++;
    }

    if (yearTo) {
        query += ` AND EXTRACT(YEAR FROM first_air_date) <= $${paramIndex}`;
        params.push(yearTo);
        paramIndex++;
    }

    if (ratingFrom !== null) {
        query += ` AND vote_average >= $${paramIndex}`;
        params.push(ratingFrom);
        paramIndex++;
    }

    if (ratingTo !== null) {
        query += ` AND vote_average <= $${paramIndex}`;
        params.push(ratingTo);
        paramIndex++;
    }

    if (language) {
        query += ` AND original_language = $${paramIndex}`;
        params.push(language);
        paramIndex++;
    }

    const sortColumn = sortBy === 'vote_average' ? 'vote_average' :
        sortBy === 'first_air_date' ? 'first_air_date' : 'popularity';
    query += ` ORDER BY ${sortColumn} DESC NULLS LAST`;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    try {
        const result = await pool.query(query, params);

        const data = result.rows.map(row => ({
            id: row.id,
            tmdb_id: row.id,
            slug: row.slug,
            name: row.name,
            name_ar: row.name_ar,
            name_en: row.name,
            original_name: row.name_original,
            poster_path: row.poster_path,
            poster_url: buildImageUrl(row.poster_path),
            backdrop_path: row.backdrop_path,
            backdrop_url: buildImageUrl(row.backdrop_path, 'w1280'),
            vote_average: row.vote_average,
            first_air_date: row.first_air_date,
            popularity: row.popularity,
            original_language: row.original_language,
            overview: truncateOverview(row.overview),
            primary_genre: row.primary_genre,
            media_type: 'tv' // CRITICAL: Always set media_type for TV series
        }));

        let countQuery = "SELECT COUNT(*) FROM tv_series WHERE slug IS NOT NULL AND slug != $1 AND slug != $2";
        const countParams = ['', 'content'];
        let countParamIndex = 3;

        if (genre) {
            countQuery += ` AND primary_genre = $${countParamIndex}`;
            countParams.push(genre.toLowerCase());
            countParamIndex++;
        }

        if (yearFrom) {
            countQuery += ` AND EXTRACT(YEAR FROM first_air_date) >= $${countParamIndex}`;
            countParams.push(yearFrom);
            countParamIndex++;
        }

        if (yearTo) {
            countQuery += ` AND EXTRACT(YEAR FROM first_air_date) <= $${countParamIndex}`;
            countParams.push(yearTo);
            countParamIndex++;
        }

        if (ratingFrom !== null) {
            countQuery += ` AND vote_average >= $${countParamIndex}`;
            countParams.push(ratingFrom);
            countParamIndex++;
        }

        if (ratingTo !== null) {
            countQuery += ` AND vote_average <= $${countParamIndex}`;
            countParams.push(ratingTo);
            countParamIndex++;
        }

        if (language) {
            countQuery += ` AND original_language = $${countParamIndex}`;
            countParams.push(language);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        const response = {
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            _cache: { hit: false, responseTime: Date.now() - startTime }
        };

        cache.set(cacheKey, response);
        res.json(response);
    } catch (error) {
        console.error('[TV API] Error:', error);
        res.status(500).json({ error: 'Failed to fetch TV series', details: error.message });
    }
});

/**
 * GET /api/tv/:slug - TV series details
 */
router.get('/tv/:slug', async (req, res) => {
    const { slug } = req.params;
    const cacheKey = `tv:${slug}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        const query = `
      SELECT id, slug, name, name_ar, name_original,
             poster_path, backdrop_path,
             vote_average, vote_count, first_air_date, last_air_date,
             popularity, original_language, overview, overview_ar,
             primary_genre, genres,
             number_of_seasons, number_of_episodes,
             created_at, updated_at
      FROM tv_series 
      WHERE slug = $1
    `;
        const result = await pool.query(query, [slug]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'TV series not found' });
        }

        const series = result.rows[0];

        // Convert genres array to objects format expected by frontend
        const genresArray = series.genres || [];
        const genresObjects = genresArray.map((genreName, index) => ({
            id: index + 1,
            name: genreName
        }));

        const response = {
            id: series.id,
            tmdb_id: series.id,
            slug: series.slug,
            name: series.name,
            name_ar: series.name_ar,
            name_en: series.name,
            original_name: series.name_original,
            poster_path: series.poster_path,
            poster_url: buildImageUrl(series.poster_path),
            backdrop_path: series.backdrop_path,
            backdrop_url: buildImageUrl(series.backdrop_path, 'w1280'),
            vote_average: series.vote_average ? parseFloat(series.vote_average) : null, // Convert to number
            vote_count: series.vote_count ? parseInt(series.vote_count) : null, // Convert to number
            first_air_date: series.first_air_date,
            last_air_date: series.last_air_date,
            popularity: series.popularity,
            original_language: series.original_language,
            overview: series.overview,
            overview_ar: series.overview_ar,
            primary_genre: series.primary_genre,
            genres: genresObjects, // Convert to objects format
            number_of_seasons: series.number_of_seasons,
            number_of_episodes: series.number_of_episodes,
            media_type: 'tv', // CRITICAL: Always set media_type for TV series
            created_at: series.created_at,
            updated_at: series.updated_at
        };

        cache.set(cacheKey, response);
        res.json(response);
    } catch (error) {
        console.error('[TV Details] Error:', error);
        res.status(500).json({ error: 'Failed to fetch TV series' });
    }
});

/**
 * GET /api/tv/:slug/cast - TV series cast
 */
router.get('/tv/:slug/cast', async (req, res) => {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 12;

    try {
        const seriesQuery = "SELECT id FROM tv_series WHERE slug = $1";
        const seriesResult = await pool.query(seriesQuery, [slug]);

        if (seriesResult.rows.length === 0) {
            return res.status(404).json({ error: 'TV series not found' });
        }

        const seriesId = seriesResult.rows[0].id;

        const query = `
      SELECT a.id, a.slug, a.name, a.name_ar, a.profile_path,
             tc.character_name, tc.cast_order
      FROM tv_cast tc
      JOIN actors a ON tc.actor_id = a.id
      WHERE tc.series_id = $1
      ORDER BY tc.cast_order ASC
      LIMIT $2
    `;

        const result = await pool.query(query, [seriesId, limit]);

        const data = result.rows.map(row => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            name_ar: row.name_ar,
            profile_path: row.profile_path,
            profile_url: buildImageUrl(row.profile_path, 'w185'),
            character_name: row.character_name
        }));

        res.json({ data });
    } catch (error) {
        console.error('[TV Cast] Error:', error);
        res.status(500).json({ error: 'Failed to fetch cast' });
    }
});

/**
 * GET /api/tv/:slug/crew - TV series crew
 */
router.get('/tv/:slug/crew', async (req, res) => {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const seriesQuery = "SELECT id FROM tv_series WHERE slug = $1";
        const seriesResult = await pool.query(seriesQuery, [slug]);

        if (seriesResult.rows.length === 0) {
            return res.status(404).json({ error: 'TV series not found' });
        }

        const seriesId = seriesResult.rows[0].id;

        const query = `
      SELECT a.id, a.name, tc.job, tc.department
      FROM tv_crew tc
      JOIN actors a ON tc.actor_id = a.id
      WHERE tc.series_id = $1
      ORDER BY 
        CASE tc.job
          WHEN 'Director' THEN 1
          WHEN 'Producer' THEN 2
          WHEN 'Writer' THEN 3
          ELSE 4
        END,
        tc.job
      LIMIT $2
    `;

        const result = await pool.query(query, [seriesId, limit]);

        const data = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            job: row.job,
            department: row.department
        }));

        res.json({ data });
    } catch (error) {
        console.error('[TV Crew] Error:', error);
        res.status(500).json({ error: 'Failed to fetch crew' });
    }
});

/**
 * GET /api/tv/:slug/keywords - TV series keywords
 */
router.get('/tv/:slug/keywords', async (req, res) => {
    const { slug } = req.params;

    try {
        const seriesQuery = "SELECT keywords FROM tv_series WHERE slug = $1";
        const seriesResult = await pool.query(seriesQuery, [slug]);

        if (seriesResult.rows.length === 0) {
            return res.status(404).json({ error: 'TV series not found' });
        }

        const keywords = seriesResult.rows[0].keywords || [];

        const data = keywords.map((keyword, index) => ({
            id: index + 1,
            name: keyword
        }));

        res.json({ data });
    } catch (error) {
        console.error('[TV Keywords] Error:', error);
        res.status(500).json({ error: 'Failed to fetch keywords' });
    }
});

/**
 * GET /api/tv/:slug/similar - Similar TV series
 */
router.get('/tv/:slug/similar', async (req, res) => {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const seriesQuery = "SELECT primary_genre FROM tv_series WHERE slug = $1";
        const seriesResult = await pool.query(seriesQuery, [slug]);

        if (seriesResult.rows.length === 0) {
            return res.status(404).json({ error: 'TV series not found' });
        }

        const primaryGenre = seriesResult.rows[0].primary_genre;

        const query = `
      SELECT id, slug, name, name_ar, name_original, poster_path, vote_average, first_air_date, primary_genre
      FROM tv_series
      WHERE slug != $1 AND primary_genre = $2
      ORDER BY popularity DESC
      LIMIT $3
    `;

        const result = await pool.query(query, [slug, primaryGenre, limit]);

        const data = result.rows.map(row => ({
            ...row,
            name_en: row.name, // For backward compatibility
            poster_url: buildImageUrl(row.poster_path),
            media_type: 'tv' // CRITICAL: Always set media_type
        }));

        res.json({ data });
    } catch (error) {
        console.error('[Similar TV] Error:', error);
        res.status(500).json({ error: 'Failed to fetch similar TV series' });
    }
});

/**
 * GET /api/tv/:slug/seasons - List seasons for a TV series
 */
router.get('/tv/:slug/seasons', async (req, res) => {
    const { slug } = req.params;

    try {
        const seriesQuery = "SELECT id FROM tv_series WHERE slug = $1";
        const seriesResult = await pool.query(seriesQuery, [slug]);

        if (seriesResult.rows.length === 0) {
            return res.status(404).json({ error: 'TV series not found' });
        }

        const seriesId = seriesResult.rows[0].id;

        const query = `
      SELECT id, season_number, name, overview, poster_path, air_date, episode_count
      FROM seasons
      WHERE series_id = $1
      ORDER BY season_number ASC
    `;

        const result = await pool.query(query, [seriesId]);

        const data = result.rows.map(row => ({
            ...row,
            // CockroachDB returns bigint/integer as strings - convert to numbers
            season_number: parseInt(row.season_number),
            episode_count: parseInt(row.episode_count) || 0,
            poster_url: buildImageUrl(row.poster_path)
        }));

        res.json({ data });
    } catch (error) {
        console.error('[Seasons] Error:', error);
        res.status(500).json({ error: 'Failed to fetch seasons' });
    }
});

/**
 * GET /api/tv/:slug/season/:number/episodes - List episodes for a season
 */
router.get('/tv/:slug/season/:number/episodes', async (req, res) => {
    const { slug, number } = req.params;
    const seasonNumber = parseInt(number);

    try {
        const seriesQuery = "SELECT id FROM tv_series WHERE slug = $1";
        const seriesResult = await pool.query(seriesQuery, [slug]);

        if (seriesResult.rows.length === 0) {
            return res.status(404).json({ error: 'TV series not found' });
        }

        const seriesId = seriesResult.rows[0].id;

        const seasonQuery = "SELECT id FROM seasons WHERE series_id = $1 AND season_number = $2";
        const seasonResult = await pool.query(seasonQuery, [seriesId, seasonNumber]);

        if (seasonResult.rows.length === 0) {
            return res.status(404).json({ error: 'Season not found' });
        }

        const seasonId = seasonResult.rows[0].id;

        const query = `
      SELECT id, episode_number, name, overview, still_path, air_date,
             vote_average, vote_count, runtime
      FROM episodes
      WHERE season_id = $1
      ORDER BY episode_number ASC
    `;

        const result = await pool.query(query, [seasonId]);

        const data = result.rows.map(row => ({
            ...row,
            still_url: buildImageUrl(row.still_path, 'w300')
        }));

        res.json({ data });
    } catch (error) {
        console.error('[Episodes] Error:', error);
        res.status(500).json({ error: 'Failed to fetch episodes' });
    }
});

/**
 * GET /api/search - Cross-content search
 */
router.get('/search', async (req, res) => {
    const query = req.query.q;
    const contentType = req.query.type;
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const results = { movies: [], tv: [], total: 0 };

        if (!contentType || contentType === 'all' || contentType === 'movie') {
            const movieQuery = `
        SELECT id, slug, title, title_ar, poster_path, vote_average, release_date
        FROM movies
        WHERE title ILIKE $1 OR title_ar ILIKE $1 OR title_original ILIKE $1
        ORDER BY popularity DESC
        LIMIT $2
      `;

            const movieResult = await pool.query(movieQuery, [`%${query}%`, limit]);
            results.movies = movieResult.rows.map(row => ({
                ...row,
                poster_url: buildImageUrl(row.poster_path)
            }));
        }

        if (!contentType || contentType === 'all' || contentType === 'tv') {
            const tvQuery = `
        SELECT id, slug, name, name_ar, poster_path, vote_average, first_air_date
        FROM tv_series
        WHERE name ILIKE $1 OR name_ar ILIKE $1 OR name_original ILIKE $1
        ORDER BY popularity DESC
        LIMIT $2
      `;

            const tvResult = await pool.query(tvQuery, [`%${query}%`, limit]);
            results.tv = tvResult.rows.map(row => ({
                ...row,
                poster_url: buildImageUrl(row.poster_path)
            }));
        }

        results.total = results.movies.length + results.tv.length;
        res.json(results);
    } catch (error) {
        console.error('[Search] Error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

/**
 * GET /api/home/aggregated - Home page aggregated content
 */
router.get('/home/aggregated', async (req, res) => {
    const cacheKey = 'home:aggregated';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        const trendingMoviesQuery = `
      SELECT id, slug, title, poster_path, vote_average, release_date
      FROM movies
      WHERE slug IS NOT NULL
      ORDER BY popularity DESC
      LIMIT 20
    `;

        const topRatedMoviesQuery = `
      SELECT id, slug, title, poster_path, vote_average, release_date
      FROM movies
      WHERE slug IS NOT NULL AND vote_average >= 7
      ORDER BY vote_average DESC
      LIMIT 20
    `;

        const trendingSeriesQuery = `
      SELECT id, slug, name, poster_path, vote_average, first_air_date
      FROM tv_series
      WHERE slug IS NOT NULL
      ORDER BY popularity DESC
      LIMIT 20
    `;

        const [trendingMovies, topRatedMovies, trendingSeries] = await Promise.all([
            pool.query(trendingMoviesQuery),
            pool.query(topRatedMoviesQuery),
            pool.query(trendingSeriesQuery)
        ]);

        const response = {
            trendingMovies: trendingMovies.rows.map(row => ({
                ...row,
                poster_url: buildImageUrl(row.poster_path)
            })),
            topRatedMovies: topRatedMovies.rows.map(row => ({
                ...row,
                poster_url: buildImageUrl(row.poster_path)
            })),
            trendingSeries: trendingSeries.rows.map(row => ({
                ...row,
                poster_url: buildImageUrl(row.poster_path)
            }))
        };

        cache.set(cacheKey, response);
        res.json(response);
    } catch (error) {
        console.error('[Home Aggregated] Error:', error);
        res.status(500).json({ error: 'Failed to fetch home content' });
    }
});

/**
 * DELETE /api/cache/clear - Clear all API cache
 */
router.delete('/cache/clear', (req, res) => {
    try {
        cache.flushAll();
        res.json({
            success: true,
            message: 'All API cache cleared successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Cache Clear] Error:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

/**
 * GET /api/software - List software
 */
router.get('/software', async (req, res) => {
    const { sortBy, category, search, page = 1, limit = 40 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
        let conditions = [];
        let params = [];
        let paramIndex = 1;

        if (category) {
            conditions.push(`category = $${paramIndex++}`);
            params.push(category);
        }
        if (search) {
            conditions.push(`(name ILIKE $${paramIndex} OR name_ar ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const orderBy = sortBy === 'trending' ? 'created_at DESC' : 'name ASC';

        const query = `
            SELECT id, slug, name, name_ar, description, description_ar,
                   icon, category, version, size, developer, primary_platform,
                   created_at
            FROM software
            ${where}
            ORDER BY ${orderBy}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(parseInt(limit), offset);

        const result = await pool.query(query, params);
        res.json({ data: result.rows, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        console.error('[Software] Error:', error);
        res.status(500).json({ error: 'Failed to fetch software' });
    }
});

/**
 * GET /api/software/:slug - Software details
 */
router.get('/software/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const isNumeric = /^\d+$/.test(slug);
        const query = isNumeric
            ? 'SELECT * FROM software WHERE id = $1'
            : 'SELECT * FROM software WHERE slug = $1';
        const result = await pool.query(query, [slug]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Software not found' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('[Software Details] Error:', error);
        res.status(500).json({ error: 'Failed to fetch software' });
    }
});

export default router;
