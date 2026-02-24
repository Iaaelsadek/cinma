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
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Star, Eye, Heart as HeartIcon, Play, Download, Sparkles, MessageSquare } from 'lucide-react'
import { ShareButton } from '../../components/common/ShareButton'
import { useLang } from '../../state/useLang'
import ReactPlayer from 'react-player'
import { SeoHead } from '../../components/common/SeoHead'
import { useDualTitles } from '../../hooks/useDualTitles'
import { SectionHeader } from '../../components/common/SectionHeader'

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
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [dbTrailerUrl, setDbTrailerUrl] = useState<string | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [heart, setHeart] = useState(false)
  const [showTrailer, setShowTrailer] = useState(false)

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
      if (loading) return
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
  }, [user, loading])

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

  const comments = useQuery({
    queryKey: ['comments', 'movie', movieId],
    queryFn: () => getComments(movieId, 'movie'),
    enabled: Number.isFinite(movieId)
  })
  const { register, handleSubmit, reset } = useForm<{ text: string }>()
  const onAddComment = async (v: { text: string }) => {
    if (!user || !id) return
    try {
      await addComment(user.id, Number(id), 'movie', v.text)
      reset({ text: '' })
      comments.refetch()
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

  const { lang } = useLang()
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)
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
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12">
        <SkeletonDetails />
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
                <Link
                  to={`/watch/movie/${id}#downloads`}
                  onClick={() => {
                    if (Number.isFinite(movieId)) incrementClicks('movies', movieId).catch(() => undefined)
                  }}
                  className="rounded-lg bg-emerald-600 px-6 h-10 flex items-center justify-center text-white font-bold shadow-md hover:brightness-110"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('تحميل', 'Download')}
                </Link>
                <ShareButton title={title} text={overview?.slice(0, 100)} />
                <button onClick={() => toggleHeart.mutate()} className={`p-2 rounded-lg border border-white/10 ${heart ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-zinc-400'}`}>
                   <HeartIcon className={`w-5 h-5 ${heart ? 'fill-current' : ''}`} />
                </button>
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

            {!!cast.length && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
                <div className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('طاقم العمل', 'Cast')}</div>
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
                  {cast.map((p) => {
                    const img = p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : ''
                    return (
                      <div key={p.id} className="w-16 shrink-0 text-center">
                        <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-zinc-800 border border-white/5">
                          {img && <img src={img} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                        </div>
                        <div className="mt-1 truncate text-[10px] text-zinc-300">{p.name}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
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
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {similar!.results.slice(0, 10).map((m) => (
              <MovieCard key={m.id} movie={m} />
            ))}
          </div>
        </section>
      )}
      {downloadLinks.length > 0 && (
        <section>
          <SectionHeader title={t('روابط التحميل', 'Download Links')} icon={<Download />} />
          <div className="flex flex-wrap gap-2">
            {downloadLinks.map((d, i) => (
              <a
                key={`${d.url}-${i}`}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (Number.isFinite(movieId)) incrementClicks('movies', movieId).catch(() => undefined)
                }}
                className="rounded-md border border-zinc-700 px-3 py-1 text-sm text-primary"
              >
                {d.label || `رابط ${i + 1}`}
              </a>
            ))}
          </div>
        </section>
      )}
      <section>
        <SectionHeader title={t('التعليقات', 'Comments')} icon={<MessageSquare />} />
        {user ? (
          <form onSubmit={handleSubmit(onAddComment)} className="grid gap-2 mb-4">
            <textarea
              {...register('text', { required: true, minLength: 1 })}
              placeholder="أضف تعليقاً"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2"
              rows={3}
            />
            <div>
              <button className="rounded-md bg-primary px-4 h-11 text-white">نشر</button>
            </div>
          </form>
        ) : (
          <div className="text-sm text-zinc-400 mb-4">سجل الدخول لإضافة تعليق</div>
        )}
        <div className="space-y-2">
          {(comments.data || []).map((c) => (
            <div key={c.id} className="rounded-lg border border-zinc-800 p-3">
              <div className="text-sm">{c.text}</div>
              <div className="mt-1 text-xs text-zinc-500">{new Date(c.created_at).toLocaleString()}</div>
              {(user?.id === c.user_id || isAdmin) && (
                <div className="mt-2">
                  <button
                    onClick={async () => { await deleteComment(c.id); comments.refetch() }}
                    className="text-xs text-red-400"
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          ))}
          {comments.isLoading && <div className="text-sm text-zinc-400">جاري التحميل...</div>}
        </div>
      </section>
    </div>
  )
}
