import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { tmdb } from '../lib/tmdb'
import { AdsManager } from '../components/common/AdsManager'
import { useAuth } from '../hooks/useAuth'
import { Helmet } from 'react-helmet-async'
import { CONFIG } from '../lib/constants'
import { useLang } from '../state/useLang'
import { getRecommendations, RecommendationItem } from '../services/recommendations'
import { BrainCircuit, Play, Plus } from 'lucide-react'
import { MovieRow } from '../components/features/media/MovieRow'
import { VideoRow } from '../components/features/media/VideoRow'
import { motion } from 'framer-motion'
import { VideoCard, VideoItem } from '../components/features/media/VideoCard'
import { HeroSlider } from '../components/features/hero/HeroSlider'
import { useCategoryVideos, useClassicVideos } from '../hooks/useFetchContent'
import { SkeletonGrid } from '../components/common/Skeletons'
import { supabase, getContinueWatching } from '../lib/supabase'
import { CinemaTrain } from '../components/CinemaTrain'
import { SeoHead } from '../components/common/SeoHead'
import { useQuranPlayer } from '../context/QuranPlayerContext'

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

export const Home = () => {
  const { user } = useAuth()
  const { lang } = useLang()
  const [page, setPage] = useState(1)

  // TMDB Queries
  const popularMovies = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['popular', page],
    queryFn: async () => {
      const { data } = await tmdb.get('/movie/popular', { params: { page } })
      return data
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

  const heroItems = useMemo(() => (trendingMovies.data?.results || []).slice(0, 5), [trendingMovies.data])
  const trendingVideos = useCategoryVideos('trending', { limit: 20 })
  const latestMovies = useCategoryVideos('movie', { limit: 20 })
  const tvSeries = useCategoryVideos('series', { limit: 20 })
  const gaming = useCategoryVideos('gaming', { limit: 20 })
  const programming = useCategoryVideos('programming', { limit: 20 })
  const classics = useClassicVideos({ limit: 20 })
  const plays = useCategoryVideos('play', { limit: 20 })
  const others = useCategoryVideos('others', { limit: 20 })
  const kids = useCategoryVideos('kids', { limit: 12 })

  const animeHub = useQuery<AnimeRow[]>({
    queryKey: ['home-anime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anime')
        .select('id,title,category,image_url')
        .order('id', { ascending: false })
        .limit(12)
      if (error) throw error
      return data as AnimeRow[]
    },
    staleTime: 300000
  })

  const quranHub = useQuery<QuranRow[]>({
    queryKey: ['home-quran'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quran_reciters')
        .select('id,name,category,image,rewaya,server')
        .order('id', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as QuranRow[]
    },
    staleTime: 300000
  })

  const popularAr = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'popular-ar'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/movie', { 
        params: { region: 'EG', sort_by: 'popularity.desc', page: 1 } 
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const canonicalUrl = typeof window !== 'undefined' ? `${location.origin}${location.pathname}` : ''
  const description = lang === 'ar'
    ? 'منصة مشاهدة عربية فاخرة تجمع الأفلام والمسلسلات والألعاب والبرمجيات في تجربة سينمائية حديثة.'
    : 'A luxury Arabic streaming platform for movies, series, games, and software with a cinematic modern experience.'
  const siteSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: lang === 'ar' ? 'سينما أونلاين' : 'Cinema Online',
    url: canonicalUrl || CONFIG.DOMAIN || 'https://cinma.online',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${canonicalUrl || CONFIG.DOMAIN || 'https://cinma.online'}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }), [lang, canonicalUrl])

  return (
    <div className="min-h-screen bg-[#050505] pb-24 text-zinc-100">
      <Helmet>
        <title>{lang === 'ar' ? 'سينما أونلاين | منصة المشاهدة الفاخرة' : 'Cinema Online | Luxury Streaming Platform'}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={lang === 'ar' ? 'سينما أونلاين' : 'Cinema Online'} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="preconnect" href="https://image.tmdb.org" />
      </Helmet>
      <SeoHead schema={siteSchema} />

      <section className="relative h-[78vh] min-h-[520px] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.2),_transparent_55%)]" />
        {heroItems.length > 0 && <HeroSlider items={heroItems} />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-[#050505]/40 to-[#050505]" />
      </section>

      <div className="relative -mt-10 z-[25] px-4 lg:px-12 pointer-events-none md:pointer-events-auto">
        <CinemaTrain />
      </div>

      <div className="relative z-20 space-y-12 -mt-28 md:-mt-36 lg:-mt-44">
        <div id="trending" />
        {/* Trending Section - Bento Grid */}
        {trendingVideos.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={6} variant="video" />
          </section>
        ) : trendingVideos.data && trendingVideos.data.length > 0 ? (
          <BentoTrendingHub 
            title={lang === 'ar' ? 'الرائج الآن' : 'Trending Now'} 
            videos={trendingVideos.data} 
          />
        ) : null}

        {user && (
          <section id="continue" className="px-4 lg:px-12 py-12">
            <ContinueRail userId={user.id} />
          </section>
        )}

        {/* Gaming Zone */}
        <div id="gaming" />
        {gaming.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={8} variant="video" />
          </section>
        ) : gaming.data && gaming.data.length > 0 ? (
          <BentoArena 
            title={lang === 'ar' ? 'الألعاب الرائجة' : 'Trending Games'} 
            videos={gaming.data} 
            type="gaming"
          />
        ) : null}

        {/* Programming & Tech */}
        <div id="software" />
        {programming.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={8} variant="video" />
          </section>
        ) : programming.data && programming.data.length > 0 ? (
          <BentoArena 
            title={lang === 'ar' ? 'أحدث البرمجيات' : 'Latest Software'} 
            videos={programming.data} 
            type="tech"
          />
        ) : null}

        <AdsManager type="banner" position="top" />

        {/* Popular in MENA */}
        <div id="mena" />
        {popularAr.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={10} variant="poster" />
          </section>
        ) : (
          <MovieRow 
            title={lang === 'ar' ? 'الأكثر مشاهدة في مصر والشرق الأوسط' : 'Trending in MENA'} 
            movies={(popularAr.data?.results || []).slice(0, 15)} 
          />
        )}

        <div id="movies" />
        {latestMovies.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={10} variant="video" />
          </section>
        ) : latestMovies.data && latestMovies.data.length > 0 ? (
          <VideoRow title={lang === 'ar' ? 'أحدث الأفلام' : 'Latest Movies'} videos={latestMovies.data} />
        ) : null}

        <div id="series" />
        {tvSeries.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={10} variant="video" />
          </section>
        ) : tvSeries.data && tvSeries.data.length > 0 ? (
          <VideoRow title={lang === 'ar' ? 'المسلسلات' : 'TV Series'} videos={tvSeries.data} />
        ) : null}

        <div id="classics" />
        {classics.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={10} variant="video" />
          </section>
        ) : classics.data && classics.data.length > 0 ? (
          <VideoRow title={lang === 'ar' ? 'الكلاسيكيات' : 'Classics'} videos={classics.data} />
        ) : null}

        {plays.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={10} variant="video" />
          </section>
        ) : plays.data && plays.data.length > 0 ? (
          <VideoRow title={lang === 'ar' ? 'مسرحيات كلاسيكية' : 'Classic Plays'} videos={plays.data} />
        ) : null}

        <div id="kids" />
        {kids.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={8} variant="video" />
          </section>
        ) : kids.data && kids.data.length > 0 ? (
          <KidsWorld title={lang === 'ar' ? 'ركن الأطفال: مغامرات عمر وسندس' : 'Kids Corner: Omar & Sondos Adventures'} videos={kids.data} />
        ) : null}

        <div id="quran" />
        {quranHub.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={8} variant="video" />
          </section>
        ) : quranHub.data && quranHub.data.length > 0 ? (
          <QuranHub title={lang === 'ar' ? 'رحاب القرآن' : 'Quran Hub'} reciters={quranHub.data} />
        ) : null}

        <div id="anime" />
        {animeHub.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={8} variant="video" />
          </section>
        ) : animeHub.data && animeHub.data.length > 0 ? (
          <AnimeHub title={lang === 'ar' ? 'عالم الأنمي' : 'Anime Hub'} items={animeHub.data} />
        ) : null}

        {others.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={10} variant="video" />
          </section>
        ) : others.data && others.data.length > 0 ? (
          <VideoRow title={lang === 'ar' ? 'أخرى' : 'Others'} videos={others.data} />
        ) : null}

        {/* Global Hits */}
        {popularMovies.isPending ? (
          <section className="px-4 lg:px-12 py-12">
            <SkeletonGrid count={10} variant="poster" />
          </section>
        ) : (
          <MovieRow 
            title={lang === 'ar' ? 'الأكثر شهرة عالمياً' : 'Global Hits'} 
            movies={(popularMovies.data?.results || []).slice(0, 15)} 
          />
        )}

        {/* AI Discovery Section */}
        {user && <AIRecommended userId={user.id} />}
      </div>
      <AdsManager type="banner" position="bottom" />
    </div>
  )
}

