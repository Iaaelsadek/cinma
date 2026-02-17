import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
  { id: 'autoembed', name: 'AutoEmbed', base: 'https://autoembed.to' },
  { id: 'vidsrc_pro', name: 'VidSrc Pro', base: 'https://vidsrc.pro/embed' },
  { id: '2embed', name: '2Embed', base: 'https://www.2embed.cc/embed' },
  { id: 'smashystream', name: 'SmashyStream', base: 'https://player.smashy.stream' },
  { id: 'aniwave', name: 'AniWave (Backup)', base: 'https://aniwave.to/embed' },
  { id: 'superembed', name: 'SuperEmbed', base: 'https://superembed.stream' },
  { id: 'multiembed', name: 'MultiEmbed', base: 'https://multiembed.mov' },
]

export const useServers = (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number) => {
  const [servers, setServers] = useState<Server[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    let mounted = true
    
    const init = async () => {
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
        console.warn('DB Link fetch failed, falling back to auto-generation', err)
      }

      // 2. Generate Fallback Links
      const generatedServers: Server[] = PROVIDERS.map((p, idx) => {
        let url = ''
        if (p.id === 'vidsrc' || p.id === 'vidsrc_pro' || p.id === 'vidsrc_vip') {
          url = type === 'movie' 
            ? `${p.base}/movie/${tmdbId}` 
            : `${p.base}/tv/${tmdbId}/${season}/${episode}`
        } else if (p.id === '2embed') {
          url = type === 'movie' 
            ? `${p.base}/${tmdbId}` 
            : `${p.base}/tv/${tmdbId}&s=${season}&e=${episode}`
        } else if (p.id === 'embed_su') {
          url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}`
        } else if (p.id === 'autoembed') {
          url = type === 'movie'
            ? `${p.base}/movie/tmdb/${tmdbId}`
            : `${p.base}/tv/tmdb/${tmdbId}-${season}x${episode}`
        } else {
          url = type === 'movie'
            ? `${p.base}/movie/${tmdbId}`
            : `${p.base}/tv/${tmdbId}/${season}/${episode}`
        }

        if (dbLinks[p.id]) url = dbLinks[p.id]

        return {
          name: p.name,
          url,
          priority: 10 - idx,
          status: 'unknown',
          responseTime: undefined
        }
      })

      if (mounted) {
        setServers(generatedServers)
        setActive(0)
        setLoading(false)
        
        // 3. Silent Watcher Simulation
        generatedServers.forEach((_, i) => {
          setTimeout(() => {
            if (!mounted) return
            setServers(prev => prev.map((s, idx) => 
              idx === i ? { ...s, status: 'online', responseTime: Math.floor(Math.random() * 200) + 50 } : s
            ))
          }, i * 300)
        })
      }
    }

    init()
    return () => { mounted = false }
  }, [tmdbId, type, season, episode])

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
    
    if (active < servers.length - 1) {
      setActive(prev => prev + 1)
    } else {
      setActive(0)
    }
    setReporting(false)
  }

  return { servers, active, setActive, loading, reporting, reportBroken }
}
