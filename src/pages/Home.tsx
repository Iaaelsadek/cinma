import { useMemo } from 'react'
import { PrefetchLink } from '../components/common/PrefetchLink'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { tmdb } from '../lib/tmdb'
import { AdsManager } from '../components/features/system/AdsManager'
import { useAuth } from '../hooks/useAuth'
import { CONFIG } from '../lib/constants'
import { useLang } from '../state/useLang'
import { getRecommendations, RecommendationItem } from '../services/recommendations'
import { useRecommendations } from '../hooks/useRecommendations'
import { BrainCircuit, Play, Plus, Zap, Cpu, Gamepad2, Tv, Film, Drama, BookOpen, Sparkles } from 'lucide-react'
import { MovieRow } from '../components/features/media/MovieRow'
import { MovieCard } from '../components/features/media/MovieCard'
import { VideoRow } from '../components/features/media/VideoRow'
import { motion } from 'framer-motion'
import { useCategoryVideos, useClassicVideos } from '../hooks/useFetchContent'
import { SkeletonGrid, SkeletonHero } from '../components/common/Skeletons'
import { supabase, getContinueWatching } from '../lib/supabase'
import { SeoHead } from '../components/common/SeoHead'
import { useQuranPlayer } from '../context/QuranPlayerContext'
import { QuantumHero } from '../components/features/hero/QuantumHero'
import { QuantumTrain } from '../components/features/media/QuantumTrain'
import { ContinueWatchingRow } from '../components/features/media/ContinueWatchingRow'
import { HolographicCard } from '../components/effects/HolographicCard'
import { SectionHeader } from '../components/common/SectionHeader'

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

type AnimeRow = {
  id: number
  title: string | null
  category: string | null
  image_url: string | null
}

type QuranRow = {
  id: number
  name: string | null
  category: string | null
  image: string | null
  rewaya: string | null
  server: string | null
}

import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, FreeMode } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'

