// src/lib/db.ts - CockroachDB utility functions (via server API)

const IS_SERVER = typeof window === 'undefined';
const API_BASE = IS_SERVER ? 'http://localhost:3001' : '';

export interface Movie {
  id: number;
  slug?: string;
  title: string;
  original_title?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult?: boolean;
  original_language?: string;
  runtime?: number;
  status?: string;
  tagline?: string;
  budget?: number;
  revenue?: number;
  genres?: Array<{ id: number; name: string }>;
  cast_data?: any[];
  crew_data?: any[];
  similar_content?: any[];
  production_companies?: any[];
  keywords?: any[];
  videos?: any[];
  images?: any[];
  ai_summary?: string | null;
  trailer_url?: string | null;
}

export interface TVSeries {
  id: number;
  slug?: string;
  name: string;
  original_name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  first_air_date?: string;
  last_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  genres?: Array<{ id: number; name: string }>;
  cast_data?: any[];
  networks?: any[];
  seasons?: any[];
}

export interface SearchParams {
  query?: string;
  genre?: string;
  min_rating?: number;
  year?: number;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: number;
  slug?: string;
  name: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  air_date?: string;
  vote_average: number;
  popularity: number;
  genres?: any[];
  media_type: 'movie' | 'tv';
}

// Trending movies
export async function getTrendingMoviesDB(limit = 20): Promise<Movie[]> {
  const res = await fetch(`${API_BASE}/api/movies?sortBy=trending&limit=${limit}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// Movie by ID or Slug
export async function getMovieByIdDB(identifier: number | string): Promise<Movie | null> {
  const res = await fetch(`${API_BASE}/api/movies/${identifier}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return res.json();
}

// Search movies
export async function searchMoviesDB(params: SearchParams): Promise<Movie[]> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.append('q', params.query);
  if (params.genre) queryParams.append('genre', params.genre);
  if (params.min_rating) queryParams.append('ratingFrom', params.min_rating.toString());
  if (params.year) queryParams.append('yearFrom', params.year.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/api/movies?${queryParams.toString()}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// Trending TV series
export async function getTrendingTVDB(limit = 20): Promise<TVSeries[]> {
  const res = await fetch(`${API_BASE}/api/tv?sortBy=trending&limit=${limit}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// TV series by ID or Slug
export async function getTVByIdDB(identifier: number | string): Promise<TVSeries | null> {
  const res = await fetch(`${API_BASE}/api/tv/${identifier}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return res.json();
}

// Search TV series
export async function searchTVDB(params: SearchParams): Promise<TVSeries[]> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.append('q', params.query);
  if (params.genre) queryParams.append('genre', params.genre);
  if (params.min_rating) queryParams.append('ratingFrom', params.min_rating.toString());
  if (params.year) queryParams.append('yearFrom', params.year.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/api/tv?${queryParams.toString()}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// Get seasons for a TV series
export async function getSeasonsDB(seriesId: number): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/tv/${seriesId}/seasons`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// Get episodes for a season
export async function getEpisodesDB(seasonId: number): Promise<any[]> {
  // Note: This endpoint needs to be updated to match the new API structure
  // The new API uses /api/tv/:slug/season/:number/episodes
  // For now, keeping the old endpoint structure
  const res = await fetch(`${API_BASE}/api/tv/seasons/${seasonId}/episodes`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// Unified search (movies + TV)
export async function searchAllDB(q: string, limit = 20): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();

  // Combine movies and TV results
  const movies = (result.movies || []).map((item: any) => ({
    ...item,
    media_type: 'movie' as const,
    name: item.title,
    air_date: item.release_date
  }));

  const tv = (result.tv || []).map((item: any) => ({
    ...item,
    media_type: 'tv' as const,
    air_date: item.first_air_date
  }));

  return [...movies, ...tv];
}

// Unified search wrapper for inline dynamic imports in UI
export async function searchDB(params: {
  query?: string;
  type?: 'movies' | 'tv' | 'all';
  limit?: number;
}): Promise<SearchResult[]> {
  const { query, type = 'all', limit = 20 } = params;
  if (type === 'movies') {
    const data = await searchMoviesDB({ query, limit });
    return data as unknown as SearchResult[];
  }
  if (type === 'tv') {
    const data = await searchTVDB({ query, limit });
    return data as unknown as SearchResult[];
  }
  // all
  const data = await searchAllDB(query ?? '', limit);
  // Normalize to SearchResult[]
  return data as unknown as SearchResult[];
}

// DB health check
export async function checkDBHealth(): Promise<{
  status: string;
  movies: number;
  tv_series: number;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}

// Random movies (for hero/discovery)
export async function getRandomMoviesDB(limit = 10, minRating = 6.0): Promise<Movie[]> {
  try {
    const res = await fetch(`${API_BASE}/api/movies?sortBy=popularity&ratingFrom=${minRating}&limit=${limit}`);
    if (!res.ok) {
      return [];
    }
    const result = await res.json();
    return result.data || [];
  } catch {
    return [];
  }
}

// Random TV series (for hero/discovery)
export async function getRandomTVDB(limit = 10, minRating = 6.0): Promise<TVSeries[]> {
  try {
    const res = await fetch(`${API_BASE}/api/tv?sortBy=popularity&ratingFrom=${minRating}&limit=${limit}`);
    if (!res.ok) {
      return [];
    }
    const result = await res.json();
    return result.data || [];
  } catch {
    return [];
  }
}

// ==========================================
// SOFTWARE INTERFACES & FUNCTIONS
// ==========================================

export interface Software {
  id: number;
  title: string;
  description?: string;
  poster_url?: string;
  backdrop_url?: string;
  release_date?: string;
  rating?: number;
  rating_count?: number;
  popularity?: number;
  category?: string;
  license_type?: string;
  download_url?: string;
  version?: string;
  size?: string;
  platform?: string;
}

export interface SoftwareSearchParams {
  query?: string;
  category?: string;
  license_type?: string;
  min_rating?: number;
  page?: number;
  limit?: number;
}

// Trending software
export async function getTrendingSoftwareDB(limit = 20): Promise<Software[]> {
  const res = await fetch(`${API_BASE}/api/software?sortBy=trending&limit=${limit}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// Software by ID or Slug
export async function getSoftwareByIdDB(identifier: number | string): Promise<Software | null> {
  const res = await fetch(`${API_BASE}/api/software/${identifier}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return res.json();
}

// Search software
export async function searchSoftwareDB(params: SoftwareSearchParams): Promise<Software[]> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.append('q', params.query);
  if (params.category) queryParams.append('category', params.category);
  if (params.license_type) queryParams.append('license', params.license_type);
  if (params.min_rating) queryParams.append('ratingFrom', params.min_rating.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/api/software?${queryParams.toString()}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// ==========================================
// ANIME INTERFACES & FUNCTIONS
// ==========================================

export interface Anime {
  id: number;
  title: string;
  image_url?: string;
  category?: string;
  score?: number;
}

export interface AnimeSearchParams {
  query?: string;
  category?: string;
  limit?: number;
}

// Search anime
export async function searchAnimeDB(params: AnimeSearchParams): Promise<Anime[]> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.append('q', params.query);
  if (params.category) queryParams.append('category', params.category);
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/api/anime?${queryParams.toString()}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// ==========================================
// ACTORS INTERFACES & FUNCTIONS
// ==========================================

export interface Actor {
  id: number;
  tmdb_id?: number;
  name: string;
  profile_path?: string;
  popularity?: number;
  known_for_department?: string;
  biography?: string;
  birthday?: string;
  place_of_birth?: string;
  known_for?: any[];
}

export interface ActorSearchParams {
  query?: string;
  page?: number;
  limit?: number;
}

// Trending actors
export async function getTrendingActorsDB(limit = 20): Promise<Actor[]> {
  const res = await fetch(`${API_BASE}/api/actors?sortBy=popularity&limit=${limit}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// Actor by ID or Slug
export async function getActorByIdDB(identifier: number | string): Promise<Actor | null> {
  const res = await fetch(`${API_BASE}/api/actors/${identifier}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return res.json();
}

// Search actors
export async function searchActorsDB(params: ActorSearchParams): Promise<Actor[]> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.append('q', params.query);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/api/actors?${queryParams.toString()}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// ==========================================
// SLUG OPERATIONS
// ==========================================

/**
 * Generic query function for CockroachDB
 * @param query - SQL query string
 * @param params - Query parameters
 * @returns Query result rows
 */
export async function fetchDB(endpoint: string, options: RequestInit = {}): Promise<any> {
  // Get auth token from Supabase if available
  let authToken = '';
  try {
    if (typeof window !== 'undefined') {
      const { supabase } = await import('./supabase');
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token || '';
    }
  } catch (error: any) {
    console.error('[fetchDB] Failed to get auth token:', error);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Add Authorization header if token is available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new Error(`DB Fetch Failed: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Upsert content into CockroachDB
 * @param table - Table name
 * @param data - Array of objects to upsert
 * @returns Upsert result
 */
export async function upsertContentDB(table: string, data: any[]): Promise<any> {
  return fetchDB('/api/db/query', {
    method: 'POST',
    body: JSON.stringify({
      query: `INSERT INTO ${table} (${Object.keys(data[0]).join(', ')}) 
              VALUES ${data
          .map(
            (_, i) =>
              `(${Object.keys(data[0])
                .map((_, j) => `$${i * Object.keys(data[0]).length + j + 1}`)
                .join(', ')})`
          )
          .join(', ')}
              ON CONFLICT (id) DO UPDATE SET ${Object.keys(data[0])
          .filter((k) => k !== 'id')
          .map((k) => `${k} = EXCLUDED.${k}`)
          .join(', ')}`,
      params: data.flatMap((obj) => Object.values(obj)),
    }),
  });
}

/**
 * Resolve slug to ID
 */
export async function resolveSlug(
  slug: string,
  type: 'movie' | 'tv' | 'actor' | 'game' | 'software'
): Promise<number | null> {
  const table = type === 'tv' ? 'tv_series' : type === 'actor' ? 'actors' : `${type}s`;
  try {
    const res = await fetch(`${API_BASE}/slug/get-by-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, table }),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Failed to resolve slug: ${res.statusText}`);
    }

    const data = await res.json();
    return data?.id || null;
  } catch (error: any) {
    console.error(`Error resolving slug for ${type}:`, error);
    return null;
  }
}

/**
 * Get content by slug from any table
 * @param slug - URL slug to search for
 * @param table - Database table name (movies, tv_series, actors, games, software)
 * @returns Content object or null if not found
 */
export async function getContentBySlug(slug: string, table: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/slug/get-by-slug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, table }),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Failed to get content by slug: ${res.statusText}`);
    }

    return res.json();
  } catch (error: any) {
    console.error('Error fetching content by slug:', error);
    return null;
  }
}

/**
 * Update slug for existing content
 * @param id - Content ID
 * @param slug - New slug value
 * @param table - Database table name
 * @returns true if successful, false otherwise
 */
export async function updateSlug(id: number, slug: string, table: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/slug/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, slug, table }),
    });

    if (!res.ok) {
      console.error('Failed to update slug:', res.status, res.statusText);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('Error updating slug:', error);
    return false;
  }
}

/**
 * Check if a slug exists in a table
 * @param slug - Slug to check
 * @param table - Database table name
 * @returns true if slug exists, false otherwise
 */
export async function slugExists(slug: string, table: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/slug/exists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, table }),
    });

    if (!res.ok) {
      console.error('Failed to check slug existence:', res.status, res.statusText);
      return false;
    }

    const data = await res.json();
    return data?.exists === true;
  } catch (error: any) {
    console.error('Error checking slug existence:', error);
    return false;
  }
}

/**
 * Generate slugs for existing content in a table
 */
export async function generateSlugsForTable(table: string): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/slug/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table }),
    });

    if (!res.ok) {
      console.error(`Failed to generate slugs for ${table}:`, res.status, res.statusText);
      return -1;
    }

    const data = await res.json();
    return data?.count || 0;
  } catch (error: any) {
    console.error(`Error generating slugs for ${table}:`, error);
    return -1;
  }
}

// ==========================================
// DAILYMOTION INTERFACES & FUNCTIONS
// ==========================================

export interface DailyMotionVideo {
  id: string;
  slug: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  embed_url: string;
  duration?: number;
  view_count?: number;
  category?: string;
  tags?: string[];
  popularity?: number;
  created_at?: string;
}

export interface DailyMotionSearchParams {
  query?: string;
  category?: string;
  page?: number;
  limit?: number;
}

// Trending DailyMotion videos
export async function getTrendingDailyMotionDB(limit = 20): Promise<DailyMotionVideo[]> {
  const res = await fetch(`${API_BASE}/api/dailymotion?sortBy=popularity&limit=${limit}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

// DailyMotion video by ID or Slug
export async function getDailyMotionByIdDB(identifier: string): Promise<DailyMotionVideo | null> {
  const res = await fetch(`${API_BASE}/api/dailymotion/${identifier}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    return null;
  }
  return res.json();
}

// Search DailyMotion videos
export async function searchDailyMotionDB(params: DailyMotionSearchParams): Promise<DailyMotionVideo[]> {
  const queryParams = new URLSearchParams();
  if (params.query) queryParams.append('q', params.query);
  if (params.category) queryParams.append('category', params.category);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/api/dailymotion?${queryParams.toString()}`);
  if (!res.ok) {
    return [];
  }
  const result = await res.json();
  return result.data || [];
}

