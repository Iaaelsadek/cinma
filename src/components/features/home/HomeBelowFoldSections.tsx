import { Suspense, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Tv, Film, Drama, Zap, FileText, Play, Smile } from 'lucide-react'
import { tmdb } from '../../../lib/tmdb'
import { CONFIG } from '../../../lib/constants'
import { useCategoryVideos } from '../../../hooks/useFetchContent'
import { useDailyMotion } from '../../../hooks/useDailyMotion'
import { useTranslatedContent } from '../../../hooks/useTranslatedContent'
import { resolveTitleWithFallback } from '../../../lib/translation'
import { SectionHeader } from '../../common/SectionHeader'
import { SkeletonGrid } from '../../common/Skeletons'
import { MovieCard } from '../../features/media/MovieCard'
import { HolographicCard } from '../../effects/HolographicCard'
import { PrefetchLink } from '../../common/PrefetchLink'
import { QuantumTrain } from '../../features/media/QuantumTrain'
import { getRecommendations, type RecommendationItem } from '../../../services/recommendations'
import { useAuth } from '../../../hooks/useAuth'
import { useLang } from '../../../state/useLang'

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

type CriticalHomeData = {
  popularAr: TmdbMedia[]
  arabicSeries: TmdbMedia[]
  kids: TmdbMedia[]
}

type HomeBelowFoldSectionsProps = {
  criticalHomeData?: CriticalHomeData
  topRatedMovies?: TmdbMedia[]
}

const sanitizeMediaItems = (items: TmdbMedia[] | undefined) =>
  (items || []).filter((item) =>
    Number.isFinite(Number(item?.id)) &&
    Number(item.id) > 0 &&
    Boolean(item.poster_path && item.poster_path.trim()) &&
    Boolean(resolveTitleWithFallback(item))
  )

