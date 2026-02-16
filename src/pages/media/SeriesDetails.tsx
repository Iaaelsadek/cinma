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
import { getProfile } from '../../lib/supabase'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useLang } from '../../state/useLang'
import React from 'react'
import ReactPlayer from 'react-player'
import { getEmbedUrlByIndex } from '../../services/embedService'
import { SeoHead } from '../../components/common/SeoHead'

const SeriesDetails = () => {
  const { id } = useParams()
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
  const backdrop = series.data?.backdrop_path ? `https://image.tmdb.org/t/p/original${series.data.backdrop_path}` : ''
  const title = series.data?.name || `مسلسل #${id}`
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
  const embedUrl = useMemo(() => {
    if (!tvId) return ''
    const s = seasonNumber || 1
    const e = playingEpisode || 1
    return getEmbedUrlByIndex('tv', tvId, { season: s, episode: e, serverIndex })
  }, [tvId, seasonNumber, playingEpisode, serverIndex])

  const comments = useQuery({
    queryKey: ['comments', 'tv', tvId],
    queryFn: () => getComments(tvId, 'tv'),
    enabled: Number.isFinite(tvId)
  })
  const { register, handleSubmit, reset } = useForm<{ text: string }>()
  const onAddComment = async (v: { text: string }) => {
    if (!user || !id) return
    try {
      await addComment(user.id, Number(id), 'tv', v.text)
      reset({ text: '' })
      comments.refetch()
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
    <div className="relative space-y-6">
      <Helmet>
        <title>{`${title} | ${t('مسلسل', 'Series')} | cinma.online`}</title>
        <meta name="description" content={(overview || '').slice(0, 160)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={(overview || '').slice(0, 160)} />
        <meta property="og:image" content={series.data?.backdrop_path ? `https://image.tmdb.org/t/p/original${series.data.backdrop_path}` : '/og-image.jpg'} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>
      <SeoHead schema={jsonLdSeries} />
      {backdrop && (
        <div className="pointer-events-none fixed inset-0 -z-10">
          <img src={backdrop} alt={title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/60 to-[#0f0f0f]" />
        </div>
      )}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr_380px]">
        {/* Left: Poster & actions */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
            <div className="aspect-[2/3] w-full bg-zinc-900/40">
              {poster && <img src={poster} alt={title} className="h-full w-full object-cover" />}
            </div>
          </div>
          {user && (
            <button onClick={() => toggleHeart.mutate()} className={`w-full rounded-md px-3 py-2 text-sm ${heart ? 'bg-red-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              {heart ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
            </button>
          )}
        </div>
        {/* Center: Info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <nav className="text-xs text-zinc-400">
              <Link to="/" className="hover:text-white">{t('الرئيسية', 'Home')}</Link>
              <span className="mx-1 text-lg text-zinc-200">›</span>
              <Link to="/series" className="hover:text-white">{t('مسلسلات', 'Series')}</Link>
              {year ? (
                <>
                  <span className="mx-1 text-lg text-zinc-200">›</span>
                  <Link to={`/series/year/${year}`} className="hover:text-white">{year}</Link>
                </>
              ) : null}
              <span className="mx-1 text-lg text-zinc-200">›</span>
              <span className="text-white">{title}</span>
            </nav>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
              {year && (
                <Link to={`/series/year/${year}`} className="rounded-md border border-white/10 bg-white/10 px-2 py-0.5">
                  {year}
                </Link>
              )}
              <span className="mx-1 opacity-50">•</span>
              {runtime && <span>{runtime}</span>}
              <span className="mx-1 opacity-50">•</span>
              {vote != null && <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-yellow-400" /> {vote}</span>}
            </div>
            {!!genres.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {genres.map((g) => (
                  <Link
                    key={g.id}
                    to={`/series/genre/${g.id}`}
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/90 hover:bg-white/20"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}
            <p className="mt-3 text-zinc-200">{overview}</p>
            <div className="mt-3 no-scrollbar flex gap-2 overflow-x-auto">
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
                    className={`rounded-full px-3 py-1 text-sm ${seasonNumber === s.season_number ? 'bg-primary text-white' : 'border border-white/10 bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {t('الموسم', 'S')} {s.season_number}
                  </button>
                ))}
            </div>
          </div>
          {!!cast.length && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <div className="mb-2 text-sm font-semibold text-zinc-200">{t('طاقم العمل', 'Cast & Crew')}</div>
              <div className="no-scrollbar flex gap-3 overflow-x-auto">
                {cast.map((p) => {
                  const img = p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : ''
                  return (
                    <div key={p.id} className="w-24 shrink-0 text-center">
                      <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-zinc-800">
                        {img && <img src={img} alt={p.name} className="h-full w-full object-cover" />}
                      </div>
                      <div className="mt-1 truncate text-xs text-white">{p.name}</div>
                      <div className="truncate text-[10px] text-zinc-400">{p.roles?.[0]?.character || ''}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        {/* Right: Trailer + actions */}
        <div className="space-y-3">
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
              ) : trailerKey ? (
                <ReactPlayer
                  url={`https://www.youtube.com/watch?v=${trailerKey}`}
                  width="100%"
                  height="100%"
                  playing
                  muted
                  controls
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">لا يوجد تريلر</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setServerIndex(0)} className={`rounded-md px-4 h-11 text-xs ${serverIndex === 0 ? 'bg-primary text-white' : 'border border-white/10 bg-white/10 text-white hover:bg-white/20'}`}>vidsrc</button>
            <button onClick={() => setServerIndex(1)} className={`rounded-md px-4 h-11 text-xs ${serverIndex === 1 ? 'bg-primary text-white' : 'border border-white/10 bg-white/10 text-white hover:bg-white/20'}`}>2embed</button>
            <button onClick={() => setServerIndex(2)} className={`rounded-md px-4 h-11 text-xs ${serverIndex === 2 ? 'bg-primary text-white' : 'border border-white/10 bg-white/10 text-white hover:bg-white/20'}`}>embed.su</button>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/watch/${id}?type=tv&season=${seasonNumber || 1}&episode=${playingEpisode || 1}`} className="flex-1 rounded-md bg-gradient-to-r from-primary to-luxury-purple h-11 text-center text-white">
              {t('شاهد الآن', 'Watch Now')}
            </Link>
            <Link to={`/watch/${id}?type=tv&season=${seasonNumber || 1}&episode=1`} className="rounded-md border border-white/10 bg-white/10 px-4 h-11 text-white hover:bg-white/20">
              {t('تحميل', 'Download')}
            </Link>
          </div>
        </div>
      </motion.div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('الحلقات', 'Episodes')}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
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
                    {still && <img src={still} alt={e.name} className="h-full w-full object-cover" />}
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
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('التعليقات', 'Comments')}</h2>
        {user ? (
          <form onSubmit={handleSubmit(onAddComment)} className="grid gap-2">
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
          <div className="text-sm text-zinc-400">سجل الدخول لإضافة تعليق</div>
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
          {comments.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`sk-cm-${i}`} className="rounded-lg border border-zinc-800 p-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
                  <div className="mt-1 h-3 w-1/3 animate-pulse rounded bg-zinc-900" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default SeriesDetails
