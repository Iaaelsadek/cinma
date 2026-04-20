/**
 * Data Helpers - Utility functions for data validation and extraction
 * 
 * This file contains helper functions for:
 * - Slug validation and filtering
 * - US certification extraction from movie data
 * - US TV rating extraction from series data
 * - Genre caching and fetching from CockroachDB API
 * - Advanced search functionality using CockroachDB API
 */

import { errorLogger } from '../services/errorLogging'
import axios from 'axios'

// ============================================================================
// SLUG VALIDATION
// ============================================================================

/**
 * Check if a slug is valid
 * @param slug - The slug to validate
 * @returns true if slug is valid (non-null, non-empty, not 'content')
 */
export function isValidSlug(slug: string | null | undefined): boolean {
  return Boolean(slug && slug.trim() !== '' && slug !== 'content')
}

/**
 * Filter items without valid slugs
 * @param items - Array of items with optional slug property
 * @returns Array of items with valid slugs only
 */
export function filterValidSlugs<T extends { slug?: string | null }>(items: T[]): T[] {
  return items.filter(item => isValidSlug(item.slug))
}

// ============================================================================
// CERTIFICATION & RATING EXTRACTION
// ============================================================================

/**
 * Extract US certification from movie data
 * @param movie - Movie data from CockroachDB
 * @returns US certification in uppercase or empty string
 */
export function extractUsCertification(movie: any): string {
  try {
    const releaseDates = movie?.release_dates?.results as Array<{
      iso_3166_1: string
      release_dates: Array<{ certification?: string }>
    }> | undefined
    
    if (!Array.isArray(releaseDates)) return ''
    
    const us = releaseDates.find(r => r.iso_3166_1 === 'US')
    const cert = us?.release_dates?.[0]?.certification
    
    return cert ? cert.toUpperCase() : ''
  } catch (error: any) {
    errorLogger.logError({
      message: 'Failed to extract US certification',
      severity: 'low',
      category: 'media',
      context: { error, movieId: movie?.id }
    })
    return ''
  }
}

/**
 * Extract US TV rating from series data
 * @param series - TV series data from CockroachDB
 * @returns US rating in uppercase or empty string
 */
export function extractUsTvRating(series: any): string {
  try {
    const contentRatings = series?.content_ratings?.results as Array<{
      iso_3166_1: string
      rating?: string
    }> | undefined
    
    if (!Array.isArray(contentRatings)) return ''
    
    const us = contentRatings.find(r => r.iso_3166_1 === 'US')
    
    return us?.rating ? us.rating.toUpperCase() : ''
  } catch (error: any) {
    errorLogger.logError({
      message: 'Failed to extract US TV rating',
      severity: 'low',
      category: 'media',
      context: { error, seriesId: series?.id }
    })
    return ''
  }
}

// ============================================================================
// GENRE CACHING & FETCHING
// ============================================================================

interface GenreCache {
  data: Array<{ id: number; name: string }>
  timestamp: number
}

const genreCache: Record<string, GenreCache> = {}
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch genres from CockroachDB API with caching
 * @param type - 'movie' or 'tv'
 * @returns Array of genres
 */
export async function fetchGenresFromAPI(type: 'movie' | 'tv'): Promise<Array<{ id: number; name: string }>> {
  try {
    // Check cache first
    const cacheKey = `genres_${type}`
    const cached = genreCache[cacheKey]
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data
    }
    
    // Fetch from API
    const response = await axios.get(`/api/genres`, {
      params: { type }
    })
    
    const genres = response.data.genres || []
    
    // Update cache
    genreCache[cacheKey] = {
      data: genres,
      timestamp: Date.now()
    }
    
    return genres
  } catch (error: any) {
    errorLogger.logError({
      message: 'Failed to fetch genres from API',
      severity: 'medium',
      category: 'network',
      context: { error, type }
    })
    
    // Return cached data if available, otherwise empty array
    const cacheKey = `genres_${type}`
    return genreCache[cacheKey]?.data || []
  }
}

// ============================================================================
// ADVANCED SEARCH
// ============================================================================

