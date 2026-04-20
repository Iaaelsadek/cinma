import { memo, useState, useEffect, useRef, lazy, Suspense } from 'react'
import type { DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PrefetchLink } from '../../common/PrefetchLink'
import { getGenreName } from '../../../lib/genres'
import { generateWatchUrl, generateContentUrl } from '../../../lib/utils'
import { useLang } from '../../../state/useLang'
import { useDualTitles } from '../../../hooks/useDualTitles'
import { TmdbImage } from '../../common/TmdbImage'
import { getTranslation, resolveOverviewWithFallback, resolveTitleWithFallback } from '../../../lib/translation'
import { AggregateRating } from '../reviews/AggregateRating'
import axios from 'axios'

const LazyReactPlayer = lazy(() => import('react-player/youtube'))

export type Movie = {
  id: number
  slug?: string | null
  title?: string | null
  name?: string | null
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  overview?: string
  media_type?: 'movie' | 'tv' | 'game' | 'software' | string
  genre_ids?: number[]
  original_language?: string
  category?: string
  // Aggregate rating data (optional, passed from parent)
  aggregate_rating?: number | null
  rating_count?: number
  review_count?: number
}

export const MovieCard = memo(({ movie, index = 0, isVisible }: { movie: Movie; index?: number; isVisible?: boolean }) => {
  const [translatedData, setTranslatedData] = useState<any>(null)
  const [translationRequested, setTranslationRequested] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [trailerKey, setTrailerKey] = useState<string | null>(null)
  const { lang } = useLang()

  // Merge translated data into movie object for useDualTitles
  // CRITICAL: Filter out undefined values to prevent overwriting database values
  const cleanTranslatedData = translatedData
    ? Object.fromEntries(Object.entries(translatedData).filter(([_, v]) => v !== undefined))
    : {}
  const effectiveMovie = { ...movie, ...cleanTranslatedData }
  const titles = useDualTitles(effectiveMovie)
  const resolvedTitle = resolveTitleWithFallback(effectiveMovie)
  const resolvedOverview = resolveOverviewWithFallback(effectiveMovie, lang)

  const navigate = useNavigate()
  // Use titles.main for display (respects language preference)
  const title = titles.main || resolvedTitle || effectiveMovie.title || effectiveMovie.name || 'Untitled'

  const date = movie.release_date || movie.first_air_date || ''
  const year = date ? new Date(date).getFullYear() : ''

  const isTv = movie.media_type === 'tv' || (!!movie.name && !movie.title)
  const isGame = movie.media_type === 'game'
  const isSoftware = movie.media_type === 'software'
  const isAnime = movie.media_type === 'anime'
  const isQuran = movie.media_type === 'quran'

  const getMediaType = () => {
    if (isGame) return 'game'
    if (isSoftware) return 'software'
    if (isAnime) return 'anime'
    if (isQuran) return 'quran'
    if (isTv) return 'tv'
    return 'movie'
  }

  const mediaType = getMediaType()

  // Skip items without slug to prevent crashes
  if (!movie.slug || movie.slug.trim() === '' || movie.slug === 'content') {
    return null
  }

  const contentUrl = generateContentUrl({ ...movie, media_type: mediaType })
  const watchUrl = generateWatchUrl({ ...movie, media_type: mediaType })
  // Convert vote_average to number (API returns it as string from CockroachDB numeric type)
  const voteAvg = typeof movie.vote_average === 'number' ? movie.vote_average : parseFloat(String(movie.vote_average || 0))
  const rating = voteAvg > 0 ? Math.round(voteAvg * 10) / 10 : null

  // Use primary_genre from database and translate to Arabic if needed
  const primaryGenre = (movie as any).primary_genre
  const genre = primaryGenre ? getGenreName(primaryGenre, 'ar') : (movie.genre_ids?.[0] ? getGenreName(String(movie.genre_ids[0]), 'ar') : null) || (movie as any).category
  const currentYear = new Date().getFullYear()
  const isCurrentYear = year === currentYear

  // Truncate overview to max 15 words
  const getShortOverview = (text?: string) => {
    if (!text) return ''
    const words = text.split(' ')
    if (words.length <= 15) return text
    return words.slice(0, 15).join(' ') + '...'
  }
  const shortOverview = getShortOverview(resolvedOverview)
  const [thumbSrc, setThumbSrc] = useState<string>(((movie as any).thumbnail || '').trim())
  const hasPosterPath = Boolean(movie.poster_path && movie.poster_path.trim())
  const hasValidTitle = Boolean(resolvedTitle)

  useEffect(() => {
    if (!['movie', 'tv'].includes(mediaType)) return
    if (translationRequested) return

    // CRITICAL FIX: If movie already has title_ar from database, don't fetch translation at all
    // This prevents overwriting correct Arabic titles from CockroachDB with TMDB translations
    const dbHasArabicTitle = Boolean((movie as any).title_ar || (movie as any).name_ar)
    if (dbHasArabicTitle && resolvedOverview) return

    if (resolvedTitle && resolvedOverview) return

    setTranslationRequested(true)
    getTranslation(movie).then((res) => {
      if (res) {
        // CRITICAL: Only use translation data if movie doesn't already have Arabic title from database
        if (dbHasArabicTitle) {
          // Keep database Arabic title, only use translation for overview if needed
          const cleanedTranslation: any = {}
          if (res.overview_ar && !movie.overview) cleanedTranslation.overview_ar = res.overview_ar
          if (res.overview_en && !movie.overview) cleanedTranslation.overview_en = res.overview_en
          // Explicitly DO NOT include title_ar or name_ar from translation
          setTranslatedData(Object.keys(cleanedTranslation).length > 0 ? cleanedTranslation : null)
        } else {
          setTranslatedData(res)
        }
      }
    })
  }, [movie.id, mediaType, resolvedTitle, resolvedOverview, translationRequested])

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let mounted = true

    if (isHovered && !trailerKey) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = setTimeout(async () => {
        try {
          // CRITICAL: Videos are stored in CockroachDB, not TMDB
          // Fetch from our API endpoint which reads from database
          // Use slug instead of UUID for API calls
          const slug = movie.slug || String(movie.id)
          const endpoint = mediaType === 'tv' ? `/api/tv/${slug}` : `/api/movies/${slug}`
          const { data } = await axios.get(endpoint)

          // Parse videos from database (stored as JSON string)
          const videos = data.videos ? JSON.parse(data.videos) : []
          const trailer = videos.find(
            (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
          )
          if (mounted && trailer?.key) {
            setTrailerKey(trailer.key)
          }
        } catch {
          // Silent fail
        }
      }, 500) // 500ms debounce
    } else if (!isHovered && hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    return () => {
      mounted = false
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
    }
  }, [isHovered, trailerKey, mediaType, movie.id])

  useEffect(() => {
    setThumbSrc(((movie as any).thumbnail || '').trim())
  }, [(movie as any).thumbnail])

  const getMediaLabel = () => {
    const isAr = lang === 'ar'
    if (isGame) return isAr ? 'لعبة' : 'Game'
    if (isSoftware) return isAr ? 'برنامج' : 'Software'
    if (isAnime) return isAr ? 'أنمي' : 'Anime'
    if (isQuran) return isAr ? 'قارئ' : 'Reciter'
    if (isTv) return isAr ? 'مسلسل' : 'Series'
    return isAr ? 'فيلم' : 'Movie'
  }

  if (!hasPosterPath || !hasValidTitle) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-0 group/card"
    >
      <PrefetchLink
        to={watchUrl}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable={false}
        onDragStart={(e: DragEvent<HTMLAnchorElement>) => e.preventDefault()}
        className="block relative h-full w-full lumen-focus-ring rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumen-gold focus-visible:outline-offset-2 touch-pan-y"
      >
        <div className="lumen-card h-full flex flex-col transition-transform duration-300 ease-lumen hover:scale-[1.03] focus-within:scale-[1.02]">
          {/* Poster */}
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-lumen-muted">
            {thumbSrc ? (
              <img
                src={thumbSrc}
                alt={title}
                loading="lazy"
                decoding="async"
                className={`h-full w-full object-cover transition-all duration-500 ease-lumen ${isHovered ? 'scale-105 brightness-75' : 'scale-100'}`}
                onError={() => setThumbSrc('')}
              />
            ) : (
              <TmdbImage
                path={movie.poster_path || movie.backdrop_path}
                alt={title}
                size="w342"
                className="h-full w-full"
                imgClassName={`transition-all duration-500 ease-lumen ${isHovered ? 'scale-105 brightness-75' : 'scale-100'}`}
                fallback={
                  <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-600 p-4 text-center">
                    <Play size={32} strokeWidth={1.5} className="mb-2 opacity-50" />
                    <span className="text-[10px] font-medium opacity-50 line-clamp-2">{title}</span>
                  </div>
                }
              />
            )}

            {/* Lazy Video Layer */}
            <AnimatePresence>
              {isHovered && trailerKey && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-black"
                >
                  <Suspense fallback={null}>
                    <LazyReactPlayer
                      url={`https://www.youtube.com/watch?v=${trailerKey}`}
                      width="100%"
                      height="100%"
                      playing
                      muted
                      loop
                      config={{
                        youtube: {
                          playerVars: {
                            autoplay: 1,
                            controls: 0,
                            showinfo: 0,
                            modestbranding: 1,
                            rel: 0,
                            iv_load_policy: 3
                          }
                        }
                      } as any}
                      className="pointer-events-none scale-150"
                    />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>

            {/* LUMEN grain overlay (subtle) */}
            <div className="lumen-grain rounded-2xl" aria-hidden />

            {/* Rating - Moved to bottom */}
          </div>

          {/* Title & meta */}
          <div className="p-3 h-[104px] grid grid-rows-[18px_16px_1fr] bg-gradient-to-b from-transparent to-lumen-void/60">
            <h3 className="line-clamp-1 text-sm font-semibold leading-[18px] text-lumen-cream group-hover/card:text-lumen-gold transition-colors duration-200">
              {titles.main}
            </h3>
            <p className={`line-clamp-1 text-xs leading-4 text-lumen-gold/80 font-arabic ${titles.sub ? '' : 'invisible'}`}>
              {titles.sub || '—'}
            </p>
            <div className="self-end mt-1 flex flex-wrap items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-lumen-silver">
              {/* TMDB Rating - Always show if available */}
              {rating != null && (
                <span className="flex items-center gap-0.5 text-lumen-gold">
                  <Star size={10} fill="currentColor" />
                  {rating}
                </span>
              )}

              {/* Genre */}
              {genre && (
                <>
                  {rating != null && <span className="w-0.5 h-0.5 rounded-full bg-lumen-silver/50" />}
                  <span className="truncate max-w-[80px]">{genre}</span>
                </>
              )}

              {/* Year */}
              {year && (
                <>
                  <span className="w-0.5 h-0.5 rounded-full bg-lumen-silver/50" />
                  <span className={isCurrentYear ? 'text-cyan-400 animate-neon-flash font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : ''}>
                    {year}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </PrefetchLink>
    </motion.div>
  )
}, (prev, next) => {
  return prev.movie.id === next.movie.id && prev.index === next.index
})
