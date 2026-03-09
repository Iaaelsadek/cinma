import { useMemo, useState, useEffect, useRef } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { tmdb } from '../lib/tmdb'
import { AdsManager } from '../components/features/system/AdsManager'
import { useAuth } from '../hooks/useAuth'
import { CONFIG } from '../lib/constants'
import { useLang } from '../state/useLang'
import { useRecommendations } from '../hooks/useRecommendations'
import { Zap, Tv, Film, Drama, Sparkles, Smile, FileText, Play, BrainCircuit } from 'lucide-react'
import { MovieCard } from '../components/features/media/MovieCard'
import { HolographicCard } from '../components/effects/HolographicCard'
import { PrefetchLink } from '../components/common/PrefetchLink'
import { getRecommendations, type RecommendationItem } from '../services/recommendations'
import { useCategoryVideos } from '../hooks/useFetchContent'
import { SkeletonGrid, SkeletonHero } from '../components/common/Skeletons'
import { supabase } from '../lib/supabase'
import { SeoHead } from '../components/common/SeoHead'
import { QuantumHero } from '../components/features/hero/QuantumHero'
import { QuantumTrain } from '../components/features/media/QuantumTrain'
import { ContinueWatchingRow } from '../components/features/media/ContinueWatchingRow'
import { SectionHeader } from '../components/common/SectionHeader'
import { logger } from '../lib/logger'

// Types (kept from original)
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

