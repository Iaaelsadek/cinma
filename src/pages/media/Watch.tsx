import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { addHistory, getProgress, supabase, upsertProgress } from '../../lib/supabase'
import { AdsManager } from '../../components/features/system/AdsManager'
import { tmdb } from '../../lib/tmdb'
import { SeoHead } from '../../components/common/SeoHead'
import { Calendar, Clock, Star } from 'lucide-react'
import { ShareButton } from '../../components/common/ShareButton'
import { NotFound } from '../NotFound'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { SubtitleManager } from '../../components/features/media/SubtitleManager'
import { useServers } from '../../hooks/useServers'
import { errorLogger } from '../../services/errorLogging'
import { EmbedPlayer } from '../../components/features/media/EmbedPlayer'
import { ServerSelector } from '../../components/features/media/ServerSelector'
import { EpisodeSelector } from '../../components/features/media/EpisodeSelector'

type DownloadLink = { label?: string; url: string }

type TmdbCastMember = {
  id: number
  name: string
  profile_path?: string | null
}

type TmdbCrewMember = {
    id: number
    name: string
    job: string
  }
  
  type TmdbDetails = {
    title?: string
    name?: string
    original_language?: string
    release_date?: string
    first_air_date?: string
    runtime?: number
    episode_run_time?: number[]
    vote_average?: number
    vote_count?: number
    genres?: Array<{ id: number; name: string }>
    overview?: string
    poster_path?: string | null
    backdrop_path?: string | null
    credits?: { cast?: TmdbCastMember[]; crew?: TmdbCrewMember[] }
    videos?: { results: Array<{ key: string; type: string; site: string }> }
    external_ids?: { imdb_id?: string }
    seasons?: Array<{ season_number: number; episode_count: number; name: string }>
  }

