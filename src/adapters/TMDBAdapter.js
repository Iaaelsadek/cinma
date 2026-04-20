/**
 * TMDBAdapter - TMDB-Specific Implementation
 * 
 * Extends BaseAdapter to fetch and normalize content from TMDB API.
 * 
 * Features:
 * - Dual-language fetching (ar-SA, en-US)
 * - Arabic preference for localized fields
 * - Image URL normalization
 * - Cast/crew filtering
 * - Video filtering (YouTube only)
 * - Keywords limiting
 * - Seasons normalization
 */

import axios from 'axios';
import BaseAdapter from './BaseAdapter.js';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

class TMDBAdapter extends BaseAdapter {
  constructor(config = {}) {
    super(config);
    
    this.apiKey = config.apiKey || process.env.TMDB_API_KEY;
    if (!this.apiKey) {
      throw new Error('TMDB API key is required');
    }

    // Rate limiting
    this.requestsPerSecond = config.requestsPerSecond || 40;
    this.lastRequestTime = 0;
  }

  /**
   * Get source name
   * @returns {string}
   */
  getSourceName() {
    return 'TMDB';
  }

  /**
   * Fetch a single item from TMDB by ID
   * 
   * @param {string} externalId - TMDB ID
   * @param {string} contentType - 'movie' | 'tv_series' | 'actor'
   * @returns {Promise<NormalizedContent>}
   */
  async fetchOne(externalId, contentType) {
    // Fetch in both languages
    const [arData, enData] = await Promise.all([
      this._fetchFromTMDB(externalId, contentType, 'ar-SA'),
      this._fetchFromTMDB(externalId, contentType, 'en-US')
    ]);

    // For TV series, deep fetch episodes data
    if (contentType === 'tv_series') {
      const episodesData = await this._deepFetchEpisodes(externalId, arData, enData);
      arData.episodesData = episodesData;
      enData.episodesData = episodesData;
    }

    // Merge and normalize
    return this.normalize({ ar: arData, en: enData }, contentType);
  }

  /**
   * Search TMDB by title
   * 
   * @param {string} title - Search query
   * @param {string} contentType - 'movie' | 'tv_series' | 'actor'
   * @returns {Promise<NormalizedContent[]>}
   */
  async searchByTitle(title, contentType) {
    const endpoint = this._getSearchEndpoint(contentType);
    
    const response = await this._makeRequest(endpoint, {
      query: title,
      language: 'ar-SA',
      include_adult: false
    });

    // Return top 5 results
    const results = response.results.slice(0, 5);
    
    // Fetch full details for each result
    const normalized = [];
    for (const result of results) {
      try {
        const fullData = await this.fetchOne(result.id.toString(), contentType);
        normalized.push(fullData);
      } catch (error) {
        console.error(`Failed to fetch details for ${result.id}:`, error.message);
      }
    }

    return normalized;
  }

  /**
   * Normalize TMDB data to NormalizedContent
   * 
   * @param {object} rawData - { ar: arData, en: enData }
   * @param {string} contentType
   * @returns {NormalizedContent}
   */
  normalize(rawData, contentType) {
    const { ar, en } = rawData;

    if (contentType === 'movie') {
      return this._normalizeMovie(ar, en);
    } else if (contentType === 'tv_series') {
      return this._normalizeTVSeries(ar, en);
    } else if (contentType === 'actor') {
      return this._normalizeActor(ar, en);
    } else {
      throw new Error(`Unsupported content_type: ${contentType}`);
    }
  }

