import React from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useLang } from '../../state/useLang'
import { mapCategorySlugToGenre, getGenreLabel } from '../../lib/genre-utils'
import { UnifiedSectionPage } from './UnifiedSectionPage'
import type { ContentType } from '../../types/unified-section'

interface GenreCategoryPageProps {
  contentType: ContentType
}

export const GenreCategoryPage: React.FC<GenreCategoryPageProps> = ({ contentType }) => {
  const { category } = useParams<{ category: string }>()
  const { lang } = useLang()

  const arabicGenre = category ? mapCategorySlugToGenre(category) : null

  // Redirect to base page if invalid category
  if (!arabicGenre) {
    return <Navigate to={`/${contentType}`} replace />
  }

  const categoryName = getGenreLabel(arabicGenre, lang)
  const contentTypeName = {
    movies: { ar: 'أفلام', en: 'Movies' },
    series: { ar: 'مسلسلات', en: 'Series' },
    anime: { ar: 'أنمي', en: 'Anime' },
    gaming: { ar: 'ألعاب', en: 'Games' },
    software: { ar: 'برامج', en: 'Software' },
  }[contentType]

  const title = `${contentTypeName?.[lang]} - ${categoryName}`

  return (
    <>
      <Helmet>
        <title>{title} - سينما أونلاين</title>
      </Helmet>
      <UnifiedSectionPage
        contentType={contentType}
        activeFilter="all"
        initialGenre={arabicGenre}
      />
    </>
  )
}
