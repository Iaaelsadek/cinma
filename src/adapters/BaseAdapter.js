/**
 * BaseAdapter - Abstract Interface for Content Source Adapters
 * 
 * All adapters (TMDB, RAWG, IGDB, etc.) MUST extend this class
 * and implement the required methods.
 * 
 * Philosophy:
 * - Source-agnostic design
 * - All adapters return NormalizedContent objects
 * - CoreIngestor doesn't know about specific sources
 */

class BaseAdapter {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Fetch a single item from the source API by its external ID.
   * Must return a NormalizedContent object or throw.
   *
   * @param {string} externalId - Source's unique ID
   * @param {string} contentType - 'movie' | 'tv_series' | 'game' | 'software' | 'actor'
   * @returns {Promise<NormalizedContent>}
   * @throws {Error} If not implemented or fetch fails
   */
  async fetchOne(externalId, contentType) {
    throw new Error('fetchOne() must be implemented by adapter subclass');
  }

  /**
   * Search the source by title. Returns array of candidates.
   * Used when ingesting by title (not by known ID).
   *
   * @param {string} title - Search query
   * @param {string} contentType - 'movie' | 'tv_series' | 'game' | 'software' | 'actor'
   * @returns {Promise<NormalizedContent[]>}
   * @throws {Error} If not implemented or search fails
   */
  async searchByTitle(title, contentType) {
    throw new Error('searchByTitle() must be implemented by adapter subclass');
  }

  /**
   * Normalize a raw API response into NormalizedContent.
   * Must be implemented by each adapter.
   *
   * @param {object} rawData - Raw API response
   * @param {string} contentType - Content type for context
   * @returns {NormalizedContent}
   * @throws {Error} If not implemented or normalization fails
   */
  normalize(rawData, contentType) {
    throw new Error('normalize() must be implemented by adapter subclass');
  }

  /**
   * Get the source name (e.g., 'TMDB', 'RAWG')
   * @returns {string}
   */
  getSourceName() {
    throw new Error('getSourceName() must be implemented by adapter subclass');
  }
}

/**
 * NormalizedContent Interface (TypeScript-style JSDoc)
 * 
 * @typedef {Object} NormalizedContent
 * 
 * Source tracking
 * @property {string} external_source - 'TMDB', 'RAWG', 'IGDB', 'MANUAL'
 * @property {string} external_id - Source's unique ID (always string)
 * @property {string} content_type - 'movie' | 'tv_series' | 'game' | 'software' | 'actor'
 * 
 * Core fields (all content types)
 * @property {string} title - Primary display title (Arabic if available)
 * @property {string} original_title - Original language title
 * @property {string|null} overview
 * @property {string|null} poster_url - Full URL (pre-normalized)
 * @property {string|null} backdrop_url - Full URL (pre-normalized)
 * @property {number|null} release_year - 4-digit year
 * @property {string|null} release_date - ISO date 'YYYY-MM-DD'
 * @property {number} popularity - >= 0
 * @property {string|null} original_language - ISO 639-1
 * 
 * Ratings
 * @property {number} vote_average - 0.0 – 10.0
 * @property {number} vote_count - >= 0
 * 
 * JSONB fields (pre-serialized arrays)
 * @property {Array<Object>} genres - [{ id, name }]
 * @property {Array<Object>} cast_data - [{ id, name, character, profile_path, order }]
 * @property {Array<Object>} crew_data - [{ id, name, job, department, profile_path }]
 * @property {Array<Object>} videos - [{ id, key, name, site, type, official }]
 * @property {Array<Object>} keywords - [{ id, name }]
 * @property {Array<Object>} images - [{ file_path, type, width, height }]
 * 
 * Type-specific fields (null if not applicable)
 * TV Series
 * @property {string|null} first_air_date
 * @property {string|null} last_air_date
 * @property {number|null} number_of_seasons
 * @property {number|null} number_of_episodes
 * @property {string|null} status
 * @property {Array<Object>|null} networks - [{ id, name, logo_path }]
 * @property {Array<Object>|null} seasons - [{ id, season_number, name, episode_count, air_date, poster_path }]
 * 
 * Games / Software
 * @property {string|null} developer
 * @property {string|null} publisher
 * @property {Array<string>|null} platform
 * @property {number|null} rating
 * @property {number|null} metacritic_score
 */

export default BaseAdapter;
