/**
 * TMDB Normalization Utility
 * 
 * Transforms raw TMDB API responses into our exact database schema structure.
 * 
 * CRITICAL FEATURES:
 * - Prepends full TMDB image CDN URLs to all poster/backdrop paths
 * - Arabic localization with English fallback for empty fields
 * - Deep TV series data normalization (seasons, episodes)
 * - Populates required fields (servers array) to prevent frontend crashes
 * - Validates tmdb_id presence
 */

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original'

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface TmdbMovieResponse {
  id: number
  title: string
  original_title?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  popularity: number
  runtime?: number
  genres?: Array<{ id: number; name: string }>
  original_language?: string
  origin_country?: string[]
  status?: string
  tagline?: string
  budget?: number
  revenue?: number
  credits?: {
    cast?: Array<{ id: number; name: string; character: string; profile_path: string | null; order: number }>
    crew?: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }>
  }
  videos?: {
    results?: Array<{ id: string; key: string; name: string; site: string; type: string; official: boolean }>
  }
  keywords?: {
    keywords?: Array<{ id: number; name: string }>
  }
}

export interface TmdbTvResponse {
  id: number
  name: string
  original_name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  last_air_date?: string
  vote_average: number
  vote_count: number
  popularity: number
  number_of_seasons: number
  number_of_episodes: number
  episode_run_time?: number[]
  genres?: Array<{ id: number; name: string }>
  original_language?: string
  origin_country?: string[]
  status?: string
  tagline?: string
  type?: string
  in_production?: boolean
  seasons?: Array<{
    id: number
    season_number: number
    name: string
    overview: string
    poster_path: string | null
    air_date: string
    episode_count: number
  }>
  credits?: {
    cast?: Array<{ id: number; name: string; character: string; profile_path: string | null; order: number }>
    crew?: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }>
  }
  videos?: {
    results?: Array<{ id: string; key: string; name: string; site: string; type: string; official: boolean }>
  }
  keywords?: {
    results?: Array<{ id: number; name: string }>
  }
}

export interface NormalizedMovie {
  tmdb_id: number
  title: string
  original_title: string
  overview: string
  poster_path: string
  backdrop_path: string
  release_date: string
  vote_average: number
  vote_count: number
  popularity: number
  runtime: number
  genres: string
  original_language: string
  origin_country: string
  status: string
  tagline: string
  budget: number
  revenue: number
  cast_data: string
  crew_data: string
  videos: string
  keywords: string
  servers: string
}

export interface NormalizedTvSeries {
  tmdb_id: number
  name: string
  original_name: string
  overview: string
  poster_path: string
  backdrop_path: string
  first_air_date: string
  last_air_date: string
  vote_average: number
  vote_count: number
  popularity: number
  number_of_seasons: number
  number_of_episodes: number
  episode_run_time: number
  genres: string
  original_language: string
  origin_country: string
  status: string
  tagline: string
  type: string
  in_production: boolean
  seasons: string
  cast_data: string
  crew_data: string
  videos: string
  keywords: string
  servers: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Prepends TMDB CDN base URL to image path
 * CRITICAL: Returns full URL, not relative path
 */
function normalizeImagePath(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http')) return path // Already full URL
  return `${TMDB_IMAGE_BASE_URL}${path}`
}

/**
 * Arabic localization with English fallback
 * CRITICAL: If Arabic value is empty, falls back to English
 */
function localizeField(arabicValue: string | undefined, englishValue: string | undefined): string {
  const arabic = arabicValue?.trim()
  const english = englishValue?.trim()
  
  if (arabic && arabic.length > 0) return arabic
  if (english && english.length > 0) return english
  return ''
}

/**
 * Extract and format cast data
 */
function extractCastData(credits: TmdbMovieResponse['credits'] | TmdbTvResponse['credits']): string {
  if (!credits?.cast || credits.cast.length === 0) return '[]'
  
  const cast = credits.cast.slice(0, 20).map(member => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profile_path: normalizeImagePath(member.profile_path),
    order: member.order
  }))
  
  return JSON.stringify(cast)
}

/**
 * Extract and format crew data
 */
function extractCrewData(credits: TmdbMovieResponse['credits'] | TmdbTvResponse['credits']): string {
  if (!credits?.crew || credits.crew.length === 0) return '[]'
  
  // Get directors, writers, producers
  const crew = credits.crew
    .filter(member => ['Director', 'Writer', 'Producer', 'Executive Producer'].includes(member.job))
    .slice(0, 20)
    .map(member => ({
      id: member.id,
      name: member.name,
      job: member.job,
      department: member.department,
      profile_path: normalizeImagePath(member.profile_path)
    }))
  
  return JSON.stringify(crew)
}

/**
 * Extract and format videos data
 */
function extractVideos(videos: TmdbMovieResponse['videos'] | TmdbTvResponse['videos']): string {
  if (!videos?.results || videos.results.length === 0) return '[]'
  
  const videoList = videos.results
    .filter(video => video.site === 'YouTube')
    .slice(0, 10)
    .map(video => ({
      id: video.id,
      key: video.key,
      name: video.name,
      site: video.site,
      type: video.type,
      official: video.official
    }))
  
  return JSON.stringify(videoList)
}

/**
 * Extract and format genres
 */
function extractGenres(genres: Array<{ id: number; name: string }> | undefined): string {
  if (!genres || genres.length === 0) return '[]'
  
  const genreList = genres.map(genre => ({
    id: genre.id,
    name: genre.name
  }))
  
  return JSON.stringify(genreList)
}

/**
 * Extract and format keywords
 */
