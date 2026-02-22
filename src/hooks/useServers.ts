import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { errorLogger } from '../services/errorLogging'

export type Server = {
  name: string
  url: string
  priority: number
  status: 'unknown' | 'online' | 'offline' | 'degraded'
  responseTime?: number
}

// ------------------------------------------------------------------
// STAGE 2: ZERO-FAILURE STREAMING ARCHITECTURE
// ------------------------------------------------------------------
const PROVIDERS = [
  { id: 'vidsrc_nl', name: 'VidSrc NL (Fast)', base: 'https://vidsrc.net/embed' },
  { id: 'vidsrc', name: 'VidSrc (Primary)', base: 'https://vidsrc.to/embed' },
  { id: 'vidsrc_me', name: 'VidSrc Me', base: 'https://vidsrc.me/embed' },
  { id: 'embed_su', name: 'Embed.su', base: 'https://embed.su/embed' },
  { id: 'vidsrc_pro', name: 'VidSrc Pro', base: 'https://vidsrc.pro/embed' },
  { id: 'vidsrc_vip', name: 'VidSrc VIP', base: 'https://vidsrc.vip/embed' },
  { id: 'vidsrc_xyz', name: 'VidSrc XYZ', base: 'https://vidsrc.xyz/embed' },
  { id: 'vidsrc_icu', name: 'VidSrc ICU', base: 'https://vidsrc.icu/embed' },
  { id: 'autoembed', name: 'AutoEmbed', base: 'https://autoembed.co' },
  { id: 'vidsrc_cc', name: 'VidSrc CC', base: 'https://vidsrc.cc/v2/embed' },
  { id: 'vidlink', name: 'VidLink', base: 'https://vidlink.pro' },
  { id: 'superembed', name: 'SuperEmbed', base: 'https://superembed.stream' },
  { id: 'smashystream', name: 'SmashyStream', base: 'https://embed.smashystream.com/playere.php' },
  { id: 'multiembed', name: 'MultiEmbed', base: 'https://multiembed.mov' },
  { id: '2embed', name: '2Embed', base: 'https://www.2embed.cc/embed' },
]

