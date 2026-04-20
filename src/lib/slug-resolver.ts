/**
 * Slug Resolver - Resolve slugs to content IDs
 * 
 * This module provides functionality to:
 * - Query CockroachDB by slug
 * - Fallback to TMDB search if not found
 * - Extract and prioritize year from slug
 * - LRU cache with TTL for performance
 */

import { tmdb } from './tmdb'
import { extractYearFromSlug } from './url-utils'
import { ContentNotFoundError } from './errors'
import { CONFIG } from './constants'
import { getCacheForType } from './slug-cache'

const API_BASE = CONFIG.API_BASE || ''

/**
 * Options for slug resolution
 */
export interface SlugResolutionOptions {
  slug: string
  contentType: 'movie' | 'tv' | 'software' | 'actor'
  searchTmdb?: boolean
}

/**
 * Result of slug resolution
 */
export interface SlugResolutionResult {
  contentId: number | null
  source: 'database' | 'tmdb' | 'not-found'
  metadata?: {
    title?: string
    year?: number
    correctSlug?: string
  }
}

/**
 * Resolve a slug to content ID (detailed version)
 * 
 * Resolution strategy:
 * 1. Query CockroachDB by slug
 * 2. If not found and searchTmdb=true, search TMDB
 * 3. Extract year from slug and prioritize matching results
 * 
 * @param options - Resolution options
 * @returns Resolution result with content ID and source
 */
export async function resolveSlugDetailed(options: SlugResolutionOptions): Promise<SlugResolutionResult> {
  const { slug, contentType, searchTmdb = true } = options

  if (!slug || slug.trim() === '') {
    return {
      contentId: null,
      source: 'not-found'
    }
  }

  // Step 0: Check cache first
  const cache = getCacheForType(contentType)
  const cacheKey = `${contentType}:${slug}`
  const cachedId = cache.get(cacheKey)

  if (cachedId !== undefined) {
    return {
      contentId: cachedId,
      source: 'database',
      metadata: {
        correctSlug: slug
      }
    }
  }

  // Step 1: Query CockroachDB by slug
  try {
    const dbResult = await queryDatabaseBySlug(slug, contentType)
    if (dbResult) {
      // Cache the result
      cache.set(cacheKey, dbResult.id)

      return {
        contentId: dbResult.id,
        source: 'database',
        metadata: {
          title: dbResult.title || dbResult.name,
          correctSlug: dbResult.slug
        }
      }
    }
  } catch (error: any) {
    console.error('Database query failed:', error)
    // Continue to TMDB fallback
  }

  // Step 2: TMDB fallback (if enabled)
  if (searchTmdb && (contentType === 'movie' || contentType === 'tv')) {
    try {
      const tmdbResult = await searchTmdbBySlug(slug, contentType)
      if (tmdbResult) {
        // Cache TMDB result as well
        cache.set(cacheKey, tmdbResult.id)

        return {
          contentId: tmdbResult.id,
          source: 'tmdb',
          metadata: {
            title: tmdbResult.title || tmdbResult.name,
            year: tmdbResult.year
          }
        }
      }
    } catch (error: any) {
      console.error('TMDB search failed:', error)
    }
  }

  // Step 3: Not found
  return {
    contentId: null,
    source: 'not-found'
  }
}

/**
 * Query CockroachDB by slug
 */
async function queryDatabaseBySlug(
  slug: string,
  contentType: string
): Promise<{ id: number; slug: string; title?: string; name?: string } | null> {
  try {
    let endpoint: string

    switch (contentType) {
      case 'movie':
        endpoint = `/api/db/movies/slug/${encodeURIComponent(slug)}`
        break
      case 'tv':
        endpoint = `/api/db/tv/slug/${encodeURIComponent(slug)}`
        break
      case 'software':
        endpoint = `/api/db/software/slug/${encodeURIComponent(slug)}`
        break
      case 'actor':
        endpoint = `/api/db/actors/slug/${encodeURIComponent(slug)}`
        break
      default:
        throw new Error(`Unknown content type: ${contentType}`)
    }

    const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint
    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Validate that the response has an id field
    if (!data || !data.id) {
      return null
    }

    return data
  } catch (error: any) {
    console.error('Database query error:', error)
    return null
  }
}

