import { useMemo } from 'react'
import { PrefetchLink } from '../components/common/PrefetchLink'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { tmdb } from '../lib/tmdb'
import { AdsManager } from '../components/common/AdsManager'
import { useAuth } from '../hooks/useAuth'
import { CONFIG } from '../lib/constants'
import { useLang } from '../state/useLang'
import { getRecommendations, RecommendationItem } from '../services/recommendations'
import { BrainCircuit, Play, Plus, Zap, Cpu, Gamepad2, Tv, Film, Drama } from 'lucide-react'
import { MovieRow } from '../components/features/media/MovieRow'
import { MovieCard } from '../components/features/media/MovieCard'
import { VideoRow } from '../components/features/media/VideoRow'
import { motion } from 'framer-motion'
import { useCategoryVideos, useClassicVideos } from '../hooks/useFetchContent'
import { SkeletonGrid } from '../components/common/Skeletons'
import { supabase, getContinueWatching } from '../lib/supabase'
import { SeoHead } from '../components/common/SeoHead'
import { useQuranPlayer } from '../context/QuranPlayerContext'
import { QuantumHero } from '../components/features/hero/QuantumHero'
import { QuantumTrain } from '../components/features/media/QuantumTrain'
import { ContinueWatchingRow } from '../components/features/media/ContinueWatchingRow'
import { HolographicCard } from '../components/effects/HolographicCard'

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

  // --- DATA FETCHING (Optimized & Parallelized) ---
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
    const source = trendingMovies.data?.results || popularMovies.data?.results || []
    return source.slice(0, 8)
  }, [trendingMovies.data, popularMovies.data])

  // Other Content
  const trendingVideos = useCategoryVideos('trending', { limit: 20 })
  const latestMovies = useCategoryVideos('movie', { limit: 20 })
  const tvSeries = useCategoryVideos('series', { limit: 20 })
  const gaming = useCategoryVideos('gaming', { limit: 20 })
  const programming = useCategoryVideos('programming', { limit: 20 })
  const classics = useClassicVideos({ limit: 20 })
  const plays = useCategoryVideos('play', { limit: 20 })
  const others = useCategoryVideos('others', { limit: 20 })
  
  const animeHub = useQuery<AnimeRow[]>({
    queryKey: ['home-anime'],
    queryFn: async () => {
      const { data } = await supabase.from('anime').select('id,title,category,image_url').order('id', { ascending: false }).limit(12)
      return data as AnimeRow[]
    },
    staleTime: 300000
  })

  const quranHub = useQuery<QuranRow[]>({
    queryKey: ['home-quran'],
    queryFn: async () => {
      const { data } = await supabase.from('quran_reciters').select('id,name,category,image,rewaya,server').order('id', { ascending: false }).limit(10)
      return data as QuranRow[]
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
         <QuantumHero items={heroItems} />
      </section>

      <AdsManager type="banner" position="home-top" />

      <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        {/* Continue Watching - for logged-in users */}
        {user && (
          <section className="relative z-20 pt-8 pb-4">
            <ContinueWatchingRow userId={user.id} />
          </section>
        )}
        {/* 2. THE INFINITE TRAIN */}
        <section className="relative z-20 -mt-10 w-full overflow-hidden pb-12 rounded-3xl">
          <QuantumTrain items={popularMovies.data?.results || []} />
        </section>

        {/* 3. MASONRY GRID & CONTENT */}
        <div className="relative z-30 space-y-32 pb-40">
        
        {/* Section: Trending Egypt (Aflam) */}
        <section>
          <SectionHeader title={lang === 'ar' ? 'الأعلى مشاهدة في مصر' : 'Top Trending in Egypt'} icon={<Zap />} />
          <QuantumTrain items={popularAr.data?.results || []} />
        </section>

        {/* Section: Ramadan & Arabic Series */}
        <section>
          <SectionHeader title={lang === 'ar' ? 'مسلسلات عربية ورمضانية' : 'Arabic & Ramadan Series'} icon={<Tv />} />
          <QuantumTrain items={arabicSeries.data?.results || []} />
        </section>

        {/* Section: Masrahiyat (Plays) */}
        <section>
          <SectionHeader title={lang === 'ar' ? 'مسرحيات وكلاسيكيات' : 'Plays & Classics'} icon={<Drama />} />
          <QuantumTrain items={plays.data || []} />
        </section>

        {/* Section: Turkish Drama */}
        <section>
          <SectionHeader title={lang === 'ar' ? 'الدراما التركية' : 'Turkish Drama'} icon={<Film />} />
          <QuantumTrain items={turkishSeries.data?.results || []} />
        </section>

        {/* Section: Global Trending */}
        <section>
          <SectionHeader title={lang === 'ar' ? 'الرائج عالمياً' : 'Global Trending'} icon={<Zap />} />
          {popularAr.isPending ? <SkeletonGrid count={10} variant="poster" /> : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 perspective-1000">
              {popularAr.data?.results?.slice(0, 12).map((movie, idx) => (
                 <MovieCard key={movie.id} movie={movie} index={idx} />
              ))}
            </div>
          )}
        </section>

        {/* Section: Tech & Gaming (Bento Style) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
           <BentoBox 
             title={lang === 'ar' ? 'منطقة الألعاب' : 'Gaming Zone'} 
             icon={<Gamepad2 />} 
             items={gaming.data || []}
             color="purple"
           />
           <BentoBox 
             title={lang === 'ar' ? 'البرمجيات' : 'Software Core'} 
             icon={<Cpu />} 
             items={programming.data || []}
             color="cyan"
           />
        </section>

        {/* Section: Top Rated (Horizontal Scroll) */}
        <section>
           <SectionHeader title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} icon={<Film />} />
           <div className="flex gap-6 overflow-x-auto pb-8 snap-x scrollbar-none">
              {topRatedMovies.data?.results?.slice(0, 10).map((movie, idx) => (
                <div key={movie.id} className="snap-center shrink-0 w-[200px]">
                   <MovieCard movie={movie} index={idx} />
                </div>
              ))}
           </div>
        </section>

        {/* AI Discovery */}
        {user && (
          <section className="relative p-12 rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-3xl">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10" />
            <div className="relative z-10">
               <div className="flex items-center gap-4 mb-8">
                 <BrainCircuit className="text-cyan-400 w-10 h-10 animate-pulse" />
                 <h2 className="text-4xl font-black tracking-tighter uppercase">{lang === 'ar' ? 'اكتشافات الذكاء الاصطناعي' : 'AI Discovery Protocol'}</h2>
               </div>
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

const SectionHeader = ({ title, icon }: { title: string, icon: any }) => (
  <div className="flex items-center gap-4 mb-12">
    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-cyan-400 shadow-[0_0_20px_rgba(0,255,204,0.1)]">
      {icon}
    </div>
    <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
      {title}
    </h2>
    <div className="h-[1px] flex-1 bg-gradient-to-r from-cyan-500/50 to-transparent ml-8" />
  </div>
)

const BentoBox = ({ title, icon, items, color }: { title: string, icon: any, items: any[], color: 'cyan' | 'purple' }) => {
  const accent = color === 'cyan' ? 'text-cyan-400' : 'text-purple-400'
  const border = color === 'cyan' ? 'group-hover:border-cyan-500/50' : 'group-hover:border-purple-500/50'
  
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        {icon}
        <h3 className={`text-2xl font-black uppercase tracking-widest ${accent}`}>{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {items.slice(0, 4).map((item, i) => (
          <HolographicCard key={item.id} className={`aspect-video ${i === 0 ? 'col-span-2 row-span-2 aspect-video' : ''}`}>
             <PrefetchLink to={`/watch/yt/${item.id}`} className="block h-full relative group">
                <img src={item.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={item.title} />
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
             <img src={`https://image.tmdb.org/t/p/w300${m.poster_path}`} className="w-full h-full object-cover" alt={m.title} />
           </PrefetchLink>
        </HolographicCard>
      ))}
    </div>
  )
}
