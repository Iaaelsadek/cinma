import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { tmdb, getUsTvRating, getRatingColorFromCert } from '../../lib/tmdb'
import {
  addToWatchlist,
  deleteEpisode,
  getEpisodes,
  getSeasons,
  getSeriesById,
  isInWatchlist,
  removeFromWatchlist,
  upsertEpisode,
  upsertSeason,
  upsertSeries
} from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { addComment, deleteComment, getComments } from '../../lib/supabase'
import { ReviewVotes } from '../../components/features/social/ReviewVotes'
import { AddToListModal } from '../../components/features/social/AddToListModal'
import { getProfile } from '../../lib/supabase'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, List, MessageSquare, Play, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { ShareButton } from '../../components/common/ShareButton'
import { AiInsights } from '../../components/features/media/AiInsights'
import { SectionHeader } from '../../components/common/SectionHeader'
import { useLang } from '../../state/useLang'
import React from 'react'
import ReactPlayer from 'react-player'
import { getEmbedUrlByIndex } from '../../services/embedService'
import { SeoHead } from '../../components/common/SeoHead'
import { useDualTitles } from '../../hooks/useDualTitles'

interface SeriesDetailsProps {
  id?: string
}

const SeriesDetails = ({ id: propId }: SeriesDetailsProps = {}) => {
  const params = useParams()
  const id = propId || params.id
  const tvId = Number(id)
  const { user } = useAuth()
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null)
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [heart, setHeart] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const series = useQuery({
    queryKey: ['series', tvId],
    queryFn: async () => {
      const local = await getSeriesById(tvId)
      if (local) return local
      const { data } = await tmdb.get(`/tv/${tvId}`)
      const rating = await getUsTvRating(tvId)
      await upsertSeries({
        id: tvId,
        name: data.name || '',
        arabic_name: data.name || '',
        overview: data.overview || '',
        ai_summary: null,
        rating_color: getRatingColorFromCert(rating),
        genres: data.genres || null,
        first_air_date: data.first_air_date || null,
        poster_path: data.poster_path || null,
        backdrop_path: data.backdrop_path || null
      })
      const remoteSeasons: Array<any> = data.seasons || []
      for (const s of remoteSeasons) {
        if ((s.season_number ?? 0) < 0) continue
        await upsertSeason({
          series_id: tvId,
          season_number: s.season_number ?? 0,
          name: s.name || '',
          overview: s.overview || '',
          poster_path: s.poster_path || null,
          air_date: s.air_date || null
        })
      }
      const after = await getSeriesById(tvId)
      return after
    },
    enabled: Number.isFinite(tvId)
  })
  const remote = useQuery({
    queryKey: ['series-remote', tvId],
    queryFn: async () => {
      const { data } = await tmdb.get(`/tv/${tvId}`, { params: { append_to_response: 'aggregate_credits,videos' } })
      return data
    },
    enabled: Number.isFinite(tvId)
  })

  // SEO Schema
  const schemaData = useMemo(() => {
    if (!remote.data) return null;
    const s = remote.data
    return {
      "@context": "https://schema.org",
      "@type": "TVSeries",
      "name": s.name,
      "image": s.backdrop_path ? `https://image.tmdb.org/t/p/w780${s.backdrop_path}` : undefined,
      "description": s.overview,
      "startDate": s.first_air_date,
      "actor": s.aggregate_credits?.cast?.slice(0, 5).map((actor: any) => ({
        "@type": "Person",
        "name": actor.name
      })),
      "aggregateRating": s.vote_average ? {
        "@type": "AggregateRating",
        "ratingValue": s.vote_average,
        "bestRating": "10",
        "ratingCount": s.vote_count
      } : undefined
    }
  }, [remote.data])

  const dualTitles = useDualTitles(series.data || {})

  const seasons = useQuery({
    queryKey: ['seasons', tvId, series.data?.id],
    queryFn: async () => {
      if (!series.data) return []
      const items = await getSeasons(tvId)
      return items
    },
    enabled: !!series.data
  })

  useEffect(() => {
    if (seasons.data && seasons.data.length && seasonNumber == null) {
      const first = seasons.data.find((s: any) => s.season_number > 0) || seasons.data[0]
      setSeasonNumber(first?.season_number ?? null)
      setSeasonId(first?.id ?? null)
    }
  }, [seasons.data, seasonNumber])

  const episodes = useQuery({
    queryKey: ['episodes', tvId, seasonId, seasonNumber],
    queryFn: async () => {
      if (!seasonId || seasonNumber == null) return []
      const rows = await getEpisodes(seasonId)
      if (rows.length > 0) return rows
      const { data } = await tmdb.get(`/tv/${tvId}/season/${seasonNumber}`)
      const eps = (data.episodes || []) as Array<any>
      for (const e of eps) {
        await upsertEpisode({
          season_id: seasonId,
          episode_number: e.episode_number ?? 0,
          name: e.name || '',
          overview: e.overview || '',
          still_path: e.still_path || null,
          air_date: e.air_date || null
        })
      }
      const after = await getEpisodes(seasonId)
      return after
    },
    enabled: !!seasonId && seasonNumber != null
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user || !tvId) return
      const inside = await isInWatchlist(user.id, tvId, 'tv')
      if (!cancelled) setHeart(inside)
    })()
    return () => { cancelled = true }
  }, [user, tvId])

  const toggleHeart = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('auth')
      if (heart) {
        await removeFromWatchlist(user.id, tvId, 'tv')
      } else {
        await addToWatchlist(user.id, tvId, 'tv')
      }
    },
    onSuccess: () => {
      setHeart((h) => !h)
      toast.success(!heart ? 'تمت الإضافة إلى المفضلة' : 'تمت الإزالة من المفضلة')
    },
    onError: (e: any) => toast.error(e?.message || 'خطأ')
  })

  const poster = series.data?.poster_path ? `https://image.tmdb.org/t/p/w500${series.data.poster_path}` : ''
  const backdrop = series.data?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${series.data.backdrop_path}` : ''
  const title = dualTitles.main || series.data?.name || `مسلسل #${id}`
  const arabicTitle = dualTitles.sub
  const overview = series.data?.overview || 'لا يوجد وصف متاح'
  const year = (series.data?.first_air_date ? new Date(series.data.first_air_date).getFullYear() : '') as any
  const episodeMin = Array.isArray(remote.data?.episode_run_time) && remote.data.episode_run_time.length ? remote.data.episode_run_time[0] : null
  const runtime = episodeMin != null ? `${Math.floor(episodeMin / 60)}h ${episodeMin % 60}m` : ''
  const vote = typeof remote.data?.vote_average === 'number' ? Math.round(remote.data.vote_average * 10) / 10 : null
  const genres: Array<{ id: number; name: string }> = remote.data?.genres || []
  const cast: Array<any> = (remote.data?.aggregate_credits?.cast || []).slice(0, 12)
  const trailerKey: string | null = (() => {
    const vids: Array<any> = remote.data?.videos?.results || []
    const yt = vids.find((v) => v.site === 'YouTube' && /trailer/i.test(v.type))
    return yt?.key || null
  })()
  const [playingEpisode, setPlayingEpisode] = useState<number | null>(null)
  const [serverIndex, setServerIndex] = useState<number>(0)
  const [showTrailer, setShowTrailer] = useState(false)
  const [showListModal, setShowListModal] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTrailer(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const embedUrl = useMemo(() => {
    if (!tvId) return ''
    const s = seasonNumber || 1
    const e = playingEpisode || 1
    return getEmbedUrlByIndex('tv', tvId, { season: s, episode: e, serverIndex })
  }, [tvId, seasonNumber, playingEpisode, serverIndex])

  const [userRating, setUserRating] = useState<number>(0)
  const [avgRating, setAvgRating] = useState<number>(0)

  const comments = useQuery({
    queryKey: ['comments', 'tv', tvId],
    queryFn: () => getComments(tvId, 'tv'),
    enabled: Number.isFinite(tvId)
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
        contentType: 'tv',
        text: v.text,
        title: v.title,
        rating: userRating > 0 ? userRating : undefined
      })
      reset({ text: '', title: '' })
      setUserRating(0)
      comments.refetch()
      toast.success(t('تم إضافة المراجعة بنجاح', 'Review added successfully'))
    } catch (e: any) {
      toast.error(e?.message || 'فشل الإضافة')
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user) { setIsAdmin(false); return }
      const p = await getProfile(user.id)
      if (!cancelled) setIsAdmin(p?.role === 'admin')
    })()
    return () => { cancelled = true }
  }, [user])

  const { lang } = useLang()
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const canonicalUrl = typeof window !== 'undefined' ? `${location.origin}${location.pathname}` : ''
  const jsonLdSeries = useMemo(() => {
    const agg: any = vote != null ? {
      '@type': 'AggregateRating',
      ratingValue: vote,
      ratingCount: typeof remote.data?.vote_count === 'number' ? remote.data.vote_count : 100,
      bestRating: '10',
      worstRating: '1'
    } : undefined
    return {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      name: title,
      image: poster || backdrop || '',
      description: (overview || '').slice(0, 200),
      actor: cast.map(c => ({ '@type': 'Person', name: c.name })).slice(0, 6),
      genre: genres.map(g => g.name),
      aggregateRating: agg,
      potentialAction: {
        '@type': 'WatchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `https://cinma.online/series/${id}`
        }
      }
    }
  }, [vote, remote.data, title, poster, backdrop, overview, cast, genres, id])
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
        title={`${title} | ${t('مسلسل', 'Series')}`}
        description={overview || ''}
        image={backdrop || poster || undefined}
        type="video.tv_show"
        schema={jsonLdSeries}
      />
      {backdrop && (
        <div className="absolute top-0 left-0 right-0 h-[30vh] -z-10 overflow-hidden">
          <img src={backdrop} alt={title} className="h-full w-full object-cover opacity-50" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/60 to-[#050505]" />
        </div>
      )}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_240px]">
        {/* Left: Poster & actions */}
        <div className="space-y-2 order-2 md:order-1">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
            <div className="aspect-[2/3] w-full bg-zinc-900/40">
              {poster && <img src={poster} alt={title} className="h-full w-full object-cover" loading="lazy" />}
            </div>
          </div>
          {user && (
            <button onClick={() => toggleHeart.mutate()} className={`w-full rounded-md px-3 py-2 text-xs ${heart ? 'bg-red-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              {heart ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
            </button>
          )}
        </div>
        {/* Center: Info */}
        <div className="space-y-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
            <nav className="text-xs text-zinc-400 mb-2">
              <Link to="/" className="hover:text-white">{t('الرئيسية', 'Home')}</Link>
              <span className="mx-1 text-zinc-600">/</span>
              <Link to="/series" className="hover:text-white">{t('مسلسلات', 'Series')}</Link>
              <span className="mx-1 text-zinc-600">/</span>
              <span className="text-white">{title}</span>
            </nav>
            
            <div className="flex flex-col gap-1">
               <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
               {arabicTitle && <h2 className="text-lg text-primary font-arabic opacity-90">{arabicTitle}</h2>}
            </div>
            
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
              {year && <span className="rounded bg-white/10 px-2 py-0.5">{year}</span>}
              {runtime && <span className="rounded bg-white/10 px-2 py-0.5">{runtime}</span>}
              {vote != null && <span className="rounded bg-white/10 px-2 py-0.5 text-yellow-400 font-bold">★ {vote}</span>}
            </div>
            
            {!!genres.length && (
              <div className="mt-2 flex flex-wrap gap-2">
                {genres.map((g) => (
                  <Link
                    key={g.id}
                    to={`/series/genre/${g.id}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-zinc-300 hover:bg-white/10"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}
            
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{overview}</p>
            
            <AiInsights 
              title={series.data?.name || ''} 
              type="tv" 
              overview={series.data?.overview || ''}
              className="mt-6"
            />
            
            <div className="mt-3 no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {(seasons.data || [])
                .filter((s: any) => (s.season_number ?? 0) >= 0)
                .map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSeasonNumber(s.season_number)
                      const found = seasons.data?.find((x: any) => x.season_number === s.season_number)
                      setSeasonId(found?.id ?? null)
                      setPlayingEpisode(null)
                    }}
                    className={`rounded-full px-3 py-1 text-xs whitespace-nowrap ${seasonNumber === s.season_number ? 'bg-primary text-white' : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'}`}
                  >
                    {t('الموسم', 'S')} {s.season_number}
                  </button>
                ))}
            </div>
          </div>
          
          {!!cast.length && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
              <div className="mb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('طاقم العمل', 'Cast')}</div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
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
        
        {/* Right: Trailer + actions */}
        <div className="space-y-2 order-3">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60 p-2 backdrop-blur-md">
            <div className="aspect-video w-full overflow-hidden rounded-md">
              {playingEpisode ? (
                <iframe
                  title="player"
                  src={embedUrl}
                  className="h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  referrerPolicy="no-referrer"
                />
              ) : (trailerKey && showTrailer) ? (
                <ReactPlayer
                  url={`https://www.youtube.com/watch?v=${trailerKey}`}
                  width="100%"
                  height="100%"
                  light={true}
                  controls
                  playIcon={<div className="bg-primary rounded-full p-4"><Play className="w-8 h-8 text-white fill-current" /></div>}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                  {!showTrailer && trailerKey ? (
                    <div className="animate-pulse bg-zinc-800 w-full h-full" />
                  ) : (
                    'لا يوجد تريلر'
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setServerIndex(0)} className={`rounded-md px-4 h-10 text-xs ${serverIndex === 0 ? 'bg-primary text-white' : 'border border-white/10 bg-white/10 text-white hover:bg-white/20'}`}>vidsrc</button>
            <button onClick={() => setServerIndex(1)} className={`rounded-md px-4 h-10 text-xs ${serverIndex === 1 ? 'bg-primary text-white' : 'border border-white/10 bg-white/10 text-white hover:bg-white/20'}`}>2embed</button>
            <button onClick={() => setServerIndex(2)} className={`rounded-md px-4 h-10 text-xs ${serverIndex === 2 ? 'bg-primary text-white' : 'border border-white/10 bg-white/10 text-white hover:bg-white/20'}`}>embed.su</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ShareButton title={title} text={overview?.slice(0, 100)} />
            {user && (
              <button 
                onClick={() => setShowListModal(true)}
                className="p-2 rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-lumen-gold transition-colors"
              >
                <List className="w-5 h-5" />
              </button>
            )}
            <Link to={`/watch/${id}?type=tv&season=${seasonNumber || 1}&episode=${playingEpisode || 1}`} className="flex-1 rounded-md bg-gradient-to-r from-primary to-luxury-purple h-10 flex items-center justify-center text-white font-bold min-w-[120px]">
              {t('شاهد الآن', 'Watch Now')}
            </Link>
            <Link to={`/watch/${id}?type=tv&season=${seasonNumber || 1}&episode=1`} className="rounded-md border border-white/10 bg-white/10 px-4 h-10 flex items-center text-white hover:bg-white/20">
              {t('تحميل', 'Download')}
            </Link>
          </div>
        </div>
      </motion.div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('الحلقات', 'Episodes')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {(episodes.data || []).map((e: any) => {
            const still = e.still_path ? `https://image.tmdb.org/t/p/w300${e.still_path}` : ''
            return (
              <button
                key={e.id}
                onClick={() => setPlayingEpisode(e.episode_number || 1)}
                className={`overflow-hidden rounded-lg border border-zinc-800 text-left transition ${playingEpisode === (e.episode_number || 1) ? 'bg-white/10' : 'bg-white/5 hover:bg-white/10'}`}
              >
                <div className="relative">
                  <div className="aspect-[16/9] w-full bg-zinc-800">
                    {still && <img src={still} alt={e.name} className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 line-clamp-1 text-sm font-semibold text-white">
                    {t('الحلقة', 'Episode')} {e.episode_number}: {e.name || t('بدون عنوان', 'Untitled')}
                  </div>
                </div>
                <div className="line-clamp-2 p-2 text-xs text-zinc-400">{e.overview || '—'}</div>
              </button>
            )
          })}
          {episodes.isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-ep-${i}`} className="overflow-hidden rounded-lg border border-zinc-800 bg-white/5">
              <div className="aspect-[16/9] w-full animate-pulse bg-zinc-800" />
              <div className="p-2 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </section>
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
              contentId={tvId}
              contentType="tv"
              onClose={() => setShowListModal(false)}
              lang={lang}
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
                    <div className="text-[10px] text-zinc-500">{new Date(c.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
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
                lang={lang} 
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
  )
}

export default SeriesDetails