/**
 * Search TMDB by slug
 * 
 * Converts slug to search query and prioritizes results matching extracted year
 */
async function searchTmdbBySlug(
  slug: string,
  contentType: 'movie' | 'tv'
): Promise<{ id: number; title?: string; name?: string; year?: number } | null> {
  try {
    // Extract year from slug
    const year = extractYearFromSlug(slug)

    // Convert slug to search query (replace hyphens with spaces)
    let searchQuery = slug.replace(/-/g, ' ')

    // Remove year from search query if present
    if (year) {
      searchQuery = searchQuery.replace(new RegExp(`\\s*${year}\\s*$`), '').trim()
    }

    if (!searchQuery) {
      return null
    }

    // Search TMDB
    const endpoint = contentType === 'movie' ? '/search/movie' : '/search/tv'
    const response = await tmdb.get(endpoint, {
      params: {
        query: searchQuery,
        include_adult: false,
        year: year || undefined
      }
    })

    const results = response.data?.results || []

    if (results.length === 0) {
      return null
    }

    // Prioritize results matching the year
    if (year) {
      results.sort((a: any, b: any) => {
        const aDate = a.release_date || a.first_air_date
        const bDate = b.release_date || b.first_air_date

        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1

        const aYear = new Date(aDate).getFullYear()
        const bYear = new Date(bDate).getFullYear()

        // Exact year match gets highest priority
        if (aYear === year && bYear !== year) return -1
        if (bYear === year && aYear !== year) return 1

        // Otherwise sort by popularity
        return (b.popularity || 0) - (a.popularity || 0)
      })
    }

    // Return the top result
    const topResult = results[0]
    const resultDate = topResult.release_date || topResult.first_air_date
    const resultYear = resultDate ? new Date(resultDate).getFullYear() : undefined

    return {
      id: topResult.id,
      title: topResult.title,
      name: topResult.name,
      year: resultYear
    }
  } catch (error: any) {
    console.error('TMDB search error:', error)
    return null
  }
}

/**
 * Resolve a slug to content ID (simple version)
 * 
 * This is a simplified wrapper around resolveSlugDetailed that returns
 * just the content ID or null.
 * 
 * @param slug - The slug to resolve
 * @param contentType - Type of content
 * @param searchTmdb - Whether to search TMDB if not found in database (default: true)
 * @returns Content ID or null if not found
 */
export async function resolveSlug(
  slug: string,
  contentType: 'movie' | 'tv' | 'software' | 'actor',
  searchTmdb: boolean = true
): Promise<number | null> {
  const result = await resolveSlugDetailed({ slug, contentType, searchTmdb })
  return result.contentId
}

/**
 * Resolve multiple slugs in batch
 * 
 * @param slugs - Array of slugs to resolve
 * @param contentType - Type of content
 * @returns Map of slug to content ID
 */
export async function resolveSlugsBatch(
  slugs: string[],
  contentType: 'movie' | 'tv'
): Promise<Map<string, number>> {
  const resultMap = new Map<string, number>()

  if (slugs.length === 0) {
    return resultMap
  }

  try {
    const tableName = contentType === 'movie' ? 'movies' : 'tv_series'
    const url = API_BASE ? `${API_BASE}/api/db/slug/resolve-batch` : '/api/db/slug/resolve-batch'

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs, table: tableName })
    })

    if (!response.ok) {
      throw new Error(`Batch resolve failed: ${response.statusText}`)
    }

    const data = await response.json()
    const results = data.results || []

    for (const item of results) {
      if (item.slug && item.id) {
        resultMap.set(item.slug, item.id)
      }
    }
  } catch (error: any) {
    console.error('Batch slug resolution error:', error)
  }

  return resultMap
}
