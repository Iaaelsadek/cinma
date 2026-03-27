import { useEffect, useMemo, useState } from 'react'
import {useParams, useNavigate, useLocation} from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resolveSlug } from '../../lib/slugResolver'
import { logger } from '../../lib/logger'
import { supabase } from '../../lib/supabase'
import {getMovieByIdDB} from '../../lib/db'
import { tmdb } from '../../lib/tmdb'
import { TrafficLightBadge } from '../../components/common/TrafficLightBadge'
import { MovieCard } from '../../components/features/media/MovieCard'
import { useAuth } from '../../hooks/useAuth'
import {getProfile, addToWatchlist, isInWatchlist, removeFromWatchlist} from '../../lib/supabase'
import { toast } from 'sonner'
import { Helmet } from 'react-helmet-async'
import {motion} from 'framer-motion'
import {Star, Heart, Play} from 'lucide-react'
import { clsx } from 'clsx'
import { ShareButton } from '../../components/common/ShareButton'
import { useLang } from '../../state/useLang'
import ReactPlayer from 'react-player/lazy'
import { SeoHead } from '../../components/common/SeoHead'
import { useDualTitles } from '../../hooks/useDualTitles'
import { generateArabicSummary } from '../../lib/gemini'
import { SectionHeader } from '../../components/common/SectionHeader'
import { SkeletonDetails } from '../../components/common/Skeletons'

// Types
type TmdbGenre = { id: number; name: string }
type TmdbCrewMember = { id: number; job?: string; name?: string }
type TmdbCastMember = { id: number; name?: string; character?: string; profile_path?: string | null }
type TmdbVideo = { site?: string; type?: string; key?: string }
type TmdbReleaseDatesGroup = { iso_3166_1: string; release_dates: Array<{ certification?: string }> }
type TmdbSimilarItem = {
  id: number
  title?: string
  name?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  release_date?: string
  first_air_date?: string
  media_type?: 'movie' | 'tv'
}

