/**
 * IGDB Adapter - Games Database Integration
 * 
 * Handles Twitch OAuth2 authentication and IGDB API requests
 * for game data ingestion into Cinema.online
 */

import fetch from 'node-fetch';

class IGDBAdapter {
  constructor(config = {}) {
    this.clientId = config.clientId || process.env.IGDB_CLIENT_ID;
    this.clientSecret = config.clientSecret || process.env.IGDB_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are required');
    }
  }

  /**
   * Get or refresh OAuth2 access token from Twitch
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials'
        })
      });

      if (!response.ok) {
        throw new Error(`Twitch OAuth failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Set expiry to 5 minutes before actual expiry for safety
      this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`Failed to get IGDB access token: ${error.message}`);
    }
  }

  /**
   * Fetch game data from IGDB by ID
   * @param {string} gameId - IGDB game ID
   * @returns {Promise<Object>} Normalized game data
   */
  async fetchById(gameId) {
    const token = await this.getAccessToken();

    try {
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: `fields name, summary, cover.url, artworks.url, first_release_date, 
               genres.name, platforms.name, involved_companies.company.name, 
               involved_companies.developer, involved_companies.publisher,
               rating, rating_count, aggregated_rating, aggregated_rating_count,
               screenshots.url, videos.video_id, keywords.name, websites.url;
               where id = ${gameId};`
      });

      if (!response.ok) {
        throw new Error(`IGDB API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data || data.length === 0) {
        return null;
      }

      return this.normalizeGameData(data[0]);
    } catch (error) {
      throw new Error(`Failed to fetch game ${gameId}: ${error.message}`);
    }
  }

  /**
   * Search games by name
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Array of game results
   */
  async search(query, limit = 10) {
    const token = await this.getAccessToken();

    try {
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain'
        },
        body: `search "${query}"; 
               fields name, cover.url, first_release_date, rating, platforms.name;
               limit ${limit};`
      });

      if (!response.ok) {
        throw new Error(`IGDB search error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.map(game => ({
        id: game.id,
        name: game.name,
        cover: game.cover?.url?.replace('t_thumb', 't_cover_big'),
        releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000) : null,
        rating: game.rating,
        platforms: game.platforms?.map(p => p.name) || []
      }));
    } catch (error) {
      throw new Error(`Failed to search games: ${error.message}`);
    }
  }

  /**
   * Normalize IGDB game data to Cinema.online format
   * @param {Object} game - Raw IGDB game data
   * @returns {Object} Normalized game data
   */
  normalizeGameData(game) {
    // Extract developer and publisher
    let developer = null;
    let publisher = null;
    
    if (game.involved_companies) {
      const devCompany = game.involved_companies.find(ic => ic.developer);
      const pubCompany = game.involved_companies.find(ic => ic.publisher);
      
      developer = devCompany?.company?.name || null;
      publisher = pubCompany?.company?.name || null;
    }

    // Convert cover URL to high quality
    const posterUrl = game.cover?.url 
      ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
      : null;

    // Convert artwork to backdrop
    const backdropUrl = game.artworks && game.artworks.length > 0
      ? `https:${game.artworks[0].url.replace('t_thumb', 't_1080p')}`
      : null;

    // Convert screenshots
    const images = game.screenshots?.map(screenshot => ({
      url: `https:${screenshot.url.replace('t_thumb', 't_screenshot_big')}`
    })) || [];

    // Convert videos (YouTube IDs)
    const videos = game.videos?.map(video => ({
      type: 'Trailer',
      key: video.video_id,
      site: 'YouTube'
    })) || [];

    // Convert genres
    const genres = game.genres?.map(genre => ({
      id: genre.id,
      name: genre.name
    })) || [];

    // Convert keywords
    const keywords = game.keywords?.map(keyword => ({
      id: keyword.id,
      name: keyword.name
    })) || [];

    // Convert platforms
    const platforms = game.platforms?.map(platform => ({
      id: platform.id,
      name: platform.name
    })) || [];

    // Calculate vote average (IGDB uses 0-100 scale, we use 0-10)
    // Apply 5.0 default for missing ratings (neutral position)
    let voteAverage = null;
    
    if (game.rating !== null && game.rating !== undefined) {
      voteAverage = (game.rating / 10).toFixed(1);
    } else {
      // Apply 5.0 default for missing ratings (neutral position)
      voteAverage = 5.0;
    }
    
    // Do NOT apply default if rating is explicitly 0
    if (game.rating === 0) {
      voteAverage = 0;
    }
    
    const voteCount = game.rating_count || 0;

    // Use aggregated rating if available (critic scores)
    const aggregatedRating = game.aggregated_rating 
      ? (game.aggregated_rating / 10).toFixed(1) 
      : null;

    // Release date
    const releaseDate = game.first_release_date 
      ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
      : null;

    const releaseYear = releaseDate ? parseInt(releaseDate.substring(0, 4)) : null;

    return {
      external_id: game.id.toString(),
      external_source: 'IGDB',
      title: game.name,
      title_en: game.name, // IGDB names are always in English
      original_title: game.name,
      overview: game.summary || null,
      poster_url: posterUrl,
      backdrop_url: backdropUrl,
      release_date: releaseDate,
      release_year: releaseYear,
      vote_average: voteAverage,
      vote_count: voteCount,
      popularity: aggregatedRating || voteAverage || 0,
      developer: developer,
      publisher: publisher,
      platform: platforms,
      rating: null, // ESRB/PEGI rating not in basic query
      metacritic_score: aggregatedRating ? Math.round(parseFloat(aggregatedRating) * 10) : null,
      genres: genres,
      keywords: keywords,
      videos: videos,
      images: images,
      websites: game.websites || []
    };
  }

  /**
   * Batch fetch multiple games
   * @param {Array<string>} gameIds - Array of IGDB game IDs
   * @returns {Promise<Array>} Array of normalized game data
   */
  async fetchBatch(gameIds) {
    const results = [];
    
    for (const gameId of gameIds) {
      try {
        const game = await this.fetchById(gameId);
        if (game) {
          results.push(game);
        }
      } catch (error) {
        results.push({
          external_id: gameId,
          error: error.message
        });
      }
    }
    
    return results;
  }
}

export default IGDBAdapter;