import { useTranslatedContent } from '../hooks/useTranslatedContent'
import { useDailyMotion } from '../hooks/useDailyMotion'
import { resolveTitleWithFallback } from '../lib/translation'

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
          const params: any = { 
            with_original_language: ep.lang,
            sort_by: ep.type === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc',
            'vote_count.gte': 10, // Basic filter to avoid junk
            page: 1,
            language: 'ar-SA'
          }
          if ('genres' in ep) params.with_genres = ep.genres

          const res = await tmdb.get(`/discover/${ep.type}`, { params })
          
          let item = res.data.results?.[0]
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
    queryKey: ['home', 'chinese-series'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', { 
        params: { 
          with_original_language: 'zh', 
          sort_by: 'first_air_date.desc', 
          page: 1 
        } 
      })
      return { results: data.results.map((i: any) => ({ ...i, media_type: 'tv' })) }
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  // 3. DIVERSE SECTIONS (Bollywood, K-Drama, Kids, Docs)
  const bollywoodMovies = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'bollywood'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/movie', { 
        params: { 
          with_original_language: 'hi', 
          sort_by: 'primary_release_date.desc', 
          page: 1,
          region: 'IN'
        } 
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const koreanSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'k-drama'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', { 
        params: { 
          with_original_language: 'ko', 
          sort_by: 'first_air_date.desc', 
          page: 1 
        } 
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY && canLoadBelowFold,
    staleTime: 300000
  })

  const documentaries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'docs'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/movie', { 
        params: { 
          with_genres: '99', 
          sort_by: 'primary_release_date.desc', 
          page: 1 
        } 
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY && canLoadBelowFold,
    staleTime: 300000
  })

  const popularMovies = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['popular-train'],
    queryFn: async () => {
      const [moviePage1, moviePage2, tvPage1, tvPage2] = await Promise.all([
        tmdb.get('/movie/popular', { params: { page: 1 } }),
        tmdb.get('/movie/popular', { params: { page: 2 } }),
        tmdb.get('/tv/popular', { params: { page: 1 } }),
        tmdb.get('/tv/popular', { params: { page: 2 } })
      ])

      const withType = (items: TmdbMedia[] | undefined, type: 'movie' | 'tv'): TmdbMedia[] =>
        (items || []).map((item) => ({ ...item, media_type: item.media_type || type }))

      return { results: [
        ...withType(moviePage1.data.results, 'movie'),
        ...withType(moviePage2.data.results, 'movie'),
        ...withType(tvPage1.data.results, 'tv'),
        ...withType(tvPage2.data.results, 'tv')
      ]}
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    placeholderData: keepPreviousData,
    staleTime: 300000
  })

  const plays = useCategoryVideos('plays', { limit: 20 }) 

  const turkishSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'turkish-series'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', { 
        params: { 
          with_original_language: 'tr', 
          sort_by: 'first_air_date.desc', 
          page: 1 
        } 
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY && canLoadBelowFold,
    staleTime: 300000
  })

  const criticalHomeData = useQuery<{ popularAr: TmdbMedia[]; arabicSeries: TmdbMedia[]; kids: TmdbMedia[] }>({
    queryKey: ['home-critical-lcp'],
    queryFn: async () => {
      const mapRows = (rows: HomeViewRow[] | null | undefined): TmdbMedia[] =>
        (rows || [])
          .map((item) => ({
            id: Number(item.tmdb_id),
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
          .filter((item) =>
            Number.isFinite(Number(item.id)) &&
            Number(item.id) > 0 &&
            Boolean(item.poster_path && item.poster_path.trim()) &&
            Boolean(resolveTitleWithFallback(item))
          )

      const [trendingView, ramadanView, kidsTmdb] = await Promise.all([
        supabase.from('mv_home_trending').select('*').limit(20),
        supabase.from('mv_ramadan_eg').select('*').limit(20),
        tmdb.get('/discover/movie', {
          params: {
            with_genres: '16,10751',
            sort_by: 'primary_release_date.desc',
            page: 1
          }
        })
      ])

      const popularArFromView = !trendingView.error ? mapRows(trendingView.data as HomeViewRow[]) : []
      const arabicSeriesFromView = !ramadanView.error ? mapRows(ramadanView.data as HomeViewRow[]) : []

      const popularAr = popularArFromView.length > 0
        ? popularArFromView
        : ((await tmdb.get('/discover/movie', { params: { region: 'EG', sort_by: 'primary_release_date.desc', page: 1 } })).data.results || [])

      const arabicSeries = arabicSeriesFromView.length > 0
        ? arabicSeriesFromView
        : ((await tmdb.get('/discover/tv', { params: { with_original_language: 'ar', sort_by: 'first_air_date.desc', page: 1 } })).data.results || [])

      return {
        popularAr,
        arabicSeries,
        kids: kidsTmdb.data?.results || []
      }
    },
    staleTime: 300000
  })

  const tmdbAnime = useQuery<any[]>({
    queryKey: ['home-anime-fallback'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', {
        params: { with_genres: '16', with_original_language: 'ja', sort_by: 'first_air_date.desc' }
      })
      return data.results
    },
    enabled: !!CONFIG.TMDB_API_KEY && canLoadBelowFold,
    staleTime: 300000
  })

  // --- RESTORED QUERIES ---
  const goldenEra = useCategoryVideos('golden-era', { limit: 10, enabled: canLoadBelowFold })
  const recaps = useCategoryVideos('recaps', { limit: 10, enabled: canLoadBelowFold })
  const animeHub = useCategoryVideos('anime', { limit: 20, enabled: canLoadBelowFold })
  const quranHub = useCategoryVideos('quran', { limit: 20 })

  const tmdbClassics = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'classics'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/movie', { 
        params: { 
          'release_date.lte': '1980-01-01', 
          sort_by: 'popularity.desc', 
          page: 1 
        } 
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY && canLoadBelowFold,
    staleTime: 300000
  })

  const topRatedMovies = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'top-rated'],
    queryFn: async () => {
      const { data } = await tmdb.get('/movie/top_rated', { params: { page: 1 } })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY && canLoadBelowFold,
    staleTime: 300000
  })

  const dmTrending = useDailyMotion(canLoadBelowFold)

  // Apply translations directly
  const translatedKorean = useTranslatedContent(koreanSeries.data?.results)
  const translatedTurkish = useTranslatedContent(turkishSeries.data?.results)
  const translatedChinese = useTranslatedContent(chineseSeries.data?.results)

  const description = lang === 'ar' ? 'منصة أونلاين سينما - تجربة المستقبل' : 'Online Cinema - The Future Experience'

  const heroItems = diverseHero.data?.results || []
  const sanitizeMediaItems = (items: TmdbMedia[] | undefined) =>
    (items || []).filter((item) =>
      Number.isFinite(Number(item?.id)) &&
      Number(item.id) > 0 &&
      Boolean(item.poster_path && item.poster_path.trim()) &&
      Boolean(resolveTitleWithFallback(item))
    )

  return (
    <div className="min-h-screen text-white overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      <SeoHead
        title={lang === 'ar' ? 'أونلاين سينما - منصة الأفلام والمسلسلات الأولى' : 'Online Cinema - #1 Arabic Streaming Platform'}
        description={description}
      />

      <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        {/* 1. QUANTUM HERO PORTAL */}
        <section className="relative z-10 w-full">
           {popularMovies.isLoading ? <SkeletonHero /> : <QuantumHero items={heroItems} />}
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
                 icon={<Sparkles className="text-amber-400 animate-pulse" />}
                 badge={lang === 'ar' ? 'ذكاء اصطناعي' : 'AI Powered'}
                 color="purple"
                 className="!py-8"
               />
            </div>
          </section>
        )}

        {/* 2. THE INFINITE TRAIN */}
        <section className="relative z-20 -mt-12 w-full overflow-hidden pb-4 rounded-3xl">
          {popularMovies.isLoading ? (
            <div className="flex gap-4 overflow-hidden px-4">
              <SkeletonGrid count={6} variant="poster" />
            </div>
          ) : (
            <QuantumTrain items={popularMovies.data?.results || []} />
          )}
        </section>

        {/* 3. MASONRY GRID & CONTENT */}
        <div className="relative z-30 space-y-2 pb-4">
        
        {/* Section: Trending Egypt (Aflam) */}
        <section>
          {criticalHomeData.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'الأعلى مشاهدة في مصر' : 'Top Trending in Egypt'} icon={<Zap />} link="/movies" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={sanitizeMediaItems(criticalHomeData.data?.popularAr)} 
              title={lang === 'ar' ? 'الأعلى مشاهدة في مصر' : 'Top Trending in Egypt'} 
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
              <SkeletonGrid count={6} variant="poster" />
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
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={sanitizeMediaItems(criticalHomeData.data?.kids)} 
              title={lang === 'ar' ? 'أطفال وعائلة' : 'Kids & Family'} 
              icon={<Smile />} 
              link="/kids" 
            />
          )}
        </section>


        <div ref={belowFoldTriggerRef} className="h-px w-full" />

        {canLoadBelowFold ? (
          <>
        {/* Section: Korean & Chinese Series */}
        <section>
          {koreanSeries.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'الدراما الكورية' : 'K-Drama'} icon={<Film />} link="/k-drama" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={sanitizeMediaItems(translatedKorean.data)} 
              title={lang === 'ar' ? 'الدراما الكورية' : 'K-Drama'} 
              icon={<Film />} 
              link="/k-drama" 
              color="pink"
            />
          )}
        </section>

        <section>
           {chineseSeries.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'مسلسلات صينية قصيرة' : 'Chinese Short Series'} icon={<Tv />} link="/chinese" />
              <SkeletonGrid count={6} variant="poster" />
            </>
           ) : (
            <QuantumTrain 
              items={sanitizeMediaItems(translatedChinese.data)} 
              title={lang === 'ar' ? 'مسلسلات صينية قصيرة' : 'Chinese Short Series'} 
              icon={<Tv />} 
              link="/chinese" 
              color="cyan"
            />
           )}
        </section>

        <section>
          {turkishSeries.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'الدراما التركية' : 'Turkish Drama'} icon={<Film />} link="/turkish" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={sanitizeMediaItems(translatedTurkish.data)} 
              title={lang === 'ar' ? 'الدراما التركية' : 'Turkish Drama'} 
              icon={<Film />} 
              link="/turkish" 
            />
          )}
        </section>

        {/* Section: Bollywood */}
        <section>
          {bollywoodMovies.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'أفلام بوليوود' : 'Bollywood Movies'} icon={<Film />} link="/bollywood" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={sanitizeMediaItems(bollywoodMovies.data?.results)} 
              title={lang === 'ar' ? 'أفلام بوليوود' : 'Bollywood Movies'} 
              icon={<Film />} 
              link="/bollywood" 
              color="gold"
            />
          )}
        </section>

        {/* Section: Masrahiyat (Plays) */}
        <section>
          {plays.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'مسرحيات وكلاسيكيات' : 'Plays & Classics'} icon={<Drama />} link="/plays" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={plays.data || []} 
              title={lang === 'ar' ? 'مسرحيات وكلاسيكيات' : 'Plays & Classics'} 
              icon={<Drama />} 
              link="/plays" 
              type="video"
            />
          )}
        </section>

        {/* Section: Global Trending */}
        <section>
          <SectionHeader title={lang === 'ar' ? 'الرائج عالمياً' : 'Global Trending'} icon={<Zap />} link="/top-watched" />
          {criticalHomeData.isPending ? <SkeletonGrid count={10} variant="poster" /> : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 perspective-1000">
              {sanitizeMediaItems(criticalHomeData.data?.popularAr).slice(0, 12).map((movie, idx) => (
                 <MovieCard key={movie.id} movie={movie} index={idx} />
              ))}
            </div>
          )}
        </section>

        {/* Section: Documentaries */}
        <section>
          {documentaries.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'وثائقيات وواقع' : 'Documentaries'} icon={<FileText />} link="/docs" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={sanitizeMediaItems(documentaries.data?.results)} 
              title={lang === 'ar' ? 'وثائقيات وواقع' : 'Documentaries'} 
              icon={<FileText />} 
              link="/docs" 
            />
          )}
        </section>


        {/* Section: Golden Era & Recaps (Bento Style) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <BentoBox 
             title={lang === 'ar' ? 'العصر الذهبي' : 'Golden Era'} 
             icon={<Film />} 
             items={(goldenEra.data && goldenEra.data.length > 0) ? goldenEra.data : (tmdbClassics.data?.results || [])}
             color="gold"
           />
           <BentoBox 
             title={lang === 'ar' ? 'ملخصات الأفلام' : 'Movie Recaps'} 
             icon={<Zap />} 
             items={recaps.data || []}
             color="cyan"
           />
        </section>

        {/* Section: DailyMotion Trending */}
        {dmTrending.data && dmTrending.data.length > 0 && (
          <section>
            <SectionHeader 
              title={lang === 'ar' ? 'الرائج على ديلي موشن' : 'Trending on DailyMotion'} 
              icon={<Play />} 
              badge="DailyMotion"
              color="purple"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
               {dmTrending.data.map((item, i) => (
                 <HolographicCard key={item.id} className="aspect-video group relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    <PrefetchLink to={`/watch/dm/${item.id}`} className="block h-full w-full">
                       <img 
                         src={item.thumbnail_720_url || item.thumbnail_480_url || item.thumbnail_360_url || item.thumbnail_240_url || `https://placehold.co/600x400/000000/FFFFFF/png?text=${encodeURIComponent(item.title)}`} 
                         alt={item.title}
                         className="h-full w-full object-cover opacity-80 group-hover:opacity-100"
                         loading="lazy"
                         referrerPolicy="no-referrer"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                       <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h3 className="text-xs font-bold text-white line-clamp-2 mb-1">{item.title}</h3>
                       </div>
                       {/* Play Icon Overlay */}
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                             <Play fill="white" size={16} className="text-white ml-0.5" />
                          </div>
                       </div>
                    </PrefetchLink>
                 </HolographicCard>
               ))}
            </div>
          </section>
        )}

        {/* Section: Anime */}
        <section>
          {(animeHub.isLoading && tmdbAnime.isLoading) ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'أنمي مترجم' : 'Anime'} icon={<Tv />} link="/anime" />
              <SkeletonGrid count={6} variant="poster" /> 
            </>
          ) : (
             <QuantumTrain 
               items={sanitizeMediaItems((animeHub.data && animeHub.data.length > 0) ? animeHub.data : tmdbAnime.data)} 
               title={lang === 'ar' ? 'أنمي مترجم' : 'Anime'} 
               icon={<Tv />} 
               link="/anime" 
             />
          )}
        </section>

        {/* Section: Top Rated */}
        <section>
           <SectionHeader 
             title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} 
             icon={<Film />} 
             link="/movies" 
             badge="⭐ 9.0+"
           />
           <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-none">
             {sanitizeMediaItems(topRatedMovies.data?.results).slice(0, 10).map((movie, idx) => (
                <div key={movie.id} className="snap-center shrink-0 w-[120px] md:w-[140px]">
                   <MovieCard movie={movie} index={idx} />
                </div>
              ))}
           </div>
        </section>
          </>
        ) : (
          <section>
            <SkeletonGrid count={6} variant="poster" />
          </section>
        )}


        {/* AI Discovery */}
        {user && (
          <section className="relative p-6 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10" />
            <div className="relative z-10">
               <SectionHeader 
                 title={lang === 'ar' ? 'اكتشافات الذكاء الاصطناعي' : 'AI Discovery Protocol'} 
                 icon={<BrainCircuit />} 
                 color="cyan"
               />
               <AIRecommended userId={user.id} />
            </div>
          </section>
        )}

        </div>
      </div>
    </div>
  )
}