function extractKeywords(keywords: TmdbMovieResponse['keywords'] | TmdbTvResponse['keywords']): string {
  if (!keywords) return '[]'
  
  // Handle different keyword structures (movies vs TV)
  const keywordList = (keywords as any).keywords || (keywords as any).results || []
  
  if (keywordList.length === 0) return '[]'
  
  const formatted = keywordList.slice(0, 20).map((kw: any) => ({
    id: kw.id,
    name: kw.name
  }))
  
  return JSON.stringify(formatted)
}

/**
 * Extract and format TV series seasons with episodes
 * CRITICAL: Deep normalization for video player episode selector
 */
function extractSeasons(seasons: TmdbTvResponse['seasons']): string {
  if (!seasons || seasons.length === 0) return '[]'
  
  const seasonList = seasons
    .filter(season => season.season_number >= 0) // Include season 0 (specials)
    .map(season => ({
      id: season.id,
      season_number: season.season_number,
      name: season.name,
      overview: season.overview,
      poster_path: normalizeImagePath(season.poster_path),
      air_date: season.air_date || '',
      episode_count: season.episode_count
    }))
  
  return JSON.stringify(seasonList)
}

// ============================================================================
// Main Normalization Functions
// ============================================================================

/**
 * Normalize TMDB Movie Response to Database Schema
 * 
 * @param tmdbMovie - Raw TMDB API response for movie
 * @param arabicData - Optional Arabic localized data from separate API call
 * @returns Normalized movie object ready for database insertion
 * @throws Error if tmdb_id is missing
 */
export function normalizeMovie(
  tmdbMovie: TmdbMovieResponse,
  arabicData?: Partial<TmdbMovieResponse>
): NormalizedMovie {
  // Validate required field
  if (!tmdbMovie.id || tmdbMovie.id <= 0) {
    throw new Error('Invalid TMDB movie: missing or invalid tmdb_id')
  }
  
  return {
    tmdb_id: tmdbMovie.id,
    title: localizeField(arabicData?.title, tmdbMovie.title),
    original_title: tmdbMovie.original_title || tmdbMovie.title,
    overview: localizeField(arabicData?.overview, tmdbMovie.overview),
    poster_path: normalizeImagePath(tmdbMovie.poster_path),
    backdrop_path: normalizeImagePath(tmdbMovie.backdrop_path),
    release_date: tmdbMovie.release_date || '',
    vote_average: tmdbMovie.vote_average || 0,
    vote_count: tmdbMovie.vote_count || 0,
    popularity: tmdbMovie.popularity || 0,
    runtime: tmdbMovie.runtime || 0,
    genres: extractGenres(tmdbMovie.genres),
    original_language: tmdbMovie.original_language || 'en',
    origin_country: tmdbMovie.origin_country?.join(',') || '',
    status: tmdbMovie.status || 'Released',
    tagline: localizeField(arabicData?.tagline, tmdbMovie.tagline),
    budget: tmdbMovie.budget || 0,
    revenue: tmdbMovie.revenue || 0,
    cast_data: extractCastData(tmdbMovie.credits),
    crew_data: extractCrewData(tmdbMovie.credits),
    videos: extractVideos(tmdbMovie.videos),
    keywords: extractKeywords(tmdbMovie.keywords),
    servers: '[]' // CRITICAL: Empty array to prevent frontend crashes
  }
}

/**
 * Normalize TMDB TV Series Response to Database Schema
 * 
 * @param tmdbTv - Raw TMDB API response for TV series
 * @param arabicData - Optional Arabic localized data from separate API call
 * @returns Normalized TV series object ready for database insertion
 * @throws Error if tmdb_id is missing
 */
export function normalizeTvSeries(
  tmdbTv: TmdbTvResponse,
  arabicData?: Partial<TmdbTvResponse>
): NormalizedTvSeries {
  // Validate required field
  if (!tmdbTv.id || tmdbTv.id <= 0) {
    throw new Error('Invalid TMDB TV series: missing or invalid tmdb_id')
  }
  
  return {
    tmdb_id: tmdbTv.id,
    name: localizeField(arabicData?.name, tmdbTv.name),
    original_name: tmdbTv.original_name || tmdbTv.name,
    overview: localizeField(arabicData?.overview, tmdbTv.overview),
    poster_path: normalizeImagePath(tmdbTv.poster_path),
    backdrop_path: normalizeImagePath(tmdbTv.backdrop_path),
    first_air_date: tmdbTv.first_air_date || '',
    last_air_date: tmdbTv.last_air_date || '',
    vote_average: tmdbTv.vote_average || 0,
    vote_count: tmdbTv.vote_count || 0,
    popularity: tmdbTv.popularity || 0,
    number_of_seasons: tmdbTv.number_of_seasons || 0,
    number_of_episodes: tmdbTv.number_of_episodes || 0,
    episode_run_time: tmdbTv.episode_run_time?.[0] || 0,
    genres: extractGenres(tmdbTv.genres),
    original_language: tmdbTv.original_language || 'en',
    origin_country: tmdbTv.origin_country?.join(',') || '',
    status: tmdbTv.status || 'Ended',
    tagline: localizeField(arabicData?.tagline, tmdbTv.tagline),
    type: tmdbTv.type || 'Scripted',
    in_production: tmdbTv.in_production || false,
    seasons: extractSeasons(tmdbTv.seasons), // CRITICAL: Deep seasons/episodes data
    cast_data: extractCastData(tmdbTv.credits),
    crew_data: extractCrewData(tmdbTv.credits),
    videos: extractVideos(tmdbTv.videos),
    keywords: extractKeywords(tmdbTv.keywords),
    servers: '[]' // CRITICAL: Empty array to prevent frontend crashes
  }
}