export const Watch = () => {
  const { type: typeParam, id: idParam, slug } = useParams()
  const [sp, setSp] = useSearchParams()
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  
  const [season, setSeason] = useState(Math.max(1, Number(sp.get('season')) || 1))
  const [episode, setEpisode] = useState(Math.max(1, Number(sp.get('episode')) || 1))
  const { user } = useAuth()
  const [elapsed, setElapsed] = useState(0)
  const [showPreroll, setShowPreroll] = useState(true)
  
  // Normalize type param (movies -> movie, series -> tv)
  const rawType = typeParam || sp.get('type') || 'movie'
  let type = rawType
  if (type === 'series' || type === 'anime') type = 'tv'
  if (type === 'movies' || type === 'plays') type = 'movie'

  const [details, setDetails] = useState<TmdbDetails | null>(null)
  const [downloads, setDownloads] = useState<DownloadLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [cinemaMode, setCinemaMode] = useState(false)

  // Determine effective ID
  const id = resolvedId || idParam

  // Hook 0: Resolve Slug to ID
  useEffect(() => {
    if (idParam) return // Already have ID
    if (!slug) return

    const resolveSlug = async () => {
      setLoading(true)
      try {
        // Try to extract ID from slug (e.g. "title-12345")
        const parts = slug.split('-')
        const potentialId = parts[parts.length - 1]
        if (/^\d+$/.test(potentialId)) {
          setResolvedId(potentialId)
          return
        }

        // If no ID in slug, search TMDB
        const query = slug.replace(/-/g, ' ')
        const { data } = await tmdb.get(`/search/${type}`, {
          params: { query, page: 1 }
        })
        
        if (data.results?.[0]?.id) {
          setResolvedId(String(data.results[0].id))
        } else {
          setError(true)
          setLoading(false)
        }
      } catch (e) {
        setError(true)
        setLoading(false)
      }
    }

    resolveSlug()
  }, [slug, idParam, type])

  // Hook 1: Sync URL params
  useEffect(() => {
    const p = new URLSearchParams(sp)
    if (type === 'tv') {
      p.set('season', String(season))
      p.set('episode', String(episode))
      p.set('type', 'tv')
    } else {
      p.delete('season')
      p.delete('episode')
      p.delete('type')
    }
    setSp(p, { replace: true })
  }, [season, episode, type, setSp])

  // Hook 2: Fetch Details
  useEffect(() => {
    // If using slug and not yet resolved, wait
    if (slug && !id) return

    let mounted = true
    setLoading(true)
    setError(false)
    ;(async () => {
      if (!id) {
        setError(true)
        setLoading(false)
        return
      }
      try {
        if (type === 'movie') {
          const { data: row } = await supabase.from('movies').select('download_urls').eq('id', Number(id)).maybeSingle()
          if (mounted && row?.download_urls) setDownloads(row.download_urls as DownloadLink[])
        }
      } catch (err) {
        errorLogger.logError({
          message: 'Failed to fetch download links',
          severity: 'low',
          category: 'media',
          context: { error: err, id, type }
        })
      }
      try {
        const path = type === 'movie' ? `/movie/${id}` : `/tv/${id}`
        const { data } = await tmdb.get(path, { params: { append_to_response: 'credits,videos,external_ids' } })
        if (mounted) setDetails(data)
      } catch (e) {
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id, type, slug])

  // Hook 3: Progress Tracking (Moved UP before early returns)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    let mounted = true
    
    // Initial fetch
    ;(async () => {
      if (!id) return
      
      if (user) {
        const p = await getProgress(user.id, Number(id), (type === 'movie' ? 'movie' : 'tv'))
        if (!mounted) return
        if (p?.progress_seconds) setElapsed(p.progress_seconds)
      } else {
        // Guest: Read from local storage
        try {
          const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}')
          const key = `${type}_${id}${type === 'tv' ? `_${season}_${episode}` : ''}`
          if (guestProgress[key]) {
            setElapsed(guestProgress[key].progress)
          }
        } catch {}
      }
    })()

    // Interval save
    timer = setInterval(() => {
      if (!id) return
      setElapsed((e) => {
        const next = e + 10
        
        if (user) {
          upsertProgress({
            userId: user.id,
            contentId: Number(id),
            contentType: type === 'movie' ? 'movie' : 'tv',
            season: type === 'tv' ? season : null,
            episode: type === 'tv' ? episode : null,
            progressSeconds: next
          }).catch(() => {})
        } else {
          // Guest: Save to local storage
          try {
            const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}')
            const key = `${type}_${id}${type === 'tv' ? `_${season}_${episode}` : ''}`
            guestProgress[key] = {
              contentId: Number(id),
              contentType: type,
              season: type === 'tv' ? season : null,
              episode: type === 'tv' ? episode : null,
              progress: next,
              updatedAt: Date.now()
            }
            localStorage.setItem('guest_progress', JSON.stringify(guestProgress))
          } catch {}
        }
        return next
      })
    }, 10000)

    const onUnload = async () => {
      if (!id) return
      if (user) {
        try {
          await upsertProgress({
            userId: user.id,
            contentId: Number(id),
            contentType: type === 'movie' ? 'movie' : 'tv',
            season: type === 'tv' ? season : null,
            episode: type === 'tv' ? episode : null,
            progressSeconds: elapsed
          })
          await addHistory({
            userId: user.id,
            contentId: Number(id),
            contentType: type === 'movie' ? 'movie' : 'tv',
            season: type === 'tv' ? season : null,
            episode: type === 'tv' ? episode : null
          })
        } catch (err) {
          errorLogger.logError({
            message: 'Failed to save history on unload',
            severity: 'low',
            category: 'user_action',
            context: { error: err, userId: user.id, contentId: id }
          })
        }
      }
    }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      mounted = false
      clearInterval(timer)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [user, id, type, season, episode])

  // Hook 4: Memos (Moved UP before early returns)
  const title = useMemo(() => {
    return details?.title || details?.name || (type === 'movie' ? `فيلم #${id}` : `مسلسل #${id}`)
  }, [details, type, id])
  
  const year = useMemo(() => {
    const d = type === 'movie' ? details?.release_date : details?.first_air_date
    return d ? new Date(d).getFullYear() : null
  }, [details, type])
  
  const runtimeMin: number | null = useMemo(() => {
    if (type === 'movie' && typeof details?.runtime === 'number') return details.runtime
    if (type === 'tv' && Array.isArray(details?.episode_run_time) && details.episode_run_time[0]) return details.episode_run_time[0]
    return null
  }, [details, type])
  
  const rating = useMemo(() => {
    return typeof details?.vote_average === 'number' ? Math.round(details.vote_average * 10) / 10 : null
  }, [details])
  
  const genres = useMemo<Array<{ id: number; name: string }>>(() => details?.genres || [], [details])
  const overview = useMemo(() => details?.overview || 'لا يوجد وصف متاح', [details])
  const poster = useMemo(() => (details?.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : ''), [details])
  const backdrop = useMemo(() => (details?.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : ''), [details])
  const cast = useMemo(() => (details?.credits?.cast || []).slice(0, 16), [details])
  
  const dlList = useMemo<DownloadLink[]>(() => (
    downloads.length
      ? downloads
      : [
          { label: 'Download 1080p', url: `https://files.cinma.online/${type}/${id}/1080p.mp4` },
          { label: 'Download 720p', url: `https://files.cinma.online/${type}/${id}/720p.mp4` }
        ]
  ), [downloads, id, type])

  const trailer = useMemo(() => {
    return details?.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube')?.key
  }, [details])

  const jsonLdWatch = useMemo(() => {
    if (!details) return undefined
    return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: title,
      description: overview.slice(0, 200),
      thumbnailUrl: [backdrop, poster].filter(Boolean),
      uploadDate: (type === 'movie' ? details.release_date : details.first_air_date) || new Date().toISOString(),
      duration: runtimeMin ? `PT${runtimeMin}M` : undefined,
      aggregateRating: rating ? {
        '@type': 'AggregateRating',
        ratingValue: rating,
        ratingCount: details.vote_count || 100,
        bestRating: '10',
        worstRating: '1'
      } : undefined
    }
  }, [details, title, overview, backdrop, poster, type, runtimeMin, rating])

  // New Server Hook
  const { servers, active, setActive, loading: serversLoading, reportBroken, reporting } = useServers(
    Number(id), 
    type as 'movie' | 'tv', 
    season, 
    episode
  )

  // Early Returns (Now safe because all hooks are declared above)
  if (error) return <NotFound />
  if (loading && !details) return <div className="min-h-screen bg-[#0f0f0f] p-8"><SkeletonGrid count={1} variant="video" /></div>

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <SeoHead
        title={`${title} | ${type === 'movie' ? 'Movie' : 'Series'}`}
        description={overview || ''}
        image={backdrop || poster || undefined}
        type={type === 'movie' ? 'video.movie' : 'video.tv_show'}
        schema={jsonLdWatch}
      />
      
      {/* Cinema Mode Overlay */}
      {cinemaMode && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 transition-all duration-700 backdrop-blur-sm"
          onClick={() => setCinemaMode(false)}
        />
      )}

      <div className="relative">
        {backdrop ? (
          <>
            <img src={backdrop} alt={title} className="absolute inset-0 h-[35vh] w-full object-cover object-center opacity-60" loading="lazy" />
            <div className="absolute inset-0 h-[35vh] bg-gradient-to-b from-black/40 via-[#0f0f0f]/60 to-[#0f0f0f]" />
          </>
        ) : (
          <div className="absolute inset-0 h-[25vh] bg-[#1a1a1a]" />
        )}
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-20 pb-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_240px]">
            <div className="order-2 md:order-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-4" dir="auto">{title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-300">
                {year && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={14} className="text-[#f5c518]" /> {year}
                  </span>
                )}
                {runtimeMin != null && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={14} className="text-[#f5c518]" /> {Math.floor(runtimeMin / 60)}س {runtimeMin % 60}د
                  </span>
                )}
                {!!genres.length && (
                  <span className="inline-flex items-center gap-1">
                    {genres.slice(0, 2).map((g) => g.name).join(' • ')}
                  </span>
                )}
                {rating != null && (
                  <span className="inline-flex items-center gap-1">
                    <Star size={14} className="text-[#f5c518] fill-[#f5c518]" /> {rating}
                  </span>
                )}
              </div>
              <p className="mt-2 max-w-2xl text-sm text-zinc-300 line-clamp-3">{overview}</p>
              {details?.credits?.crew?.find((c) => c.job === 'Director') && (
                <div className="mt-1 text-xs text-zinc-400">
                  <span className="text-zinc-500">المخرج: </span>
                  <span className="text-white">{details.credits.crew.find((c) => c.job === 'Director')?.name}</span>
                </div>
              )}
              {!!cast.length && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-zinc-200 mb-2">طاقم العمل</div>
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {cast.map((p) => {
                      const img = p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : ''
                      return (
                        <div key={p.id} className="flex flex-col items-center text-center group">
                          <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-zinc-800 transition-transform duration-300 group-hover:scale-110 group-hover:border-primary/50">
                            {img && <img src={img} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                          </div>
                          <div className="mt-1 truncate w-full text-[9px] font-bold text-zinc-200 group-hover:text-primary transition-colors">{p.name}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <ShareButton title={title} text={overview?.slice(0, 100)} />
                <a href="#player" className="rounded-xl bg-[#e50914] px-5 h-9 flex items-center justify-center text-white text-xs font-bold shadow-md hover:brightness-110">
                  مشاهدة الآن
                </a>
                <a href="#downloads" className="rounded-xl bg-emerald-600 px-5 h-9 flex items-center justify-center text-white text-xs font-bold shadow-md hover:brightness-110">
                  تحميل الآن
                </a>
                <Link to={type === 'movie' ? `/movie/${id}` : `/series/${id}`} className="rounded-xl border border-white/10 bg-white/10 px-5 h-9 flex items-center justify-center text-white text-xs">
                  صفحة التفاصيل
                </Link>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl ${trailer ? 'aspect-video' : 'aspect-[2/3]'}`}>
                <div className="h-full w-full bg-[#1a1a1a]">
                  {trailer ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${trailer}?autoplay=1&mute=1&loop=1&playlist=${trailer}&controls=0&showinfo=0&modestbranding=1`}
                      className="h-full w-full pointer-events-none scale-110"
                      allow="autoplay; encrypted-media"
                      title="Trailer"
                    />
                  ) : (
                    poster && <img src={poster} alt={title} className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                {!trailer && (
                  <div className="absolute top-3 left-3 rounded-md bg-black/80 px-2 py-1 text-xs font-bold text-[#f5c518] border border-white/10">
                    WEB-DL 1080p
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        
        {/* NEW LAYOUT: Grid with Side Panel */}
        <section id="player" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Video Player */}
            <div className="order-2 lg:order-2 space-y-6">
                <div className="relative w-full">
                    {showPreroll ? (
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                        <AdsManager type="preroll" position="player" onDone={() => setShowPreroll(false)} />
                    </div>
                    ) : (
                    <EmbedPlayer
                        server={servers[active]}
                        cinemaMode={cinemaMode}
                        toggleCinemaMode={() => setCinemaMode(!cinemaMode)}
                        loading={serversLoading}
                        onNextServer={() => active < servers.length - 1 ? setActive(active + 1) : setActive(0)}
                        onReport={reportBroken}
                        reporting={reporting}
                    />
                    )}
                </div>

                {type === 'movie' && (
                    <div className="mt-4">
                    <SubtitleManager
                        tmdbId={id || ''}
                        imdbId={details?.external_ids?.imdb_id}
                        title={details?.title || details?.name}
                    />
                    </div>
                )}

                <div className="flex justify-center mt-4">
                    <div className="flex items-center gap-3 rounded-full border border-red-500/20 bg-red-500/10 px-6 py-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-bold text-red-200">
                        Server Error? Try Server 2 (مشكلة في التشغيل؟ جرب سيرفر آخر)
                    </span>
                    </div>
                </div>
            </div>

            {/* Right Column: Sidebar (Seasons, Episodes, Servers) */}
            <div className="order-1 lg:order-1 space-y-6">
                {/* Episodes Selector (TV Only) */}
                {type === 'tv' && (
                    <EpisodeSelector 
                        season={season}
                        episode={episode}
                        setSeason={setSeason}
                        setEpisode={setEpisode}
                        seasonsCount={details?.seasons?.length}
                        episodesCount={details?.seasons?.find(s => s.season_number === season)?.episode_count}
                    />
                )}

                {/* Server Selector */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                    <ServerSelector 
                        servers={servers}
                        active={active}
                        onSelect={setActive}
                    />
                </div>
            </div>

        </section>

        <section id="downloads" className="space-y-3">
          <h2 className="text-lg font-bold text-white">سيرفرات التحميل</h2>
          <div className="flex flex-wrap gap-3">
            {dlList.map((d, i) => (
              <a
                key={`${d.url}-${i}`}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-[#1a1a1a] px-4 h-11 flex items-center text-sm text-[#f5c518] hover:bg-zinc-900"
              >
                {d.label || `Download ${i + 1}`}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