  /**
   * Normalize movie data
   * @private
   */
  _normalizeMovie(ar, en) {
    // Smart fallback for titles
    const originalTitle = en.original_title || en.title;
    const titleAr = ar.title || null;
    const titleEn = en.title || null;
    const displayTitle = this._localizeField(titleAr, titleEn, originalTitle);

    return {
      // Source tracking
      external_source: 'TMDB',
      external_id: ar.id.toString(),
      content_type: 'movie',

      // Core fields (Explicit dual-language with smart fallback)
      title: displayTitle,
      title_ar: titleAr,
      title_en: titleEn,
      original_title: originalTitle,
      original_language: ar.original_language || en.original_language,
      overview: this._localizeField(ar.overview, en.overview),
      tagline: this._localizeField(ar.tagline, en.tagline),

      // Media assets (paths only, not full URLs)
      poster_path: ar.poster_path || en.poster_path || null,
      backdrop_path: ar.backdrop_path || en.backdrop_path || null,
      poster_url: this._normalizeImageUrl(ar.poster_path || en.poster_path, 'w500'),
      backdrop_url: this._normalizeImageUrl(ar.backdrop_path || en.backdrop_path, 'w1280'),

      // Release & ratings
      release_date: ar.release_date || en.release_date || null,
      release_year: this._extractYear(ar.release_date || en.release_date),
      vote_average: (() => {
        // Apply 5.0 default for null ratings
        let voteAverage = ar.vote_average ?? en.vote_average ?? 5.0;
        
        // Do NOT apply default if rating is explicitly 0
        if (ar.vote_average === 0 || en.vote_average === 0) {
          voteAverage = 0;
        }
        
        return voteAverage;
      })(),
      vote_count: ar.vote_count || 0,
      popularity: ar.popularity || 0,

      // Metadata
      adult: ar.adult || false,
      runtime: ar.runtime || en.runtime || null,
      status: ar.status || en.status || null,
      budget: ar.budget || 0,
      revenue: ar.revenue || 0,

      // JSONB fields
      genres: this._normalizeGenres(ar.genres || en.genres),
      cast_data: this._normalizeCast(ar.credits?.cast || en.credits?.cast),
      crew_data: this._normalizeCrew(ar.credits?.crew || en.credits?.crew),
      similar_content: [],
      production_companies: this._normalizeProductionCompanies(ar.production_companies || en.production_companies),
      spoken_languages: ar.spoken_languages || en.spoken_languages || [],
      keywords: this._normalizeKeywords(ar.keywords?.keywords || en.keywords?.keywords),
      videos: this._normalizeVideos(ar.videos?.results || en.videos?.results),
      images: this._normalizeImages(ar.images || en.images)
    };
  }

  /**
   * Normalize TV series data
   * @private
   */
  _normalizeTVSeries(ar, en) {
    // Smart fallback for names
    const originalName = en.original_name || en.name;
    const nameAr = ar.name || null;
    const nameEn = en.name || null;
    const displayName = this._localizeField(nameAr, nameEn, originalName);

    return {
      // Source tracking
      external_source: 'TMDB',
      external_id: ar.id.toString(),
      content_type: 'tv_series',

      // Core fields (Explicit dual-language with smart fallback)
      title: displayName,
      name: displayName,
      name_ar: nameAr,
      name_en: nameEn,
      original_title: originalName,
      original_name: originalName,
      original_language: ar.original_language || en.original_language,
      overview: this._localizeField(ar.overview, en.overview),
      tagline: this._localizeField(ar.tagline, en.tagline),

      // Media assets (paths only)
      poster_path: ar.poster_path || en.poster_path || null,
      backdrop_path: ar.backdrop_path || en.backdrop_path || null,
      poster_url: this._normalizeImageUrl(ar.poster_path || en.poster_path, 'w500'),
      backdrop_url: this._normalizeImageUrl(ar.backdrop_path || en.backdrop_path, 'w1280'),

      // Air dates
      first_air_date: ar.first_air_date || en.first_air_date || null,
      last_air_date: ar.last_air_date || en.last_air_date || null,
      release_date: ar.first_air_date || en.first_air_date || null,
      release_year: this._extractYear(ar.first_air_date || en.first_air_date),

      // Ratings
      vote_average: (() => {
        // Apply 5.0 default for null ratings
        let voteAverage = ar.vote_average ?? en.vote_average ?? 5.0;
        
        // Do NOT apply default if rating is explicitly 0
        if (ar.vote_average === 0 || en.vote_average === 0) {
          voteAverage = 0;
        }
        
        return voteAverage;
      })(),
      vote_count: ar.vote_count || 0,
      popularity: ar.popularity || 0,

      // Series metadata
      adult: ar.adult || false,
      number_of_seasons: ar.number_of_seasons || 0,
      number_of_episodes: ar.number_of_episodes || 0,
      status: ar.status || en.status || null,
      type: ar.type || en.type || null,
      episode_run_time: ar.episode_run_time || en.episode_run_time || [],

      // JSONB fields
      genres: this._normalizeGenres(ar.genres || en.genres),
      cast_data: this._normalizeCast(ar.credits?.cast || en.credits?.cast),
      crew_data: this._normalizeCrew(ar.credits?.crew || en.credits?.crew),
      similar_content: [],
      production_companies: this._normalizeProductionCompanies(ar.production_companies || en.production_companies),
      spoken_languages: ar.spoken_languages || en.spoken_languages || [],
      keywords: this._normalizeKeywords(ar.keywords?.results || en.keywords?.results),
      videos: this._normalizeVideos(ar.videos?.results || en.videos?.results),
      images: this._normalizeImages(ar.images || en.images),
      networks: this._normalizeNetworks(ar.networks || en.networks),
      seasons: this._normalizeSeasons(ar.seasons || en.seasons),
      
      // Deep fetched episodes data (if available)
      episodesData: ar.episodesData || null
    };
  }

