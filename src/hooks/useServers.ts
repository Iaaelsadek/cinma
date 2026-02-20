import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { errorLogger } from '../services/errorLogging'

export type Server = {
  name: string
  url: string
  priority: number
  status: 'unknown' | 'online' | 'offline'
  responseTime?: number
}

// ------------------------------------------------------------------
// STAGE 2: ZERO-FAILURE STREAMING ARCHITECTURE
// ------------------------------------------------------------------
const PROVIDERS = [
  { id: 'vidsrc', name: 'VidSrc (Primary)', base: 'https://vidsrc.to/embed' },
  { id: 'vidsrc_vip', name: 'VidSrc VIP', base: 'https://vidsrc.vip/embed' },
  { id: 'vidsrc_xyz', name: 'VidSrc XYZ', base: 'https://vidsrc.xyz/embed' },
  { id: 'vidsrc_me', name: 'VidSrc Me', base: 'https://vidsrc.me/embed' },
  { id: 'vidsrc_pro', name: 'VidSrc Pro', base: 'https://vidsrc.pro/embed' },
  { id: 'vidsrc_cc', name: 'VidSrc CC', base: 'https://vidsrc.cc/v2/embed' },
  { id: 'vidlink', name: 'VidLink', base: 'https://vidlink.pro' },
  { id: 'superembed', name: 'SuperEmbed', base: 'https://superembed.stream' },
  { id: 'autoembed', name: 'AutoEmbed', base: 'https://autoembed.co' },
  { id: 'smashystream', name: 'SmashyStream', base: 'https://embed.smashystream.com/playere.php' },
  { id: 'multiembed', name: 'MultiEmbed', base: 'https://multiembed.mov' },
  { id: 'embed_su', name: 'Embed.su', base: 'https://embed.su/embed' },
]

export const useServers = (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number, imdbId?: string) => {
  const [servers, setServers] = useState<Server[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reporting, setReporting] = useState(false)

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
        
        // Vidsrc.to / Pro / VIP / XYZ / In-house
        if (['vidsrc', 'vidsrc_pro', 'vidsrc_vip', 'vidsrc_xyz'].includes(p.id)) {
          url = type === 'movie' 
            ? (imdbId ? `${p.base}/movie/${imdbId}` : `${p.base}/movie/${tmdbId}`)
            : (imdbId ? `${p.base}/tv/${imdbId}/${season}/${episode}` : `${p.base}/tv/${tmdbId}/${season}/${episode}`)
        } 
        // Vidsrc.me (Supports IMDb)
        else if (p.id === 'vidsrc_me') {
          url = type === 'movie'
             ? (imdbId ? `${p.base}/movie?imdb=${imdbId}` : `${p.base}/movie?tmdb=${tmdbId}`)
             : (imdbId ? `${p.base}/tv?imdb=${imdbId}&season=${season}&episode=${episode}` : `${p.base}/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`)
        }
        // Vidsrc.cc
        else if (p.id === 'vidsrc_cc') {
          url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}`
        }
        // VidLink (New)
        else if (p.id === 'vidlink') {
          url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}`
        }
        // SuperEmbed
        else if (p.id === 'superembed') {
           url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}`
        }
        // AutoEmbed
        else if (p.id === 'autoembed') {
          url = type === 'movie'
            ? `${p.base}/movie/tmdb/${tmdbId}`
            : `${p.base}/tv/tmdb/${tmdbId}-${season}-${episode}`
        }
        // SmashyStream
        else if (p.id === 'smashystream') {
          url = type === 'movie'
            ? `${p.base}?tmdb=${tmdbId}`
            : `${p.base}?tmdb=${tmdbId}&season=${season}&episode=${episode}`
        }
        // MultiEmbed
        else if (p.id === 'multiembed') {
           url = type === 'movie'
            ? `${p.base}/directstream.php?video_id=${tmdbId}&tmdb=1`
            : `${p.base}/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
        }
        // Embed.su
        else if (p.id === 'embed_su') {
          url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}`
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
          status: 'unknown',
          responseTime: undefined
        }
      }).filter(Boolean) as Server[]

      if (mounted) {
        setServers(generatedServers)
        setActive(0) 
        setLoading(false)
        
        // 3. Silent Watcher Simulation
        setServers(prev => prev.map(s => ({ ...s, status: 'online' })))
      }
    }

    init()
    return () => { mounted = false }
  }, [tmdbId, type, season, episode, imdbId])

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
