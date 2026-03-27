/**
 * 🔍 استعلامات المحتوى الموحدة - اونلاين سينما
 * Unified Content Queries
 * 
 * @description استعلامات موحدة 100% بين الموقع والتطبيق
 * @author Online Cinema Team
 * @version 1.0.0
 */

import { supabase } from '../lib/supabase';
import type { Movie, TVSeries } from '../types/database';

// ==========================================
// Types
// ==========================================
export interface ContentFilters {
  genres?: string[];
  minRating?: number;
  minYear?: number;
  maxYear?: number;
  language?: string;
  isVisible?: boolean;
  minHealthScore?: number;
}

export interface ContentSort {
  field: 'popularity' | 'rating' | 'release_date' | 'trending_score' | 'quality_score';
  order: 'asc' | 'desc';
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

// ==========================================
// Movies Queries
// ==========================================

/**
 * جلب الأفلام مع الفلاتر والترتيب
 */
export async function getMovies(
  filters: ContentFilters = {},
  sort: ContentSort = { field: 'popularity', order: 'desc' },
  pagination: PaginationOptions = { page: 1, limit: 20 }
) {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('movies')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.isVisible !== undefined) {
    query = query.eq('is_visible', filters.isVisible);
  } else {
    // Default: only visible content
    query = query.eq('is_visible', true);
  }

  if (filters.minHealthScore) {
    query = query.gte('quality_score', filters.minHealthScore);
  }

  if (filters.genres && filters.genres.length > 0) {
    query = query.contains('genres', filters.genres);
  }

  if (filters.minRating) {
    query = query.gte('rating', filters.minRating);
  }

  if (filters.minYear || filters.maxYear) {
    if (filters.minYear) {
      query = query.gte('release_date', `${filters.minYear}-01-01`);
    }
    if (filters.maxYear) {
      query = query.lte('release_date', `${filters.maxYear}-12-31`);
    }
  }

  if (filters.language) {
    query = query.eq('original_language', filters.language);
  }

  // Apply sorting
  const sortField = sort.field === 'rating' ? 'vote_average' : 
                    sort.field === 'release_date' ? 'release_date' :
                    sort.field === 'trending_score' ? 'trending_score' :
                    sort.field === 'quality_score' ? 'quality_score' :
                    'popularity_score';
  
  query = query.order(sortField, { ascending: sort.order === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {throw error;}

  return {
    data: data as Movie[],
    count: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}


/**
 * جلب المسلسلات مع الفلاتر والترتيب
 */
export async function getTVSeries(
  filters: ContentFilters = {},
  sort: ContentSort = { field: 'popularity', order: 'desc' },
  pagination: PaginationOptions = { page: 1, limit: 20 }
) {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('tv_series')
    .select('*', { count: 'exact' });

  // Apply filters (same as movies)
  if (filters.isVisible !== undefined) {
    query = query.eq('is_visible', filters.isVisible);
  } else {
    query = query.eq('is_visible', true);
  }

  if (filters.minHealthScore) {
    query = query.gte('quality_score', filters.minHealthScore);
  }

  if (filters.genres && filters.genres.length > 0) {
    query = query.contains('genres', filters.genres);
  }

  if (filters.minRating) {
    query = query.gte('rating', filters.minRating);
  }

  if (filters.minYear || filters.maxYear) {
    if (filters.minYear) {
      query = query.gte('first_air_date', `${filters.minYear}-01-01`);
    }
    if (filters.maxYear) {
      query = query.lte('first_air_date', `${filters.maxYear}-12-31`);
    }
  }

  if (filters.language) {
    query = query.eq('original_language', filters.language);
  }

  // Apply sorting
  const sortField = sort.field === 'rating' ? 'vote_average' : 
                    sort.field === 'release_date' ? 'first_air_date' :
                    sort.field === 'trending_score' ? 'trending_score' :
                    sort.field === 'quality_score' ? 'quality_score' :
                    'popularity_score';
  
  query = query.order(sortField, { ascending: sort.order === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {throw error;}

  return {
    data: data as TVSeries[],
    count: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * جلب تفاصيل فيلم
 */
export async function getMovieDetails(movieId: number) {
  const { data, error } = await supabase
    .from('movies')
    .select('*')
    .eq('id', movieId)
    .single();

  if (error) {throw error;}
  return data as Movie;
}

/**
 * جلب تفاصيل مسلسل
 */
export async function getTVSeriesDetails(seriesId: number) {
  const { data, error } = await supabase
    .from('tv_series')
    .select('*')
    .eq('id', seriesId)
    .single();

  if (error) {throw error;}
  return data as TVSeries;
}

/**
 * البحث في الأفلام والمسلسلات
 */
export async function searchContent(
  query: string,
  contentType: 'movie' | 'tv' | 'all' = 'all',
  pagination: PaginationOptions = { page: 1, limit: 20 }
): Promise<unknown> {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  if (contentType === 'all') {
    // Search both movies and TV series
    const [moviesResult, tvResult] = await Promise.all([
      searchContent(query, 'movie', pagination),
      searchContent(query, 'tv', pagination),
    ]);

    return {
      movies: moviesResult.data,
      tvSeries: tvResult.data,
      totalCount: moviesResult.count + tvResult.count,
    };
  }

  const table = contentType === 'movie' ? 'movies' : 'tv_series';
  const titleField = contentType === 'movie' ? 'title' : 'name';

  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .eq('is_visible', true)
    .or(`${titleField}.ilike.%${query}%,overview.ilike.%${query}%`)
    .order('popularity_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {throw error;}

  return {
    data: data as (Movie | TVSeries)[],
    count: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * جلب المحتوى الشائع
 */
export async function getTrending(
  contentType: 'movie' | 'tv' | 'all' = 'all',
  limit: number = 20
): Promise<any> {
  if (contentType === 'all') {
    const movies = await getTrending('movie', limit / 2) as { data: Movie[] };
    const tvSeries = await getTrending('tv', limit / 2) as { data: TVSeries[] };

    return {
      movies: movies.data,
      tvSeries: tvSeries.data,
    };
  }

  const table = contentType === 'movie' ? 'movies' : 'tv_series';

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('is_visible', true)
    .order('trending_score', { ascending: false })
    .limit(limit);

  if (error) {throw error;}

  return {
    data: data as (Movie | TVSeries)[],
  };
}

/**
 * جلب الأعلى تقييماً
 */
export async function getTopRated(
  contentType: 'movie' | 'tv' = 'movie',
  limit: number = 20
) {
  const table = contentType === 'movie' ? 'movies' : 'tv_series';

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('is_visible', true)
    .gte('vote_count', 100) // At least 100 votes
    .order('vote_average', { ascending: false })
    .limit(limit);

  if (error) {throw error;}

  return {
    data: data as (Movie | TVSeries)[],
  };
}

export default {
  getMovies,
  getTVSeries,
  getMovieDetails,
  getTVSeriesDetails,
  searchContent,
  getTrending,
  getTopRated,
};
