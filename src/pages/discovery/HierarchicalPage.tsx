import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { MovieCard } from '../../components/features/media/MovieCard'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { Breadcrumbs } from '../../components/common/Breadcrumbs'
import { useLang } from '../../state/useLang'
import { AlertCircle } from 'lucide-react'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface HierarchicalPageProps {
  contentType: 'movies' | 'series' | 'anime' | 'gaming' | 'software'
  genre?: string
  year?: number
  platform?: string
  preset?: 'trending' | 'popular' | 'top-rated' | 'latest' | 'upcoming'
}

interface ContentItem {
  id: number
  slug: string
  title?: string
  name?: string
  poster_path?: string | null
  poster_url?: string | null
  backdrop_path?: string | null
  backdrop_url?: string | null
  vote_average?: number
  release_date?: string
  first_air_date?: string
  genres?: any[]
  primary_genre?: string
  original_language?: string
  popularity?: number
  media_type?: string
}

interface APIResponse {
  data: ContentItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get API endpoint based on content type
 * CRITICAL: All content comes from CockroachDB via API endpoints
 */
function getEndpoint(contentType: string): string {
  switch (contentType) {
    case 'movies':
      return '/api/movies'
    case 'series':
      return '/api/tv'
    case 'anime':
      return '/api/movies' // Anime are movies with Japanese language
    case 'gaming':
      return '/api/software' // gaming section removed, fallback to software
    case 'software':
      return '/api/software'
    default:
      return '/api/movies'
  }
}

/**
 * Map English genre names to Arabic (as stored in database)
 */
function mapGenreToArabic(genre: string): string {
  const genreMap: Record<string, string> = {
    'action': 'حركة',
    'adventure': 'مغامرة',
    'animation': 'رسوم-متحركة',
    'comedy': 'كوميديا',
    'crime': 'جريمة',
    'documentary': 'وثائقي',
    'drama': 'دراما',
    'family': 'عائلي',
    'fantasy': 'فانتازيا',
    'history': 'تاريخي',
    'horror': 'رعب',
    'music': 'موسيقي',
    'mystery': 'غموض',
    'romance': 'رومانسي',
    'science-fiction': 'خيال-علمي',
    'thriller': 'إثارة',
    'war': 'حرب',
    'western': 'غربي',
    'biography': 'سيرة-ذاتية',
    'sport': 'رياضة',
    // Anime genres
    'slice-of-life': 'شريحة-من-الحياة',
    'sports': 'رياضة',
    'supernatural': 'خارق-للطبيعة',
    'mecha': 'ميكا'
  }

  return genreMap[genre.toLowerCase()] || genre
}

/**
 * Build query parameters based on props
 */
function buildQueryParams(props: HierarchicalPageProps, page: number): URLSearchParams {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20'
  })

  // Genre filter (primary_genre) - convert to Arabic
  if (props.genre) {
    const arabicGenre = mapGenreToArabic(props.genre)
    params.set('genre', arabicGenre)
  }

  // Year filter
  if (props.year) {
    params.set('yearFrom', props.year.toString())
    params.set('yearTo', props.year.toString())
  }

  // Platform filter (for gaming and software)
  if (props.platform) {
    params.set('platform', props.platform)
  }

  // Preset filters
  if (props.preset) {
    switch (props.preset) {
      case 'trending':
        params.set('sortBy', 'trending')
        break
      case 'popular':
        params.set('sortBy', 'popularity')
        break
      case 'top-rated':
        params.set('sortBy', 'vote_average')
        params.set('ratingFrom', '7')
        break
      case 'latest':
        params.set('sortBy', 'release_date')
        break
      case 'upcoming':
        params.set('sortBy', 'release_date')
        // Filter for future dates
        const currentYear = new Date().getFullYear()
        params.set('yearFrom', currentYear.toString())
        break
    }
  } else {
    // Default sort by popularity
    params.set('sortBy', 'popularity')
  }

  // Special handling for anime
  if (props.contentType === 'anime') {
    params.set('language', 'ja')
  }

  return params
}

/**
 * Generate SEO-optimized page title
 */
function generateTitle(
  contentType: string,
  genre?: string,
  year?: number,
  preset?: string,
  lang: string = 'ar'
): string {
  const typeLabels: Record<'ar' | 'en', Record<string, string>> = {
    ar: {
      movies: 'أفلام',
      series: 'مسلسلات',
      anime: 'أنمي',
      gaming: 'ألعاب',
      software: 'برمجيات'
    },
    en: {
      movies: 'Movies',
      series: 'Series',
      anime: 'Anime',
      gaming: 'Games',
      software: 'Software'
    }
  }

  const presetLabels: Record<'ar' | 'en', Record<string, string>> = {
    ar: {
      trending: 'الرائج',
      popular: 'الأكثر شعبية',
      'top-rated': 'الأعلى تقييماً',
      latest: 'الأحدث',
      upcoming: 'قريباً'
    },
    en: {
      trending: 'Trending',
      popular: 'Popular',
      'top-rated': 'Top Rated',
      latest: 'Latest',
      upcoming: 'Upcoming'
    }
  }

  const langKey = lang as 'ar' | 'en'
  const typeLabel = typeLabels[langKey][contentType] || contentType
  const parts: string[] = []

  if (preset) {
    parts.push(presetLabels[langKey][preset] || preset)
  }

  if (genre) {
    parts.push(genre)
  }

  if (year) {
    parts.push(year.toString())
  }

  parts.push(typeLabel)

  const title = parts.join(' ')
  return `${title} | فور سيما`
}

