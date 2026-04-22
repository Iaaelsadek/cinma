import React, { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLang } from '../../state/useLang'
import { AdvancedFilters } from '../../components/features/filters/AdvancedFilters'
import { SeoHead } from '../../components/common/SeoHead'
import { generateClassicsSeoData } from '../../lib/seo-helpers'
import { SkeletonGrid } from '../../components/common/Skeletons'

// Use lazy loading to avoid static/dynamic import conflict
const ClassicsPage = lazy(() => import('./Classics').then(m => ({ default: m.ClassicsPage })))

/**
 * Wrapper for ClassicsPage that adds filters
 */
export const ClassicsWithFilters: React.FC = () => {
  const { lang } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()

  // Extract filters from URL
  const genre = searchParams.get('genre') || undefined
  const year = searchParams.get('year') || undefined
  const rating = searchParams.get('rating') || undefined
  const language = searchParams.get('language') || undefined

  // Generate dynamic SEO based on filters using helper
  const seoData = generateClassicsSeoData({ genre, year, rating, language })

  // Handle filter changes
  const handleFilterChange = (key: string, value: string | number | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (value === null || value === '') {
      newParams.delete(key)
    } else {
      newParams.set(key, String(value))
    }
    // Reset page when filters change
    if (key !== 'page') {
      newParams.delete('page')
    }
    setSearchParams(newParams)
  }

  // Convert back to proper types for AdvancedFilters
  const genreValue = genre || null
  const yearValue = year || null
  const ratingValue = rating ? parseFloat(rating) : null
  const languageValue = language || null

  // Handle clearing all filters at once
  const handleClearAllFilters = () => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete('genre')
    newParams.delete('year')
    newParams.delete('rating')
    newParams.delete('language')
    newParams.delete('page')
    setSearchParams(newParams)
  }

  return (
    <>
      <SeoHead
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords?.join(', ')}
        type="video.movie"
        image="https://4cima.com/og-classics.jpg"
      />

      {/* Desktop: filters with spacing for neon grid */}
      <div className="hidden sm:block mt-8">
        <AdvancedFilters
          contentType="movies"
          genre={genreValue}
          year={yearValue}
          rating={ratingValue}
          language={languageValue}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAllFilters}
          lang={lang}
        />
      </div>

      {/* Mobile: filters only (no neon grid) */}
      <div className="sm:hidden">
        <AdvancedFilters
          contentType="movies"
          genre={genreValue}
          year={yearValue}
          rating={ratingValue}
          language={languageValue}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAllFilters}
          lang={lang}
        />
      </div>

      {/* Content */}
      <Suspense fallback={<div className="min-h-screen bg-[#0f0f0f] p-8"><SkeletonGrid count={12} /></div>}>
        <ClassicsPage />
      </Suspense>
    </>
  )
}
