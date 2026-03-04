import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../../lib/tmdb'
import { TrafficLightBadge } from '../../components/common/TrafficLightBadge'
import { MovieCard } from '../../components/features/media/MovieCard'
import { useAuth } from '../../hooks/useAuth'
import { getProfile, incrementClicks, supabase } from '../../lib/supabase'
import { generateArabicSummary } from '../../lib/gemini'
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '../../lib/supabase'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { addComment, deleteComment, getComments, updateComment } from '../../lib/supabase'
import { ReviewVotes } from '../../components/features/social/ReviewVotes'
import { AddToListModal } from '../../components/features/social/AddToListModal'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Eye, Heart as HeartIcon, Play, Sparkles, MessageSquare, Trash2, List } from 'lucide-react'
import { clsx } from 'clsx'
import { ShareButton } from '../../components/common/ShareButton'
import { useLang } from '../../state/useLang'
import ReactPlayer from 'react-player'
import { SeoHead } from '../../components/common/SeoHead'
import { useDualTitles } from '../../hooks/useDualTitles'
import { SectionHeader } from '../../components/common/SectionHeader'
import { useHiddenMedia } from '../../hooks/useHiddenMedia'
import { AlertTriangle } from 'lucide-react'

type TmdbGenre = { id: number; name: string }
type TmdbCrewMember = { id: number; job?: string; name?: string }
type TmdbCastMember = { id: number; name?: string; character?: string; profile_path?: string | null }
type TmdbVideo = { site?: string; type?: string; key?: string }
type TmdbReleaseDatesGroup = { iso_3166_1: string; release_dates: Array<{ certification?: string }> }
type TmdbMovieDetails = {
  id: number
  title?: string
  name?: string
  release_date?: string
  runtime?: number
  vote_average?: number
  vote_count?: number
  popularity?: number
  genres?: TmdbGenre[]
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  credits?: { cast?: TmdbCastMember[]; crew?: TmdbCrewMember[] }
  videos?: { results?: TmdbVideo[] }
  release_dates?: { results?: TmdbReleaseDatesGroup[] }
}
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

import { SkeletonDetails } from '../../components/common/Skeletons'

