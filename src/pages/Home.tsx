import { useMemo, useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { tmdb } from '../lib/tmdb'
import { AdsManager } from '../components/features/system/AdsManager'
import { useAuth } from '../hooks/useAuth'
import { CONFIG } from '../lib/constants'
import { useLang } from '../state/useLang'
import { useRecommendations } from '../hooks/useRecommendations'
import { Zap, Tv, Film, Drama, Sparkles, Smile, FileText, Play, BookOpen, BrainCircuit } from 'lucide-react'
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

import { useTranslatedContent } from '../hooks/useTranslatedContent'
import { useDailyMotion } from '../hooks/useDailyMotion'

export const Home = () => {
  const { user } = useAuth()
  const { lang } = useLang()
  const { data: recommendations } = useRecommendations()

  // --- DATA FETCHING (Optimized & Parallelized) ---
  // 1. DIVERSE HERO CONTENT (Restored to 8 requests for maximum diversity)
  const diverseHero = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['diverse-hero-content'],
    queryFn: async () => {
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
            sort_by: 'popularity.desc',
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
          sort_by: 'popularity.desc', 
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
          sort_by: 'popularity.desc', 
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
          sort_by: 'popularity.desc', 
          page: 1 
        } 
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const kidsContent = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'kids'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/movie', { 
        params: { 
          with_genres: '16,10751', 
          sort_by: 'popularity.desc', 
          page: 1 
        } 
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const documentaries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'docs'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/movie', { 
        params: { 
          with_genres: '99', 
          sort_by: 'popularity.desc', 
          page: 1 
        } 
      })
      return data
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

  const plays = useCategoryVideos('plays', { limit: 20 }) 

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

  const tmdbAnime = useQuery<any[]>({
    queryKey: ['home-anime-fallback'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', {
        params: { with_genres: '16', with_original_language: 'ja', sort_by: 'popularity.desc' }
      })
      return data.results
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  // --- RESTORED QUERIES ---
  const goldenEra = useCategoryVideos('golden-era', { limit: 10 })
  const recaps = useCategoryVideos('recaps', { limit: 10 })
  const animeHub = useCategoryVideos('anime', { limit: 20 })
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
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const topRatedMovies = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'top-rated'],
    queryFn: async () => {
      const { data } = await tmdb.get('/movie/top_rated', { params: { page: 1 } })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000
  })

  const dmTrending = useDailyMotion()

  // Apply translations directly
  const translatedKorean = useTranslatedContent(koreanSeries.data?.results)
  const translatedTurkish = useTranslatedContent(turkishSeries.data?.results)
  const translatedChinese = useTranslatedContent(chineseSeries.data?.results)

  const description = lang === 'ar' ? 'منصة أونلاين سينما - تجربة المستقبل' : 'Online Cinema - The Future Experience'

  const heroItems = diverseHero.data?.results || []

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

      <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full">
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

        {/* Section: Kids & Family */}
        <section>
          {kidsContent.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'أطفال وعائلة' : 'Kids & Family'} icon={<Smile />} link="/kids" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={kidsContent.data?.results || []} 
              title={lang === 'ar' ? 'أطفال وعائلة' : 'Kids & Family'} 
              icon={<Smile />} 
              link="/kids" 
            />
          )}
        </section>


        {/* Section: Korean & Chinese Series */}
        <section>
          {koreanSeries.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'الدراما الكورية' : 'K-Drama'} icon={<Film />} link="/k-drama" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={translatedKorean.data || []} 
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
              items={translatedChinese.data || []} 
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
              items={translatedTurkish.data || []} 
              title={lang === 'ar' ? 'الدراما التركية' : 'Turkish Drama'} 
              icon={<Film />} 
              link="/turkish" 
            />
          )}
        </section>

        {/* Section: Anime */}
        <section>
          {tmdbAnime.isLoading ? (
            <>
              <SectionHeader title={lang === 'ar' ? 'أحدث الأنمي' : 'Latest Anime'} icon={<Zap />} link="/anime" />
              <SkeletonGrid count={6} variant="poster" />
            </>
          ) : (
            <QuantumTrain 
              items={tmdbAnime.data || []} 
              title={lang === 'ar' ? 'أحدث الأنمي' : 'Latest Anime'} 
              icon={<Zap />} 
              link="/anime" 
              color="purple"
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
              items={bollywoodMovies.data?.results || []} 
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
          {popularAr.isPending ? <SkeletonGrid count={10} variant="poster" /> : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 perspective-1000">
              {popularAr.data?.results?.slice(0, 12).map((movie, idx) => (
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
              items={documentaries.data?.results || []} 
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
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                       <img 
                         src={item.thumbnail_720_url} 
                         alt={item.title}
                         className="h-full w-full object-cover opacity-80 group-hover:opacity-100"
                         loading="lazy"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                       <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h3 className="text-xs font-bold text-white line-clamp-2 mb-1">{item.title}</h3>
                       </div>
                    </a>
                 </HolographicCard>
               ))}
            </div>
          </section>
        )}

        {/* Section: Anime */}
        <section>
          <SectionHeader title={lang === 'ar' ? 'أنمي مترجم' : 'Anime'} icon={<Tv />} link="/anime" />
          {animeHub.isLoading && tmdbAnime.isLoading ? <SkeletonGrid count={6} variant="poster" /> : (
             <QuantumTrain items={animeHub.data && animeHub.data.length > 0 ? animeHub.data : (tmdbAnime.data || [])} />
          )}
        </section>

        {/* Section: Quran */}
        {quranHub.data && quranHub.data.length > 0 && (
          <section>
            <SectionHeader title={lang === 'ar' ? 'القرآن الكريم' : 'Holy Quran'} icon={<BookOpen />} link="/quran" />
            {quranHub.isLoading ? <SkeletonGrid count={6} variant="poster" /> : (
               <QuantumTrain items={quranHub.data || []} />
            )}
          </section>
        )}

        {/* Section: Top Rated */}
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
