import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, FreeMode } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/free-mode'
import { Link, useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase, grantAchievement } from '../../lib/supabase'
import { AdsManager } from '../../components/features/system/AdsManager'
import { tmdb } from '../../lib/tmdb'
import { MovieCard } from '../../components/features/media/MovieCard'
import { SeoHead } from '../../components/common/SeoHead'
import { generateMovieKeywords, generateSeriesKeywords } from '../../lib/seo-keywords'
import { translateGenre } from '../../lib/genre-translations'
import { AlertTriangle, Heart, Layers, ChevronLeft, ChevronRight, Calendar, Clock, Star, Sparkles, Play, Users } from 'lucide-react'
import { ShareButton } from '../../components/common/ShareButton'
import { NotFound } from '../NotFound'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { useServers } from '../../hooks/useServers'
import { useWatchProgress } from '../../hooks/useWatchProgress'
import { useTripleTitles } from '../../hooks/useTripleTitles'
import { getSeasons } from '../../services/contentAPI'

import { EmbedPlayer } from '../../components/features/media/EmbedPlayer'
import { EpisodeSelector } from '../../components/features/media/EpisodeSelector'

import { toast } from '../../lib/toast-manager'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { logger } from '../../lib/logger'

import { generateWatchUrl } from '../../lib/utils'
import { detectLegacyUrl, generateRedirectUrl } from '../../lib/url-utils'

type TmdbCastMember = {
  id: number | string
  name: string
  name_ar?: string | null
  profile_path?: string | null
  profile_url?: string | null
  slug?: string
  character_name?: string
}

type TmdbCrewMember = {
  id: number
  name: string
  job: string
}

type TmdbDetails = {
  title?: string
  title_ar?: string
  title_en?: string
  original_title?: string
  name?: string
  name_ar?: string
  name_en?: string
  original_name?: string
  original_language?: string
  release_date?: string
  first_air_date?: string
  runtime?: number
  episode_run_time?: number[]
  vote_average?: number
  vote_count?: number
  genres?: Array<{ id: number; name: string }>
  overview?: string
  overview_ar?: string
  overview_en?: string
  poster_path?: string | null
  backdrop_path?: string | null
  credits?: { cast?: TmdbCastMember[]; crew?: TmdbCrewMember[] }
  videos?: { results: Array<{ key: string; type: string; site: string }> }
  external_ids?: { imdb_id?: string }
  external_id?: string // TMDB ID from CockroachDB
  external_source?: string // Source (e.g., 'TMDB')
  seasons?: Array<{ season_number: number; episode_count: number; name: string }>
  slug?: string
}

