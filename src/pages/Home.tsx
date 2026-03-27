import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { tmdb } from '../lib/tmdb'
import { AdsManager } from '../components/features/system/AdsManager'
import { useCategoryVideos } from '../hooks/useFetchContent'
import { resolveTitleWithFallback } from '../lib/translation'
import { useAuth } from '../hooks/useAuth'
import { useLang } from '../state/useLang'
import { useRecommendations } from '../hooks/useRecommendations'
import { Zap, Tv, Smile } from 'lucide-react'
import { SkeletonHero } from '../components/common/Skeletons'
import { supabase } from '../lib/supabase'
import { SeoHead } from '../components/common/SeoHead'
import { QuantumHero } from '../components/features/hero/QuantumHero'
import { QuantumTrain } from '../components/features/media/QuantumTrain'
import { ContinueWatchingRow } from '../components/features/media/ContinueWatchingRow'
import { SectionHeader } from '../components/common/SectionHeader'
import { logger } from '../lib/logger'

const HomeBelowFoldSections = lazy(() =>
  import('../components/features/home/HomeBelowFoldSections').then((mod) => ({
    default: mod.HomeBelowFoldSections
  }))
)

type TmdbMedia = {
  id: number
  title?: string
  name?: string
  media_type?: 'movie' | 'tv'
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  overview?: string
  release_date?: string
  first_air_date?: string
}

type HomeViewRow = {
  tmdb_id: number
  media_type: 'movie' | 'tv'
  title?: string | null
  name?: string | null
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number | null
  overview?: string | null
  release_date?: string | null
  first_air_date?: string | null
}