export interface AdvancedSearchParams {
  query?: string
  types?: Array<'movie' | 'tv' | 'anime'>
  genres?: number[]
  yearFrom?: number
  yearTo?: number
  ratingFrom?: number
  ratingTo?: number
  language?: string
  keywords?: string
  sort?: string
  page?: number
}

interface SearchResult {
  id: number
  slug?: string
  title?: string
  name?: string
  media_type: 'movie' | 'tv'
  popularity?: number
  vote_average?: number
  release_date?: string
  first_air_date?: string
  [key: string]: any
}

/**
 * Advanced search using CockroachDB API
 * @param params - Search parameters
 * @returns Search results with movies and TV series
 */
export async function advancedSearchFromAPI(params: AdvancedSearchParams) {
  const {
    query = '',
    types = ['movie'],
    genres = [],
    yearFrom,
    yearTo,
    ratingFrom,
    ratingTo,
    language,
    keywords,
    sort = 'popularity',
    page = 1
  } = params
  
  try {
    const doAnime = types.includes('anime')
    const doMovie = types.includes('movie')
    const doTv = types.includes('tv') || doAnime
    
    const promises: Array<Promise<{ results: SearchResult[]; total_pages: number }>> = []
    
    // Search movies
    if (doMovie) {
      const movieParams: any = {
        page,
        limit: 20,
        sort: sort === 'popularity' ? 'popularity' : sort === 'vote_average' ? 'vote_average' : 'release_date'
      }
      
      if (query) movieParams.query = query
      if (genres.length > 0) movieParams.genres = genres.join(',')
      if (yearFrom) movieParams.yearFrom = yearFrom
      if (yearTo) movieParams.yearTo = yearTo
      if (ratingFrom) movieParams.ratingFrom = ratingFrom
      if (ratingTo) movieParams.ratingTo = ratingTo
      if (language) movieParams.language = language
      if (keywords) movieParams.keywords = keywords
      
      const moviePromise = axios.get('/api/movies', { params: movieParams })
        .then(r => ({
          results: (r.data.results || []).map((item: any) => ({ ...item, media_type: 'movie' as const })),
          total_pages: r.data.total_pages || 1
        }))
      
      promises.push(moviePromise)
    }
    
    // Search TV series
    if (doTv) {
      const tvParams: any = {
        page,
        limit: 20,
        sort: sort === 'popularity' ? 'popularity' : sort === 'vote_average' ? 'vote_average' : 'first_air_date'
      }
      
      if (query) tvParams.query = query
      if (genres.length > 0) tvParams.genres = genres.join(',')
      if (yearFrom) tvParams.yearFrom = yearFrom
      if (yearTo) tvParams.yearTo = yearTo
      if (ratingFrom) tvParams.ratingFrom = ratingFrom
      if (ratingTo) tvParams.ratingTo = ratingTo
      if (doAnime) {
        tvParams.language = 'ja'
        // Add animation genre if not already included
        const genreList = genres.length > 0 ? [...genres] : []
        if (!genreList.includes(16)) genreList.push(16)
        tvParams.genres = genreList.join(',')
      } else if (language) {
        tvParams.language = language
      }
      if (keywords) tvParams.keywords = keywords
      
      const tvPromise = axios.get('/api/tv', { params: tvParams })
        .then(r => ({
          results: (r.data.results || []).map((item: any) => ({ ...item, media_type: 'tv' as const })),
          total_pages: r.data.total_pages || 1
        }))
      
      promises.push(tvPromise)
    }
    
    const results = await Promise.all(promises)
    
    if (results.length === 1) {
      // Filter valid slugs before returning
      return {
        page,
        results: filterValidSlugs(results[0].results),
        total_pages: results[0].total_pages
      }
    }
    
    // Merge movie + TV results and sort by popularity
    const allResults = [...(results[0]?.results || []), ...(results[1]?.results || [])]
    allResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    
    return {
      page,
      results: filterValidSlugs(allResults),
      total_pages: Math.max(results[0]?.total_pages || 1, results[1]?.total_pages || 1)
    }
  } catch (error: any) {
    errorLogger.logError({
      message: 'Advanced search failed',
      severity: 'medium',
      category: 'network',
      context: { error, params }
    })
    
    // Return empty results as fallback
    return {
      page: 1,
      results: [],
      total_pages: 1
    }
  }
}
