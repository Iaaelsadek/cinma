/**
 * ContentValidator - Pre-Insert Validation Rules
 * 
 * Applied by CoreIngestor BEFORE slug generation.
 * A failed validation results in status='skipped' in ingestion_log.
 * 
 * Philosophy:
 * - Validation is a policy decision, not an error
 * - Skipped items are NOT retried
 * - Clear rejection reasons for debugging
 */

class ContentValidator {
  constructor(config = {}) {
    this.config = {
      allowAdultContent: config.allowAdultContent || false,
      ...config
    };
  }

  /**
   * Validate a NormalizedContent object
   * 
   * @param {NormalizedContent} content
   * @returns {{ valid: boolean, reason: string|null }}
   */
  validate(content) {
    // Special handling for actors - different validation rules
    if (content.content_type === 'actor') {
      return this._validateActor(content);
    }

    // Rule 1: Missing poster
    if (!content.poster_url || content.poster_url.trim() === '') {
      return { valid: false, reason: 'missing_poster' };
    }

    // Rule 2: Missing backdrop
    if (!content.backdrop_url || content.backdrop_url.trim() === '') {
      return { valid: false, reason: 'missing_backdrop' };
    }

    // Rule 3: Missing overview
    if (!content.overview || content.overview.trim() === '') {
      return { valid: false, reason: 'missing_overview' };
    }

    // Rule 4: Future release
    if (content.release_date) {
      const releaseDate = new Date(content.release_date);
      const now = new Date();
      
      if (!isNaN(releaseDate.getTime()) && releaseDate > now) {
        return { valid: false, reason: 'future_release' };
      }
    }

    // Rule 5: Unreleased content (STRICT)
    if (content.content_type === 'movie') {
      if (content.status && content.status !== 'Released') {
        return { valid: false, reason: 'unreleased_movie' };
      }
    }
    
    if (content.content_type === 'tv_series') {
      const validStatuses = ['Released', 'Returning Series', 'Ended'];
      if (content.status && !validStatuses.includes(content.status)) {
        return { valid: false, reason: 'unreleased_tv_series' };
      }
    }

    // Rule 6: Quality threshold (vote_average >= 5.0 AND vote_count >= 50)
    if (content.vote_average < 5.0) {
      return { valid: false, reason: 'low_rating' };
    }
    
    if (content.vote_count < 50) {
      return { valid: false, reason: 'insufficient_votes' };
    }

    // Rule 7: Invalid vote_average range
    if (content.vote_average < 0 || content.vote_average > 10) {
      return { valid: false, reason: 'invalid_vote_average' };
    }

    // Rule 8: Runtime validation
    if (content.content_type === 'movie') {
      if (!content.runtime || content.runtime < 40) {
        return { valid: false, reason: 'movie_too_short' };
      }
    }

    if (content.content_type === 'tv_series') {
      // Check episode_run_time (should be in JSONB or as array)
      const episodeRunTime = content.episode_run_time || [];
      if (Array.isArray(episodeRunTime) && episodeRunTime.length > 0) {
        const avgRuntime = episodeRunTime.reduce((a, b) => a + b, 0) / episodeRunTime.length;
        if (avgRuntime < 10) {
          return { valid: false, reason: 'episode_too_short' };
        }
      }
    }

    // Rule 9: Missing title
    if (!content.title && !content.name) {
      return { valid: false, reason: 'missing_title' };
    }

    // Rule 10: Adult content (STRICT - always reject)
    if (content.adult === true) {
      return { valid: false, reason: 'adult_content' };
    }

    // Rule 11: Excluded genres (Talk Show, News, Reality, Documentary)
    const excludedGenres = ['Talk', 'News', 'Reality', 'Documentary'];
    if (content.genres && Array.isArray(content.genres)) {
      for (const genre of content.genres) {
        const genreName = genre.name || '';
        for (const excluded of excludedGenres) {
          if (genreName.includes(excluded)) {
            return { valid: false, reason: `excluded_genre_${excluded.toLowerCase()}` };
          }
        }
      }
    }

    // All validations passed
    return { valid: true, reason: null };
  }

  /**
   * Validate actor content (different rules than movies/tv)
   * 
   * @param {NormalizedContent} content
   * @returns {{ valid: boolean, reason: string|null }}
   * @private
   */
  _validateActor(content) {
    // Rule 1: Missing profile image (actors don't have backdrop)
    if (!content.poster_url && !content.profile_url) {
      return { valid: false, reason: 'missing_profile' };
    }

    // Rule 2: Missing biography (actors don't need overview)
    if (!content.biography && !content.overview) {
      return { valid: false, reason: 'missing_biography' };
    }

    // Rule 3: Missing name
    if (!content.name && !content.title) {
      return { valid: false, reason: 'missing_name' };
    }

    // Rule 4: Adult content
    if (content.adult === true) {
      return { valid: false, reason: 'adult_content' };
    }

    // Rule 5: Popularity threshold (actors should have some recognition)
    if (content.popularity < 5.0) {
      return { valid: false, reason: 'low_popularity' };
    }

    return { valid: true, reason: null };
  }

  /**
   * Get human-readable description of rejection reason
   * 
   * @param {string} reason
   * @returns {string}
   */
  getReasonDescription(reason) {
    const descriptions = {
      missing_poster: 'Content has no poster image',
      missing_backdrop: 'Content has no backdrop image',
      missing_overview: 'Content has no overview/description',
      missing_profile: 'Actor has no profile image',
      missing_biography: 'Actor has no biography',
      missing_name: 'Actor has no name',
      low_popularity: 'Actor popularity is below 5.0',
      future_release: 'Release date is in the future',
      unreleased_movie: 'Movie status is not Released',
      unreleased_tv_series: 'TV series status is not Released/Returning Series/Ended',
      low_rating: 'Rating is below 5.0 (quality threshold)',
      insufficient_votes: 'Vote count is below 50 (reliability threshold)',
      invalid_vote_average: 'Vote average is out of range (0-10)',
      movie_too_short: 'Movie runtime is less than 40 minutes',
      episode_too_short: 'Average episode runtime is less than 10 minutes',
      missing_title: 'Content has no title',
      adult_content: 'Adult content is not allowed',
      excluded_genre_talk: 'Talk Show genre is excluded',
      excluded_genre_news: 'News genre is excluded',
      excluded_genre_reality: 'Reality genre is excluded',
      excluded_genre_documentary: 'Documentary genre is excluded'
    };

    return descriptions[reason] || 'Unknown validation failure';
  }
}

export default ContentValidator;
