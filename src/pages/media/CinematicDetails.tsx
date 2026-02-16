import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { Play, Download, Star, Eye, Heart } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useLang } from '../../state/useLang'
import { tmdb } from '../../lib/tmdb'

type Badge = { label: string; tone?: 'gold' | 'yellow' | 'slate' | 'red' }
type Cast = { id: number; name: string; role?: string; avatar?: string }
type Tech = { director?: string; country?: string; language?: string; releaseDate?: string }
type Similar = { id: number; title: string; thumb?: string; rating?: number }
type Episode = { episode: number; title: string; duration: number; still?: string; watchUrl: string; downloadUrls: string[] }
type Season = { season: number; episodes: Episode[] }
type CinematicData = {
  id: number
  type: 'movie' | 'tv'
  title: string
  poster: string
  backdrop: string
  views: string
  liked: string
  imdb: number
  age: string
  quality: string
  audio: string
  runtime: string
  synopsis: string
  cast: Cast[]
  tech: Tech
  trailer: string
  similar: Similar[]
  seasons?: Season[]
}

const defaultMovieId = 550
const defaultTvId = 1399

const buildImage = (path?: string | null, size: string = 'w500') => (path ? `https://image.tmdb.org/t/p/${size}${path}` : '')

const formatCount = (value: number) => {
  if (!Number.isFinite(value)) return '0'
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return `${Math.round(value)}`
}

