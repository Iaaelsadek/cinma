/**
 * URL Utilities for Legacy URL Detection and Redirection
 * 
 * This module provides utilities for:
 * - Detecting legacy URLs with IDs
 * - Extracting IDs and years from slugs
 * - Generating redirect URLs
 */

import { ContentNotFoundError } from './errors'

/**
 * Detect if a URL is a legacy URL (contains ID at the end)
 * 
 * Legacy URL patterns:
 * - /watch/movie/spider-man-12345
 * - /watch/tv/breaking-bad-456/s1/ep1
 * - /movie/inception-789
 * 
 * CRITICAL: Only pure numeric strings are considered legacy IDs
 * - "12345" → legacy ID
 * - "flying-car-2017" → NOT legacy (valid slug with year)
 * 
 * @param slug - The slug part of the URL
 * @returns Object with isLegacy flag and extracted ID, or null
 */
export function detectLegacyUrl(slug: string): { isLegacy: boolean; id: number | null; cleanSlug: string } {
  if (!slug || slug.trim() === '') {
    return { isLegacy: false, id: null, cleanSlug: slug }
  }

  // CRITICAL FIX: Only consider pure numeric strings as legacy IDs
  // This prevents slugs ending with years (e.g., "game-2017") from being misidentified
  const pureNumberMatch = slug.match(/^\d+$/)
  if (pureNumberMatch) {
    const id = parseInt(slug, 10)
    if (!isNaN(id)) {
      return { isLegacy: true, id, cleanSlug: '' }
    }
  }

  return { isLegacy: false, id: null, cleanSlug: slug }
}

/**
 * Extract ID from URL slug
 * 
 * @param slug - The slug potentially containing ID
 * @returns Extracted ID or null
 */
export function extractIdFromUrl(slug: string): number | null {
  const result = detectLegacyUrl(slug)
  return result.id
}

/**
 * Extract year from slug
 * 
 * Looks for 4-digit year pattern in slug
 * Examples:
 * - "spider-man-2024" -> 2024
 * - "inception-2010" -> 2010
 * - "the-matrix" -> null
 * 
 * @param slug - The slug potentially containing year
 * @returns Extracted year or null
 */
export function extractYearFromSlug(slug: string): number | null {
  if (!slug || slug.trim() === '') {
    return null
  }

  // Match 4-digit year pattern (1900-2099) - find ALL matches and take the last one
  const matches = slug.matchAll(/-(19\d{2}|20\d{2})(?:-|$)/g)
  const allMatches = Array.from(matches)

  if (allMatches.length > 0) {
    // Take the LAST match (rightmost year)
    const lastMatch = allMatches[allMatches.length - 1]
    const year = parseInt(lastMatch[1], 10)
    if (!isNaN(year) && year >= 1900 && year <= 2099) {
      return year
    }
  }

  return null
}

/**
 * Content item interface for redirect URL generation
 */
export interface ContentItem {
  id: number | string
  slug: string
  media_type?: string
  type?: string
  title?: string
  name?: string
}

/**
 * Generate redirect URL from content ID
 * 
 * This function queries the database to find content by ID,
 * then generates a clean URL using the slug.
 * 
 * @param contentId - The content ID
 * @param contentType - Type of content (movie, tv, etc.)
 * @param season - Optional season number for TV series
 * @param episode - Optional episode number for TV series
 * @returns Clean URL or null if content not found
 */
export async function generateRedirectUrl(
  contentId: number,
  contentType: 'movie' | 'tv' | 'game' | 'software' | 'actor',
  season?: number,
  episode?: number
): Promise<string | null> {
  try {
    // Query database to get content with slug
    const tableName = getTableName(contentType)
    const response = await fetch(`/api/db/${tableName}/${contentId}`)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Failed to fetch content: ${response.statusText}`)
    }

    const content = await response.json()

    if (!content || !content.slug || content.slug.trim() === '') {
      console.error(`Content ${contentType}:${contentId} found but missing slug`)
      return null
    }

    // Generate clean URL based on content type
    if (contentType === 'tv' && season !== undefined && episode !== undefined) {
      return `/watch/tv/${content.slug}/s${season}/ep${episode}`
    } else if (contentType === 'movie') {
      return `/watch/movie/${content.slug}`
    } else if (contentType === 'tv') {
      // TV series without season/episode - return watch URL without s/ep
      return `/watch/tv/${content.slug}`
    } else {
      // For other types (game, software, actor)
      return `/${contentType}/${content.slug}`
    }
  } catch (error: any) {
    console.error('Error generating redirect URL:', error)
    return null
  }
}

/**
 * Map content type to database table name
 */
function getTableName(contentType: string): string {
  switch (contentType) {
    case 'movie':
      return 'movies'
    case 'tv':
      return 'tv_series'
    case 'actor':
      return 'actors'
    case 'game':
      return 'games'
    case 'software':
      return 'software'
    default:
      throw new Error(`Unknown content type: ${contentType}`)
  }
}

/**
 * Parse watch URL to extract content type, slug, season, and episode
 * 
 * Supported patterns:
 * - /watch/movie/{slug}
 * - /watch/tv/{slug}/s{season}/ep{episode}
 * 
 * @param pathname - The URL pathname
 * @returns Parsed URL components or null
 */
export function parseWatchUrl(pathname: string): {
  contentType: 'movie' | 'tv'
  slug: string
  season?: number
  episode?: number
} | null {
  if (!pathname || !pathname.startsWith('/watch/')) {
    return null
  }

  // Remove /watch/ prefix
  const path = pathname.substring(7)
  const parts = path.split('/')

  if (parts.length < 2) {
    return null
  }

  const contentType = parts[0] as 'movie' | 'tv'
  const slug = parts[1]

  if (contentType === 'movie') {
    return { contentType, slug }
  } else if (contentType === 'tv' && parts.length >= 4) {
    // Extract season and episode
    const seasonMatch = parts[2].match(/^s(\d+)$/)
    const episodeMatch = parts[3].match(/^ep(\d+)$/)

    if (seasonMatch && episodeMatch) {
      const season = parseInt(seasonMatch[1], 10)
      const episode = parseInt(episodeMatch[1], 10)

      if (!isNaN(season) && !isNaN(episode)) {
        return { contentType, slug, season, episode }
      }
    }
  }

  return null
}
