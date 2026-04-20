/**
 * Subsection Configuration
 * 
 * Central configuration for all subsections across content types.
 * Defines subsections, their labels, paths, and filters.
 */

import type { SubsectionConfig } from '../types/subsection'

/**
 * SUBSECTION_CONFIG
 * 
 * Complete configuration for all subsections in the application.
 * Each content type (movies, series, gaming, software) has its own subsections.
 */
export const SUBSECTION_CONFIG: SubsectionConfig = {
  /**
   * Movies Subsections
   */
  movies: [
    {
      id: 'all',
      labelAr: 'الكل',
      labelEn: 'All',
      path: '/movies',
      filters: {}
    },
    {
      id: 'trending',
      labelAr: 'الرائجة',
      labelEn: 'Trending',
      path: '/movies/trending',
      filters: {},
      sortBy: 'popularity'
    },
    {
      id: 'top-rated',
      labelAr: 'الأعلى تقييماً',
      labelEn: 'Top Rated',
      path: '/movies/top-rated',
      filters: { minRating: 7 },
      sortBy: 'vote_average'
    },
    {
      id: 'latest',
      labelAr: 'الأحدث',
      labelEn: 'Latest',
      path: '/movies/latest',
      filters: {},
      sortBy: 'release_date'
    },
    {
      id: 'classics',
      labelAr: 'الكلاسيكية',
      labelEn: 'Classics',
      path: '/movies/classics',
      filters: { maxYear: 1999, minVoteCount: 50 }
    },
    {
      id: 'summaries',
      labelAr: 'الملخصات',
      labelEn: 'Summaries',
      path: '/movies/summaries',
      filters: { category: 'recaps' }
    }
  ],

  /**
   * TV Series Subsections
   */
  series: [
    {
      id: 'all',
      labelAr: 'الكل',
      labelEn: 'All',
      path: '/series',
      filters: {}
    },
    {
      id: 'trending',
      labelAr: 'الرائجة',
      labelEn: 'Trending',
      path: '/series/trending',
      filters: {},
      sortBy: 'popularity'
    },
    {
      id: 'top-rated',
      labelAr: 'الأعلى تقييماً',
      labelEn: 'Top Rated',
      path: '/series/top-rated',
      filters: { minRating: 7 },
      sortBy: 'vote_average'
    },
    {
      id: 'latest',
      labelAr: 'الأحدث',
      labelEn: 'Latest',
      path: '/series/latest',
      filters: {},
      sortBy: 'first_air_date'
    },
    {
      id: 'classics',
      labelAr: 'الكلاسيكية',
      labelEn: 'Classics',
      path: '/series/classics',
      filters: { maxYear: 1999, minVoteCount: 50 }
    },
    {
      id: 'summaries',
      labelAr: 'الملخصات',
      labelEn: 'Summaries',
      path: '/series/summaries',
      filters: { category: 'recaps' }
    },
    {
      id: 'ramadan',
      labelAr: 'رمضان',
      labelEn: 'Ramadan',
      path: '/series/ramadan',
      filters: { language: 'ar', genres: ['رمضان', 'دراما'] }
    }
  ],

  /**
   * Gaming Subsections
   */
  gaming: [
    {
      id: 'all',
      labelAr: 'الكل',
      labelEn: 'All',
      path: '/gaming',
      filters: {}
    },
    {
      id: 'trending',
      labelAr: 'الرائجة',
      labelEn: 'Trending',
      path: '/gaming/trending',
      filters: {},
      sortBy: 'popularity'
    },
    {
      id: 'top-rated',
      labelAr: 'الأعلى تقييماً',
      labelEn: 'Top Rated',
      path: '/gaming/top-rated',
      filters: { minRating: 7 },
      sortBy: 'vote_average'
    },
    {
      id: 'latest',
      labelAr: 'الأحدث',
      labelEn: 'Latest',
      path: '/gaming/latest',
      filters: {},
      sortBy: 'release_date'
    }
  ],

  /**
   * Software Subsections
   */
  software: [
    {
      id: 'all',
      labelAr: 'الكل',
      labelEn: 'All',
      path: '/software',
      filters: {}
    },
    {
      id: 'trending',
      labelAr: 'الرائجة',
      labelEn: 'Trending',
      path: '/software/trending',
      filters: {},
      sortBy: 'popularity'
    },
    {
      id: 'top-rated',
      labelAr: 'الأعلى تقييماً',
      labelEn: 'Top Rated',
      path: '/software/top-rated',
      filters: { minRating: 7 },
      sortBy: 'vote_average'
    },
    {
      id: 'latest',
      labelAr: 'الأحدث',
      labelEn: 'Latest',
      path: '/software/latest',
      filters: {},
      sortBy: 'release_date'
    }
  ],

  /**
   * Anime Subsections
   */
  anime: [
    {
      id: 'all',
      labelAr: 'الكل',
      labelEn: 'All',
      path: '/anime',
      filters: {}
    },
    {
      id: 'trending',
      labelAr: 'الرائجة',
      labelEn: 'Trending',
      path: '/anime/trending',
      filters: {},
      sortBy: 'popularity'
    },
    {
      id: 'top-rated',
      labelAr: 'الأعلى تقييماً',
      labelEn: 'Top Rated',
      path: '/anime/top-rated',
      filters: { minRating: 7 },
      sortBy: 'vote_average'
    },
    {
      id: 'latest',
      labelAr: 'الأحدث',
      labelEn: 'Latest',
      path: '/anime/latest',
      filters: {},
      sortBy: 'release_date'
    }
  ]
}

/**
 * Get subsections for a specific content type
 * @param contentType - The content type to get subsections for
 * @returns Array of subsection definitions
 */
export function getSubsections(contentType: keyof SubsectionConfig) {
  return SUBSECTION_CONFIG[contentType] || []
}

/**
 * Get a specific subsection by content type and subsection ID
 * @param contentType - The content type
 * @param subsectionId - The subsection ID
 * @returns Subsection definition or undefined
 */
export function getSubsection(
  contentType: keyof SubsectionConfig,
  subsectionId: string
) {
  const subsections = SUBSECTION_CONFIG[contentType] || []
  return subsections.find((s) => s.id === subsectionId)
}
