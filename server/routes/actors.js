/**
 * Actors API Routes - Cinema.online
 * Database: CockroachDB ONLY
 */

import express from 'express';
import NodeCache from 'node-cache';
import pool from '../../src/db/pool.js';

const router = express.Router();

// In-Memory Caching - 5 minutes TTL
const cache = new NodeCache({ stdTTL: 300 });

const FALLBACK_IMAGE = 'https://via.placeholder.com/500x750?text=No+Image';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function buildImageUrl(path, size = 'w500') {
    if (!path) return FALLBACK_IMAGE;
    if (path.startsWith('http')) return path;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * GET /api/actors/:slug - Get actor details
 */
router.get('/actors/:slug', async (req, res) => {
    const { slug } = req.params;
    const cacheKey = `actor:${slug}`;
    const cached = cache.get(cacheKey);

    if (cached) {
        return res.json(cached);
    }

    try {
        const result = await pool.query(
            `SELECT id, slug, name, name_ar, biography, biography_ar, birthday, place_of_birth, profile_path, popularity
       FROM actors
       WHERE slug = $1`,
            [slug]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Actor not found' });
        }

        const actor = result.rows[0];
        const response = {
            ...actor,
            name_en: actor.name, // For compatibility
            known_for_department: 'Acting', // Default value
            profile_url: buildImageUrl(actor.profile_path),
            // Format birthday to YYYY-MM-DD
            birthday: actor.birthday ? new Date(actor.birthday).toISOString().split('T')[0] : null
        };

        cache.set(cacheKey, response);
        res.json(response);
    } catch (error) {
        console.error('[Actors API] Error fetching actor:', error);
        res.status(500).json({ error: 'Failed to fetch actor' });
    }
});

/**
 * GET /api/actors/:slug/works - Get actor's filmography
 */
router.get('/actors/:slug/works', async (req, res) => {
    const { slug } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);
    const cacheKey = `actor:${slug}:works:${limit}`;
    const cached = cache.get(cacheKey);

    if (cached) {
        return res.json(cached);
    }

    try {
        // Get actor ID first
        const actorResult = await pool.query(
            'SELECT id FROM actors WHERE slug = $1',
            [slug]
        );

        if (actorResult.rows.length === 0) {
            return res.status(404).json({ error: 'Actor not found' });
        }

        const actorId = actorResult.rows[0].id;

        // Get movies
        const moviesResult = await pool.query(
            `SELECT DISTINCT m.id, m.slug, m.title, m.title_ar, m.title_original, m.poster_path, 
              m.vote_average, m.release_date, mc.character_name, 'movie' as media_type
       FROM movies m
       INNER JOIN movie_cast mc ON m.id = mc.movie_id
       WHERE mc.actor_id = $1
       ORDER BY m.release_date DESC NULLS LAST
       LIMIT $2`,
            [actorId, limit]
        );

        // Get TV series
        const tvResult = await pool.query(
            `SELECT DISTINCT t.id, t.slug, t.name as title, t.name_ar as title_ar, t.name_original as title_original, 
              t.poster_path, t.vote_average, t.first_air_date as release_date, 
              tc.character_name, 'tv' as media_type
       FROM tv_series t
       INNER JOIN tv_cast tc ON t.id = tc.series_id
       WHERE tc.actor_id = $1
       ORDER BY t.first_air_date DESC NULLS LAST
       LIMIT $2`,
            [actorId, limit]
        );

        // Combine and sort by date
        const allWorks = [...moviesResult.rows, ...tvResult.rows]
            .map(work => ({
                id: work.id,
                slug: work.slug,
                title: work.title,
                title_ar: work.title_ar,
                title_en: work.title, // Use title as title_en for compatibility
                original_title: work.title_original,
                poster_path: work.poster_path,
                poster_url: buildImageUrl(work.poster_path),
                vote_average: work.vote_average,
                release_date: work.release_date ? new Date(work.release_date).toISOString().split('T')[0] : null,
                character_name: work.character_name,
                media_type: work.media_type
            }))
            .sort((a, b) => {
                const dateA = new Date(a.release_date || '1900-01-01');
                const dateB = new Date(b.release_date || '1900-01-01');
                return dateB - dateA;
            })
            .slice(0, limit);

        const response = {
            data: allWorks,
            total: allWorks.length
        };

        cache.set(cacheKey, response);
        res.json(response);
    } catch (error) {
        console.error('[Actors API] Error fetching works:', error);
        res.status(500).json({ error: 'Failed to fetch actor works' });
    }
});

export default router;