const sanitizeMediaItems = (items: TmdbMedia[] | undefined) =>
  (items || []).filter((item) =>
    Number.isFinite(Number(item?.id)) &&
    Number(item.id) > 0 &&
    Boolean(item.poster_path && item.poster_path.trim()) &&
    Boolean(resolveTitleWithFallback(item))
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
  // 1. DIVERSE HERO CONTENT (Optimized with Static Cache)
  const diverseHero = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['diverse-hero-content'],
    queryFn: async () => {
      // Try Static Cache First
      try {
        const res = await fetch('/data/homepage_cache.json')
        if (res.ok) {
          const cache = await res.json()
          if (cache.trending && cache.trending.length > 0) {
             // Transform if necessary to match TmdbMedia type
             // The cache contains Supabase 'movies'/'series' rows.
             // We need to map them to TmdbMedia shape (id, title, poster_path...)
             // Supabase columns: tmdb_id, title, poster_path, backdrop_path, vote_average, overview...
             
             return {
               results: cache.trending.map((item: any) => ({
                 id: item.tmdb_id,
                 title: item.title || item.name,
                 name: item.name || item.title,
                 media_type: item.media_type || (item.title ? 'movie' : 'tv'),
                 poster_path: item.poster_path,
                 backdrop_path: item.backdrop_path,
                 vote_average: item.vote_average,
                 overview: item.overview,
                 release_date: item.release_date || item.first_air_date
               }))
             }
          }
        }
      } catch (e) {
        logger.warn('Static cache miss for hero')
      }

      // Fallback to TMDB API (Original Logic)
      const endpoints = [
        { type: 'movie', lang: 'en' }, // Foreign Movie
        { type: 'movie', lang: 'ar' }, // Arabic Movie
        { type: 'tv', lang: 'ar' },    // Arabic Series
        { type: 'tv', lang: 'en' },    // Foreign Series
        { type: 'tv', lang: 'tr' },    // Turkish Series
        { type: 'tv', lang: 'ko' },    // Korean Series
        { type: 'movie', lang: 'hi' }, // Bollywood
        { type: 'tv', lang: 'ja', genres: '16' } // Anime
      ] as const

      const promises = endpoints.map(async ep => {
        try {
          const today = new Date().toISOString().split('T')[0]
          const params: any = { 
            with_original_language: ep.lang,
            sort_by: 'popularity.desc',
            'vote_count.gte': 10, // Basic filter to avoid junk
            page: 1,
            language: 'ar-SA'
          }
          if (ep.type === 'movie') {
            params['release_date.lte'] = today
          } else {
            params['first_air_date.lte'] = today
          }
          if ('genres' in ep) params.with_genres = ep.genres

          const res = await tmdb.get(`/discover/${ep.type}`, { params })
          
          const item = res.data.results?.[0]
          if (!item) return null
          
          return { ...item, media_type: ep.type }
        } catch (e) {
          return null
        }
      })

      const results = await Promise.all(promises)
      return { results: results.filter((i): i is TmdbMedia => !!i) }
    },
    staleTime: 1000 * 60 * 60, // 60 mins
    placeholderData: keepPreviousData
  })

  // 2. CHINESE DRAMAS
  const chineseSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'chinese-series-initial'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await tmdb.get('/discover/tv', {
        params: {
          with_original_language: 'zh',
          sort_by: 'popularity.desc',
          'first_air_date.lte': today,
          page: 1,
        },
      })
      return { results: data.results.map((i: any) => ({ ...i, media_type: 'tv' })) }
    },
    enabled: false,
    staleTime: 300000,
  })

  // 3. DIVERSE SECTIONS (Bollywood, K-Drama, Kids, Docs)
  const bollywoodMovies = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'bollywood-initial'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await tmdb.get('/discover/movie', {
        params: {
          with_original_language: 'hi',
          sort_by: 'popularity.desc',
          'release_date.lte': today,
          page: 1,
          region: 'IN',
        },
      })
      return data
    },
    enabled: false,
    staleTime: 300000,
  })

  const koreanSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'k-drama-initial'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await tmdb.get('/discover/tv', {
        params: {
          with_original_language: 'ko',
          sort_by: 'popularity.desc',
          'first_air_date.lte': today,
          page: 1,
        },
      })
      return data
    },
    enabled: false,
    staleTime: 300000,
  })

  const documentaries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'docs-initial'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await tmdb.get('/discover/movie', {
        params: {
          with_genres: '99',
          sort_by: 'popularity.desc',
          'release_date.lte': today,
          page: 1,
        },
      })
      return data
    },
    enabled: false,
    staleTime: 300000,
  })

  const homeAggregated = useQuery({
    queryKey: ['home-aggregated', lang],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/home?lang=${lang === 'ar' ? 'ar' : 'en'}`)
        if (res.ok) {
          return res.json() as Promise<{
            tmdb?: {
              trending?: { results?: TmdbMedia[] }
              popularMovies?: { results?: TmdbMedia[] }
              topRatedMovies?: { results?: TmdbMedia[] }
            }
            supabase?: {
              mvTrending?: any[] | null
            }
          }>
        }
      } catch (e) {
        logger.warn('home_aggregated_failed, falling back to direct TMDB fetch')
      }
      
      // Fallback if /api/home doesn't exist or fails
      const { data } = await tmdb.get('/movie/popular', { params: { page: 1 } }).catch(() => ({ data: { results: [] } }))
      return {
        tmdb: {
          popularMovies: data
        }
      }
    },
    staleTime: 300000,
  })

  const plays = useCategoryVideos('plays', { limit: 20 })

  const criticalHomeData = useQuery<{ popularAr: TmdbMedia[]; arabicSeries: TmdbMedia[]; kids: TmdbMedia[]; bollywood: TmdbMedia[] }>({
    queryKey: ['home-critical-lcp'],
    queryFn: async () => {
      const mapRows = (rows: HomeViewRow[] | null | undefined): TmdbMedia[] => {
        return (rows || [])
          .map((item) => ({
            id: Number(item.tmdb_id),
            slug: (item as any).slug || undefined,
            title: item.title || undefined,
            name: item.name || undefined,
            media_type: item.media_type,
            poster_path: item.poster_path || undefined,
            backdrop_path: item.backdrop_path || undefined,
            vote_average: item.vote_average || 0,
            overview: item.overview || undefined,
            release_date: item.release_date || undefined,
            first_air_date: item.first_air_date || undefined
          }))
          .filter((item) => {
            return (
              Number.isFinite(Number(item.id)) &&
              Number(item.id) > 0 &&
              Boolean(item.poster_path && item.poster_path.trim()) &&
              Boolean(resolveTitleWithFallback(item))
            )
          })
      }

      const mapMovies = (rows: any[] | null | undefined): TmdbMedia[] => {
        return (rows || [])
          .map((item) => ({
            id: Number(item.tmdb_id || item.id),
            slug: item.slug || undefined,
            title: item.title || undefined,
            media_type: 'movie' as const,
            poster_path: item.poster_path || undefined,
            backdrop_path: item.backdrop_path || undefined,
            vote_average: item.vote_average || 0,
            overview: item.overview || undefined,
            release_date: item.release_date || undefined
          }))
          .filter((item) => {
            return (
              Number.isFinite(Number(item.id)) &&
              Number(item.id) > 0 &&
              Boolean(item.poster_path && item.poster_path.trim()) &&
              Boolean(resolveTitleWithFallback(item))
            )
          })
      }

      const mapSeries = (rows: any[] | null | undefined): TmdbMedia[] => {
        return (rows || [])
          .map((item) => ({
            id: Number(item.id),
            slug: item.slug || undefined,
            name: item.name || item.title || undefined,
            media_type: 'tv' as const,
            poster_path: item.poster_path || undefined,
            backdrop_path: item.backdrop_path || undefined,
            vote_average: item.vote_average || 0,
            overview: item.overview || undefined,
            first_air_date: item.first_air_date || undefined
          }))
          .filter((item) => {
            return (
              Number.isFinite(Number(item.id)) &&
              Number(item.id) > 0 &&
              Boolean(item.poster_path && item.poster_path.trim()) &&
              Boolean(resolveTitleWithFallback(item))
            )
          })
      }

      const today = new Date().toISOString().split('T')[0]
      
      const [trendingView, arabicSeriesView, kidsView, bollywoodView, kidsTmdb, arabicSeriesTmdb, bollywoodTmdb] = await Promise.all([
        supabase.from('mv_home_trending').select('*').limit(20),
        supabase
          .from('tv_series')
          .select('id,slug,name,title,poster_path,backdrop_path,vote_average,overview,first_air_date,is_ramadan,original_language,origin_country,popularity')
          .or('is_ramadan.eq.true,original_language.eq.ar,origin_country.cs.{EG},origin_country.cs.{SA},origin_country.cs.{SY},origin_country.cs.{AE},origin_country.cs.{KW}')
          .lte('first_air_date', today)
          .order('popularity', { ascending: false })
          .limit(50),
        supabase
          .from('movies')
          .select('id,slug,tmdb_id,title,poster_path,backdrop_path,vote_average,overview,release_date,category,popularity')
          .in('category', ['kids-family', 'kids', 'family', 'animation'])
          .lte('release_date', today)
          .order('popularity', { ascending: false })
          .limit(50),
        supabase
          .from('movies')
          .select('id,slug,tmdb_id,title,poster_path,backdrop_path,vote_average,overview,release_date,original_language,origin_country,category,popularity')
          .or('category.eq.bollywood,original_language.eq.hi,origin_country.cs.{IN}')
          .lte('release_date', today)
          .order('popularity', { ascending: false })
          .limit(50),
        tmdb.get('/discover/movie', {
          params: {
            with_genres: '16,10751',
            sort_by: 'popularity.desc',
            'release_date.lte': today,
            'vote_count.gte': 50,
            page: 1
          }
        }).catch(() => ({ data: { results: [] } })),
        tmdb.get('/discover/tv', {
          params: {
            with_original_language: 'ar',
            with_origin_country: 'EG|SA|SY|AE|KW',
            sort_by: 'popularity.desc',
            'first_air_date.lte': today,
            'vote_count.gte': 10,
            page: 1
          }
        }).catch(() => ({ data: { results: [] } })),
        tmdb.get('/discover/movie', {
          params: {
            with_original_language: 'hi',
            with_origin_country: 'IN',
            sort_by: 'popularity.desc',
            'release_date.lte': today,
            'vote_count.gte': 20,
            page: 1
          }
        }).catch(() => ({ data: { results: [] } }))
      ])

      const popularArFromView = !trendingView.error ? mapRows(trendingView.data as HomeViewRow[]) : []
      const arabicSeriesFromDb = !arabicSeriesView.error ? mapSeries(arabicSeriesView.data as any[]) : []
      const kidsFromDb = !kidsView.error ? mapMovies(kidsView.data as any[]) : []
      const bollywoodFromDb = !bollywoodView.error ? mapMovies(bollywoodView.data as any[]) : []

      const popularAr = popularArFromView.length > 0
        ? popularArFromView
        : mapMovies((await tmdb.get('/discover/movie', { params: { region: 'EG', sort_by: 'popularity.desc', 'release_date.lte': today, page: 1 } }).catch(() => ({ data: { results: [] } }))).data.results || [])

      const arabicSeries = arabicSeriesFromDb.length > 0 ? arabicSeriesFromDb : mapSeries(arabicSeriesTmdb.data?.results || [])
      const kids = kidsFromDb.length > 0 ? kidsFromDb : mapMovies(kidsTmdb.data?.results || [])
      const bollywood = bollywoodFromDb.length > 0 ? bollywoodFromDb : mapMovies(bollywoodTmdb.data?.results || [])

      return {
        popularAr,
        arabicSeries,
        kids,
        bollywood
      }
    },
    staleTime: 300000
  })

  const description = lang === 'ar' ? 'منصة أونلاين سينما - تجربة المستقبل' : 'Online Cinema - The Future Experience'

  const heroItems = diverseHero.data?.results || []
  const criticalData = criticalHomeData.data
  const topRatedMovies = homeAggregated.data?.tmdb?.topRatedMovies?.results

  return (
    <div className="min-h-screen text-white overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      <SeoHead
        title={lang === 'ar' ? 'أونلاين سينما - منصة الأفلام والمسلسلات الأولى' : 'Online Cinema - #1 Arabic Streaming Platform'}
        description={description}
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
            <QuantumTrain items={sanitizeMediaItems(homeAggregated.data?.tmdb?.popularMovies?.results || [])} />
          )}
        </section>

        {/* 3. MASONRY GRID & CONTENT */}
        <div className="relative z-30 space-y-2 pb-4 mt-16">
        
        {/* Section: Trending Egypt (Aflam) */}
        <section>
          {criticalHomeData.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'الأعلى مشاهدة' : 'Top Trending'} icon={<Zap />} link="/movies" />
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
              link="/movies" 
            />
          )}
        </section>

        {/* Section: Ramadan & Arabic Series */}
        <section>
          {criticalHomeData.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'مسلسلات عربية ورمضانية' : 'Arabic & Ramadan Series'} icon={<Tv />} link="/ramadan" />
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
              link="/ramadan" 
            />
          )}
        </section>

        {/* Section: Kids & Family */}
        <section>
          {criticalHomeData.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'أطفال وعائلة' : 'Kids & Family'} icon={<Smile />} link="/kids" />
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
              link="/kids" 
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