// --- SUB COMPONENTS ---

const BentoBox = ({ title, icon, items, color }: { title: string, icon: any, items: any[], color: 'cyan' | 'purple' | 'gold' }) => {
  if (!items || items.length === 0) return null

  return (
    <div>
      <SectionHeader title={title} icon={icon} color={color} />
      <div className="grid grid-cols-2 gap-3">
        {items.slice(0, 4).map((item, i) => {
          const isTmdb = !!item.poster_path || !!item.backdrop_path
          const img = item.thumbnail || (item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}` : `https://image.tmdb.org/t/p/w500${item.poster_path}`)
          const link = isTmdb 
            ? `/watch/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}` 
            : `/watch/yt/${item.id}`
            
          return (
            <HolographicCard key={item.id} className={`aspect-video ${i === 0 ? 'col-span-2 row-span-2 aspect-video' : ''}`}>
               <PrefetchLink to={link} className="block h-full relative group">
                  <img 
                    src={img} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                    alt={item.title || item.name}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                     <h4 className="font-bold text-white leading-tight line-clamp-2 text-sm md:text-lg">{item.title || item.name}</h4>
                  </div>
               </PrefetchLink>
            </HolographicCard>
          )
        })}
      </div>
    </div>
  )
}

const AIRecommended = ({ userId }: { userId: string }) => {
  const q = useQuery<RecommendationItem[]>({ 
    queryKey: ['recs', userId], 
    queryFn: () => getRecommendations(userId),
    staleTime: 1000 * 60 * 60
  })

  if (!q.data?.length) return <div className="text-zinc-500">Initializing Neural Net...</div>

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
      {q.data.slice(0, 5).map(m => (
        <HolographicCard key={m.id} className="aspect-[2/3]">
           <PrefetchLink to={`/watch/movie/${m.id}`}>
             <img 
               src={`https://image.tmdb.org/t/p/w300${m.poster_path}`} 
               className="w-full h-full object-cover" 
               alt={m.title}
               loading="lazy" 
             />
           </PrefetchLink>
        </HolographicCard>
      ))}
    </div>
  )
}