  /**
   * Normalize actor data
   * @private
   */
  _normalizeActor(ar, en) {
    return {
      // Source tracking
      external_source: 'TMDB',
      external_id: ar.id.toString(),
      content_type: 'actor',

      // Core fields
      title: ar.name || en.name,
      name: ar.name || en.name,
      original_title: en.name,
      original_name: en.name,
      overview: this._localizeField(ar.biography, en.biography),
      biography: this._localizeField(ar.biography, en.biography),

      // Media
      poster_url: this._normalizeImageUrl(ar.profile_path || en.profile_path, 'w500'),
      profile_url: this._normalizeImageUrl(ar.profile_path || en.profile_path, 'w500'),
      backdrop_url: null,

      // Actor metadata
      imdb_id: ar.imdb_id || en.imdb_id || null,
      birthday: ar.birthday || en.birthday || null,
      deathday: ar.deathday || en.deathday || null,
      place_of_birth: ar.place_of_birth || en.place_of_birth || null,
      gender: ar.gender || en.gender || 0,
      known_for_department: ar.known_for_department || en.known_for_department || null,
      popularity: ar.popularity || 0,
      adult: ar.adult || false,
      homepage: ar.homepage || en.homepage || null,

      // Release year (use birthday year)
      release_year: this._extractYear(ar.birthday || en.birthday),
      release_date: ar.birthday || en.birthday || null,

      // Ratings (not applicable for actors)
      vote_average: 0,
      vote_count: 0,

      // JSONB fields
      also_known_as: ar.also_known_as || en.also_known_as || [],
      genres: [],
      cast_data: [],
      crew_data: [],
      keywords: [],
      videos: [],
      images: []
    };
  }

  /**
   * Localize field - prefer Arabic if available and non-empty
   * SMART FALLBACK: If Arabic is empty, use English. If English is empty, use original_title.
   * NEVER allow empty title fields.
   * @private
   */
  _localizeField(arValue, enValue, originalValue = null) {
    // Try Arabic first
    if (arValue && arValue.trim().length > 0) {
      return arValue;
    }
    // Fallback to English
    if (enValue && enValue.trim().length > 0) {
      return enValue;
    }
    // Final fallback to original
    if (originalValue && originalValue.trim().length > 0) {
      return originalValue;
    }
    return null;
  }