const CinematicDetails = () => {
  const { lang } = useLang()
  const { id, type: routeType } = useParams()
  const navigate = useNavigate()
  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)
  const initialType: 'movie' | 'tv' = routeType === 'tv' ? 'tv' : 'movie'
  const initialId = Number(id) || (initialType === 'movie' ? defaultMovieId : defaultTvId)
  const [type, setType] = useState<'movie' | 'tv'>(initialType)
  const [contentId, setContentId] = useState(initialId)
  const [season, setSeason] = useState(1)
  const [hoverPlay, setHoverPlay] = useState(false)
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const nextType: 'movie' | 'tv' = routeType === 'tv' ? 'tv' : 'movie'
    const nextId = Number(id) || (nextType === 'movie' ? defaultMovieId : defaultTvId)
    setType(nextType)
    setContentId(nextId)
  }, [routeType, id])

  const detailsQuery = useQuery({
    queryKey: ['cinematic', type, contentId, lang],
    queryFn: async () => {
      const base = type === 'movie' ? `/movie/${contentId}` : `/tv/${contentId}`
      const [details, credits, videos, similar] = await Promise.all([
        tmdb.get(base),
        tmdb.get(`${base}/credits`),
        tmdb.get(`${base}/videos`),
        tmdb.get(`${base}/similar`)
      ])
      return { details: details.data, credits: credits.data, videos: videos.data, similar: similar.data }
    }
  })

  useEffect(() => {
    const seasons = detailsQuery.data?.details?.seasons || []
    const first = seasons.find((s: any) => s.season_number > 0)?.season_number ?? seasons[0]?.season_number ?? 1
    if (type === 'tv') setSeason(first)
  }, [type, detailsQuery.data?.details?.seasons])

  const seasonQuery = useQuery({
    queryKey: ['cinematic-season', contentId, season, lang],
    queryFn: async () => {
      const { data } = await tmdb.get(`/tv/${contentId}/season/${season}`)
      return data
    },
    enabled: type === 'tv' && !!detailsQuery.data
  })

  const details = detailsQuery.data?.details
  const credits = detailsQuery.data?.credits
  const videos = detailsQuery.data?.videos
  const similar = detailsQuery.data?.similar
  const title = type === 'movie' ? details?.title : details?.name
  const imdb = Number(details?.vote_average || 0)
  const views = formatCount((details?.popularity || 0) * 1000)
  const liked = `${Math.round(imdb * 10)}%`
  const age = details?.adult ? (type === 'movie' ? '18+' : 'TV-MA') : (type === 'movie' ? '13+' : 'TV-14')
  const quality = imdb >= 7.5 ? '4K UHD' : imdb >= 6.5 ? 'HD' : 'SD'
  const audio = imdb >= 7 ? 'Dolby Atmos' : 'Stereo'
  const runtime = type === 'movie'
    ? details?.runtime ? `${details.runtime}m` : '—'
    : details?.episode_run_time?.[0] ? `${details.episode_run_time[0]}m` : '—'
  const synopsis = details?.overview || t('لا يوجد وصف متاح حالياً.', 'No synopsis available yet.')
  const poster = buildImage(details?.poster_path, 'w500')
  const backdrop = buildImage(details?.backdrop_path, 'original')
  const director = type === 'movie'
    ? credits?.crew?.find((c: any) => c.job === 'Director')?.name
    : details?.created_by?.[0]?.name
  const country = type === 'movie' ? details?.production_countries?.[0]?.name : details?.origin_country?.[0]
  const language = details?.original_language?.toUpperCase()
  const releaseDate = type === 'movie' ? details?.release_date : details?.first_air_date
  const cast: Cast[] = (credits?.cast || []).slice(0, 10).map((p: any) => ({
    id: p.id,
    name: p.name,
    role: p.character,
    avatar: p.profile_path ? buildImage(p.profile_path, 'w185') : undefined
  }))
  const trailerCandidate = (videos?.results || []).find((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'))
  const trailer = trailerCandidate ? `https://www.youtube.com/watch?v=${trailerCandidate.key}` : ''
  const similarItems: Similar[] = (similar?.results || []).slice(0, 6).map((s: any) => ({
    id: s.id,
    title: s.title || s.name,
    thumb: s.poster_path ? buildImage(s.poster_path, 'w154') : undefined,
    rating: s.vote_average
  }))

  const seasonButtons = (details?.seasons || []).filter((s: any) => s.season_number > 0)
  const episodeRows: Episode[] = (seasonQuery.data?.episodes || []).map((e: any) => ({
    episode: e.episode_number,
    title: e.name || `${t('حلقة', 'Ep')} ${e.episode_number}`,
    duration: e.runtime || details?.episode_run_time?.[0] || 0,
    still: e.still_path ? buildImage(e.still_path, 'w300') : undefined,
    watchUrl: `/watch/${contentId}?type=tv&season=${season}&episode=${e.episode_number}`,
    downloadUrls: []
  }))

  const data: CinematicData | null = details ? {
    id: contentId,
    type,
    title: title || (type === 'movie' ? t('فيلم غير معروف', 'Unknown Movie') : t('مسلسل غير معروف', 'Unknown Series')),
    poster,
    backdrop,
    views,
    liked,
    imdb,
    age,
    quality,
    audio,
    runtime,
    synopsis,
    cast,
    tech: { director, country, language, releaseDate },
    trailer,
    similar: similarItems,
    seasons: type === 'tv' ? [{ season, episodes: episodeRows }] : undefined
  } : null

  useEffect(() => {
    if (!data?.poster) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = data.poster
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = 8
        c.height = 8
        const ctx = c.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, 8, 8)
        const d = ctx.getImageData(4, 4, 1, 1).data
        const color = `rgb(${d[0]},${d[1]},${d[2]})`
        if (glowRef.current) glowRef.current.style.setProperty('--glow', color)
      } catch {}
    }
  }, [data?.poster])

  if (detailsQuery.isLoading || !data) {
    return (
      <div className="min-h-[100svh] bg-[#050505] px-4 py-16 text-white">
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
          {t('جارٍ تحميل التفاصيل السينمائية...', 'Loading cinematic details...')}
        </div>
      </div>
    )
  }

  const badges: Badge[] = [
    { label: data.quality, tone: 'gold' },
    { label: `IMDb ${data.imdb.toFixed(1)}`, tone: 'yellow' },
    { label: data.audio, tone: 'slate' },
    { label: data.age, tone: 'red' }
  ]
  const canonicalUrl = typeof window !== 'undefined' ? `${location.origin}${location.pathname}` : ''
  const metaDescription = data.synopsis.slice(0, 160)

  return (
    <div className="relative min-h-[100svh]">
      <Helmet>
        <title>{`${data.title} | ${type === 'movie' ? t('فيلم', 'Movie') : t('مسلسل', 'Series')} | cinma.online`}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={data.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={data.backdrop || data.poster || '/og-image.jpg'} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>
      <AnimatePresence>
        <motion.div
          key={data.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="pointer-events-none fixed inset-0 -z-10"
        >
          {data.backdrop && <img src={data.backdrop} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.7)_60%,#0f0f0f_100%)]" />
        </motion.div>
      </AnimatePresence>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => {
              setType('movie')
              navigate(`/cinematic/movie/${defaultMovieId}`)
            }}
            className={`rounded-full px-4 h-11 text-sm ${type === 'movie' ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {t('فيلم', 'Movie')}
          </button>
          <button
            onClick={() => {
              setType('tv')
              navigate(`/cinematic/tv/${defaultTvId}`)
            }}
            className={`rounded-full px-4 h-11 text-sm ${type === 'tv' ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {t('مسلسل', 'Series')}
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[25%_45%_30%]">
            <div ref={glowRef} className="space-y-3 [--glow:#ff3b3b]">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-2xl ring-1 ring-[var(--glow)]/30">
                <div className="aspect-[2/3] w-full">
                  {data.poster ? <img src={data.poster} alt={data.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div className="pointer-events-none absolute inset-0 shadow-[0_0_60px_0_var(--glow)]" />
              </div>
              <button
                onClick={() => {
                  if (type === 'movie') navigate(`/watch/${contentId}`)
                  else navigate(`/watch/${contentId}?type=tv&season=${season}&episode=1`)
                }}
                className="group w-full rounded-xl bg-gradient-to-r from-primary to-luxury-purple px-5 h-11 text-lg font-semibold text-white shadow-lg ring-1 ring-white/10 hover:brightness-110"
              >
                <span className="inline-flex items-center gap-2"><Play className="h-5 w-5" /> {type === 'movie' ? t('شاهد الفيلم', 'Watch Movie') : t('شاهد المسلسل', 'Watch Series')}</span>
              </button>
              <button className="w-full rounded-xl border border-white/15 bg-white/10 px-5 h-11 text-white backdrop-blur hover:bg-white/20">
                <span className="inline-flex items-center gap-2"><Download className="h-5 w-5" /> {t('تحميل', 'Download')}</span>
              </button>
              <div className="rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white/90">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> {data.views} {t('مشاهدة', 'Views')}</span>
                  <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4 text-rose-400" /> {data.liked} {t('إعجاب', 'Liked')}</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">{data.title}</h1>
              <div className="flex flex-wrap gap-2">
                {badges.map((b, i) => {
                  const cls =
                    b.tone === 'gold'
                      ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-200'
                      : b.tone === 'yellow'
                      ? 'bg-yellow-500 text-black'
                      : b.tone === 'red'
                      ? 'bg-red-600 text-white'
                      : 'border-white/20 bg-white/10 text-white'
                  return (
                    <span key={`${b.label}-${i}`} className={`rounded-full border px-3 py-1 text-xs ${cls}`}>
                      {b.label}
                    </span>
                  )
                })}
              </div>
              <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/90">{data.synopsis}</p>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-sm font-semibold text-white/90">{t('طاقم العمل', 'Cast & Crew')}</div>
                <div className="no-scrollbar flex gap-3 overflow-x-auto">
                  {data.cast.map((p) => (
                    <div key={p.id} className="w-24 shrink-0 text-center">
                      <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-zinc-800">
                        {p.avatar ? <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="mt-1 truncate text-xs text-white">{p.name}</div>
                      <div className="truncate text-[10px] text-zinc-400">{p.role || ''}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-sm font-semibold text-white/90">{t('معلومات تقنية', 'Tech Specs')}</div>
                <div className="grid grid-cols-2 gap-2 text-sm text-white/90">
                  <div className="rounded border border-white/10 bg-white/5 p-2">{t('المخرج', 'Director')}: <span className="font-medium">{data.tech.director || '—'}</span></div>
                  <div className="rounded border border-white/10 bg-white/5 p-2">{t('البلد', 'Country')}: <span className="font-medium">{data.tech.country || '—'}</span></div>
                  <div className="rounded border border-white/10 bg-white/5 p-2">{t('اللغة', 'Language')}: <span className="font-medium">{data.tech.language || '—'}</span></div>
                  <div className="rounded border border-white/10 bg-white/5 p-2">{t('تاريخ الإصدار', 'Release Date')}: <span className="font-medium">{data.tech.releaseDate || '—'}</span></div>
                </div>
              </div>
              {type === 'tv' && (
                <div className="space-y-4">
                  <div className="no-scrollbar flex gap-2 overflow-x-auto">
                    {seasonButtons.map((s: any) => (
                      <button key={s.season_number} onClick={() => setSeason(s.season_number)} className={`rounded-full px-4 h-11 text-sm ${season === s.season_number ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                        {t('الموسم', 'Season')} {s.season_number}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {(data.seasons?.[0]?.episodes || []).map((e) => (
                      <button
                        key={e.episode}
                        onClick={() => navigate(e.watchUrl)}
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 text-left ring-1 ring-transparent transition duration-200 hover:scale-[1.01] hover:ring-white/20"
                      >
                        <div className="aspect-video w-full bg-zinc-900">
                          {e.still && <img src={e.still} alt={e.title} className="h-full w-full object-cover" />}
                        </div>
                        <div className="p-3">
                          <div className="truncate text-sm font-semibold text-white">{t('حلقة', 'Ep')} {e.episode}: {e.title}</div>
                          <div className="text-xs text-zinc-400">{e.duration ? `${e.duration}m` : '—'}</div>
                        </div>
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                          <div className="rounded-full bg-black/60 p-3 text-white shadow-lg"><Play className="h-5 w-5" /></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div onMouseEnter={() => setHoverPlay(true)} onMouseLeave={() => setHoverPlay(false)} className="overflow-hidden rounded-xl border border-white/10 bg-black/60 p-2">
                <div className="aspect-video w-full overflow-hidden rounded-md">
                  {data.trailer ? (
                    <ReactPlayer
                      url={data.trailer}
                      width="100%"
                      height="100%"
                      muted
                      playing={hoverPlay}
                      controls={false}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                      {t('لا يوجد عرض متاح', 'No trailer available')}
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 text-sm font-semibold text-white/90">{t('أعمال مشابهة', 'Similar')}</div>
                <div className="space-y-2">
                  {data.similar.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2 hover:bg-white/10">
                      <div className="h-14 w-10 overflow-hidden rounded bg-zinc-800">
                        {s.thumb && <img src={s.thumb} alt={s.title} className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-white">{s.title}</div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-yellow-300"><Star className="h-4 w-4" /> {s.rating ? s.rating.toFixed(1) : '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default CinematicDetails
