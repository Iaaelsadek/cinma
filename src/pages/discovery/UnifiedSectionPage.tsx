import React, { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useLang } from '../../state/useLang'
import { useUnifiedContent } from '../../hooks/useUnifiedContent'
import { UnifiedFilters } from '../../components/unified/UnifiedFilters'
import { ContentGrid } from '../../components/features/media/ContentGrid'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { ErrorMessage } from '../../lib/error-handling'
import type { ContentType, FilterType } from '../../types/unified-section'

interface UnifiedSectionPageProps {
  contentType: ContentType
  activeFilter?: FilterType
  initialGenre?: string
  categoryFilter?: string   // For Islamic content (fatwa, prophets, etc.)
  initialYear?: number
  initialRating?: number
  initialSort?: string
}

/**
 * Helper functions for SEO
 */
const getPageTitle = (
  contentType: ContentType,
  activeFilter: FilterType,
  lang: 'ar' | 'en'
): string => {
  const titles: Record<ContentType, Record<string, { ar: string; en: string }>> = {
    movies: {
      all: { ar: 'الأفلام - فور سيما', en: 'Movies - 4Cima' },
      trending: { ar: 'الأفلام الرائجة', en: 'Trending Movies' },
      'top-rated': { ar: 'الأفلام الأعلى تقييماً', en: 'Top Rated Movies' },
      latest: { ar: 'أحدث الأفلام', en: 'Latest Movies' },
      upcoming: { ar: 'الأفلام القادمة', en: 'Upcoming Movies' },
      classics: { ar: 'الأفلام الكلاسيكية', en: 'Classic Movies' },
      summaries: { ar: 'ملخصات الأفلام', en: 'Movie Summaries' }
    },
    series: {
      all: { ar: 'المسلسلات - فور سيما', en: 'TV Series - 4Cima' },
      trending: { ar: 'المسلسلات الرائجة', en: 'Trending Series' },
      'top-rated': { ar: 'المسلسلات الأعلى تقييماً', en: 'Top Rated Series' },
      latest: { ar: 'أحدث المسلسلات', en: 'Latest Series' },
      upcoming: { ar: 'المسلسلات القادمة', en: 'Upcoming Series' },
      classics: { ar: 'المسلسلات الكلاسيكية', en: 'Classic Series' },
      summaries: { ar: 'ملخصات المسلسلات', en: 'Series Summaries' },
      ramadan: { ar: 'مسلسلات رمضان', en: 'Ramadan Series' }
    },
    anime: {
      all: { ar: 'الأنمي - فور سيما', en: 'Anime - 4Cima' },
      trending: { ar: 'الأنمي الرائج', en: 'Trending Anime' },
      'top-rated': { ar: 'الأنمي الأعلى تقييماً', en: 'Top Rated Anime' },
      latest: { ar: 'أحدث الأنمي', en: 'Latest Anime' },
      upcoming: { ar: 'الأنمي القادم', en: 'Upcoming Anime' },
      animation_movies: { ar: 'أفلام أنيمي', en: 'Animation Movies' },
      cartoon_series: { ar: 'مسلسلات كرتون', en: 'Cartoon Series' }
    },
    gaming: {
      all: { ar: 'الألعاب - فور سيما', en: 'Games - 4Cima' },
      trending: { ar: 'الألعاب الرائجة', en: 'Trending Games' },
      'top-rated': { ar: 'الألعاب الأعلى تقييماً', en: 'Top Rated Games' },
      latest: { ar: 'أحدث الألعاب', en: 'Latest Games' },
      upcoming: { ar: 'الألعاب القادمة', en: 'Upcoming Games' }
    },
    software: {
      all: { ar: 'البرامج - فور سيما', en: 'Software - 4Cima' },
      trending: { ar: 'البرامج الرائجة', en: 'Trending Software' },
      'top-rated': { ar: 'البرامج الأعلى تقييماً', en: 'Top Rated Software' },
      latest: { ar: 'أحدث البرامج', en: 'Latest Software' },
      upcoming: { ar: 'البرامج القادمة', en: 'Upcoming Software' }
    }
  }

  return titles[contentType][activeFilter]?.[lang] || titles[contentType].all[lang]
}