const BentoBox = ({
  title,
  icon,
  items,
  color,
}: {
  title: string
  icon: JSX.Element
  items: any[]
  color: 'cyan' | 'purple' | 'gold'
}) => {
  if (!items || items.length === 0) return null

  return (
    <div>
      <SectionHeader title={title} icon={icon} color={color} />
      <div className="grid grid-cols-2 gap-3">
        {items.slice(0, 4).map((item, i) => {
          const isTmdb = !!item.poster_path || !!item.backdrop_path
          const img =
            item.thumbnail ||
            (item.backdrop_path
              ? `https://image.tmdb.org/t/p/w500${item.backdrop_path}`
              : `https://image.tmdb.org/t/p/w500${item.poster_path}`)
          const link = isTmdb
            ? `/watch/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`
            : `/watch/yt/${item.id}`

          return (
            <HolographicCard
              key={item.id}
              className={`aspect-video ${i === 0 ? 'col-span-2 row-span-2 aspect-video' : ''}`}
            >
              <PrefetchLink to={link} className="block h-full relative group">
                <img
                  src={img}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  alt={item.title || item.name}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h4 className="font-bold text-white leading-tight line-clamp-2 text-sm md:text-lg">
                    {item.title || item.name}
                  </h4>
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
    staleTime: 1000 * 60 * 60,
  })

  if (!q.data?.length) {
    return <div className="text-zinc-500">Initializing Neural Net...</div>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
      {q.data.slice(0, 5).map((m) => (
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

const HomeBelowFoldSectionsInner = ({ criticalHomeData, topRatedMovies }: HomeBelowFoldSectionsProps) => {
  const { user } = useAuth()
  const { lang } = useLang()

  const koreanSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'k-drama'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', {
        params: {
          with_original_language: 'ko',
          sort_by: 'first_air_date.desc',
          page: 1,
        },
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000,
  })

  const chineseSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'chinese-series'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', {
        params: {
          with_original_language: 'zh',
          sort_by: 'first_air_date.desc',
          page: 1,
        },
      })
      return { results: data.results.map((i: any) => ({ ...i, media_type: 'tv' })) }
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000,
  })

  const turkishSeries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'turkish-series'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', {
        params: {
          with_original_language: 'tr',
          sort_by: 'first_air_date.desc',
          page: 1,
        },
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000,
  })

  const bollywoodMovies = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'bollywood'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/movie', {
        params: {
          with_original_language: 'hi',
          sort_by: 'primary_release_date.desc',
          page: 1,
          region: 'IN',
        },
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000,
  })

  const documentaries = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'docs'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/movie', {
        params: {
          with_genres: '99',
          sort_by: 'primary_release_date.desc',
          page: 1,
        },
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000,
  })

  const tmdbAnime = useQuery<TmdbMedia[]>({
    queryKey: ['home-anime-fallback'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/tv', {
        params: { with_genres: '16', with_original_language: 'ja', sort_by: 'first_air_date.desc' },
      })
      return data.results
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000,
  })

  const tmdbClassics = useQuery<{ results: TmdbMedia[] }>({
    queryKey: ['home', 'classics'],
    queryFn: async () => {
      const { data } = await tmdb.get('/discover/movie', {
        params: {
          'release_date.lte': '1980-01-01',
          sort_by: 'popularity.desc',
          page: 1,
        },
      })
      return data
    },
    enabled: !!CONFIG.TMDB_API_KEY,
    staleTime: 300000,
  })

  const goldenEra = useCategoryVideos('golden-era', { limit: 10, enabled: true })
  const recaps = useCategoryVideos('recaps', { limit: 10, enabled: true })
  const animeHub = useCategoryVideos('anime', { limit: 20, enabled: true })
  const plays = useCategoryVideos('plays', { limit: 20, enabled: true })
  const dmTrending = useDailyMotion(true)

  const translatedKorean = useTranslatedContent(koreanSeries.data?.results)
  const translatedTurkish = useTranslatedContent(turkishSeries.data?.results)
  const translatedChinese = useTranslatedContent(chineseSeries.data?.results)

  return (
    <>
      <section>
        {koreanSeries.isLoading ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'الدراما الكورية' : 'K-Drama'}
              icon={<Film />}
              link="/k-drama"
            />
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
            <SectionHeader
              title={lang === 'ar' ? 'مسلسلات صينية قصيرة' : 'Chinese Short Series'}
              icon={<Tv />}
              link="/chinese"
            />
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
            <SectionHeader
              title={lang === 'ar' ? 'الدراما التركية' : 'Turkish Drama'}
              icon={<Film />}
              link="/turkish"
            />
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

      <section>
        {bollywoodMovies.isLoading ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'أفلام بوليوود' : 'Bollywood Movies'}
              icon={<Film />}
              link="/bollywood"
            />
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

      <section>
        {plays.isLoading ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'مسرحيات وكلاسيكيات' : 'Plays & Classics'}
              icon={<Drama />}
              link="/plays"
            />
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

      <section>
        <SectionHeader
          title={lang === 'ar' ? 'الرائج عالمياً' : 'Global Trending'}
          icon={<Zap />}
          link="/top-watched"
        />
        {!criticalHomeData ? (
          <SkeletonGrid count={10} variant="poster" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 perspective-1000">
            {sanitizeMediaItems(criticalHomeData.popularAr)
              .slice(0, 12)
              .map((movie, idx) => (
                <MovieCard key={movie.id} movie={movie} index={idx} />
              ))}
          </div>
        )}
      </section>

      <section>
        {documentaries.isLoading ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'وثائقيات وواقع' : 'Documentaries'}
              icon={<FileText />}
              link="/docs"
            />
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

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BentoBox
          title={lang === 'ar' ? 'العصر الذهبي' : 'Golden Era'}
          icon={<Film />}
          items={goldenEra.data && goldenEra.data.length > 0 ? goldenEra.data : tmdbClassics.data?.results || []}
          color="gold"
        />
        <BentoBox
          title={lang === 'ar' ? 'ملخصات الأفلام' : 'Movie Recaps'}
          icon={<Zap />}
          items={recaps.data || []}
          color="cyan"
        />
      </section>

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
              <HolographicCard
                key={item.id}
                className="aspect-video group relative overflow-hidden rounded-xl border border-white/10 bg-black/40"
              >
                <PrefetchLink to={`/watch/dm/${item.id}`} className="block h-full w-full">
                  <img
                    src={
                      item.thumbnail_720_url ||
                      item.thumbnail_480_url ||
                      item.thumbnail_360_url ||
                      item.thumbnail_240_url ||
                      `https://placehold.co/600x400/000000/FFFFFF/png?text=${encodeURIComponent(item.title)}`
                    }
                    alt={item.title}
                    className="h-full w-full object-cover opacity-80 group-hover:opacity-100"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-xs font-bold text-white line-clamp-2 mb-1">{item.title}</h3>
                  </div>
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

      <section>
        {(animeHub.isLoading && tmdbAnime.isLoading) ? (
          <>
            <SectionHeader
              title={lang === 'ar' ? 'أنمي مترجم' : 'Anime'}
              icon={<Tv />}
              link="/anime"
            />
            <SkeletonGrid count={6} variant="poster" />
          </>
        ) : (
          <QuantumTrain
            items={sanitizeMediaItems(
              animeHub.data && animeHub.data.length > 0 ? animeHub.data : tmdbAnime.data || [],
            )}
            title={lang === 'ar' ? 'أنمي مترجم' : 'Anime'}
            icon={<Tv />}
            link="/anime"
          />
        )}
      </section>

      <section>
        <SectionHeader
          title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'}
          icon={<Film />}
          link="/movies"
          badge="⭐ 9.0+"
        />
        {!topRatedMovies ? (
          <SkeletonGrid count={10} variant="poster" />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-none">
            {sanitizeMediaItems(topRatedMovies)
              .slice(0, 10)
              .map((movie, idx) => (
                <div key={movie.id} className="snap-center shrink-0 w-[120px] md:w-[140px]">
                  <MovieCard movie={movie} index={idx} />
                </div>
              ))}
          </div>
        )}
      </section>

      {user && (
        <section className="relative p-6 rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10" />
          <div className="relative z-10">
            <SectionHeader
              title={lang === 'ar' ? 'اكتشافات الذكاء الاصطناعي' : 'AI Discovery Protocol'}
              icon={<Smile />}
              color="cyan"
            />
            <AIRecommended userId={user.id} />
          </div>
        </section>
      )}
    </>
  )
}

export const HomeBelowFoldSections = memo(({ criticalHomeData, topRatedMovies }: HomeBelowFoldSectionsProps) => {
  return (
    <Suspense
      fallback={
        <section>
          <SkeletonGrid count={6} variant="poster" />
        </section>
      }
    >
      <HomeBelowFoldSectionsInner criticalHomeData={criticalHomeData} topRatedMovies={topRatedMovies} />
    </Suspense>
  )
})