export const Home = () => {
  const { user } = useAuth()
  const { lang } = useLang()
  const { data: recommendations, isLoading: recommendationsLoading } = useRecommendations()

  // --- DATA FETCHING (Optimized & Parallelized) ---
  // 1. DIVERSE HERO CONTENT
  const diverseHero = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['diverse-hero-content'],
    queryFn: async () => {
      const endpoints = [
        { type: 'movie', lang: 'en' }, // Foreign Movie
        { type: 'movie', lang: 'ar' }, // Arabic Movie
        { type: 'tv', lang: 'ar' },    // Arabic Series
        { type: 'tv', lang: 'en' },    // Foreign Series
        { type: 'movie', lang: 'ko' }, // Korean Movie
        { type: 'tv', lang: 'ko' },    // Korean Series
        { type: 'tv', lang: 'zh' },    // Chinese Series
        { type: 'tv', lang: 'tr' },    // Turkish Series
      ] as const

      const promises = endpoints.map(ep => 
        tmdb.get(`/discover/${ep.type}`, { 
          params: { 
            with_original_language: ep.lang,
            sort_by: 'popularity.desc',
            page: 1
          }
        }).then(res => {
          const item = res.data.results[0]
          return item ? { ...item, media_type: ep.type } : null
        })
      )

      const results = await Promise.all(promises)
      return { results: results.filter((i): i is TmdbMedia => !!i) }
    },
    staleTime: 300000
  })

  // 2. CHINESE DRAMAS
  const chineseSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'chinese-series'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', { 
        params: { 
          with_original_language: 'zh', 
          sort_by: 'popularity.desc', 
          page: 1 
        } 
      })
      return { results: data.results.map((i: any) => ({ ...i, media_type: 'tv' })) }
    },
    enabled: !!CONFIG.TMDB_API_KEY,
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

  const trendingMovies = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['trending-week'],
    queryFn: async () => {
      const { data } = await tmdb.get('/trending/movie/week')
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const heroItems = useMemo(() => {
    return diverseHero.data?.results || []
  }, [diverseHero.data])

  // Other Content
  const classics = useClassicVideos({ limit: 20 })
  const plays = useCategoryVideos('plays', { limit: 20 }) // plays (99 items)
  const goldenEra = useCategoryVideos('golden_era', { limit: 20 }) // golden_era (97 items)
  const recaps = useCategoryVideos('recaps', { limit: 20 }) // recaps (34 items)
  
  const animeHub = useQuery<any[]>({
    queryKey: ['home-anime'],
    queryFn: async () => {
      const { data } = await supabase.from('anime').select('id,title,category,image_url').order('id', { ascending: false }).limit(12)
      return (data || []).map(item => ({
        ...item,
        poster_path: item.image_url,
        media_type: 'tv',
        original_language: 'ja'
      }))
    },
    staleTime: 300000
  })

  const quranHub = useQuery<any[]>({
    queryKey: ['home-quran'],
    queryFn: async () => {
      const { data } = await supabase.from('quran_reciters').select('id,name,category,image,rewaya,server').order('id', { ascending: false }).limit(10)
      return (data || []).map(item => ({
        ...item,
        title: item.name,
        poster_path: item.image,
        media_type: 'quran',
        overview: item.rewaya
      }))
    },
    staleTime: 300000
  })

  const arabicSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'arabic-series'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', { 
        params: { 
          with_original_language: 'ar', 
          sort_by: 'popularity.desc', 
          page: 1 
        } 
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const turkishSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'turkish-series'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', { 
        params: { 
          with_original_language: 'tr', 
          sort_by: 'popularity.desc', 
          page: 1 
        } 
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const popularAr = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'popular-ar'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/movie', { params: { region: 'EG', sort_by: 'popularity.desc', page: 1 } })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const topRatedMovies = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'top-rated-movies'],
    queryFn: async () => {
      const { data } = await tmdb.get('/movie/top_rated', { params: { page: 1 } })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const canonicalUrl = typeof window !== 'undefined' ? `${location.origin}${location.pathname}` : ''
  const description = lang === 'ar' ? 'منصة أونلاين سينما - تجربة المستقبل' : 'Online Cinema - The Future Experience'

  return (
    <div className="min-h-screen text-white overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      <SeoHead
        title={lang === 'ar' ? 'أونلاين سينما - منصة الأفلام والمسلسلات الأولى' : 'Online Cinema - #1 Arabic Streaming Platform'}
        description={description}
      />

      {/* 1. QUANTUM HERO PORTAL */}
      <section className="relative z-10 w-full">
         {popularMovies.isLoading ? <SkeletonHero /> : <QuantumHero items={heroItems} />}
      </section>

      <AdsManager type="banner" position="home-top" />

      <div className="max-w-[2400px] mx-auto px-4 md:px-6 w-full">
        {/* Continue Watching - for logged-in users */}
        {user && (
          <section className="relative z-20 pt-6 pb-2">
            <ContinueWatchingRow userId={user.id} />
          </section>
        )}

        {/* Section: Picked for You (Auth only) - Recommendation System */}
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
          {popularAr.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'الأعلى مشاهدة في مصر' : 'Top Trending in Egypt'} icon={<Zap />} link="/movies" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={popularAr.data?.results || []} 
              title={lang === 'ar' ? 'الأعلى مشاهدة في مصر' : 'Top Trending in Egypt'} 
              icon={<Zap />} 
              link="/movies" 
            />
          )}
        </section>

        {/* Section: Ramadan & Arabic Series */}
        <section>
          {arabicSeries.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'مسلسلات عربية ورمضانية' : 'Arabic & Ramadan Series'} icon={<Tv />} link="/ramadan" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={arabicSeries.data?.results || []} 
              title={lang === 'ar' ? 'مسلسلات عربية ورمضانية' : 'Arabic & Ramadan Series'} 
              icon={<Tv />} 
              link="/ramadan" 
            />
          )}
        </section>

        {/* Section: Chinese Dramas */}
        <section>
          {chineseSeries.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'مسلسلات صينية (C-Dramas)' : 'Chinese Dramas'} icon={<Tv />} link="/chinese" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={chineseSeries.data?.results || []} 
              title={lang === 'ar' ? 'مسلسلات صينية (C-Dramas)' : 'Chinese Dramas'} 
              icon={<Tv />} 
              link="/chinese" 
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

        {/* Section: Turkish Drama */}
        <section>
          {turkishSeries.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'الدراما التركية' : 'Turkish Drama'} icon={<Film />} link="/series" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={turkishSeries.data?.results || []} 
              title={lang === 'ar' ? 'الدراما التركية' : 'Turkish Drama'} 
              icon={<Film />} 
              link="/series" 
            />
          )}
        </section>

        {/* Section: Global Trending */}
        <section>
          <SectionHeader title={lang === 'ar' ? 'الرائج عالمياً' : 'Global Trending'} icon={<Zap />} link="/top-watched" />
          {popularAr.isPending ? <SkeletonGrid count={10} variant="poster" /> : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 perspective-1000">
              {popularAr.data?.results?.slice(0, 12).map((movie, idx) => (
                 <MovieCard key={movie.id} movie={movie} index={idx} />
              ))}
            </div>
          )}
        </section>

        {/* Section: Golden Era & Recaps (Bento Style) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <BentoBox 
             title={lang === 'ar' ? 'العصر الذهبي' : 'Golden Era'} 
             icon={<Film />} 
             items={goldenEra.data || []}
             color="gold"
           />
           <BentoBox 
             title={lang === 'ar' ? 'ملخصات الأفلام' : 'Movie Recaps'} 
             icon={<Zap />} 
             items={recaps.data || []}
             color="cyan"
           />
        </section>

        {/* Section: Anime */}
        <section>
          <SectionHeader title={lang === 'ar' ? 'أنمي مترجم' : 'Anime'} icon={<Tv />} link="/anime" />
          {animeHub.isLoading ? <SkeletonGrid count={6} variant="poster" /> : (
             <QuantumTrain items={animeHub.data || []} />
          )}
        </section>

        {/* Section: Quran */}
        <section>
          <SectionHeader title={lang === 'ar' ? 'القرآن الكريم' : 'Holy Quran'} icon={<BookOpen />} link="/quran" />
          {quranHub.isLoading ? <SkeletonGrid count={6} variant="poster" /> : (
             <QuantumTrain items={quranHub.data || []} />
          )}
        </section>

        {/* Section: Top Rated (Horizontal Scroll) */}
        <section>
           <SectionHeader 
             title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} 
             icon={<Film />} 
             link="/movies" 
             badge="⭐ 9.0+"
           />
           <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-none">
              {topRatedMovies.data?.results?.slice(0, 10).map((movie, idx) => (
                <div key={movie.id} className="snap-center shrink-0 w-[120px] md:w-[140px]">
                   <MovieCard movie={movie} index={idx} />
                </div>
              ))}
           </div>
        </section>

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

import { ChevronLeft, ChevronRight } from 'lucide-react'

const BentoBox = ({ title, icon, items, color }: { title: string, icon: any, items: any[], color: 'cyan' | 'purple' | 'gold' }) => {
  return (
    <div>
      <SectionHeader title={title} icon={icon} color={color} />
      <div className="grid grid-cols-2 gap-3">
        {items.slice(0, 4).map((item, i) => (
          <HolographicCard key={item.id} className={`aspect-video ${i === 0 ? 'col-span-2 row-span-2 aspect-video' : ''}`}>
             <PrefetchLink to={`/watch/yt/${item.id}`} className="block h-full relative group">
                <img 
                  src={item.thumbnail} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                  alt={item.title}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                   <h4 className="font-bold text-white leading-tight line-clamp-2 text-sm md:text-lg">{item.title}</h4>
                </div>
             </PrefetchLink>
          </HolographicCard>
        ))}
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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