const getPageDescription = (
  contentType: ContentType,
  activeFilter: FilterType,
  lang: 'ar' | 'en'
): string => {
  const descriptions = {
    movies: {
      all: {
        ar: 'اكتشف أفضل الأفلام من جميع أنحاء العالم. شاهد الأفلام الرائجة، الأعلى تقييماً، والأحدث.',
        en: 'Discover the best movies from around the world. Watch trending, top rated, and latest films.'
      },
      trending: {
        ar: 'شاهد الأفلام الأكثر رواجاً هذا الأسبوع',
        en: 'Watch the most trending movies this week'
      },
      'top-rated': {
        ar: 'أفضل الأفلام الأعلى تقييماً من النقاد والجمهور',
        en: 'Best top rated movies from critics and audiences'
      },
      latest: {
        ar: 'أحدث الأفلام المضافة إلى المنصة',
        en: 'Latest movies added to the platform'
      },
      upcoming: {
        ar: 'الأفلام القادمة قريباً في السينما',
        en: 'Upcoming movies coming soon to theaters'
      },
      classics: {
        ar: 'أفضل الأفلام الكلاسيكية القديمة',
        en: 'Best classic movies of all time'
      },
      summaries: {
        ar: 'ملخصات الأفلام السريعة',
        en: 'Quick movie summaries'
      }
    },
    series: {
      all: {
        ar: 'اكتشف أفضل المسلسلات من جميع أنحاء العالم',
        en: 'Discover the best TV series from around the world'
      },
      trending: {
        ar: 'شاهد المسلسلات الأكثر رواجاً هذا الأسبوع',
        en: 'Watch the most trending series this week'
      },
      'top-rated': {
        ar: 'أفضل المسلسلات الأعلى تقييماً',
        en: 'Best top rated TV series'
      },
      latest: {
        ar: 'أحدث المسلسلات المضافة',
        en: 'Latest series added'
      },
      upcoming: {
        ar: 'المسلسلات القادمة قريباً',
        en: 'Upcoming series coming soon'
      },
      classics: {
        ar: 'أفضل المسلسلات الكلاسيكية القديمة',
        en: 'Best classic TV series of all time'
      },
      summaries: {
        ar: 'ملخصات المسلسلات السريعة',
        en: 'Quick series summaries'
      },
      ramadan: {
        ar: 'أفضل مسلسلات رمضان',
        en: 'Best Ramadan series'
      }
    },
    anime: {
      all: {
        ar: 'اكتشف أفضل الأنمي الياباني',
        en: 'Discover the best Japanese anime'
      },
      trending: {
        ar: 'شاهد الأنمي الأكثر رواجاً',
        en: 'Watch the most trending anime'
      },
      'top-rated': {
        ar: 'أفضل الأنمي الأعلى تقييماً',
        en: 'Best top rated anime'
      },
      latest: {
        ar: 'أحدث الأنمي المضاف',
        en: 'Latest anime added'
      },
      upcoming: {
        ar: 'الأنمي القادم قريباً',
        en: 'Upcoming anime coming soon'
      },
      animation_movies: {
        ar: 'أفضل أفلام الأنيمي',
        en: 'Best animation movies'
      },
      cartoon_series: {
        ar: 'أفضل مسلسلات الكرتون',
        en: 'Best cartoon series'
      }
    },
    gaming: {
      all: {
        ar: 'اكتشف أفضل الألعاب',
        en: 'Discover the best games'
      },
      trending: {
        ar: 'الألعاب الأكثر رواجاً',
        en: 'Most trending games'
      },
      'top-rated': {
        ar: 'أفضل الألعاب الأعلى تقييماً',
        en: 'Best top rated games'
      },
      latest: {
        ar: 'أحدث الألعاب',
        en: 'Latest games'
      },
      upcoming: {
        ar: 'الألعاب القادمة',
        en: 'Upcoming games'
      }
    },
    software: {
      all: {
        ar: 'اكتشف أفضل البرامج',
        en: 'Discover the best software'
      },
      trending: {
        ar: 'البرامج الأكثر رواجاً',
        en: 'Most trending software'
      },
      'top-rated': {
        ar: 'أفضل البرامج الأعلى تقييماً',
        en: 'Best top rated software'
      },
      latest: {
        ar: 'أحدث البرامج',
        en: 'Latest software'
      },
      upcoming: {
        ar: 'البرامج القادمة',
        en: 'Upcoming software'
      }
    }
  }

  const contentDescriptions = descriptions[contentType]
  const filterDescription = contentDescriptions[activeFilter as keyof typeof contentDescriptions]
  return filterDescription?.[lang] || contentDescriptions.all[lang]
}