  /**
   * Normalize image URL
   * @private
   */
  _normalizeImageUrl(path, size = 'original') {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  /**
   * Extract year from date string
   * @private
   */
  _extractYear(dateString) {
    if (!dateString) return null;
    const year = parseInt(dateString.substring(0, 4));
    return (year >= 1000 && year <= 9999) ? year : null;
  }

  /**
   * Normalize genres
   * @private
   */
  _normalizeGenres(genres) {
    if (!genres || !Array.isArray(genres)) return [];
    return genres.map(g => ({ id: g.id, name: g.name }));
  }

  /**
   * Normalize cast (top 20)
   * @private
   */
  _normalizeCast(cast) {
    if (!cast || !Array.isArray(cast)) return [];
    return cast.slice(0, 20).map(c => ({
      id: c.id,
      name: c.name,
      character: c.character || '',
      profile_path: this._normalizeImageUrl(c.profile_path, 'w185'),
      order: c.order || 999
    }));
  }

  /**
   * Normalize crew (4 key roles: Director, Writer, Producer, Composer)
   * @private
   */
  _normalizeCrew(crew) {
    if (!crew || !Array.isArray(crew)) return [];
    
    const keyRoles = ['Director', 'Writer', 'Producer', 'Original Music Composer'];
    const filtered = crew.filter(c => keyRoles.includes(c.job));
    
    return filtered.slice(0, 4).map(c => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department || '',
      profile_path: this._normalizeImageUrl(c.profile_path, 'w185')
    }));
  }

  /**
   * Normalize production companies
   * @private
   */
  _normalizeProductionCompanies(companies) {
    if (!companies || !Array.isArray(companies)) return [];
    return companies.map(c => ({
      id: c.id,
      name: c.name,
      logo_path: this._normalizeImageUrl(c.logo_path, 'w185'),
      origin_country: c.origin_country || ''
    }));
  }

  /**
   * Normalize keywords (max 20)
   * @private
   */
  _normalizeKeywords(keywords) {
    if (!keywords || !Array.isArray(keywords)) return [];
    return keywords.slice(0, 20).map(k => ({ id: k.id, name: k.name }));
  }

  /**
   * Normalize videos (YouTube only, max 10)
   * @private
   */
  _normalizeVideos(videos) {
    if (!videos || !Array.isArray(videos)) return [];
    
    const youtubeVideos = videos.filter(v => v.site === 'YouTube');
    
    return youtubeVideos.slice(0, 10).map(v => ({
      id: v.id,
      key: v.key,
      name: v.name,
      site: v.site,
      type: v.type,
      official: v.official || false
    }));
  }

  /**
   * Normalize images
   * @private
   */
  _normalizeImages(images) {
    if (!images) return [];
    
    const result = [];
    
    // Backdrops
    if (images.backdrops && Array.isArray(images.backdrops)) {
      images.backdrops.slice(0, 5).forEach(img => {
        result.push({
          file_path: this._normalizeImageUrl(img.file_path, 'original'),
          type: 'backdrop',
          width: img.width,
          height: img.height
        });
      });
    }
    
    // Posters
    if (images.posters && Array.isArray(images.posters)) {
      images.posters.slice(0, 5).forEach(img => {
        result.push({
          file_path: this._normalizeImageUrl(img.file_path, 'original'),
          type: 'poster',
          width: img.width,
          height: img.height
        });
      });
    }
    
    return result;
  }

  /**
   * Normalize networks
   * @private
   */
  _normalizeNetworks(networks) {
    if (!networks || !Array.isArray(networks)) return [];
    return networks.map(n => ({
      id: n.id,
      name: n.name,
      logo_path: this._normalizeImageUrl(n.logo_path, 'w185')
    }));
  }

  /**
   * Normalize seasons (season_number >= 0, EXCLUDE season 0)
   * @private
   */
  _normalizeSeasons(seasons) {
    if (!seasons || !Array.isArray(seasons)) return [];
    
    return seasons
      .filter(s => s.season_number > 0) // EXCLUDE season 0 (behind-the-scenes)
      .map(s => ({
        id: s.id,
        season_number: s.season_number,
        name: s.name,
        episode_count: s.episode_count || 0,
        air_date: s.air_date || null,
        poster_path: this._normalizeImageUrl(s.poster_path, 'w500')
      }));
  }

  /**
   * Deep fetch episodes data for TV series
   * Makes additional requests to /tv/{id}/season/{n} for each season
   * Excludes season 0 (behind-the-scenes content)
   * 
   * @param {string} seriesId - TMDB series ID
   * @param {object} arData - Arabic series data
   * @param {object} enData - English series data
   * @returns {Promise<object>} - { seasons: [...], episodes: [...] }
   * @private
   */
  async _deepFetchEpisodes(seriesId, arData, enData) {
    const seasons = arData.seasons || enData.seasons || [];
    
    // Filter out season 0
    const validSeasons = seasons.filter(s => s.season_number > 0);
    
    if (validSeasons.length === 0) {
      return { seasons: [], episodes: [] };
    }

    const allSeasons = [];
    const allEpisodes = [];

    // Fetch each season's details
    for (const season of validSeasons) {
      try {
        const seasonData = await this._makeRequest(`/tv/${seriesId}/season/${season.season_number}`, {
          language: 'ar-SA'
        });

        allSeasons.push({
          season_number: seasonData.season_number,
          name: seasonData.name,
          overview: seasonData.overview,
          air_date: seasonData.air_date,
          poster_path: seasonData.poster_path,
          episode_count: seasonData.episodes?.length || 0
        });

        // Extract episodes
        if (seasonData.episodes && Array.isArray(seasonData.episodes)) {
          const episodes = seasonData.episodes.map(ep => ({
            season_number: seasonData.season_number,
            episode_number: ep.episode_number,
            name: ep.name,
            overview: ep.overview,
            still_path: ep.still_path,
            air_date: ep.air_date,
            vote_average: ep.vote_average || 0,
            vote_count: ep.vote_count || 0,
            runtime: ep.runtime
          }));

          allEpisodes.push(...episodes);
        }

      } catch (error) {
        console.error(`Failed to fetch season ${season.season_number} for series ${seriesId}:`, error.message);
        // Continue with other seasons
      }
    }

    return { seasons: allSeasons, episodes: allEpisodes };
  }

  /**
   * Fetch from TMDB API
   * @private
   */
  async _fetchFromTMDB(id, contentType, language) {
    const endpoint = this._getDetailsEndpoint(id, contentType);
    
    return await this._makeRequest(endpoint, {
      language,
      append_to_response: 'credits,videos,images,keywords'
    });
  }

  /**
   * Get details endpoint
   * @private
   */
  _getDetailsEndpoint(id, contentType) {
    if (contentType === 'movie') {
      return `/movie/${id}`;
    } else if (contentType === 'tv_series') {
      return `/tv/${id}`;
    } else if (contentType === 'actor') {
      return `/person/${id}`;
    } else if (contentType === 'game') {
      // TMDB doesn't have games - use movie endpoint as fallback
      return `/movie/${id}`;
    } else if (contentType === 'software') {
      // TMDB doesn't have software - use movie endpoint as fallback
      return `/movie/${id}`;
    } else {
      throw new Error(`Unknown content_type: ${contentType}`);
    }
  }

  /**
   * Get search endpoint
   * @private
   */
  _getSearchEndpoint(contentType) {
    if (contentType === 'movie') {
      return '/search/movie';
    } else if (contentType === 'tv_series') {
      return '/search/tv';
    } else if (contentType === 'actor') {
      return '/search/person';
    } else {
      throw new Error(`Unknown content_type: ${contentType}`);
    }
  }

  /**
   * Make HTTP request to TMDB with rate limiting
   * @private
   */
  async _makeRequest(endpoint, params = {}) {
    // Rate limiting
    await this._rateLimit();

    const url = `${TMDB_BASE_URL}${endpoint}`;
    
    try {
      const response = await axios.get(url, {
        params: {
          api_key: this.apiKey,
          ...params
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`TMDB API error: ${error.response.status} - ${error.response.data.status_message || 'Unknown error'}`);
      } else if (error.request) {
        throw new Error('TMDB API request timeout or network error');
      } else {
        throw error;
      }
    }
  }

  /**
   * Rate limiting
   * @private
   */
  async _rateLimit() {
    const now = Date.now();
    const minInterval = 1000 / this.requestsPerSecond;
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

export default TMDBAdapter;
