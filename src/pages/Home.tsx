import { useState, useEffect, useRef, lazy, Suspense, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { tmdb } from '../lib/tmdb'
import { AdsManager } from '../components/features/system/AdsManager'
import { resolveTitleWithFallback } from '../lib/translation'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../state/useLang'
import { useRecommendations } from '../hooks/useRecommendations'
import { Zap, Tv, Smile } from 'lucide-react'
import { SkeletonHero } from '../components/common/Skeletons'
import { SeoHead } from '../components/common/SeoHead'
import { QuantumHero } from '../components/features/hero/QuantumHero'
import { QuantumTrain } from '../components/features/media/QuantumTrain'
import { ContinueWatchingRow } from '../components/features/media/ContinueWatchingRow'
import { SectionHeader } from '../components/common/SectionHeader'
import { logger } from '../lib/logger'
import { sanitizeMediaItems, type TmdbMedia } from '../lib/mediaUtils'
import { HOME_KEYWORDS } from '../lib/seo-keywords'

const HomeBelowFoldSections = lazy(() =>
  import('../components/features/home/HomeBelowFoldSections').then((mod) => ({
    default: mod.HomeBelowFoldSections
  }))
)

export const Home = () => {
  const { user } = useAuth()
  const { lang } = useLang()
  const { data: recommendations } = useRecommendations()
  const belowFoldTriggerRef = useRef<HTMLDivElement | null>(null)
  const [canLoadBelowFold, setCanLoadBelowFold] = useState(false)

  useEffect(() => {
    const node = belowFoldTriggerRef.current
    if (!node || canLoadBelowFold) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setCanLoadBelowFold(true)
          observer.disconnect()
        }
      },
      { rootMargin: '400px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [canLoadBelowFold])

  // --- DATA FETCHING (Optimized & Parallelized) ---
  // 1. DIVERSE HERO CONTENT (CockroachDB ONLY - NO TMDB FALLBACK)
  const diverseHero = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['diverse-hero-content-v2'], // Changed key to force cache invalidation
    queryFn: async () => {
      // Fetch ONLY from CockroachDB API
      try {
        const response = await fetch('/api/home')
        if (response.ok) {
          const data = await response.json()
          const allItems = [
            ...(data.latest || []),
            ...(data.topRated || []),
            ...(data.popular || [])
          ]

          // Map to TmdbMedia format and filter items with valid slugs
          const validItems = allItems
            .map((item: any) => ({
              id: item.id, // Keep as UUID string
              slug: item.slug,
              title: item.title,
              title_ar: item.title_ar,
              title_en: item.title_en,
              original_title: item.original_title,
              name: item.title,
              media_type: (item.content_type || 'movie') as 'movie' | 'tv',
              poster_path: item.poster_url,
              backdrop_path: item.backdrop_url || item.poster_url,
              vote_average: Number(item.vote_average) || 0,
              overview: item.overview || '',
              overview_ar: item.overview_ar || '',
              overview_en: item.overview_en || item.overview || '',
              release_date: item.release_date || '',
              original_language: item.original_language || 'en',
              primary_genre: item.primary_genre,
              genres: item.primary_genre ? [item.primary_genre] : []
            }))
            .filter((item: TmdbMedia) =>
              item.id &&
              item.slug &&
              item.slug.trim() !== '' &&
              item.slug !== 'content' &&
              (item.poster_path || (item as any).poster_url) &&
              item.title
            )

          return { results: validItems.slice(0, 8) }
        }
      } catch (e: any) {
        logger.error('Failed to fetch from /api/home for hero', e)
      }

      // Return empty array if API fails
      return { results: [] }
    },
    staleTime: 1000 * 60 * 5, // 5 mins (match backend cache)
    placeholderData: keepPreviousData
  })

  // 2. CHINESE DRAMAS (Redundant - handled in HomeBelowFoldSections)
  // 3. DIVERSE SECTIONS (Redundant - handled in HomeBelowFoldSections)

  const homeAggregated = useQuery({
    queryKey: ['home-aggregated-v2', lang], // Changed key to force cache invalidation
    queryFn: async () => {
      try {
        // Use /api/home which has proper poster URLs
        const res = await fetch('/api/home')
        if (res.ok) {
          const data = await res.json()
          return {
            trending: data.latest || [],
            topRated: data.topRated || [],
            popular: data.popular || []
          }
        }
      } catch (e: any) {
        logger.warn('home_aggregated_failed', e)
      }

      // Fallback: return empty arrays
      return {
        trending: [],
        topRated: [],
        popular: []
      }
    },
    staleTime: 300000,
  })

  const criticalHomeData = useQuery<{ popularAr: TmdbMedia[]; arabicSeries: TmdbMedia[]; kids: TmdbMedia[]; bollywood: TmdbMedia[] }>({
    queryKey: ['home-critical-lcp-v2'], // Changed key to force cache invalidation
    queryFn: async () => {
      const mapItems = (items: any[]): TmdbMedia[] => {
        return (items || [])
          .map((item) => ({
            id: item.id, // Keep as UUID string
            slug: item.slug as string | undefined,
            title: item.title || item.name,
            title_ar: item.title_ar || item.name_ar,
            title_en: item.title_en || item.name_en,
            original_title: item.original_title || item.original_name,
            name: item.name || item.title,
            media_type: (item.content_type || item.media_type || 'movie') as 'movie' | 'tv',
            poster_path: item.poster_url || item.poster_path,
            backdrop_path: item.backdrop_url || item.backdrop_path,
            vote_average: Number(item.vote_average) || 0,
            overview: item.overview,
            overview_ar: item.overview_ar,
            release_date: item.release_date || item.first_air_date,
            first_air_date: item.first_air_date || item.release_date,
            primary_genre: item.primary_genre,
            genres: item.primary_genre ? [item.primary_genre] : []
          }))
          .filter((item) => {
            return (
              Boolean(item.id) &&
              Boolean(item.poster_path?.trim() || (item as any).poster_url?.trim()) &&
              Boolean(resolveTitleWithFallback(item)) &&
              Boolean(item.slug && item.slug.trim() !== '' && item.slug !== 'content')
            )
          })
      }

      // Fetch from /api/home which has proper poster URLs
      try {
        const response = await fetch('/api/home')
        if (response.ok) {
          const data = await response.json()

          return {
            popularAr: mapItems(data.popular),
            arabicSeries: mapItems(data.latest),
            kids: mapItems(data.topRated),
            bollywood: mapItems(data.popular)
          }
        }
      } catch (e: any) {
        logger.warn('API failed for critical home data', e)
      }

      // If API fails, return empty arrays
      return {
        popularAr: [],
        arabicSeries: [],
        kids: [],
        bollywood: []
      }
    },
    staleTime: 300000
  })

  const description = lang === 'ar' ? 'منصة فور سيما - تجربة المستقبل' : '4Cima - The Future Experience'

  // Memoize all arrays to prevent reference changes on every render
  const heroItems = useMemo(
    () => sanitizeMediaItems(diverseHero.data?.results),
    [diverseHero.data?.results]
  )

  const criticalData = criticalHomeData.data

  const topRatedMovies = useMemo(
    () => homeAggregated.data?.topRated?.filter((item: TmdbMedia) =>
      item.slug && item.slug.trim() !== '' && item.slug !== 'content'
    ) ?? [],
    [homeAggregated.data?.topRated]
  )

  const trendingItems = useMemo(
    () => homeAggregated.data?.trending?.filter((item: TmdbMedia) =>
      item.slug && item.slug.trim() !== '' && item.slug !== 'content'
    ) ?? [],
    [homeAggregated.data?.trending]
  )

  return (
    <div className="min-h-screen text-white overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      <SeoHead
        title={lang === 'ar' ? 'فور سيما - منصة الأفلام والمسلسلات الأولى' : '4Cima - #1 Arabic Streaming Platform'}
        description={description}
        keywords={HOME_KEYWORDS}
      />

      <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full relative">
        {/* 1. QUANTUM HERO PORTAL */}
        <section className="relative z-10 w-full">
          {diverseHero.isLoading ? <SkeletonHero /> : <QuantumHero items={heroItems} />}
        </section>

        <AdsManager type="banner" position="home-top" />

        {/* Continue Watching - for logged-in users */}
        {user && (
          <section className="relative z-20 pt-6 pb-2">
            <ContinueWatchingRow userId={user.id} />
          </section>
        )}

        {/* AI Recommendations */}
        {user && recommendations && recommendations.length > 0 && (
          <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-violet-950/10 mb-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent opacity-50 blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <QuantumTrain
                items={recommendations}
                title={lang === 'ar' ? 'مقترح لك' : 'Picked for You'}
                icon={<Zap className="text-amber-400" />}
                badge={lang === 'ar' ? 'ذكاء اصطناعي' : 'AI Powered'}
                color="purple"
                className="!py-8"
              />
            </div>
          </section>
        )}

        {/* 2. THE INFINITE TRAIN */}
        <section className="relative z-20 mt-8 w-full overflow-hidden pb-4 rounded-3xl">
          {homeAggregated.isLoading ? (
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4 md:px-12 mt-8 mb-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-full aspect-[2/3] rounded-xl bg-gray-800/40 animate-pulse border border-gray-700/30 shadow-lg" />
              ))}
            </div>
          ) : (
            <QuantumTrain items={sanitizeMediaItems(trendingItems)} />
          )}
        </section>

        {/* 3. MASONRY GRID & CONTENT */}
        <div className="relative z-30 space-y-2 pb-4 mt-16">

          {/* Section: Trending Egypt (Aflam) */}
          <section>
            {criticalHomeData.isLoading ? (
              <>
                <SectionHeader title={lang === 'ar' ? 'الأعلى مشاهدة' : 'Top Trending'} icon={<Zap />} link="/movies/trending" />
                <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4 md:px-12 mt-8 mb-12">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-full aspect-[2/3] rounded-xl bg-gray-800/40 animate-pulse border border-gray-700/30 shadow-lg" />
                  ))}
                </div>
              </>
            ) : (
              <QuantumTrain
                items={sanitizeMediaItems(criticalHomeData.data?.popularAr)}
                title={lang === 'ar' ? 'الأعلى مشاهدة' : 'Top Trending'}
                icon={<Zap />}
                link="/movies/trending"
              />
            )}
          </section>

          {/* Section: Ramadan & Arabic Series */}
          <section>
            {criticalHomeData.isLoading ? (
              <>
                <SectionHeader title={lang === 'ar' ? 'مسلسلات عربية ورمضانية' : 'Arabic & Ramadan Series'} icon={<Tv />} link="/series/trending" />
                <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4 md:px-12 mt-8 mb-12">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-full aspect-[2/3] rounded-xl bg-gray-800/40 animate-pulse border border-gray-700/30 shadow-lg" />
                  ))}
                </div>
              </>
            ) : (
              <QuantumTrain
                items={sanitizeMediaItems(criticalHomeData.data?.arabicSeries)}
                title={lang === 'ar' ? 'مسلسلات عربية ورمضانية' : 'Arabic & Ramadan Series'}
                icon={<Tv />}
                link="/series/trending"
              />
            )}
          </section>

          {/* Section: Kids & Family */}
          <section>
            {criticalHomeData.isLoading ? (
              <>
                <SectionHeader title={lang === 'ar' ? 'أطفال وعائلة' : 'Kids & Family'} icon={<Smile />} link="/movies/animation" />
                <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4 md:px-12 mt-8 mb-12">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-full aspect-[2/3] rounded-xl bg-gray-800/40 animate-pulse border border-gray-700/30 shadow-lg" />
                  ))}
                </div>
              </>
            ) : (
              <QuantumTrain
                items={sanitizeMediaItems(criticalData?.kids)}
                title={lang === 'ar' ? 'أطفال وعائلة' : 'Kids & Family'}
                icon={<Smile />}
                link="/movies/animation"
              />
            )}
          </section>


          <div ref={belowFoldTriggerRef} className="h-px w-full" />

          {canLoadBelowFold ? (
            <Suspense
              fallback={
                <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4 md:px-12 mt-8 mb-12">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-full aspect-[2/3] rounded-xl bg-gray-800/40 animate-pulse border border-gray-700/30 shadow-lg" />
                  ))}
                </div>
              }
            >
              <HomeBelowFoldSections
                criticalHomeData={criticalData}
                topRatedMovies={topRatedMovies}
              />
            </Suspense>
          ) : (
            <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4 md:px-12 mt-8 mb-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-full aspect-[2/3] rounded-xl bg-gray-800/40 animate-pulse border border-gray-700/30 shadow-lg" />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