export const UnifiedSectionPage: React.FC<UnifiedSectionPageProps> = ({
  contentType,
  activeFilter = 'all',
  initialGenre,
  categoryFilter,
  initialYear,
  initialRating,
  initialSort
}) => {
  const { lang } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()

  const genre = searchParams.get('genre') || initialGenre || null
  const year = searchParams.get('year') || (initialYear ? String(initialYear) : null)
  const rating = searchParams.get('rating') ? parseFloat(searchParams.get('rating')!) : initialRating || null
  const language = searchParams.get('language') || null
  const platform = searchParams.get('platform') || null
  const os = searchParams.get('os') || null
  const currentPage = parseInt(searchParams.get('page') || '1')

  const queryResult = useUnifiedContent({
    contentType,
    activeFilter,
    genre,
    category: categoryFilter || null,
    year,
    rating,
    language: language ?? undefined,
    page: currentPage,
    limit: 100,
    enableInfiniteScroll: false
  })

  const { data, isLoading, error } = queryResult

  const allItems = useMemo(() => {
    if (!data) return []
    if ('pages' in data) return (data as any).pages.flatMap((p: any) => p.items)
    if ('items' in (data as any)) return (data as any).items
    return []
  }, [data])

  const totalCount = (data as any)?.total || 0
  const totalPages = (data as any)?.totalPages || 1

  const handleFilterChange = (filterType: 'genre' | 'year' | 'rating' | 'language' | 'platform' | 'os', value: string | number | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (value === null || value === '') newParams.delete(filterType)
    else newParams.set(filterType, String(value))
    newParams.delete('page')
    setSearchParams(newParams)
  }

  const handleClearAllFilters = () => {
    const newParams = new URLSearchParams(searchParams)
      ;['genre', 'year', 'rating', 'language', 'platform', 'os', 'page'].forEach(k => newParams.delete(k))
    setSearchParams(newParams)
  }

  const goToPage = (p: number) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', String(p))
    setSearchParams(newParams)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <Helmet>
        <title>{getPageTitle(contentType, activeFilter, lang)}</title>
        <meta name="description" content={getPageDescription(contentType, activeFilter, lang)} />
      </Helmet>

      <div className="mt-8">
        <UnifiedFilters
          contentType={contentType}
          genre={genre}
          year={year}
          rating={rating}
          language={language}
          platform={platform}
          os={os}
          categoryFilter={categoryFilter}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAllFilters}
          lang={lang}
        />
      </div>

      {isLoading ? (
        <SkeletonGrid count={40} variant="poster" />
      ) : error ? (
        <ErrorMessage error={error} onRetry={() => window.location.reload()} lang={lang} />
      ) : (
        <>
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {totalCount ? (lang === 'ar' ? `تم العثور على ${totalCount} نتيجة` : `Found ${totalCount} results`) : ''}
          </div>

          <ContentGrid items={allItems} contentType={contentType} isLoading={false} lang={lang} />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10 pb-8 flex-wrap">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm disabled:opacity-30 hover:bg-white/10 transition"
              >
                {lang === 'ar' ? 'السابق' : 'Prev'}
              </button>

              {(() => {
                const half = 4
                const start = Math.max(1, Math.min(currentPage - half, totalPages - 9))
                const end = Math.min(totalPages, start + 9)
                return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition ${p === currentPage
                        ? 'bg-primary text-black'
                        : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                      }`}
                  >
                    {p}
                  </button>
                ))
              })()}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm disabled:opacity-30 hover:bg-white/10 transition"
              >
                {lang === 'ar' ? 'التالي' : 'Next'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