export const MovieDetails = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { lang } = useLang()
  const queryClient = useQueryClient()

  const [isAdmin, setIsAdmin] = useState(false)
  const [heart, setHeart] = useState(false)
  const [showTrailer, setShowTrailer] = useState(false)
  const [dbTrailerUrl, setDbTrailerUrl] = useState<string | null>(null)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [movieId, setMovieId] = useState<number | null>(null)

  // 1. Fetch from DB
  const { data: dbMovie, isLoading: isDbLoading } = useQuery({
    queryKey: ['movie-db', slug],
    queryFn: async () => {
      if (!slug) return null;
      return getMovieByIdDB(slug)
    },
    enabled: !!slug
  })

  // Update movieId when dbMovie is loaded
  useEffect(() => {
    if (dbMovie?.id) {
      setMovieId(dbMovie.id)
    }
  }, [dbMovie])

  // 2. Fetch from TMDB (Fallback)
  const { data: tmdbMovie, isLoading: isTmdbLoading } = useQuery({
    queryKey: ['movie-tmdb', movieId],
    queryFn: async () => {
      if (!movieId) return null;
      try {
        const { data } = await tmdb.get(`/movie/${movieId}`, {
          params: { append_to_response: 'release_dates,credits,videos' }
        })
        return data
      } catch (err) {
        return null
      }
    },
    enabled: !!movieId
  })

  const data = dbMovie || tmdbMovie
  const isLoading = isDbLoading || (isTmdbLoading && !dbMovie)

  // Hooks
  const dualTitles = useDualTitles(data || {})

  // Admin & Watchlist Check
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user) {
        setIsAdmin(false)
        setHeart(false)
        return
      }
      const p = await getProfile(user.id)
      if (cancelled) return
      setIsAdmin(p?.role === 'admin')
      if (movieId) {
        const inside = await isInWatchlist(user.id, movieId, 'movie')
        if (!cancelled) setHeart(inside)
      }
    })()
    return () => { cancelled = true }
  }, [user, movieId])

  // Get AI Summary & Trailer from DB if available
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!movieId) return
      const { data: dbData } = await supabase.from('movies').select('ai_summary,trailer_url').eq('id', movieId).maybeSingle()
      if (cancelled) return
      if (dbData?.ai_summary) setAiSummary(dbData.ai_summary)
      setDbTrailerUrl(dbData?.trailer_url || null)
    })()
    return () => { cancelled = true }
  }, [movieId])

  // Auto-translate overview if needed
  useEffect(() => {
    if (!data || !data.overview) return
    const isArabic = /[\u0600-\u06FF]/.test(data.overview)
    if (!isArabic && !aiSummary) {
      generateArabicSummary(data.title || data.name || '', data.overview).then(summary => {
        if (summary && summary !== data.overview) {
          setAiSummary(summary)
        }
      })
    }
  }, [data?.overview, data?.title, data?.name, aiSummary])

  // Watchlist Mutation
  const toggleWatchlist = useMutation({
    mutationFn: async () => {
      if (!user || !movieId) throw new Error('auth')
      if (heart) {
        await removeFromWatchlist(user.id, movieId, 'movie')
      } else {
        await addToWatchlist(user.id, movieId, 'movie')
      }
    },
    onSuccess: () => {
      setHeart(!heart)
      toast.success(heart ? (lang === 'ar' ? 'تم الحذف من القائمة' : 'Removed from watchlist') : (lang === 'ar' ? 'تم الإضافة للقائمة' : 'Added to watchlist'))
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    },
    onError: (err: any) => {
      if (err.message === 'auth') toast.error(lang === 'ar' ? 'يجب تسجيل الدخول' : 'Please login first')
      else toast.error('Error updating watchlist')
    }
  })

  // Derived Data
  const usCert = useMemo(() => {
    const groups = data?.release_dates?.results as TmdbReleaseDatesGroup[] | undefined
    const us = groups?.find(g => g.iso_3166_1 === 'US')
    const cert = us?.release_dates?.find(r => (r.certification || '').length > 0)?.certification || ''
    return cert.toUpperCase()
  }, [data])

  const { data: similar } = useQuery<{ results: TmdbSimilarItem[] }>({
    queryKey: ['similar-by-cert', movieId, usCert],
    queryFn: async () => {
      if (!usCert) return { results: [] }
      const { data } = await tmdb.get('/discover/movie', {
        params: {
          certification_country: 'US',
          certification: usCert,
          sort_by: 'popularity.desc'
        }
      })
      return data as { results: TmdbSimilarItem[] }
    },
    enabled: !!usCert && Number.isFinite(movieId)
  })

  const schemaData = useMemo(() => {
    if (!data) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Movie",
      "name": data.title || data.name,
      "image": data.poster_path ? `https://image.tmdb.org/t/p/w780${data.poster_path}` : undefined,
      "description": data.overview,
      "datePublished": data.release_date,
      "aggregateRating": data.vote_average ? {
        "@type": "AggregateRating",
        "ratingValue": data.vote_average,
        "bestRating": "10",
        "ratingCount": data.vote_count
      } : undefined
    }
  }, [data])

  if (isLoading) return <SkeletonDetails />
  if (!data) return <div className="text-center py-20 text-white">Movie not found</div>

  // Visual Data
  const poster = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '/placeholder.jpg'
  const backdrop = data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : ''
  const title = dualTitles.sub || dualTitles.main || data.title || data.name
  const overview = aiSummary || data.overview || (lang === 'ar' ? 'لا يوجد وصف' : 'No description')
  const rating = data.vote_average ? Math.round(data.vote_average * 10) / 10 : 0
  const year = data.release_date ? new Date(data.release_date).getFullYear() : ''
  const genres = data.genres || []
  
  // Trailer Logic
  const trailerKey = data.videos?.results?.find((v: TmdbVideo) => v.type === 'Trailer' && v.site === 'YouTube')?.key
  const finalTrailerUrl = dbTrailerUrl || (trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : null)

  return (
    <>
      <SeoHead 
        title={title}
        description={overview}
        image={poster}
        type="video.movie"
        rating={data.vote_average}
        ratingCount={data.vote_count}
        releaseDate={data.release_date}
        genres={genres.map((g: any) => g.name)}
        schema={schemaData}
      />

      <div className="min-h-screen bg-black text-white relative w-full overflow-hidden">
        {/* Backdrop */}
        <div className="absolute inset-0 h-[70vh]">
            {backdrop && (
                <div className="absolute inset-0">
                    <img src={backdrop} alt="" className="w-full h-full object-cover opacity-40 mask-image-b" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                </div>
            )}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-[20vh] pb-20">
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
                {/* Left: Poster */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div className="relative rounded-xl overflow-hidden shadow-2xl aspect-[2/3] group">
                        <img src={poster} alt={title} className="w-full h-full object-cover" />
                    </div>
                    
                    <button 
                        onClick={() => toggleWatchlist.mutate()}
                        className={clsx(
                            "w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all",
                            heart ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-white/10 hover:bg-white/20"
                        )}
                    >
                        <Heart className={clsx("w-5 h-5", heart && "fill-current")} />
                        {heart ? (lang === 'ar' ? 'في القائمة' : 'In Watchlist') : (lang === 'ar' ? 'أضف للقائمة' : 'Add to Watchlist')}
                    </button>
                </motion.div>

                {/* Right: Info */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-2">{title}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                            <span>{year}</span>
                            <span>•</span>
                            <div className="flex items-center gap-1 text-yellow-500">
                                <Star className="w-4 h-4 fill-current" />
                                <span>{rating}</span>
                            </div>
                            <span>•</span>
                            <span>{genres.map((g: TmdbGenre) => g.name).join(', ')}</span>
                        </div>
                    </div>

                    <p className="text-lg leading-relaxed text-zinc-300 max-w-3xl">
                        {overview}
                    </p>

                    {finalTrailerUrl && (
                        <div className="pt-4">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Play className="w-5 h-5 text-red-500" />
                                {lang === 'ar' ? 'الإعلان الرسمي' : 'Official Trailer'}
                            </h3>
                            <div className="aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10 max-w-2xl">
                                <ReactPlayer 
                                    url={finalTrailerUrl}
                                    width="100%"
                                    height="100%"
                                    controls
                                    light={backdrop}
                                    playIcon={<div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Play className="w-8 h-8 text-white fill-current ml-1" /></div>}
                                />
                            </div>
                        </div>
                    )}
                    
                    {/* Similar Movies */}
                    {similar?.results && similar.results.length > 0 && (
                        <div className="pt-12">
                            <SectionHeader title={lang === 'ar' ? 'أفلام مشابهة' : 'Similar Movies'} icon={<Play className="w-5 h-5" />} />
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {similar.results.slice(0, 5).map(item => (
                                    <MovieCard key={item.id} movie={{ ...item, media_type: 'movie' }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </>
  )
}
