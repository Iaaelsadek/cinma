import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, FreeMode } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/free-mode'
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase, createWatchParty, updateWatchParty, grantAchievement } from '../../lib/supabase'
import { AdsManager } from '../../components/features/system/AdsManager'
import { tmdb } from '../../lib/tmdb'
import { MovieCard } from '../../components/features/media/MovieCard'
import { SeoHead } from '../../components/common/SeoHead'
import { AlertTriangle, X, Sparkles, Layers, ChevronLeft, ChevronRight, ExternalLink, Calendar, Clock, Star, Users, Play as PlayIcon } from 'lucide-react'
import { ShareButton } from '../../components/common/ShareButton'
import { NotFound } from '../NotFound'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { SubtitleManager } from '../../components/features/media/SubtitleManager'
import { useServers } from '../../hooks/useServers'
import { useWatchProgress } from '../../hooks/useWatchProgress'
import { errorLogger } from '../../services/errorLogging'

import { EmbedPlayer } from '../../components/features/media/EmbedPlayer'
import { ServerSelector } from '../../components/features/media/ServerSelector'
import { EpisodeSelector } from '../../components/features/media/EpisodeSelector'
import { WatchParty } from '../../components/features/social/WatchParty'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

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
  const { type: typeParam, id: idParam, slug: slugParam, s, e, lang: langParam } = useParams()
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const { user, loading: authLoading } = useAuth()

  const isNumericId = useMemo(() => idParam && /^\d+$/.test(idParam), [idParam])
  
  const { initialType, initialId, initialSlug, initialSeason, initialEpisode, lang } = useMemo(() => {
    // Case A: SEO Route (/watch/:lang/:type/:genre/:slug)
    // Matched if langParam is ar or en
    if (langParam === 'ar' || langParam === 'en' || typeParam === 'ar' || typeParam === 'en') {
      const actualLang = (langParam === 'ar' || langParam === 'en') ? langParam : typeParam as 'ar' | 'en'
      const actualTypeParam = (langParam === 'ar' || langParam === 'en') ? typeParam : idParam
      const actualSlug = (langParam === 'ar' || langParam === 'en') ? e : s // Shifted depending on which route matched
      
      let t = actualTypeParam || 'movie'
      if (t === 'series' || t === 'anime') t = 'tv'
      if (t === 'movies' || t === 'plays') t = 'movie'
      
      return {
        initialType: t,
        initialId: null,
        initialSlug: actualSlug || null,
        initialSeason: 1,
        initialEpisode: 1,
        lang: actualLang
      }
    }

    // Case B: ID Route (/watch/:type/:id/:s/:e)
    // If typeParam is a valid media type, it's likely an ID route
    const isValidType = typeParam === 'movie' || typeParam === 'tv' || typeParam === 'series' || typeParam === 'movies' || typeParam === 'anime' || typeParam === 'plays'
    
    if (isValidType && isNumericId) {
      let t = typeParam || 'movie'
      if (t === 'series' || t === 'anime') t = 'tv'
      if (t === 'movies' || t === 'plays') t = 'movie'
      
      return {
        initialType: t,
        initialId: idParam,
        initialSlug: slugParam,
        initialSeason: null,
        initialEpisode: null,
        lang: 'ar' as 'ar' | 'en'
      }
    }

    // Default Fallback
    let t = typeParam || 'movie'
    if (t === 'series' || t === 'anime') t = 'tv'
    if (t === 'movies' || t === 'plays') t = 'movie'

    return {
      initialType: t,
      initialId: idParam || null,
      initialSlug: slugParam,
      initialSeason: null,
      initialEpisode: null,
      lang: 'ar' as 'ar' | 'en'
    }
  }, [typeParam, idParam, slugParam, s, e, langParam, isNumericId])

  // 1. Check for partyId in URL and verify user
  useEffect(() => {
    const urlPartyId = sp.get('partyId')
    if (urlPartyId && !user && !authLoading) {
      const newSp = new URLSearchParams(sp)
      newSp.delete('partyId')
      setSp(newSp, { replace: true })
      setPartyId(null)
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول للانضمام إلى غرفة المشاهدة الجماعية' : 'Please login to join the group watch party', { id: 'auth-required' })
    }
  }, [sp, user, authLoading, lang, setSp])

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  // Clean s and e from "s1" or "ep1" format
  const sNum = useMemo(() => {
    if (initialSeason) return initialSeason
    if (!s) return null
    if (s.toString().startsWith('s')) return Number(s.toString().slice(1))
    return Number(s)
  }, [s, initialSeason])

  const eNum = useMemo(() => {
    if (initialEpisode) return initialEpisode
    if (!e) return null
    if (e.toString().startsWith('ep')) return Number(e.toString().slice(2))
    return Number(e)
  }, [e, initialEpisode])

  // Initial Sync from URL or SearchParams
  useEffect(() => {
    const sFromQuery = Number(sp.get('season'))
    const eFromQuery = Number(sp.get('episode'))
    
    // If we have query params, redirect to clean URL and return
    if ((sFromQuery || eFromQuery) && idParam) {
      const typeParamFinal = typeParam || sp.get('type') || 'movie'
      navigate(`/watch/${typeParamFinal}/${idParam}/s${sFromQuery || 1}/ep${eFromQuery || 1}`, { replace: true })
      return
    }
  }, [sp, idParam, typeParam, navigate])

  const [season, setSeason] = useState(Math.max(1, sNum || 1))
  const [episode, setEpisode] = useState(Math.max(1, eNum || 1))
  
  // Sync state with URL params
  useEffect(() => {
    if (sNum) setSeason(sNum)
    if (eNum) setEpisode(eNum)
  }, [sNum, eNum])

  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSeasonChange = (newSeason: number) => {
    if (type === 'tv') {
      navigate(`/watch/tv/${id}/s${newSeason}/ep1`, { replace: true })
    }
  }

  const handleEpisodeChange = (newEpisode: number) => {
    if (type === 'tv') {
      navigate(`/watch/tv/${id}/s${season}/ep${newEpisode}`, { replace: true })
    }
  }

  const type = initialType
  const id = resolvedId || initialId
  const slug = initialSlug

  const { elapsed, setElapsed } = useWatchProgress({ user, id: id || null, type, season, episode })
  
  const [showPreroll, setShowPreroll] = useState(true)
  const [showTrailer, setShowTrailer] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTrailer(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])
  
  // Normalize type param (movies -> movie, series -> tv)
  // (type normalized above)

  const [details, setDetails] = useState<TmdbDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [cinemaMode, setCinemaMode] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [partyId, setPartyId] = useState<string | null>(sp.get('partyId'))
  const [showCreateParty, setShowCreateParty] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  const [syncSeek, setSyncSeek] = useState<number | undefined>(undefined)
  const [castPage, setCastPage] = useState(0)
  const itemsPerPage = 4

  const handleCreateParty = async () => {
    if (!user) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول لإنشاء غرفة مشاهدة جماعية' : 'Please login to create a group watch party', { id: 'auth-required' })
      return
    }
    if (!roomName.trim()) {
      toast.error(lang === 'ar' ? 'يرجى إدخال اسم الغرفة' : 'Please enter room name')
      return
    }

    setIsCreating(true)
    try {
      const party = await createWatchParty({
        room_name: roomName,
        content_id: id || '',
        content_type: type,
        creator_id: user.id,
        current_time: elapsed,
        is_playing: isPlaying
      })
      
      setPartyId(party.id)
      setSp(prev => {
        prev.set('partyId', party.id)
        return prev
      })
      setShowCreateParty(false)
      toast.success(lang === 'ar' ? 'تم إنشاء غرفة المشاهدة الجماعية بنجاح' : 'Group watch party created successfully')
      
      // Grant achievement
      try {
        const granted = await grantAchievement(user.id, 'party_host')
        if (granted) toast.success(lang === 'ar' ? 'إنجاز جديد: صاحب المجلس 🏠' : 'New achievement: Group Watch Party Host 🏠')
      } catch (err) {
        console.error('Failed to grant achievement:', err)
      }
    } catch (err: any) {
      console.error('Failed to create group watch party:', err)
      toast.error(lang === 'ar' ? `فشل إنشاء الغرفة: ${err.message || 'خطأ غير معروف'}` : `Failed to create group watch party: ${err.message || 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSync = (time: number, playing: boolean) => {
    setSyncSeek(time)
    setIsPlaying(playing)
    // Clear sync seek after a moment to allow manual seeking again
    setTimeout(() => setSyncSeek(undefined), 1000)
  }

  // Hook 0: Resolve Slug to ID
  useEffect(() => {
    if (initialId) return // Already have ID
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
  }, [slug, initialId, type])

  // Hook 1: Remove redundant SearchParams sync that causes infinite redirect loops
  // Path params are already the primary source of truth.
  useEffect(() => {
    // Only update SearchParams if we are using an ID route and need to preserve other query params
    // But DON'T set season/episode if we are already using path params like /s1/ep1
    if (sNum || eNum) return

    const p = new URLSearchParams(sp)
    if (type === 'tv') {
      p.set('season', String(season))
      p.set('episode', String(episode))
      p.set('type', 'tv')
      setSp(p, { replace: true })
    }
  }, [season, episode, type, setSp, sNum, eNum])

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
        const path = type === 'movie' ? `/movie/${id}` : `/tv/${id}`
        const { data } = await tmdb.get(path, { params: { append_to_response: 'credits,videos,external_ids,recommendations,similar' } })
        
        // If it's a movie and belongs to a collection, fetch the collection
        if (type === 'movie' && data.belongs_to_collection) {
          try {
            const { data: collectionData } = await tmdb.get(`/collection/${data.belongs_to_collection.id}`)
            data.collection = collectionData
          } catch (err) {
            console.error('Failed to fetch collection:', err)
          }
        }
        
        if (mounted) setDetails(data)
      } catch (e) {
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id, type, slug])

  // Hook 3: Progress Tracking (REPLACED by useWatchProgress)

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
  const cast = useMemo(() => (details?.credits?.cast || []).slice(0, 12), [details])
  
  const trailer = useMemo(() => {
    return details?.videos?.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube')?.key
  }, [details])

  const relatedParts = useMemo(() => {
    // 1. If it's a movie and belongs to a collection, show other parts
    if (type === 'movie' && (details as any)?.collection?.parts) {
      const collectionParts = ((details as any).collection.parts as any[])
        .filter(p => p.id !== Number(id)) // exclude current
        .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())
        .map(p => ({
          id: p.id,
          title: p.title,
          poster: p.poster_path ? `https://image.tmdb.org/t/p/w342${p.poster_path}` : '',
          year: p.release_date ? new Date(p.release_date).getFullYear() : null,
          type: 'movie'
        }))
      
      if (collectionParts.length > 0) return collectionParts
    }
    
    // 2. Combine recommendations and similar results to ensure content
    const recommendations = (details as any)?.recommendations?.results || []
    const similar = (details as any)?.similar?.results || []
    
    // Merge and remove duplicates by ID
    const combined = [...recommendations, ...similar]
    const uniqueMap = new Map()
    combined.forEach(p => {
      if (p.id !== Number(id) && !uniqueMap.has(p.id)) {
        uniqueMap.set(p.id, p)
      }
    })
    
    const finalResults = Array.from(uniqueMap.values())
      .slice(0, 18) // Show more results (up to 18)
      .map((p: any) => ({
        ...p,
        media_type: p.media_type || (type === 'tv' ? 'tv' : 'movie')
      }))

    return finalResults
  }, [details, id, type])

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
  // Don't call useServers with 0 or NaN if we are waiting for resolution
  const effectiveId = id ? Number(id) : 0
  const { servers, active, setActive, loading: serversLoading, reportBroken, reporting, checkBatchAvailability } = useServers(
    effectiveId, 
    type as 'movie' | 'tv', 
    season, 
    episode,
    details?.external_ids?.imdb_id
  )

  const [availableEpisodes, setAvailableEpisodes] = useState<Record<string, boolean>>({})
  const [availableSeasonsMap, setAvailableSeasonsMap] = useState<Record<number, boolean>>({})

  const episodesCount = useMemo(() => {
    return details?.seasons?.find(s => s.season_number === season)?.episode_count || 0
  }, [details?.seasons, season])

  // 1. Fetch availability for current season episodes
  useEffect(() => {
    if (type === 'tv' && effectiveId && season && episodesCount > 0) {
      const episodesToCheck = Array.from({ length: episodesCount }).map((_, i) => ({
        s: season,
        e: i + 1
      }))
      
      checkBatchAvailability(episodesToCheck).then(results => {
        setAvailableEpisodes(prev => ({ ...prev, ...results }))
      })
    }
  }, [type, effectiveId, season, episodesCount, checkBatchAvailability])

  // 2. Fetch availability for all seasons (check first episode of each)
  useEffect(() => {
    if (type === 'tv' && effectiveId && details?.seasons) {
      const seasonsToCheck = details.seasons
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
  }, [type, effectiveId, details?.seasons, checkBatchAvailability])

    // Filter out seasons with no episodes or invalid data
    const availableSeasons = useMemo(() => {
      if (!details?.seasons) return []
      return details.seasons.filter(s => {
        if (s.season_number <= 0) return false
        if (s.episode_count <= 0) return false
        
        // ONLY hide if we have explicitly checked it and it's false
        // If it's undefined (not checked yet), show it
        if (availableSeasonsMap[s.season_number] === false) {
          // But if we have NO other seasons, show it anyway to avoid empty UI
          const otherAvailable = details?.seasons?.some(other => 
            other.season_number > 0 && 
            other.season_number !== s.season_number && 
            availableSeasonsMap[other.season_number] !== false
          )
          if (!otherAvailable) return true
          return false
        }
        return true
      })
    }, [details?.seasons, availableSeasonsMap])

  const scrollToPlayer = () => {
    const playerEl = document.getElementById('player')
    if (playerEl) {
      playerEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setShowPreroll(false)
      setIsPlaying(true)
    }
  }

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
            <img src={backdrop} alt={title} className="absolute inset-0 h-[45vh] w-full object-cover object-top opacity-60" loading="lazy" />
            <div className="absolute inset-0 h-[45vh] bg-gradient-to-b from-black/60 via-[#0f0f0f]/80 to-[#0f0f0f]" />
          </>
        ) : (
          <div className="absolute inset-0 h-[35vh] bg-[#1a1a1a]" />
        )}
        <div className="relative z-10 mx-auto max-w-[2400px] px-4 md:px-12 pt-14 pb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-12">
            {/* Left Side: Title, Details, Actions, Cast */}
            <div className="flex-1 flex flex-col items-start text-left order-2 md:order-1">
              <h1 className="text-3xl md:text-6xl font-black tracking-tight text-white mb-6 leading-[1.1]">
                {title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300 mb-8 justify-start">
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
                    {genres.slice(0, 2).map((g) => g.name).join(' • ')}
                  </span>
                )}
                {rating != null && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#f5c518]/10 border border-[#f5c518]/20 text-[#f5c518]">
                    <Star size={16} className="fill-[#f5c518]" /> {rating}
                  </span>
                )}
              </div>
              
              <p className="max-w-2xl text-lg text-zinc-300 leading-relaxed line-clamp-4 mb-10 text-left">{overview}</p>
              
              {/* Actions Section */}
              <div className="flex flex-wrap items-center gap-4 mb-10">
                <button 
                  onClick={scrollToPlayer}
                  className="rounded-2xl bg-[#e50914] px-12 h-16 flex items-center justify-center text-white text-xl font-black shadow-[0_0_40px_rgba(229,9,20,0.4)] hover:scale-105 hover:brightness-110 transition-all active:scale-95 uppercase tracking-wider"
                >
                  مشاهدة الآن
                </button>
                
                <button
                  onClick={() => {
                      if (!user) {
                        toast.error(lang === 'ar' ? 'يجب عليك تسجيل الدخول أولاً للمشاركة في غرفة المشاهدة الجماعية' : 'You must login first to join a group watch party', { id: 'auth-required' })
                        return
                      }
                      setShowCreateParty(true)
                    }}
                  className="rounded-2xl border border-primary/20 bg-primary/10 px-8 h-16 flex items-center justify-center text-primary text-sm font-black shadow-lg hover:bg-primary/20 transition-all gap-3"
                >
                  <Users size={24} />
                  غرفة المشاهدة الجماعية
                </button>

                <ShareButton 
                  title={title} 
                  text={overview?.slice(0, 100)} 
                  currentTime={elapsed}
                  className="h-16 w-16 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/10 transition-all"
                />
              </div>

              {!!cast.length && (
                <div className="w-full max-w-xl">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
                    <span className="w-4 h-[1px] bg-zinc-800" />
                    طاقم العمل
                  </div>
                  {/* Cast Slider Content - Keeping original logic but inside the new layout */}
                  <div className="relative group/cast-slider">
                    <Swiper
                      modules={[Navigation, FreeMode]}
                      navigation={{
                        nextEl: '.cast-next',
                        prevEl: '.cast-prev',
                      }}
                      freeMode={true}
                      spaceBetween={16}
                      slidesPerView="auto"
                      className="!static"
                    >
                      {cast.map((p) => (
                        <SwiperSlide key={p.id} className="!w-fit">
                          <Link 
                            to={`/actor/${p.id}`}
                            className="group/cast flex flex-col items-center gap-2 w-20 text-center hover:scale-105 transition-all"
                          >
                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/5 group-hover/cast:border-primary/50 transition-all shadow-xl">
                              {p.profile_path ? (
                                <img 
                                  src={`https://image.tmdb.org/t/p/w185${p.profile_path}`} 
                                  alt={p.name} 
                                  className="w-full h-full object-cover grayscale group-hover/cast:grayscale-0 transition-all duration-500"
                                />
                              ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                  <Users size={18} className="text-zinc-500" />
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-zinc-300 text-[9px] line-clamp-1 group-hover/cast:text-primary transition-colors">{p.name}</span>
                          </Link>
                        </SwiperSlide>
                      ))}
                    </Swiper>
                    <button className="cast-prev absolute -left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 border border-white/10 hover:bg-primary hover:text-black transition-all opacity-0 group-hover/cast-slider:opacity-100 disabled:hidden z-20 backdrop-blur-sm">
                      <ChevronLeft size={14} />
                    </button>
                    <button className="cast-next absolute -right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 border border-white/10 hover:bg-primary hover:text-black transition-all opacity-0 group-hover/cast-slider:opacity-100 disabled:hidden z-20 backdrop-blur-sm">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: Poster */}
            <div className="w-44 md:w-64 shrink-0 order-1 md:order-2 mx-auto md:mx-0">
              <div 
                onClick={scrollToPlayer}
                className="relative aspect-[2/3] overflow-hidden rounded-3xl border-4 border-white/5 bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-pointer group/poster transition-all duration-500 hover:border-primary/30"
              >
                <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover/poster:opacity-100 transition-all duration-500 bg-black/60 backdrop-blur-[2px]">
                  <div className="bg-[#e50914] rounded-full p-5 shadow-2xl transform scale-75 group-hover/poster:scale-100 transition-transform duration-500">
                    <PlayIcon size={32} fill="white" className="text-white" />
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

      <div className="mx-auto max-w-[2400px] px-4 md:px-12 py-6 space-y-6">
        


        {/* NEW LAYOUT: Full Width Stack */}
        <section id="player" className="flex flex-col gap-6">
            
            {/* Top Row: Player and Servers */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
                {/* Video Player */}
                <div id="player" className="space-y-6">
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
                            lang={lang}
                        />
                        )}
                    </div>

                    {/* Disclaimer Notice */}
                    <div className="flex flex-col gap-4">
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center"
                      >
                      <div className="flex items-center justify-center gap-2 mb-1 text-zinc-500">
                        <AlertTriangle size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('إخلاء مسؤولية', 'DISCLAIMER')}</span>
                      </div>
                      <p className="text-[9px] text-zinc-500 font-bold leading-relaxed max-w-2xl mx-auto">
                        {t(
                          'تُجلب كافة المحتويات المعروضة آلياً من مصادر خارجية؛ الموقع غير مسؤول عن أي إعلانات تظهر داخل المشغلات أو أي مشاهد قد لا تلائم البعض. لا يقوم الموقع بتخزين أي ملفات فيديو على خوادمه الخاصة، وتعود حقوق الملكية الفكرية لأصحابها الأصليين.',
                          'All content displayed is automatically fetched from external sources; the site is not responsible for any advertisements appearing within the players or any content that may not be suitable for all audiences. The site does not host any video files on its servers; all intellectual property rights belong to their respective owners.'
                        )}
                      </p>
                    </motion.div>
                  </div>
                </div>

                {/* Sidebar: Servers, Seasons, and Episodes */}
                <div className="space-y-4">
                    {/* External Source Tool (Diagnostics) */}
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                          <ExternalLink size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-tight">External Check</p>
                          <p className="text-[8px] text-zinc-500 font-bold">Verify source status</p>
                        </div>
                      </div>
                      <a 
                        href={servers[active]?.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                      >
                        Open Source
                      </a>
                    </div>

                    {/* Server Selector */}
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                        <ServerSelector 
                            servers={servers}
                            active={active}
                            onSelect={setActive}
                            lang={lang}
                        />
                    </div>

                    {/* Seasons Selector (TV Only) */}
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
                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
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
                              {/* Rotating Border Effect for Active Season (Blue/Cyan) */}
                              {season === s.season_number && (
                                <div className="absolute inset-0 z-0">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-[-150%] bg-[conic-gradient(transparent,transparent,transparent,#3b82f6)]"
                                  />
                                </div>
                              )}

                              {/* Inner Content */}
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

                    {/* Collection Parts (Movie Only) */}
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
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {((details as any).collection.parts as any[])
                            .sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime())
                            .map((p) => (
                              <Link
                                key={p.id}
                                to={`/watch/movie/${p.id}`}
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

                    {/* Episodes Selector (TV Only) */}
                    {type === 'tv' && (
                      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                        <EpisodeSelector 
                            season={season}
                            episode={episode}
                            setSeason={handleSeasonChange}
                            setEpisode={handleEpisodeChange}
                            seasonsCount={details?.seasons?.length}
                            episodesCount={episodesCount}
                            lang={lang}
                            availableEpisodes={availableEpisodes}
                        />
                      </div>
                    )}
                </div>
            </div>

            {/* Recommendations Section */}
            <div className="space-y-6 pt-6">
                {/* Similar Recommendations Section */}
                {relatedParts.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/20 text-primary">
                          <Sparkles size={18} />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">
                          {t('قد يعجبك أيضاً', 'You Might Also Like')}
                        </h2>
                      </div>
                      
                      <Link 
                        to={`/parts/${type}/${id}`} 
                        className="group flex items-center gap-2 text-[10px] font-black text-zinc-500 hover:text-primary transition-all uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5 hover:border-primary/20"
                      >
                        <span>{t('عرض المزيد', 'View More')}</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform rotate-180" />
                      </Link>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                      {relatedParts.slice(0, 100).map((p: any, index: number) => (
                        <MovieCard key={p.id} movie={p} index={index} />
                      ))}
                    </div>

                    {relatedParts.length > 100 && (
                      <div className="flex justify-center pt-8">
                        <Link 
                          to={`/parts/${type}/${id}`}
                          className="px-8 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all shadow-xl hover:shadow-primary/20"
                        >
                          {t('عرض جميع الأفلام (+' + (relatedParts.length - 100) + ')', 'View All Movies (+' + (relatedParts.length - 100) + ')')}
                        </Link>
                      </div>
                    )}
                  </div>
                )}
            </div>
        </section>
      </div>
      {/* Group Watch Party Component - Moved to Portal */}
      {mounted && partyId && createPortal(
        <WatchParty 
          partyId={partyId}
          onSync={handleSync}
          onClose={() => {
            setPartyId(null)
            setSp(prev => {
              prev.delete('partyId')
              return prev
            })
          }}
          currentVideoTime={elapsed}
          isVideoPlaying={isPlaying}
          lang={lang}
        />,
        document.body
      )}

      {/* Create Group Watch Party Modal - Moved to Portal for fixed positioning */}
      <AnimatePresence>
        {mounted && showCreateParty && createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#1a1a1a] shadow-2xl relative"
            >
              <div className="border-b border-white/5 bg-white/5 p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/20 text-primary">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">{lang === 'ar' ? 'إنشاء غرفة مشاهدة جماعية' : 'Create Group Watch Party'}</h2>
                    <p className="text-xs text-zinc-400">{lang === 'ar' ? 'شاهد مع أصدقائك في نفس الوقت وبشكل جماعي' : 'Watch with friends together in sync'}</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateParty(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mr-1">{lang === 'ar' ? 'اسم الغرفة' : 'Room Name'}</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثلاً: سهرة الخميس 🍿' : 'e.g. Movie Night 🍿'}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>

                <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 flex gap-4">
                  <div className="p-2 h-fit rounded-lg bg-primary/20 text-primary">
                    <Sparkles size={18} />
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    {lang === 'ar' 
                      ? 'بصفتك المنشئ، سيتم مزامنة تشغيل الفيديو وإيقافه ووقته مع جميع المنضمين للغرفة تلقائياً.'
                      : 'As the host, video playback and sync will be controlled by you for all participants.'}
                  </div>
                </div>

                <button
                  onClick={handleCreateParty}
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-black text-black hover:brightness-110 active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
                >
                  {isCreating ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  ) : (
                    <>
                      <PlayIcon size={18} fill="currentColor" />
                      {lang === 'ar' ? 'بدء الحفلة الآن' : 'Start Group Party Now'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  )
}