const ContinueRail = ({ userId }: { userId: string }) => {
  const { lang } = useLang()
  const q = useQuery({
    queryKey: ['continue-home', userId],
    queryFn: () => getContinueWatching(userId)
  })
  if (!q.data || q.data.length === 0) return null
  return (
    <section className="relative">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">{lang === 'ar' ? 'متابعة المشاهدة' : 'Continue Watching'}</h2>
          <p className="text-sm text-zinc-500">{lang === 'ar' ? 'أكمل من حيث توقفت' : 'Pick up where you left off'}</p>
        </div>
      </div>
      <div className="scrollbar-hide no-scrollbar flex snap-x snap-mandatory flex-row flex-nowrap gap-4 overflow-x-auto overflow-y-hidden scroll-smooth">
        {q.data.slice(0, 12).map((r) => {
          const href = r.content_type === 'movie'
            ? `/watch/movie/${r.content_id}`
            : `/watch/tv/${r.content_id}?season=${r.season_number || 1}&episode=${r.episode_number || 1}`
          const pct = r.duration_seconds > 0 ? Math.min(100, Math.round((r.progress_seconds / r.duration_seconds) * 100)) : 0
          return (
            <Link key={`${r.content_type}-${r.content_id}-${r.updated_at}`} to={href} className="snap-start w-[260px] shrink-0">
              <div className="glass-card p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {r.content_type === 'movie' ? (lang === 'ar' ? 'فيلم' : 'Movie') : (lang === 'ar' ? 'مسلسل' : 'Series')}
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded bg-white/10">
                  <div className="h-2 bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 text-[11px] text-zinc-500">
                  {lang === 'ar' ? 'التقدم' : 'Progress'}: {pct}%
                </div>
                <div className="mt-3 btn-primary h-10 w-full text-center">{lang === 'ar' ? 'استكمال' : 'Resume'}</div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

const AIRecommended = ({ userId }: { userId: string }) => {
  const { lang } = useLang()
  const q = useQuery<RecommendationItem[]>({ 
    queryKey: ['recs', userId], 
    queryFn: () => getRecommendations(userId),
    staleTime: 1000 * 60 * 60 // 1 hour
  })

  if (!q.data || q.data.length === 0) return null

  return (
    <section className="px-4 lg:px-12 py-12 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      
      <div className="mb-10 flex items-center gap-4 relative z-10">
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
          <BrainCircuit size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-white">
            {lang === 'ar' ? 'اكتشافات ذكية لك' : 'AI Discovery For You'}
          </h2>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
            {lang === 'ar' ? 'بناءً على ذوقك الفريد في المشاهدة' : 'Personalized based on your unique taste'}
          </p>
        </div>
      </div>

      <div className="relative group">
        <MovieRow title="" movies={q.data} />
      </div>

      <div className="mt-8 flex justify-center">
        <div className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] backdrop-blur-md">
          {lang === 'ar' ? 'يتم التحديث بواسطة الذكاء الاصطناعي' : 'Powered by AI Engine v2.0'}
        </div>
      </div>
    </section>
  )
}

const KidsWorld = ({ videos, title }: { videos: VideoItem[]; title: string }) => {
  const { lang } = useLang()
  
  return (
    <section className="px-4 lg:px-12 py-12 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-luxury-purple/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
        <div className="space-y-2">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400"
          >
            {title}
          </motion.h2>
          <p className="text-zinc-400 font-medium max-w-xl">
            {lang === 'ar' 
              ? 'محتوى آمن وممتع مصمم خصيصاً لأطفالنا الصغار لاكتشاف العالم من حولهم.'
              : 'Safe and fun content specially designed for our little ones to discover the world.'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white backdrop-blur-md">
            {lang === 'ar' ? 'آمن للأطفال' : 'Kids Safe'}
          </div>
          <div className="px-4 py-2 rounded-full bg-primary/20 border border-primary/30 text-xs font-bold text-primary backdrop-blur-md">
            {lang === 'ar' ? 'تعليمي' : 'Educational'}
          </div>
          <Link to="/kids" className="px-4 py-2 rounded-full bg-gradient-to-r from-primary to-luxury-purple text-xs font-bold text-white">
            {lang === 'ar' ? 'استكشاف' : 'Explore'}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {videos.slice(0, 5).map((video, idx) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -10, scale: 1.02 }}
            className="relative group cursor-pointer"
          >
            <Link to={`/watch/yt/${video.id}`} className="block">
              <div className="aspect-[4/5] rounded-[2rem] overflow-hidden border-4 border-white/5 group-hover:border-primary/50 transition-all duration-500 bg-zinc-900 shadow-xl group-hover:shadow-primary/20">
                <img 
                  src={video.thumbnail || undefined} 
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                  <h3 className="text-white font-bold text-lg leading-tight line-clamp-2">
                    {video.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-2 text-primary">
                    <Play size={16} fill="currentColor" />
                    <span className="text-xs font-black uppercase tracking-widest">{lang === 'ar' ? 'شاهد' : 'Play'}</span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

const QuranHub = ({ reciters, title }: { reciters: QuranRow[]; title: string }) => {
  const { lang } = useLang()
  const { playTrack } = useQuranPlayer()
  const buildUrl = (server: string | null) => {
    if (!server) return null
    const safe = server.endsWith('/') ? server : `${server}/`
    return `${safe}001.mp3`
  }

  return (
    <section className="px-4 lg:px-12 py-12 relative">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">{title}</h2>
          <p className="text-sm text-zinc-500 max-w-2xl">
            {lang === 'ar' ? 'تلاوات مختارة بروحانية عالية وأصوات نقية لرحلة إيمانية هادئة.' : 'Curated recitations with serene voices for a calm spiritual journey.'}
          </p>
        </div>
        <Link to="/quran" className="px-5 h-11 inline-flex items-center rounded-full bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/20">
          {lang === 'ar' ? 'عرض الكل' : 'View All'}
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {reciters.slice(0, 5).map((r) => (
          <Link
            key={r.id}
            to={`/quran/reciter/${r.id}`}
            className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-primary/40 hover:bg-white/10 block"
          >
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 overflow-hidden rounded-2xl bg-black/40 relative">
                {r.image ? (
                  <img src={r.image} alt={r.name || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-500">
                    {(r.name || '—').slice(0, 1)}
                  </div>
                )}
                {/* Hover Play Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={20} className="text-white" fill="currentColor" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white group-hover:text-primary transition-colors">{r.name || '—'}</div>
                <div className="text-xs text-zinc-500">{r.rewaya || r.category || (lang === 'ar' ? 'تلاوات مختارة' : 'Selected Recitations')}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

const AnimeHub = ({ items, title }: { items: AnimeRow[]; title: string }) => {
  const { lang } = useLang()

  return (
    <section className="px-4 lg:px-12 py-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">{title}</h2>
          <p className="text-sm text-zinc-500 max-w-2xl">
            {lang === 'ar' ? 'أحدث إصدارات الأنمي مع واجهة سينمائية تضاهي منصات البث العالمية.' : 'Latest anime releases with a cinematic interface that rivals global platforms.'}
          </p>
        </div>
        <Link to="/anime" className="px-5 h-11 inline-flex items-center rounded-full bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/20">
          {lang === 'ar' ? 'عرض الكل' : 'View All'}
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {items.slice(0, 6).map((a) => (
          <div key={a.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:border-primary/40">
            <div className="aspect-[3/4] w-full bg-zinc-900">
              {a.image_url ? (
                <img src={a.image_url} alt={a.title || ''} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-500">
                  {(a.title || 'ANIME').slice(0, 6)}
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="truncate text-sm font-bold text-white">{a.title || '—'}</div>
              <div className="text-xs text-zinc-500">{a.category || (lang === 'ar' ? 'أنمي مختار' : 'Curated Anime')}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const BentoArena = ({ videos, title, type }: { videos: VideoItem[]; title: string; type: 'gaming' | 'tech' }) => {
  const { lang } = useLang()
  const isGaming = type === 'gaming'
  const accentColor = isGaming ? 'from-emerald-400 to-cyan-400' : 'from-blue-400 to-purple-400'
  const shadowColor = isGaming ? 'shadow-emerald-500/20' : 'shadow-blue-500/20'
  const borderColor = isGaming ? 'group-hover:border-emerald-500/50' : 'group-hover:border-blue-500/50'

  return (
    <section className="px-4 lg:px-12 py-12">
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-2 h-10 rounded-full bg-gradient-to-b ${accentColor}`} />
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase">
              {title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase">
                {isGaming ? 'Live Arena Active' : 'System Online'}
              </span>
            </div>
          </div>
        </div>
        <button className="text-xs font-black tracking-widest text-zinc-500 hover:text-white transition-colors uppercase">
          {lang === 'ar' ? 'استكشاف المنطقة' : 'Explore Zone'} //
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Feature Card */}
        {videos[0] && (
          <motion.div 
            className="md:col-span-2 relative group overflow-hidden rounded-2xl border border-white/5 bg-black"
            whileHover={{ scale: 1.01 }}
          >
            <Link to={`/watch/yt/${videos[0].id}`} className="block h-[400px]">
              <img 
                src={videos[0].thumbnail || undefined} 
                alt={videos[0].title}
                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-end max-w-lg space-y-4">
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded bg-black/50 border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest backdrop-blur-md`}>
                    {isGaming ? 'Featured Stream' : 'New Tutorial'}
                  </span>
                  <span className={`px-2 py-1 rounded bg-primary/20 border border-primary/30 text-[10px] font-bold text-primary uppercase tracking-widest backdrop-blur-md`}>
                    4K Ultra HD
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-black text-white leading-tight">
                  {videos[0].title}
                </h3>
                <p className="text-zinc-400 text-sm line-clamp-2">
                  {videos[0].description}
                </p>
                <div className="pt-4">
                  <button className="px-8 h-11 rounded-full bg-gradient-to-r from-primary to-luxury-purple text-white font-black text-xs uppercase tracking-widest hover:brightness-110 transition">
                    {lang === 'ar' ? 'ابدأ المشاهدة' : 'Start Watching'}
                  </button>
                </div>
              </div>

              {/* Terminal Aesthetic Overlays */}
              <div className="absolute top-4 right-4 text-[10px] font-mono text-zinc-500 hidden md:block">
                <div>LOC: AREA_{isGaming ? 'G' : 'T'}51</div>
                <div>RES: 3840x2160</div>
                <div>FRM: 60FPS</div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Side Stack */}
        <div className="space-y-6">
          {videos.slice(1, 3).map((v, i) => (
            <motion.div 
              key={v.id}
              className={`relative group overflow-hidden rounded-2xl border border-white/5 bg-luxury-charcoal ${borderColor} ${shadowColor} transition-all duration-500`}
              whileHover={{ x: 10 }}
            >
              <Link to={`/watch/yt/${v.id}`} className="flex h-[188px]">
                <div className="w-1/3 h-full relative overflow-hidden">
                  <img 
                    src={v.thumbnail || undefined} 
                    alt={v.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="w-2/3 p-4 flex flex-col justify-center space-y-2">
                  <h4 className="text-white font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {v.title}
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                    <span>{v.views?.toLocaleString()} views</span>
                    <span>•</span>
                    <span>{v.duration ? Math.floor(v.duration / 60) + ' min' : 'Live'}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const BentoTrendingHub = ({ videos, title }: { videos: VideoItem[]; title: string }) => {
  const { lang } = useLang()
  
  return (
    <section className="px-4 lg:px-12 py-12">
      <div className="mb-8 space-y-1">
        <h2 className="text-3xl font-black tracking-tighter text-white md:text-4xl">{title}</h2>
        <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-primary to-luxury-purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-6 h-auto md:h-[600px]">
        {/* Large Feature Card */}
        {videos[0] && (
          <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden rounded-3xl border border-white/5 bg-luxury-charcoal">
            <VideoCard video={videos[0]} index={0} />
            <div className="absolute top-4 right-4 z-10 pointer-events-none">
              <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">HOT</span>
            </div>
          </div>
        )}

        {/* Medium Cards */}
        {videos.slice(1, 5).map((v, idx) => (
          <div key={v.id} className="md:col-span-1 relative group overflow-hidden rounded-3xl border border-white/5 bg-luxury-charcoal">
            <VideoCard video={v} index={idx + 1} />
          </div>
        ))}

        {/* Special Info Card / CTA */}
        <div className="md:col-span-1 relative group overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary/20 to-luxury-purple/20 backdrop-blur-3xl p-6 flex flex-col justify-center items-center text-center space-y-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <Plus className="text-primary" size={32} />
          </div>
          <h3 className="text-xl font-black text-white">
            {lang === 'ar' ? 'اكتشف المزيد' : 'Discover More'}
          </h3>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            {lang === 'ar' ? 'استكشف آلاف الساعات من المحتوى الحصري والجديد كلياً.' : 'Explore thousands of hours of exclusive and brand new content.'}
          </p>
          <button className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-luxury-purple text-white text-xs font-black uppercase tracking-widest hover:brightness-110 transition">
            {lang === 'ar' ? 'تصفح الآن' : 'Browse Now'}
          </button>
        </div>
      </div>
    </section>
  )
}
