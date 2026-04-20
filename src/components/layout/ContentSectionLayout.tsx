import React from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { FilterTabs } from '../features/filters/FilterTabs'
import { NeonConnectorGrid } from '../features/filters/NeonConnectorGrid'
import { useLang } from '../../state/useLang'
import { useSearchParams } from 'react-router-dom'
import type { ContentType } from '../../types/unified-section'

interface ContentSectionLayoutProps {
  contentType: ContentType
}

/**
 * Shared layout for all content section pages (movies, series, anime, gaming, software)
 * Contains FilterTabs that persist across all sub-pages
 */
export const ContentSectionLayout: React.FC<ContentSectionLayoutProps> = ({
  contentType
}) => {
  const { lang } = useLang()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Determine active filter from URL path
  const getActiveFilter = (): string => {
    const path = location.pathname
    if (path.includes('/trending')) return 'trending'
    if (path.includes('/top-rated')) return 'top-rated'
    if (path.includes('/latest')) return 'latest'
    if (path.includes('/upcoming')) return 'upcoming'
    if (path.includes('/classics')) return 'classics'
    if (path.includes('/summaries')) return 'summaries'
    if (path.includes('/ramadan')) return 'ramadan'
    if (path.includes('/animation-movies')) return 'animation_movies'
    if (path.includes('/cartoon-series')) return 'cartoon_series'
    return 'all'
  }

  // Check if any filters are active
  const hasActiveFilters = !!(
    searchParams.get('genre') || 
    searchParams.get('year') || 
    searchParams.get('rating')
  )

  // Calculate active tab index for neon grid
  const getActiveTabIndex = () => {
    const activeFilter = getActiveFilter()
    const tabOrder = ['all', 'trending', 'top-rated', 'latest', 'classics', 'summaries', 'ramadan', 'animation_movies', 'cartoon_series']
    return tabOrder.indexOf(activeFilter)
  }

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      {/* Skip link for accessibility */}
      <a
        href="#content-grid"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-lumen-gold focus:text-lumen-void focus:rounded-lg focus:font-bold"
      >
        {lang === 'ar' ? 'تخطى إلى المحتوى' : 'Skip to content'}
      </a>

      {/* Filter Tabs - Persistent across all pages */}
      <FilterTabs
        contentType={contentType}
        activeFilter={getActiveFilter()}
        lang={lang}
      />

      {/* Desktop: Neon grid connector */}
      <div className="hidden sm:block">
        <NeonConnectorGrid 
          hasActiveFilters={hasActiveFilters} 
          activeTabIndex={getActiveTabIndex()}
        />
      </div>

      {/* Page content */}
      <Outlet />
    </div>
  )
}
