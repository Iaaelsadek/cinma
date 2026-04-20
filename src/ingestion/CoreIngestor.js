import pool from '../db/pool.js';
import SlugEngine from '../slug/SlugEngine.js';
import StateManager from './StateManager.js';

const MAX_SLUG_ATTEMPTS = 10;

class CoreIngestor {
  async writeBatch(items, logIds) {
    if (!items || items.length === 0) return { successCount: 0, failedCount: 0, skippedCount: 0, errors: [] };
    const results = { successCount: 0, failedCount: 0, skippedCount: 0, errors: [] };
    for (let i = 0; i < items.length; i++) {
      try {
        const result = await this.upsertContent(items[i], logIds[i]);
        if (result.success) results.successCount++;
        else if (result.skipped) results.skippedCount++;
        else results.failedCount++;
      } catch (error) {
        results.failedCount++;
        const client = await pool.connect();
        try { await StateManager.setFailed(logIds[i], error.message, client); } finally { client.release(); }
      }
    }
    return results;
  }

  async upsertContent(content, logId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
        try {
          // Use English title first for slug generation, fallback to original title
          // For movies: title_en, for TV: name_en
          const titleForSlug = content.title_en || content.name_en || content.original_title || content.original_name || content.title || content.name;
          const slug = SlugEngine.generate(titleForSlug, content.release_year, attempt);
          const result = await this._executeUpsert(content, slug, client);
          await StateManager.setSuccess(logId, result.id, slug, client);
          await client.query('COMMIT');
          return { success: true, skipped: false, error: null, resultId: result.id, resultSlug: slug };
        } catch (error) {
          if (this._isSlugConflict(error)) continue;
          else throw error;
        }
      }
      await client.query('ROLLBACK');
      await StateManager.setFailed(logId, 'Slug conflict after 10 attempts', client);
      return { success: false, skipped: false, error: 'Slug conflict', resultId: null, resultSlug: null };
    } catch (error) {
      await client.query('ROLLBACK');
      await StateManager.setFailed(logId, error.message, client);
      return { success: false, skipped: false, error: error.message, resultId: null, resultSlug: null };
    } finally {
      client.release();
    }
  }

  async _executeUpsert(content, slug, client) {
    if (content.content_type === 'movie') return await this._upsertMovie(content, slug, client);
    if (content.content_type === 'tv_series') return await this._upsertTVSeries(content, slug, client);
    if (content.content_type === 'game') return await this._upsertGame(content, slug, client);
    if (content.content_type === 'software') return await this._upsertSoftware(content, slug, client);
    if (content.content_type === 'actor') return await this._upsertActor(content, slug, client);
    throw new Error('Unsupported content_type');
  }

  async _upsertMovie(c, s, cl) {
    // Apply fallback 5.0 rating if still null
    const voteAverage = c.vote_average ?? 5.0;

    const q = `INSERT INTO movies (external_source, external_id, slug, title, title_ar, title_en, original_title, original_language, overview, poster_url, poster_path, backdrop_url, backdrop_path, release_date, release_year, vote_average, vote_count, popularity, runtime, genres, cast_data, crew_data, keywords, videos, images, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW()) ON CONFLICT (external_source, external_id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, overview = EXCLUDED.overview, updated_at = NOW() RETURNING id`;
    const v = [c.external_source, c.external_id, s, c.title, c.title_ar || null, c.title_en || null, c.original_title, c.original_language, c.overview, c.poster_url, c.poster_path || null, c.backdrop_url, c.backdrop_path || null, c.release_date, c.release_year, voteAverage, c.vote_count, c.popularity, c.runtime || null, JSON.stringify(c.genres || []), JSON.stringify(c.cast_data || []), JSON.stringify(c.crew_data || []), JSON.stringify(c.keywords || []), JSON.stringify(c.videos || []), JSON.stringify(c.images || [])];
    const r = await cl.query(q, v);
    return { id: r.rows[0].id };
  }

  async _upsertTVSeries(c, s, cl) {
    // Apply fallback 5.0 rating if still null
    const voteAverage = c.vote_average ?? 5.0;

    const q = `INSERT INTO tv_series (external_source, external_id, slug, name, name_ar, name_en, original_name, original_language, overview, poster_url, poster_path, backdrop_url, backdrop_path, first_air_date, last_air_date, release_date, release_year, vote_average, vote_count, popularity, number_of_seasons, number_of_episodes, status, genres, cast_data, crew_data, keywords, videos, images, networks, seasons, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, NOW(), NOW()) ON CONFLICT ON CONSTRAINT uq_tv_series_source DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, updated_at = NOW() RETURNING id`;
    const v = [c.external_source, c.external_id, s, c.name || c.title, c.name_ar || c.title_ar || null, c.name_en || c.title_en || null, c.original_name || c.original_title, c.original_language, c.overview, c.poster_url, c.poster_path || null, c.backdrop_url, c.backdrop_path || null, c.first_air_date || null, c.last_air_date || null, c.release_date || c.first_air_date || null, c.release_year, voteAverage, c.vote_count, c.popularity, c.number_of_seasons || 0, c.number_of_episodes || 0, c.status || null, JSON.stringify(c.genres || []), JSON.stringify(c.cast_data || []), JSON.stringify(c.crew_data || []), JSON.stringify(c.keywords || []), JSON.stringify(c.videos || []), JSON.stringify(c.images || []), JSON.stringify(c.networks || []), JSON.stringify(c.seasons || [])];
    const r = await cl.query(q, v);
    if (c.episodesData?.episodes) await this._upsertEpisodes(r.rows[0].id, c.episodesData.episodes, cl);
    return { id: r.rows[0].id };
  }

  async _upsertEpisodes(sid, eps, cl) {
    if (!eps || eps.length === 0) return;
    for (const e of eps) {
      const q = `INSERT INTO episodes (series_id, season_number, episode_number, name, overview, still_path, air_date, vote_average, vote_count, runtime, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) ON CONFLICT (series_id, season_number, episode_number) DO UPDATE SET name = EXCLUDED.name, overview = EXCLUDED.overview, updated_at = NOW()`;
      await cl.query(q, [sid, e.season_number, e.episode_number, e.name, e.overview, e.still_path, e.air_date, e.vote_average || 0, e.vote_count || 0, e.runtime || null]);
    }
  }

  async _upsertGame(c, s, cl) {
    // Apply fallback 5.0 rating if still null
    const voteAverage = c.vote_average ?? 5.0;

    // Derive primary_genre from genres array if not explicitly set
    const primaryGenre = c.primary_genre || _extractPrimaryGenre(c.genres);
    // Derive primary_platform from platform array if not explicitly set
    const primaryPlatform = c.primary_platform || _extractPrimaryPlatform(c.platform);

    const q = `INSERT INTO games (external_source, external_id, slug, title, original_title, overview, poster_url, backdrop_url, release_date, release_year, vote_average, vote_count, popularity, developer, publisher, platform, primary_platform, rating, metacritic_score, genres, primary_genre, keywords, videos, images, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW()) ON CONFLICT (external_source, external_id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, primary_genre = EXCLUDED.primary_genre, primary_platform = EXCLUDED.primary_platform, updated_at = NOW() RETURNING id`;
    const v = [c.external_source, c.external_id, s, c.title, c.original_title, c.overview, c.poster_url, c.backdrop_url, c.release_date, c.release_year, voteAverage, c.vote_count, c.popularity, c.developer || null, c.publisher || null, JSON.stringify(c.platform || []), primaryPlatform, c.rating || null, c.metacritic_score || null, JSON.stringify(c.genres || []), primaryGenre, JSON.stringify(c.keywords || []), JSON.stringify(c.videos || []), JSON.stringify(c.images || [])];
    const r = await cl.query(q, v);
    return { id: r.rows[0].id };
  }

  async _upsertSoftware(c, s, cl) {
    // Apply fallback 5.0 rating if still null
    const voteAverage = c.vote_average ?? 5.0;

    const q = `INSERT INTO software (external_source, external_id, slug, title, original_title, overview, poster_url, backdrop_url, release_date, release_year, vote_average, vote_count, popularity, developer, publisher, platform, rating, genres, keywords, videos, images, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW()) ON CONFLICT (external_source, external_id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, updated_at = NOW() RETURNING id`;
    const v = [c.external_source, c.external_id, s, c.title, c.original_title, c.overview, c.poster_url, c.backdrop_url, c.release_date, c.release_year, voteAverage, c.vote_count, c.popularity, c.developer || null, c.publisher || null, JSON.stringify(c.platform || []), c.rating || null, JSON.stringify(c.genres || []), JSON.stringify(c.keywords || []), JSON.stringify(c.videos || []), JSON.stringify(c.images || [])];
    const r = await cl.query(q, v);
    return { id: r.rows[0].id };
  }

  async _upsertActor(c, s, cl) {
    const q = `INSERT INTO actors (external_source, external_id, slug, name, original_name, biography, profile_url, imdb_id, birthday, deathday, place_of_birth, gender, known_for_department, popularity, adult, homepage, also_known_as, images, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()) ON CONFLICT (external_source, external_id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name, updated_at = NOW() RETURNING id`;
    const v = [c.external_source, c.external_id, s, c.name || c.title, c.original_name || c.original_title, c.biography || c.overview, c.profile_url || c.poster_url, c.imdb_id || null, c.birthday || null, c.deathday || null, c.place_of_birth || null, c.gender || 0, c.known_for_department || null, c.popularity || 0, c.adult || false, c.homepage || null, JSON.stringify(c.also_known_as || []), JSON.stringify(c.images || [])];
    const r = await cl.query(q, v);
    return { id: r.rows[0].id };
  }

  _isSlugConflict(error) {
    return error.code === '23505' && (error.constraint || '').includes('slug');
  }
}

export default new CoreIngestor();