export const Watch = () => {
  const { type: typeParam, id: idParam, slug: slugParam, s, e, lang: langParam } = useParams()
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  // Update initial logic to prioritize slug, but fall back to ID if necessary
  const { initialType, initialId, initialSlug, initialSeason, initialEpisode, lang } = useMemo(() => {
    let t = typeParam || 'movie'
    if (t === 'series' || t === 'anime') t = 'tv'
    if (t === 'movies' || t === 'plays') t = 'movie'
    if (t === 'games') t = 'game'
    // Keep 'video' type as-is for YouTube videos
    if (t === 'video') t = 'video'

    // CRITICAL FIX: Movies should NEVER have season/episode
    const isEpisodicType = t === 'tv' || t === 'anime' || t === 'series'

    return {
      initialType: t,
      initialId: idParam || null,
      initialSlug: slugParam || null,
      // Only set season/episode for episodic content (TV shows)
      initialSeason: isEpisodicType && s ? (typeof s === 'string' && s.startsWith('s') ? Number(s.slice(1)) : Number(s)) : null,
      initialEpisode: isEpisodicType && e ? (typeof e === 'string' && e.startsWith('ep') ? Number(e.slice(2)) : Number(e)) : null,
      lang: (langParam === 'ar' || langParam === 'en') ? langParam : 'ar'
    }
  }, [typeParam, idParam, slugParam, s, e, langParam])



  // Handle legacy URLs with IDs embedded in slugs
  useEffect(() => {
    if (!initialSlug || initialId) return

    // Skip legacy detection for games (games don't have legacy URLs)
    if (initialType === 'game') return

    const handleLegacyUrl = async () => {
      const detection = detectLegacyUrl(initialSlug)

      if (!detection.isLegacy || !detection.id) {
        return // Not a legacy URL
      }

      logger.info(`Legacy URL detected: ${initialSlug} -> ID: ${detection.id}`)

      try {
        // Generate clean redirect URL
        const cleanUrl = await generateRedirectUrl(
          detection.id,
          initialType as 'movie' | 'tv',
          initialSeason || undefined,
          initialEpisode || undefined
        )

        if (cleanUrl) {
          logger.info(`Redirecting to clean URL: ${cleanUrl}`)
          const location = window.location
          navigate(`${cleanUrl}${location.search}${location.hash}`, { replace: true })
        }
      } catch (err: any) {
        // Silently fail - no error logging
      }
    }

    handleLegacyUrl()
  }, [initialSlug, initialId, initialType, initialSeason, initialEpisode, navigate])



  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  const type = initialType
  const id = initialId
  const slug = initialSlug

  // CRITICAL FIX: Movies should NOT have season/episode
  const isEpisodic = type === 'tv' || type === 'anime' || type === 'series'

  const sNum = useMemo(() => {
    // CRITICAL: Only return season number for episodic content
    if (!isEpisodic) return null
    if (initialSeason) return initialSeason
    if (!s) return null
    if (s.toString().startsWith('s')) return Number(s.toString().slice(1))
    return Number(s)
  }, [initialSeason, s, isEpisodic])

  const eNum = useMemo(() => {
    // CRITICAL: Only return episode number for episodic content
    if (!isEpisodic) return null
    if (initialEpisode) return initialEpisode
    if (!e) return null
    if (e.toString().startsWith('ep')) return Number(e.toString().slice(2))
    return Number(e)
  }, [initialEpisode, e, isEpisodic])

  const [season, setSeason] = useState(isEpisodic ? Math.max(1, sNum || 1) : undefined)
  const [episode, setEpisode] = useState(isEpisodic ? Math.max(1, eNum || 1) : undefined)

  useEffect(() => {
    if (isEpisodic) {
      if (sNum) setSeason(sNum)
      if (eNum) setEpisode(eNum)
    }
  }, [sNum, eNum, isEpisodic])

  const navigateRef = useRef(navigate)
  useEffect(() => { navigateRef.current = navigate }, [navigate])

  const handleSeasonChange = useCallback((newSeason: number) => {
    if (type === 'tv' && (slug || id)) {
      const watchUrl = generateWatchUrl(
        { id: id || slug || '', slug: slug || id || '', media_type: 'tv' },
        newSeason,
        1
      )
      navigateRef.current(watchUrl, { replace: true })
    }
  }, [type, slug]) // Fixed: removed 'id' to keep stable

  const handleEpisodeChange = useCallback((newEpisode: number) => {
    if (type === 'tv' && (slug || id)) {
      const watchUrl = generateWatchUrl(
        { id: id || slug || '', slug: slug || id || '', media_type: 'tv' },
        season,
        newEpisode
      )
      navigateRef.current(watchUrl, { replace: true })
    }
  }, [type, slug, season]) // Fixed: removed 'id' to keep stable

  const { elapsed } = useWatchProgress({
    user,
    id: id || null,
    type,
    // CRITICAL: Only pass season/episode for episodic content (TV shows)
    // Movies should NEVER have season/episode parameters
    season: isEpisodic ? season : undefined,
    episode: isEpisodic ? episode : undefined
  })
  const [showPreroll, setShowPreroll] = useState(true)
  const [details, setDetails] = useState<TmdbDetails | null>(null)
  const [seasons, setSeasons] = useState<any[]>([])
  const tripleTitles = useTripleTitles(details as TmdbDetails)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fetchError, setFetchError] = useState<boolean>(false)
  const [cinemaMode, setCinemaMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])



  // Fetch content from backend API using slug or id
  useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    let mounted = true
    setLoading(true)
    setError(false)
    setFetchError(false)
      ; (async () => {
        // CRITICAL: Only accept slug, reject ID-only requests
        if (!slug) {
          setError(true)
          setFetchError(true)
          setLoading(false)
          return
        }

        const identifier = slug

        try {
          // Special handling for YouTube videos (type=video)
          if (type === 'video') {
            // Fetch from backend API endpoint (which will query Supabase temporarily)
            // TODO: Move videos table to CockroachDB
            const response = await fetch(`/api/videos/${identifier}`, { signal })

            if (!response.ok) {
              throw new Error('Video not found')
            }

            const videoData = await response.json()

            // Map video data to details format
            const mappedData = {
              title: videoData.title,
              name: videoData.title,
              overview: videoData.description || '',
              poster_path: videoData.thumbnail,
              backdrop_path: videoData.thumbnail,
              release_date: videoData.created_at,
              vote_average: 8.5,
              external_id: videoData.id,
              external_source: 'youtube',
              videos: {
                results: [{
                  key: videoData.id,
                  type: 'Trailer',
                  site: 'YouTube'
                }]
              }
            }

            if (mounted && !signal.aborted) {
              setDetails(mappedData)
              setLoading(false)
            }
            return
          }

          // Fetch from backend API using slug or id (for movies/tv)
          const apiPath = type === 'movie'
            ? `/api/movies/${identifier}`
            : `/api/tv/${identifier}`
          const response = await fetch(apiPath, { signal })

          if (!response.ok) {
            throw new Error(`Failed to fetch ${type}`)
          }

          const data = await response.json()

          if (mounted && !signal.aborted) {
            setDetails(data)
            setLoading(false)
          }
        } catch (e: any) {
          if (signal.aborted) return
          // Silently handle missing content - show error UI without console logging
          if (mounted) {
            setError(true)
            setFetchError(true)
            setLoading(false)
          }
        }
      })()
    return () => {
      mounted = false
      controller.abort()
    }
  }, [type, slug]) // Fixed: removed 'id' to keep array size stable

  // Fetch seasons for TV series from CockroachDB API
  useEffect(() => {
    if (type === 'tv' && slug) {
      getSeasons(slug)
        .then(data => {
          setSeasons(data)
        })
        .catch(err => {
          console.error('❌ Failed to fetch seasons:', err)
          setSeasons([])
        })
    } else {
      setSeasons([])
    }
  }, [type, slug])

  const title = useMemo(() => {
    if (tripleTitles.primary) return tripleTitles.primary
    return details?.title || details?.name || (type === 'movie' ? 'فيلم' : 'مسلسل')
  }, [details, type, tripleTitles]) // Fixed: removed 'id'

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

  const overview = useMemo(() => {
    // overview_ar = Arabic translation (from DB or auto-translated)
    // overview = Original overview (usually English from TMDB)
    const arOverview = details?.overview_ar
    const enOverview = details?.overview_en || details?.overview

    if (lang === 'ar') {
      return arOverview || enOverview || 'لا يوجد وصف متاح'
    }
    return enOverview || arOverview || 'No description available'
  }, [details, lang])

  const poster = useMemo(() => (details?.poster_path ? `https://image.tmdb.org/t/p/w300${details.poster_path}` : ''), [details])
  const backdrop = useMemo(() => (details?.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : ''), [details])

  // Fetch cast from our API instead of TMDB
  const [cast, setCast] = useState<TmdbCastMember[]>([])
  const [keywords, setKeywords] = useState<Array<{ id: string | number; name: string }>>([])
  const [crew, setCrew] = useState<Array<{ id: number; name: string; job: string; department: string }>>([])

  // Generate SEO keywords
  const seoKeywords = useMemo(() => {
    if (!details) return []

    if (type === 'movie') {
      return generateMovieKeywords({
        title: details.title,
        title_ar: details.title_ar,
        title_en: details.title_en,
        original_title: details.original_title,
        release_date: details.release_date,
        genres: details.genres,
        cast: cast
      })
    } else {
      return generateSeriesKeywords({
        name: details.name,
        name_ar: details.name_ar,
        name_en: details.name_en,
        original_name: details.original_name,
        first_air_date: details.first_air_date,
        genres: details.genres
      }, season, episode)
    }
  }, [details, type, season, episode, cast])

  useEffect(() => {
    let mounted = true

    const fetchCast = async () => {
      if (!slug || type === 'video') return

      try {
        const apiPath = type === 'movie'
          ? `/api/movies/${slug}/cast?limit=8`
          : `/api/tv/${slug}/cast?limit=8`

        const response = await fetch(apiPath)

        if (!response.ok) {
          // Silently fail - no error logging for missing content
          if (mounted) setCast([])
          return
        }

        const data = await response.json()

        if (mounted) {
          setCast(data.data || [])
        }
      } catch (e: any) {
        // Silently fail - no error logging
        if (mounted) setCast([])
      }
    }

    if (slug) {
      fetchCast()
    }

    return () => { mounted = false }
  }, [slug, type])

  // Fetch keywords
  useEffect(() => {
    let mounted = true

    const fetchKeywords = async () => {
      if (!slug || type === 'video') return

      try {
        const apiPath = type === 'movie'
          ? `/api/movies/${slug}/keywords`
          : `/api/tv/${slug}/keywords`

        const response = await fetch(apiPath)

        if (!response.ok) {
          // Silently fail - no error logging for missing content
          if (mounted) setKeywords([])
          return
        }

        const data = await response.json()

        if (mounted) {
          setKeywords(data.data || [])
        }
      } catch (e: any) {
        // Silently fail - no error logging
        if (mounted) setKeywords([])
      }
    }

    if (slug) {
      fetchKeywords()
    }

    return () => { mounted = false }
  }, [slug, type])

  // Fetch crew
  useEffect(() => {
    let mounted = true

    const fetchCrew = async () => {
      if (!slug || type === 'video') return

      try {
        const apiPath = type === 'movie'
          ? `/api/movies/${slug}/crew?limit=10`
          : `/api/tv/${slug}/crew?limit=10`

        const response = await fetch(apiPath)

        if (!response.ok) {
          // Silently fail - no error logging for missing content
          if (mounted) setCrew([])
          return
        }

        const data = await response.json()

        if (mounted) {
          setCrew(data.data || [])
        }
      } catch (e: any) {
        // Silently fail - no error logging
        if (mounted) setCrew([])
      }
    }

    if (slug) {
      fetchCrew()
    }

    return () => { mounted = false }
  }, [slug, type])

  // Fetch similar content from API
  const [similarContent, setSimilarContent] = useState<any[]>([])

  useEffect(() => {
    let mounted = true

    const fetchSimilar = async () => {
      if (!slug || type === 'video') {
        return
      }

      try {
        const apiPath = type === 'movie'
          ? `/api/movies/${slug}/similar?limit=18`
          : `/api/tv/${slug}/similar?limit=18`

        const response = await fetch(apiPath)

        if (!response.ok) {
          // Silently fail - no error logging for missing content
          if (mounted) setSimilarContent([])
          return
        }

        const data = await response.json()

        if (mounted) {
          const items = data.data || []
          setSimilarContent(items)
        }
      } catch (e: any) {
        // Silently fail - no error logging
        if (mounted) setSimilarContent([])
      }
    }

    if (slug) {
      fetchSimilar()
    }

    return () => { mounted = false }
  }, [slug, type])

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

  // Use external_id from details (TMDB ID) for server generation
  // Fallback to id parameter if external_id is not available yet
  // For YouTube videos (type=video), effectiveId is 0 (no servers needed)
  const effectiveId = useMemo(() => {
    if (type === 'video') return 0 // YouTube videos don't need servers

    // PRIORITY 1: Use details.id (TMDB ID from database)
    if (details?.id) {
      const parsed = Number(details.id)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }

    // PRIORITY 2: Use details.external_id (fallback)
    if (details?.external_id) {
      const parsed = Number(details.external_id)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }

    // PRIORITY 3: Use id from URL (last resort)
    if (id && !isNaN(Number(id))) {
      const parsed = Number(id)
      if (parsed > 0) return parsed
    }

    return 0
  }, [details, type]) // Fixed: removed 'id'

  // CRITICAL: Use content_type from DB if available — prevents movie being fetched as TV
  const effectiveType = useMemo((): 'movie' | 'tv' => {
    if (type === 'video') return 'movie'
    const dbType = (details as any)?.content_type
    if (dbType === 'tv' || dbType === 'series') return 'tv'
    if (dbType === 'movie') return 'movie'
    return type === 'tv' ? 'tv' : 'movie'
  }, [details, type])

  // CRITICAL FIX: Pass undefined for season/episode if not episodic content
  const { servers, active, setActive, loading: serversLoading, reportBroken, reporting, checkBatchAvailability } = useServers(
    effectiveId,
    effectiveType,
    isEpisodic ? season : undefined,
    isEpisodic ? episode : undefined,
    details?.external_ids?.imdb_id
  )

  const dlUrl = useMemo(() => {
    if (!effectiveId) return '#'
    if (effectiveType === 'tv' && isEpisodic) return `https://dl.vidsrc.vip/tv/${effectiveId}/${season}/${episode}`
    return `https://dl.vidsrc.vip/movie/${effectiveId}`
  }, [effectiveId, effectiveType, season, episode, isEpisodic])

  const [availableEpisodes, setAvailableEpisodes] = useState<Record<string, boolean>>({})
  const [availableSeasonsMap, setAvailableSeasonsMap] = useState<Record<number, boolean>>({})
  const [summaryId, setSummaryId] = useState<string | null>(null)

  // Track what we've already checked to prevent infinite loops
  const checkedSeasonsRef = useRef<Set<string>>(new Set())
  const checkedEpisodesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!title) return
    const fetchSummary = async () => {
      const cleanTitle = title.replace(/[^\w\s\u0600-\u06FF]/g, '').trim()
      if (!cleanTitle) return
      const { data } = await supabase
        .from('videos')
        .select('id')
        .eq('category', 'summary')
        .ilike('title', `%${cleanTitle}%`)
        .limit(1)
        .maybeSingle()
      if (data) setSummaryId(data.id)
    }
    fetchSummary()
  }, [title])

  const episodesCount = useMemo(() => {
    // Use seasons from CockroachDB (not TMDB details.seasons)
    // CRITICAL FIX: Ensure season is a number for comparison
    const seasonNum = typeof season === 'number' ? season : Number(season)
    const foundSeason = seasons?.find(s => s.season_number === seasonNum)
    const count = foundSeason?.episode_count || 0

    return count
  }, [seasons, season, type])
  useEffect(() => {
    // Only check episodes availability once per season
    if (type === 'tv' && effectiveId && season && episodesCount > 0) {
      const checkKey = `${effectiveId}-${season}`

      // Skip if already checked
      if (checkedEpisodesRef.current.has(checkKey)) return

      checkedEpisodesRef.current.add(checkKey)

      const episodesToCheck = Array.from({ length: episodesCount }).map((_, i) => ({
        s: season,
        e: i + 1
      }))
      checkBatchAvailability(episodesToCheck).then(results => {
        setAvailableEpisodes(prev => ({ ...prev, ...results }))
      })
    }
  }, [type, effectiveId, season, episodesCount, checkBatchAvailability])

  useEffect(() => {
    // Only check seasons availability once
    if (type === 'tv' && effectiveId && seasons && seasons.length > 0) {
      const checkKey = `${effectiveId}-seasons`

      // Skip if already checked
      if (checkedSeasonsRef.current.has(checkKey)) return

      checkedSeasonsRef.current.add(checkKey)

      const seasonsToCheck = seasons
        .filter(s => s.season_number > 0 && s.episode_count > 0)
        .map(s => ({
          s: s.season_number,
          e: 1
        }))
      checkBatchAvailability(seasonsToCheck).then(results => {
        const seasonMap: Record<number, boolean> = {}
        Object.entries(results).forEach(([key, isAvailable]) => {
          const sNum = parseInt(key.split('-')[0])
          seasonMap[sNum] = isAvailable
        })
        setAvailableSeasonsMap(prev => ({ ...prev, ...seasonMap }))
      })
    }
  }, [type, effectiveId, seasons, checkBatchAvailability])

  const availableSeasons = useMemo(() => {
    // Use seasons from CockroachDB (not TMDB details.seasons)
    if (!seasons || seasons.length === 0) return []
    return seasons.filter(s => {
      if (s.season_number <= 0) return false
      if (s.episode_count <= 0) return false
      if (availableSeasonsMap[s.season_number] === false) {
        const otherAvailable = seasons.some(other =>
          other.season_number > 0 &&
          other.season_number !== s.season_number &&
          availableSeasonsMap[other.season_number] !== false
        )
        if (!otherAvailable) return true
        return false
      }
      return true
    })
  }, [seasons, availableSeasonsMap])

  const scrollToPlayer = () => {
    const playerEl = document.getElementById('player')
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShowPreroll(false)
    }
  }

  if (fetchError) return <NotFound />
  if (error) return <NotFound />
  if (loading && !details) return <div className="min-h-screen bg-[#0f0f0f] p-8"><SkeletonGrid count={1} variant="video" /></div>

  // Debug cast display

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <SeoHead
        title={`${title} | ${type === 'movie' ? 'Movie' : 'Series'}`}
        description={overview || ''}
        image={backdrop || poster || undefined}
        type={type === 'movie' ? 'video.movie' : 'video.tv_show'}
        keywords={seoKeywords}
        schema={jsonLdWatch}
      />

      {cinemaMode && (
        <div
          className="fixed inset-0 z-50 bg-black/95 transition-all duration-700 backdrop-blur-sm"
          onClick={() => setCinemaMode(false)}
        />
      )}

      <div className="relative">
        {backdrop ? (
          <>
            <img src={backdrop} alt={title} className="absolute inset-0 h-[45vh] w-full object-cover object-top opacity-60" loading="lazy" />
            <div className="absolute inset-0 h-[45vh] bg-gradient-to-b from-black/60 via-[#0f0f0f]/80 to-[#0f0f0f]" />
          </>
        ) : (
          <div className="absolute inset-0 h-[35vh] bg-[#1a1a1a]" />
        )}
        <div className="relative z-10 mx-auto max-w-[1800px] px-4 md:px-12 pt-14 pb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-12">
            <div className="flex-1 flex flex-col items-start text-left order-2 md:order-1">
              <div className="mb-6">
                <h1 className="text-3xl md:text-6xl font-black tracking-tight text-white leading-[1.1]">
                  {tripleTitles.arabic && tripleTitles.english ? (
                    <>
                      {tripleTitles.arabic}
                      <span className="text-zinc-400 font-semibold"> | </span>
                      {tripleTitles.english}
                    </>
                  ) : (
                    tripleTitles.primary
                  )}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300 mb-8 justify-start">
                {/* نوع المحتوى */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold">
                  <Layers size={16} />
                  {type === 'movie' && t('فيلم', 'Movie')}
                  {type === 'tv' && t('مسلسل', 'Series')}
                  {type === 'game' && t('لعبة', 'Game')}
                  {type === 'video' && t('فيديو', 'Video')}
                </span>

                {year && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10">
                    <Calendar size={16} className="text-[#f5c518]" /> {year}
                  </span>
                )}
                {runtimeMin != null && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10">
                    <Clock size={16} className="text-[#f5c518]" /> {Math.floor(runtimeMin / 60)}س {runtimeMin % 60}د
                  </span>
                )}
                {!!genres.length && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10">
                    {genres.slice(0, 2).map((g) => lang === 'ar' ? translateGenre(g.name) : g.name).join(' • ')}
                  </span>
                )}
                {rating != null && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#f5c518]/10 border border-[#f5c518]/20 text-[#f5c518]">
                    <Star size={16} className="fill-[#f5c518]" /> {rating}
                  </span>
                )}

                {/* أزرار المشاهدة والمشاركة */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={scrollToPlayer}
                    className="rounded-2xl bg-gradient-to-r from-[#e50914] to-[#b20710] px-8 h-12 flex items-center justify-center gap-2 text-white text-sm font-black shadow-[0_8px_30px_rgba(229,9,20,0.4)] hover:shadow-[0_8px_40px_rgba(229,9,20,0.6)] hover:scale-105 transition-all active:scale-95"
                  >
                    <Play size={18} className="fill-white" />
                    {t('مشاهدة الآن', 'Watch Now')}
                  </button>

                  <ShareButton
                    title={title}
                    text={overview?.slice(0, 100)}
                    currentTime={elapsed}
                    className="h-12 px-6 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center gap-2 text-white hover:bg-white/20 hover:border-white/30 transition-all font-bold text-sm"
                  />
                </div>
              </div>

              <p className="max-w-2xl text-lg text-zinc-300 leading-relaxed line-clamp-4 mb-10 text-left">{overview}</p>

              {!!cast.length && (
                <div className="w-full max-w-xl">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">
                    <span className="w-4 h-[1px] bg-zinc-800" />
                    {lang === 'ar' ? 'طاقم العمل' : 'Cast'}
                  </div>
                  <div className="flex items-start gap-2 overflow-x-visible">
                    {cast.slice(0, 8).map((p) => (
                      <Link
                        key={p.id}
                        to={`/actor/${p.slug}`}
                        className="group/cast flex flex-col items-center gap-1.5 text-center hover:scale-105 transition-all flex-shrink-0"
                        style={{ width: '70px' }}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/5 group-hover/cast:border-primary/50 transition-all shadow-xl">
                          {p.profile_url || p.profile_path ? (
                            <img
                              src={p.profile_url || `https://image.tmdb.org/t/p/w185${p.profile_path}`}
                              alt={p.name_ar || p.name}
                              className="w-full h-full object-cover grayscale group-hover/cast:grayscale-0 transition-all duration-500"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                              <Users size={16} className="text-zinc-500" />
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-zinc-300 text-[9px] line-clamp-2 leading-tight group-hover/cast:text-primary transition-colors w-full">
                          {p.name_ar || p.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-44 md:w-64 shrink-0 order-1 md:order-2 mx-auto md:mx-0">
              <div
                onClick={scrollToPlayer}
                className="relative aspect-[2/3] overflow-hidden rounded-3xl border-4 border-white/5 bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-pointer group/poster transition-all duration-500 hover:border-primary/30"
              >
                <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover/poster:opacity-100 transition-all duration-500 bg-black/60 backdrop-blur-[2px]">
                  <div className="bg-[#e50914] rounded-full p-5 shadow-2xl transform scale-75 group-hover/poster:scale-100 transition-transform duration-500">
                    <Play size={32} fill="white" className="text-white" />
                  </div>
                </div>
                <div className="h-full w-full bg-[#1a1a1a]">
                  {poster && (
                    <img
                      src={poster}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover/poster:scale-105"
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] px-4 md:px-12 py-6 space-y-6">
        <section id="player" className="flex flex-col gap-10 md:gap-12 mt-4 md:mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
            <div id="player" className="space-y-4">
              {showPreroll ? (
                <div
                  className="aspect-video w-full max-h-[65vh] overflow-hidden rounded-2xl border border-zinc-800 bg-black bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: backdrop ? `url(${backdrop})` : 'none' }}
                >
                  <div className="w-full h-full bg-black/60 backdrop-blur-sm">
                    <AdsManager type="preroll" position="player" onDone={() => setShowPreroll(false)} />
                  </div>
                </div>
              ) : type === 'video' && details?.external_id ? (
                // YouTube video player
                <div
                  className={clsx(
                    "relative aspect-video w-full overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] bg-cover bg-center bg-no-repeat",
                    cinemaMode
                      ? 'fixed inset-0 z-[60] h-screen w-screen rounded-none border-none bg-black'
                      : 'rounded-[2rem] border border-white/10 bg-black shadow-2xl ring-1 ring-white/5 max-h-[65vh]'
                  )}
                  style={{ backgroundImage: backdrop ? `url(${backdrop})` : 'none' }}
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${details.external_id}?autoplay=1&rel=0&modestbranding=1`}
                    className="h-full w-full bg-black"
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                    title={title}
                    style={{ border: 'none', overflow: 'hidden', width: '100%', height: '100%' }}
                  />
                  {cinemaMode && (
                    <motion.button
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setCinemaMode(false)}
                      className="absolute top-8 right-8 z-[70] flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 text-white hover:bg-white/20 transition-all group"
                    >
                      <span className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">{lang === 'ar' ? 'إغلاق وضع السينما' : 'Exit Cinema'}</span>
                      <Sparkles size={20} className="fill-white" />
                    </motion.button>
                  )}
                </div>
              ) : (
                <EmbedPlayer
                  server={servers[active]}
                  serverIndex={active}
                  cinemaMode={cinemaMode}
                  toggleCinemaMode={() => setCinemaMode(!cinemaMode)}
                  loading={serversLoading}
                  onNextServer={() => active < servers.length - 1 ? setActive(active + 1) : setActive(0)}
                  onReport={reportBroken}
                  reporting={reporting}
                  poster={backdrop || poster}
                  lang={lang as 'ar' | 'en'}
                  servers={servers}
                  activeServerIndex={active}
                  onServerSelect={setActive}
                />
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10"
              >
                <div className="flex items-center justify-center gap-2 mb-2 text-zinc-500">
                  <AlertTriangle size={14} />
                  <span className="text-xs font-black uppercase tracking-widest">{t('إخلاء مسؤولية', 'DISCLAIMER')}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed text-center max-w-3xl mx-auto">
                  {t(
                    'تُجلب كافة المحتويات المعروضة آلياً من مصادر خارجية؛ الموقع غير مسؤول عن أي إعلانات تظهر داخل المشغلات أو أي مشاهد قد لا تلائم البعض. لا يقوم الموقع بتخزين أي ملفات فيديو على خوادمه الخاصة، وتعود حقوق الملكية الفكرية لأصحابها الأصليين.',
                    'All content displayed is automatically fetched from external sources; the site is not responsible for any advertisements appearing within the players or any content that may not be suitable for all audiences. The site does not host any video files on its servers; all intellectual property rights belong to their respective owners.'
                  )}
                </p>
              </motion.div>
            </div>

            <div className="space-y-4">
              {summaryId && (
                <Link
                  to={`/watch/video/${summaryId}`}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-[#e50914] text-white shadow-lg hover:scale-[1.02] transition-all group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                      <Sparkles size={20} className="fill-white text-white" />
                    </div>
                    <div className="flex flex-col items-start text-start">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-90">{t('ملخص القصة', 'Story Summary')}</span>
                      <span className="text-sm font-black">{t('شاهد ملخص الفيلم/المسلسل', 'Watch Full Summary')}</span>
                    </div>
                  </div>
                  <ChevronLeft size={20} className={`relative z-10 ${lang === 'ar' ? '' : 'rotate-180'} group-hover:-translate-x-1 transition-transform`} />
                </Link>
              )}

              {type === 'tv' && (
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Layers size={14} />
                    </div>
                    <h3 className="text-[11px] font-black text-white uppercase tracking-tight">
                      {t('المواسم', 'Seasons')}
                    </h3>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1 pr-2">
                    {availableSeasons.map((s: any) => (
                      <button
                        key={s.season_number}
                        onClick={() => handleSeasonChange(s.season_number)}
                        className={clsx(
                          "group relative flex items-center justify-center rounded-lg border transition-all duration-300 h-11 w-full overflow-hidden",
                          season === s.season_number
                            ? "bg-primary border-transparent text-black shadow-lg shadow-primary/20"
                            : "bg-white/5 border-white/5 text-zinc-500 hover:border-white/10 hover:bg-white/[0.07] hover:text-white"
                        )}
                      >
                        {season === s.season_number && (
                          <div className="absolute inset-0 z-0">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-[-150%] bg-[conic-gradient(transparent,transparent,transparent,#3b82f6)]"
                            />
                          </div>
                        )}

                        <div className={clsx(
                          "relative z-10 flex items-center justify-center gap-1.5 w-[calc(100%-4px)] h-[calc(100%-4px)] rounded-[6px]",
                          season === s.season_number ? "bg-primary" : ""
                        )}>
                          <span className="text-[10px] font-bold opacity-70 uppercase">{t('موسم', 'Season')}</span>
                          <span className="text-sm md:text-base font-black">{s.season_number}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {type === 'movie' && (details as any)?.collection?.parts && (
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm space-y-4">
                  <div className="flex items-center gap-3 px-1">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Layers size={18} />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      {t('الأجزاء', 'Parts')}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2 pr-2">
                    {((details as any).collection.parts as any[])
                      .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())
                      .map((p) => (
                        <Link
                          key={p.id}
                          to={generateWatchUrl({ id: p.id, type: 'movie' })}
                          className={clsx(
                            "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border text-center",
                            Number(id) === p.id
                              ? "bg-primary border-primary text-black shadow-lg shadow-primary/20"
                              : "bg-white/5 border-white/5 text-zinc-400 hover:border-white/10 hover:bg-white/[0.07] hover:text-white"
                          )}
                        >
                          {p.title}
                        </Link>
                      ))}
                  </div>
                </div>
              )}

              {type === 'tv' && (
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                  <EpisodeSelector
                    season={season}
                    episode={episode}
                    setSeason={handleSeasonChange}
                    setEpisode={handleEpisodeChange}
                    seasonsCount={seasons?.length}
                    episodesCount={episodesCount}
                    lang={lang as 'ar' | 'en'}
                    availableEpisodes={availableEpisodes}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 pt-6">
            {(() => {
              return null
            })()}

            {similarContent.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/20 text-primary">
                      <Heart size={18} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight">
                      {t('قد يعجبك أيضاً', 'You Might Also Like')}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                  {similarContent.map((item: any, index: number) => {
                    // Map API response fields to MovieCard expected fields
                    const mappedItem = {
                      id: item.id,
                      slug: item.slug || String(item.id),
                      media_type: type,
                      // Titles
                      title: item.title,
                      title_ar: item.title_ar,
                      title_en: item.title_en || item.title,
                      name: item.name,
                      name_ar: item.name_ar,
                      name_en: item.name_en || item.name,
                      original_title: item.original_title,
                      // Images - use poster_path from API (not poster_url)
                      poster_path: item.poster_path,
                      backdrop_path: item.backdrop_path,
                      // Dates
                      release_date: item.release_date,
                      first_air_date: item.first_air_date,
                      // Rating
                      vote_average: item.vote_average || 0,
                      vote_count: item.vote_count,
                      // Genre
                      primary_genre: item.primary_genre,
                      genres: item.genres,
                      // Overview
                      overview: item.overview,
                      overview_ar: item.overview_ar,
                      overview_en: item.overview_en
                    }
                    return (
                      <MovieCard
                        key={item.id}
                        movie={mappedItem}
                        index={index}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SEO Keywords - Hidden from user view but visible to search engines */}
        {keywords.length > 0 && (
          <section className="sr-only" aria-hidden="true">
            <h2>{t('الكلمات المفتاحية', 'Keywords')}</h2>
            <div>
              {keywords.map((keyword) => (
                <span key={keyword.id}>{keyword.name}, </span>
              ))}
            </div>
            <meta name="keywords" content={keywords.map(k => k.name).join(', ')} />
          </section>
        )}
      </div>
    </div>
  )
}
