/**
 * AdapterManager - Unified Content Adapter Router
 * 
 * Routes content fetching to the appropriate adapter based on content type:
 * - TMDB: movies, tv_series, actors
 * - IGDB: games
 * - Future: software, anime, etc.
 */

import TMDBAdapter from './TMDBAdapter.js';
import IGDBAdapter from './IGDBAdapter.js';

class AdapterManager {
  constructor(config = {}) {
    // Initialize adapters
    this.tmdbAdapter = new TMDBAdapter({
      apiKey: config.tmdbApiKey || process.env.TMDB_API_KEY,
      requestsPerSecond: 40
    });

    this.igdbAdapter = new IGDBAdapter({
      clientId: config.igdbClientId || process.env.IGDB_CLIENT_ID,
      clientSecret: config.igdbClientSecret || process.env.IGDB_CLIENT_SECRET
    });

    // Adapter routing map
    this.adapterMap = {
      movie: this.tmdbAdapter,
      tv_series: this.tmdbAdapter,
      actor: this.tmdbAdapter,
      software: null // Not yet implemented
    };
  }

  /**
   * Fetch content from the appropriate adapter
   * 
   * @param {string} externalId - External ID
   * @param {string} contentType - Content type
   * @returns {Promise<Object>} Normalized content
   */
  async fetchOne(externalId, contentType) {
    const adapter = this.adapterMap[contentType];

    if (!adapter) {
      throw new Error(`No adapter configured for content type: ${contentType}`);
    }

    // TMDB adapter uses fetchOne method
    if (contentType === 'movie' || contentType === 'tv_series' || contentType === 'actor') {
      return await adapter.fetchOne(externalId, contentType);
    }

    // IGDB adapter uses fetchById method
    if (contentType === 'game') {
      const gameData = await adapter.fetchById(externalId);
      if (!gameData) {
        throw new Error(`Game not found: ${externalId}`);
      }
      // Add content_type for CoreIngestor
      gameData.content_type = 'game';
      return gameData;
    }

    throw new Error(`Unsupported content type: ${contentType}`);
  }

  /**
   * Search content across adapters
   * 
   * @param {string} query - Search query
   * @param {string} contentType - Content type
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Search results
   */
  async search(query, contentType, limit = 10) {
    const adapter = this.adapterMap[contentType];

    if (!adapter) {
      throw new Error(`No adapter configured for content type: ${contentType}`);
    }

    if (contentType === 'game') {
      return await adapter.search(query, limit);
    }

    // TMDB search not implemented in this adapter
    throw new Error('Search not implemented for this content type');
  }

  /**
   * Get adapter for content type
   * 
   * @param {string} contentType - Content type
   * @returns {Object} Adapter instance
   */
  getAdapter(contentType) {
    return this.adapterMap[contentType];
  }

  /**
   * Check if adapter is available for content type
   * 
   * @param {string} contentType - Content type
   * @returns {boolean}
   */
  hasAdapter(contentType) {
    return this.adapterMap[contentType] !== null && this.adapterMap[contentType] !== undefined;
  }
}

export default AdapterManager;