export const useServers = (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number, imdbId?: string) => {
  const [servers, setServers] = useState<Server[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reporting, setReporting] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, Server['status']>>({})

  // Fetch server statuses on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const { data } = await supabase.from('server_status').select('server_id, status')
        if (data) {
          const statusMap = data.reduce((acc, row) => ({
            ...acc,
            [row.server_id]: row.status as Server['status']
          }), {})
          setStatuses(statusMap)
        }
      } catch (e) {
        console.error('Failed to fetch server statuses', e)
      }
    }

    fetchStatuses()
    
    // Realtime subscription for status updates
    const channel = supabase
      .channel('server_status_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'server_status' },
        (payload) => {
          const { server_id, status } = payload.new as { server_id: string, status: Server['status'] }
          setStatuses(prev => ({ ...prev, [server_id]: status }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    
    const init = async () => {
      if (!tmdbId || isNaN(tmdbId) || tmdbId <= 0) {
        setServers([])
        setLoading(false)
        return
      }

      setLoading(true)
      
      // 1. Fetch Custom DB Links (Highest Priority)
      let dbLinks: Record<string, string> = {}
      try {
        if (type === 'movie') {
          const { data } = await supabase.from('movies').select('embed_links').eq('id', tmdbId).maybeSingle()
          if (data?.embed_links) dbLinks = data.embed_links
        } else if (type === 'tv' && season && episode) {
          const { data: seasonRow } = await supabase.from('seasons').select('id').eq('series_id', tmdbId).eq('season_number', season).maybeSingle()
          if (seasonRow?.id) {
            const { data: epRow } = await supabase.from('episodes').select('embed_links').eq('season_id', seasonRow.id).eq('episode_number', episode).maybeSingle()
            if (epRow?.embed_links) dbLinks = epRow.embed_links
          }
        }
      } catch (err) {
        errorLogger.logError({
          message: 'DB Link fetch failed, falling back to auto-generation',
          severity: 'low',
          category: 'media',
          context: { error: err, tmdbId, type }
        })
      }

      // 2. Generate Fallback Links
      const generatedServers: Server[] = PROVIDERS.map((p, idx) => {
        let url = ''
        
          // Vidsrc.to / Pro / VIP / XYZ / ICU / In-house
          if (['vidsrc', 'vidsrc_pro', 'vidsrc_vip', 'vidsrc_xyz', 'vidsrc_icu', 'vidsrc_nl'].includes(p.id)) {
            const query = '?ds_lang=ar'
            url = type === 'movie' 
              ? (imdbId ? `${p.base}/movie/${imdbId}${query}` : `${p.base}/movie/${tmdbId}${query}`)
              : (imdbId ? `${p.base}/tv/${imdbId}/${season}/${episode}${query}` : `${p.base}/tv/${tmdbId}/${season}/${episode}${query}`)
          } 
        // Vidsrc.me (Supports IMDb)
        else if (p.id === 'vidsrc_me') {
          url = type === 'movie'
             ? (imdbId ? `${p.base}/movie?imdb=${imdbId}&sub.lang=ar` : `${p.base}/movie?tmdb=${tmdbId}&sub.lang=ar`)
             : (imdbId ? `${p.base}/tv?imdb=${imdbId}&season=${season}&episode=${episode}&sub.lang=ar` : `${p.base}/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&sub.lang=ar`)
        }
        // Vidsrc.cc
        else if (p.id === 'vidsrc_cc') {
          url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}?lang=ar`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}?lang=ar`
        }
        // VidLink (New)
        else if (p.id === 'vidlink') {
          url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}?multiLang=true`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}?multiLang=true`
        }
        // SuperEmbed
        else if (p.id === 'superembed') {
           url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}?lang=ar`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}?lang=ar`
        }
        // AutoEmbed
        else if (p.id === 'autoembed') {
          url = type === 'movie'
            ? `${p.base}/movie/tmdb/${tmdbId}?caption=ar`
            : `${p.base}/tv/tmdb/${tmdbId}-${season}-${episode}?caption=ar`
        }
        // SmashyStream
        else if (p.id === 'smashystream') {
          url = type === 'movie'
            ? `${p.base}?tmdb=${tmdbId}&sub=ar`
            : `${p.base}?tmdb=${tmdbId}&season=${season}&episode=${episode}&sub=ar`
        }
        // MultiEmbed
        else if (p.id === 'multiembed') {
           url = type === 'movie'
            ? `${p.base}/directstream.php?video_id=${tmdbId}&tmdb=1&sub_lang=ar`
            : `${p.base}/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}&sub_lang=ar`
        }
        // Embed.su
        else if (p.id === 'embed_su') {
          url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}?language=ar`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}?language=ar`
        }
        // 2Embed
        else if (p.id === '2embed') {
           url = type === 'movie'
            ? `${p.base}/${tmdbId}?lang=ar`
            : `${p.base}/${tmdbId}?s=${season}&e=${episode}&lang=ar`
        }
        // Default Pattern (Generic)
        else {
          url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}`
        }

        // Override with DB link if exists
        if (dbLinks[p.id]) url = dbLinks[p.id]

        if (!url) return null

        return {
          name: p.name,
          url,
          priority: 10 - idx,
          status: statuses[p.id] || 'unknown',
          responseTime: undefined
        }
      }).filter(Boolean) as Server[]

      if (mounted) {
        setServers(generatedServers)
        if (active >= generatedServers.length) setActive(0)
        setLoading(false)
      }
    }

    init()
    return () => { mounted = false }
  }, [tmdbId, type, season, episode, imdbId, statuses])

  const reportBroken = async () => {
    setReporting(true)
    const s = servers[active]
    try {
      await supabase.from('link_checks').insert({
        content_id: tmdbId,
        content_type: type,
        source_name: s.name,
        url: s.url,
        status_code: 0,
        response_time_ms: 0
      })
    } catch {}
    
    // Auto-switch to next server
    if (active < servers.length - 1) {
      setActive(prev => prev + 1)
    } else {
      setActive(0) // Loop back to start
    }
    setReporting(false)
  }

  return { servers, active, setActive, loading, reporting, reportBroken }
}