export const MovieDetails = () => {
  const { id } = useParams()
  const movieId = Number(id)
  const { user, loading: authLoading } = useAuth()
  const { filterMedia, hiddenIds, isAdmin: isUserAdmin } = useHiddenMedia()
  const { lang: currentLang } = useLang()

  // Hidden Content Check
  const isHiddenFromStart = hiddenIds.has(movieId)
  if (isHiddenFromStart && !isUserAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-center p-6">
        <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="text-rose-500 w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black mb-4">المحتوى غير متوفر حالياً</h1>
        <p className="text-zinc-400 max-w-md mx-auto mb-8">
          عذراً، هذا الفيلم تم إخفاؤه مؤقتاً بسبب تعطل السيرفرات الخاصة به. سنقوم بإعادة إظهاره فور توفر روابط جديدة.
        </p>
        <Link to="/" className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform">
          العودة للرئيسية
        </Link>
      </div>
    )
  }

  const [isAdmin, setIsAdmin] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [dbTrailerUrl, setDbTrailerUrl] = useState<string | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [heart, setHeart] = useState(false)
  const [showTrailer, setShowTrailer] = useState(false)
  const [showListModal, setShowListModal] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTrailer(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const { data, isLoading } = useQuery<TmdbMovieDetails>({
    queryKey: ['movie-details', movieId],
    queryFn: async () => {
      const { data } = await tmdb.get(`/movie/${movieId}`, {
        params: { append_to_response: 'release_dates,credits,videos' }
      })
      return data
    },
    enabled: Number.isFinite(movieId)
  })

  // SEO Schema
  const schemaData = useMemo(() => {
    if (!data) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Movie",
      "name": data.title || data.name,
      "image": data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : undefined,
      "description": data.overview,
      "dateCreated": data.release_date,
      "director": data.credits?.crew?.find(c => c.job === 'Director')?.name ? {
        "@type": "Person",
        "name": data.credits.crew.find(c => c.job === 'Director')?.name
      } : undefined,
      "actor": data.credits?.cast?.slice(0, 5).map(actor => ({
        "@type": "Person",
        "name": actor.name
      })),
      "aggregateRating": data.vote_average ? {
        "@type": "AggregateRating",
        "ratingValue": data.vote_average,
        "bestRating": "10",
        "ratingCount": data.vote_count
      } : undefined
    }
  }, [data])

  const dualTitles = useDualTitles(data || {})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isLoading) return
      if (!user) {
        setIsAdmin(false)
        setHeart(false)
        return
      }
      const p = await getProfile(user.id)
      if (cancelled) return
      setIsAdmin(p?.role === 'admin')
      if (id) {
        const inside = await isInWatchlist(user.id, Number(id), 'movie')
        if (!cancelled) setHeart(inside)
      }
    })()
    return () => { cancelled = true }
  }, [user, isLoading])

  const usCert = useMemo(() => {
    const groups = data?.release_dates?.results as TmdbReleaseDatesGroup[] | undefined
    const us = groups?.find(g => g.iso_3166_1 === 'US')
    const cert = us?.release_dates?.find(r => (r.certification || '').length > 0)?.certification || ''
    return cert.toUpperCase()
  }, [data])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!id) return
      const { data } = await supabase.from('movies').select('ai_summary,trailer_url').eq('id', String(id)).maybeSingle()
      if (cancelled) return
      setAiSummary(data?.ai_summary || null)
      setDbTrailerUrl(data?.trailer_url || null)
    })()
    return () => { cancelled = true }
  }, [id])

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

  const poster = data?.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : ''
  const backdrop = data?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : ''
  const title = dualTitles.main || data?.title || data?.name || `فيلم #${id}`
  const arabicTitle = dualTitles.sub
  const year = data?.release_date ? new Date(data.release_date).getFullYear() : ''
  const runtimeMin = typeof data?.runtime === 'number' ? data.runtime : null
  const runtime = runtimeMin != null ? `${Math.floor(runtimeMin / 60)}h ${runtimeMin % 60}m` : ''
  const overview = data?.overview || 'لا يوجد وصف متاح'
  const rating = typeof data?.vote_average === 'number' ? Math.round(data.vote_average * 10) / 10 : null
  const genres: TmdbGenre[] = data?.genres || []
  const director: string | null = (() => {
    const crew: TmdbCrewMember[] = data?.credits?.crew || []
    const d = crew.find((x) => x.job === 'Director')
    return d?.name || null
  })()
  const cast: TmdbCastMember[] = (data?.credits?.cast || []).slice(0, 12)
  const trailerKey: string | null = (() => {
    const vids: TmdbVideo[] = data?.videos?.results || []
    const yt = vids.find((v) => v.site === 'YouTube' && /trailer/i.test(v.type || ''))
    return yt?.key || null
  })()
  const viewsPretty = useMemo(() => {
    const v = typeof data?.vote_count === 'number' ? data.vote_count * 10 : typeof data?.popularity === 'number' ? Math.round(data.popularity * 100) : 15000
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
    if (v >= 1000) return `${Math.round(v / 1000)}k`
    return String(v)
  }, [data])
  const likedPercent = useMemo(() => {
    if (typeof data?.vote_average === 'number') {
      const p = Math.min(99, Math.max(60, Math.round((data.vote_average / 10) * 100)))
      return p
    }
    return 98
  }, [data])

  const [downloadLinks, setDownloadLinks] = useState<Array<{ label?: string; url: string }>>([])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!id) return
      const { data: row } = await supabase.from('movies').select('download_urls').eq('id', String(id)).maybeSingle()
      if (!cancelled) setDownloadLinks((row?.download_urls || []) as Array<{ label?: string; url: string }>)
    })()
    return () => { cancelled = true }
  }, [id])

  const [userRating, setUserRating] = useState<number>(0)
  const [avgRating, setAvgRating] = useState<number>(0)

  const comments = useQuery({
    queryKey: ['comments', 'movie', movieId],
    queryFn: () => getComments(movieId, 'movie'),
    enabled: Number.isFinite(movieId)
  })

  useEffect(() => {
    if (comments.data) {
      const rated = comments.data.filter(c => c.rating)
      if (rated.length > 0) {
        const sum = rated.reduce((acc, curr) => acc + (curr.rating || 0), 0)
        setAvgRating(parseFloat((sum / rated.length).toFixed(1)))
      }
    }
  }, [comments.data])

  const { register, handleSubmit, reset } = useForm<{ text: string; title: string }>()
  const onAddComment = async (v: { text: string; title: string }) => {
    if (!user || !id) return
    try {
      await addComment({
        userId: user.id,
        contentId: Number(id),
        contentType: 'movie',
        text: v.text,
        title: v.title,
        rating: userRating > 0 ? userRating : undefined
      })
      reset({ text: '', title: '' })
      setUserRating(0)
      comments.refetch()
      toast.success(t('تم إضافة المراجعة بنجاح', 'Review added successfully'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل الإضافة'
      toast.error(message)
    }
  }

  const onGenerate = async () => {
    if (!id) return
    setGenLoading(true)
    try {
      const text = await generateArabicSummary(title, overview)
      setAiSummary(text)
      await supabase.from('movies').update({ ai_summary: text }).eq('id', String(id))
    } finally {
      setGenLoading(false)
    }
  }

  const toggleHeart = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error('auth')
      if (heart) {
        await removeFromWatchlist(user.id, Number(id), 'movie')
      } else {
        await addToWatchlist(user.id, Number(id), 'movie')
      }
    },
    onSuccess: () => {
      setHeart((h) => !h)
      toast.success(!heart ? 'تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'خطأ'
      toast.error(message)
    }
  })

  const { lang: currentLangForT } = useLang()
  const t = (ar: string, en: string) => (currentLangForT === 'ar' ? ar : en)
  const quality = '1080p'
  const canonicalUrl = typeof window !== 'undefined' ? `${location.origin}${location.pathname}` : ''
  const trailerUrl: string | null = (() => {
    if (dbTrailerUrl) return dbTrailerUrl
    if (trailerKey) return `https://www.youtube.com/watch?v=${trailerKey}`
    return null
  })()
  const jsonLdMovie = useMemo(() => {
    const agg: Record<string, unknown> | undefined = rating != null ? {
      '@type': 'AggregateRating',
      ratingValue: rating,
      ratingCount: typeof data?.vote_count === 'number' ? data.vote_count : 100,
      bestRating: '10',
      worstRating: '1'
    } : undefined
    const video: Record<string, unknown> | undefined = trailerUrl ? {
      '@type': 'VideoObject',
      name: `${title} Trailer`,
      thumbnailUrl: poster || backdrop || '',
      uploadDate: data?.release_date || new Date().toISOString().slice(0, 10),
      duration: runtimeMin != null ? `PT${runtimeMin}M` : undefined,
      embedUrl: trailerUrl,
      potentialAction: {
        '@type': 'WatchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `https://cinma.online/watch/${id}`
        }
      }
    } : undefined
    return {
      '@context': 'https://schema.org',
      '@type': 'Movie',
      name: title,
      image: poster || backdrop || '',
      description: (aiSummary || overview).slice(0, 200),
      datePublished: data?.release_date || '',
      genre: genres.map(g => g.name),
      director: director ? { '@type': 'Person', name: director } : undefined,
      aggregateRating: agg,
      potentialAction: {
        '@type': 'WatchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `https://cinma.online/watch/${id}`
        }
      },
      video
    }
  }, [rating, data, trailerUrl, title, poster, backdrop, aiSummary, overview, genres, director, runtimeMin, id])

  if (isLoading) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full pt-24 pb-12">
        <SkeletonDetails />
      </div>
    )
  }

  // Hidden Content Check
  const isHiddenAfterLoad = hiddenIds.has(movieId)
  if (isHiddenAfterLoad && !isUserAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-center p-6">
        <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="text-rose-500 w-12 h-12" />
        </div>
        <h1 className="text-3xl font-black mb-4">المحتوى غير متوفر حالياً</h1>
        <p className="text-zinc-400 max-w-md mx-auto mb-8">
          عذراً، هذا العمل تم إخفاؤه مؤقتاً بسبب تعطل السيرفرات الخاصة به. سنقوم بإعادة إظهاره فور توفر روابط جديدة.
        </p>
        <Link to="/" className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-transform">
          العودة للرئيسية
        </Link>
      </div>
    )
  }

  return (
    <div className="relative space-y-3">
      {schemaData && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(schemaData)}
          </script>
        </Helmet>
      )}
      <SeoHead
        title={`${title} | ${quality}`}
        description={aiSummary || overview || ''}
        image={backdrop || poster || undefined}
        type="video.movie"
        schema={jsonLdMovie}
      />
      {/* Cinematic background */}
      {backdrop && (
        <div className="absolute top-0 left-0 right-0 h-[35vh] -z-10 overflow-hidden">
          <img src={backdrop} alt={title} className="h-full w-full object-cover opacity-50" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505]" />
        </div>
      )}
      <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full relative z-10 pt-6 space-y-3">
        {isLoading ? (
        <SkeletonDetails />
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_200px]">
          {/* Left: Info hub */}
          <div className="space-y-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
              <nav className="text-xs text-zinc-400 mb-2">
                <Link to="/" className="hover:text-white">{t('الرئيسية', 'Home')}</Link>
                <span className="mx-1 text-zinc-600">/</span>
                <Link to="/movies" className="hover:text-white">{t('أفلام', 'Movies')}</Link>
                <span className="mx-1 text-zinc-600">/</span>
                <span className="text-white">{title}</span>
              </nav>
              
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">{title}</h1>
                {arabicTitle && <h2 className="text-lg text-primary font-arabic opacity-90">{arabicTitle}</h2>}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                <span className="rounded bg-white/10 px-2 py-0.5 text-white font-bold">{quality}</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-yellow-400 font-bold">★ {rating ?? '—'}</span>
                {year && <span className="rounded bg-white/10 px-2 py-0.5">{year}</span>}
                {runtime && <span className="rounded bg-white/10 px-2 py-0.5">{runtime}</span>}
                <TrafficLightBadge cert={usCert} />
              </div>

              {/* Action Buttons - Moved here for immediate visibility */}
              <div className="mt-4 flex flex-wrap gap-3 items-center">
                <Link
                  to={`/watch/movie/${id}#player`}
                  onClick={() => {
                    if (Number.isFinite(movieId)) incrementClicks('movies', movieId).catch(() => undefined)
                  }}
                  className="rounded-lg bg-[#e50914] px-6 h-10 flex items-center justify-center text-white font-bold shadow-md hover:brightness-110"
                >
                  <Play className="w-4 h-4 mr-2" fill="currentColor" />
                  {t('شاهد الآن', 'Watch Now')}
                </Link>
                <ShareButton title={title} text={overview?.slice(0, 100)} />
                <button onClick={() => toggleHeart.mutate()} className={`p-2 rounded-lg border border-white/10 ${heart ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-zinc-400'}`}>
                   <HeartIcon className={`w-5 h-5 ${heart ? 'fill-current' : ''}`} />
                </button>
                {user && (
                  <button 
                    onClick={() => setShowListModal(true)}
                    className="p-2 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-lumen-gold transition-colors"
                  >
                    <List className="w-5 h-5" />
                  </button>
                )}
              </div>

              {!!genres.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <Link
                      key={g.id}
                      to={`/movies/genre/${g.id}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-zinc-300 hover:bg-white/10"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              )}
              
              <p className="mt-4 text-sm leading-relaxed text-zinc-300 max-w-3xl">{overview}</p>
              
              {director && <div className="mt-3 text-xs text-zinc-400">{t('المخرج', 'Director')}: <span className="text-white">{director}</span></div>}
            </div>
          </div>
          
          {/* Right: Poster + Trailer */}
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
              <div className="aspect-[2/3] w-full">
                {poster && <img src={poster} alt={title} className="h-full w-full object-cover" loading="lazy" />}
              </div>
            </div>
            
            {trailerUrl && showTrailer ? (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60 backdrop-blur-md">
                 <div className="aspect-video w-full">
                    <ReactPlayer url={trailerUrl} width="100%" height="100%" light={true} controls playIcon={<div className="bg-red-600 rounded-full p-3"><Play className="w-6 h-6 text-white fill-current" /></div>} />
                 </div>
              </div>
            ) : trailerUrl && !showTrailer ? (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60 backdrop-blur-md">
                <div className="aspect-video w-full animate-pulse bg-zinc-800" />
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
      {!!(similar?.results?.length) && (
        <section>
          <SectionHeader title={t('مشابهة حسب التصنيف', 'Similar by Rating')} icon={<Sparkles />} />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {similar!.results.slice(0, 12).map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      )}
      <section id="reviews" className="pt-8">
        <div className="flex items-center justify-between mb-6">
          <SectionHeader 
            title={t(`المراجعات والتقييمات (${comments.data?.length || 0})`, `Reviews & Ratings (${comments.data?.length || 0})`)} 
            icon={<MessageSquare className="text-primary" />} 
          />
          {avgRating > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
              <Star className="w-4 h-4 text-primary fill-current" />
              <span className="text-sm font-bold text-primary">{avgRating}/10</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">{t('متوسط التقييم', 'Avg Rating')}</span>
            </div>
          )}
        </div>

        {user && showListModal && (
          <AnimatePresence>
            <AddToListModal
              userId={user.id}
              contentId={movieId}
              contentType="movie"
              onClose={() => setShowListModal(false)}
              lang={currentLangForT}
            />
          </AnimatePresence>
        )}

        {user ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl mb-8"
          >
            <form onSubmit={handleSubmit(onAddComment)} className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center gap-6 pb-4 border-b border-white/5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t('تقييمك', 'Your Rating')}</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setUserRating(num)}
                        onMouseEnter={() => setUserRating(num)}
                        className="transition-transform active:scale-90"
                      >
                        <Star 
                          className={clsx(
                            "w-5 h-5 transition-colors",
                            num <= userRating ? "text-primary fill-current" : "text-zinc-700"
                          )} 
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm font-bold text-white w-6">{userRating || '-'}</span>
                  </div>
                </div>
                
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t('عنوان المراجعة', 'Review Title')}</label>
                  <input
                    {...register('title')}
                    placeholder={t('مثال: تجربة سينمائية رائعة', 'Example: Great cinematic experience')}
                    className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{t('مراجعتك', 'Your Review')}</label>
                <textarea
                  {...register('text', { required: true, minLength: 1 })}
                  placeholder={t('ما رأيك في هذا العمل؟ (بدون حرق للأحداث)', 'What did you think of this? (No spoilers)')}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-4 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                  rows={4}
                />
              </div>

              <div className="flex justify-end">
                <button 
                  type="submit"
                  className="rounded-xl bg-primary px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  {t('نشر المراجعة', 'Post Review')}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center mb-8">
            <p className="text-zinc-400 text-sm mb-4">{t('سجل الدخول لتتمكن من إضافة تقييم ومراجعة', 'Sign in to add a rating and review')}</p>
            <Link to="/auth" className="text-primary font-bold hover:underline">{t('تسجيل الدخول', 'Sign In')}</Link>
          </div>
        )}

        <div className="grid gap-4">
          {(comments.data || []).map((c, idx) => (
            <motion.div 
              key={c.id} 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all"
            >
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-primary font-bold">
                    {c.user_id.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">User #{c.user_id.slice(0, 4)}</span>
                      {c.rating && (
                        <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded text-[10px] font-bold text-yellow-500 border border-yellow-500/20">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          {c.rating}/10
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500">{new Date(c.created_at).toLocaleDateString(currentLangForT === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                </div>
                
                {(user?.id === c.user_id || isAdmin) && (
                  <button
                    onClick={async () => { 
                      if (confirm(t('هل أنت متأكد من حذف هذه المراجعة؟', 'Are you sure you want to delete this review?'))) {
                        await deleteComment(c.id)
                        comments.refetch() 
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {c.title && <h4 className="text-sm font-bold text-white mb-1">{c.title}</h4>}
              <p className="text-sm text-zinc-400 leading-relaxed">{c.text}</p>
              
              <ReviewVotes 
                commentId={c.id} 
                userId={user?.id} 
                lang={currentLangForT} 
              />
            </motion.div>
          ))}
          
          {comments.isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="text-xs text-zinc-500 animate-pulse uppercase tracking-widest">{t('جاري تحميل المراجعات...', 'Loading reviews...')}</div>
            </div>
          )}
          
          {!comments.isLoading && (comments.data || []).length === 0 && (
            <div className="py-12 text-center border border-dashed border-white/5 rounded-2xl">
              <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">{t('لا توجد مراجعات بعد. كن أول من يشارك رأيه!', 'No reviews yet. Be the first to share your thoughts!')}</p>
            </div>
          )}
        </div>
        </section>
      </div>
    </div>
  )
}