/**
 * Generate SEO-optimized meta description
 */
function generateDescription(
  contentType: string,
  genre?: string,
  year?: number,
  preset?: string,
  lang: string = 'ar'
): string {
  const parts: string[] = []

  if (lang === 'ar') {
    parts.push('شاهد')
    if (preset) parts.push(preset)
    if (genre) parts.push(genre)
    if (year) parts.push(`من عام ${year}`)
    parts.push('على فور سيما')
  } else {
    parts.push('Watch')
    if (preset) parts.push(preset)
    if (genre) parts.push(genre)
    if (year) parts.push(`from ${year}`)
    parts.push('on 4Cima')
  }

  return parts.join(' ')
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HierarchicalPage = (props: HierarchicalPageProps) => {
  const { lang } = useLang()
  const [page, setPage] = useState(1)

  const params = buildQueryParams(props, page)
  params.set('limit', '100')
  const endpoint = getEndpoint(props.contentType)

  const { data, isLoading, error, refetch } = useQuery<APIResponse>({
    queryKey: ['hierarchical-v3', props.contentType, props.genre, props.year, props.platform, props.preset, page],
    queryFn: async () => {
      const response = await fetch(`${endpoint}?${params}`)
      if (!response.ok) throw new Error('Failed to fetch content')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })

  const prevPropsRef = useRef({ contentType: props.contentType, genre: props.genre, year: props.year, platform: props.platform, preset: props.preset })
  useEffect(() => {
    const prev = prevPropsRef.current
    if (prev.contentType !== props.contentType || prev.genre !== props.genre || prev.year !== props.year || prev.platform !== props.platform || prev.preset !== props.preset) {
      setPage(1)
      prevPropsRef.current = { contentType: props.contentType, genre: props.genre, year: props.year, platform: props.platform, preset: props.preset }
    }
  }, [props.contentType, props.genre, props.year, props.platform, props.preset])

  const title = generateTitle(props.contentType, props.genre, props.year, props.preset, lang)
  const description = generateDescription(props.contentType, props.genre, props.year, props.preset, lang)

  const items = (data?.data || []).map(item => ({
    ...item,
    media_type: props.contentType === 'series' ? 'tv' : props.contentType === 'gaming' ? 'game' : props.contentType,
    poster_path: item.poster_url || item.poster_path,
    backdrop_path: item.backdrop_url || item.backdrop_path
  }))

  const totalPages = data?.pagination?.totalPages || 1

  const goToPage = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error) {
    return (
      <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        <Helmet><title>{title}</title><meta name="description" content={description} /></Helmet>
        <div className="pt-24 relative z-10">
          <Breadcrumbs />
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle size={64} className="text-red-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">{lang === 'ar' ? 'حدث خطأ في تحميل المحتوى' : 'Error loading content'}</h3>
            <button onClick={() => refetch()} className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors mt-4">
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        <Helmet><title>{title}</title><meta name="description" content={description} /></Helmet>
        <div className="pt-24 relative z-10"><Breadcrumbs /><SkeletonGrid count={20} variant="poster" /></div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        <Helmet><title>{title}</title><meta name="description" content={description} /></Helmet>
        <div className="pt-24 relative z-10">
          <Breadcrumbs />
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <h3 className="text-lg font-bold mb-2">{lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}</h3>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet><title>{title}</title><meta name="description" content={description} /></Helmet>
      <div className="pt-24 relative z-10">
        <Breadcrumbs />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
          {items.map((item, index) => (
            <MovieCard key={`${item.id}-${index}`} movie={item} index={index} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10 pb-8 flex-wrap">
            <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm disabled:opacity-30 hover:bg-white/10 transition">
              {lang === 'ar' ? 'السابق' : 'Prev'}
            </button>
            {(() => {
              const start = Math.max(1, Math.min(page - 4, totalPages - 9))
              const end = Math.min(totalPages, start + 9)
              return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(p => (
                <button key={p} onClick={() => goToPage(p)} className={`w-9 h-9 rounded-lg text-sm font-bold transition ${p === page ? 'bg-primary text-black' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}>{p}</button>
              ))
            })()}
            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm disabled:opacity-30 hover:bg-white/10 transition">
              {lang === 'ar' ? 'التالي' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
