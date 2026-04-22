import React, { lazy, Suspense } from 'react'
import { SeoHead } from '../../components/common/SeoHead'
import { generatePlaysSeoData } from '../../lib/seo-helpers'
import { SkeletonGrid } from '../../components/common/Skeletons'

// Use lazy loading to avoid static/dynamic import conflict
const PlaysPage = lazy(() => import('./Plays').then(m => ({ default: m.PlaysPage })))

interface PlaysWithFiltersProps {
  category?: string
}

/**
 * Wrapper for PlaysPage (filters removed as all plays are in Arabic)
 */
export const PlaysWithFilters: React.FC<PlaysWithFiltersProps> = ({ category }) => {
  // Generate dynamic SEO based on category using helper
  const seoData = generatePlaysSeoData(category)

  return (
    <>
      <SeoHead
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords?.join(', ')}
        type="website"
        image="https://4cima.com/og-plays.jpg"
      />
      <Suspense fallback={<div className="min-h-screen bg-[#0f0f0f] p-8"><SkeletonGrid count={12} /></div>}>
        <PlaysPage category={category} />
      </Suspense>
    </>
  )
}
