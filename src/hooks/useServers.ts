import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { errorLogger } from '../services/errorLogging'

export type Server = {
  id?: string
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

const generateServerUrl = (p: typeof PROVIDERS[0], type: 'movie' | 'tv', tmdbId: number, season?: number, episode?: number, imdbId?: string) => {
  const query = '?ds_lang=ar'
  if (['vidsrc', 'vidsrc_pro', 'vidsrc_vip', 'vidsrc_xyz', 'vidsrc_icu', 'vidsrc_nl'].includes(p.id)) {
    return type === 'movie' 
      ? (imdbId ? `${p.base}/movie/${imdbId}${query}` : `${p.base}/movie/${tmdbId}${query}`)
      : (imdbId ? `${p.base}/tv/${imdbId}/${season}/${episode}${query}` : `${p.base}/tv/${tmdbId}/${season}/${episode}${query}`)
  } 
  if (p.id === 'vidsrc_me') {
    return type === 'movie'
       ? (imdbId ? `${p.base}/movie?imdb=${imdbId}&sub.lang=ar` : `${p.base}/movie?tmdb=${tmdbId}&sub.lang=ar`)
       : (imdbId ? `${p.base}/tv?imdb=${imdbId}&season=${season}&episode=${episode}&sub.lang=ar` : `${p.base}/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&sub.lang=ar`)
  }
  if (p.id === 'vidsrc_cc') {
    return type === 'movie' ? `${p.base}/movie/${tmdbId}?lang=ar` : `${p.base}/tv/${tmdbId}/${season}/${episode}?lang=ar`
  }
  if (p.id === 'vidlink') {
    return type === 'movie' ? `${p.base}/movie/${tmdbId}?multiLang=true` : `${p.base}/tv/${tmdbId}/${season}/${episode}?multiLang=true`
  }
  if (p.id === 'superembed') {
    return type === 'movie' ? `${p.base}/movie/${tmdbId}?lang=ar` : `${p.base}/tv/${tmdbId}/${season}/${episode}?lang=ar`
  }
  if (p.id === 'autoembed') {
    return type === 'movie' ? `${p.base}/movie/tmdb/${tmdbId}?caption=ar` : `${p.base}/tv/tmdb/${tmdbId}-${season}-${episode}?caption=ar`
  }
  if (p.id === 'smashystream') {
    return type === 'movie' ? `${p.base}?tmdb=${tmdbId}&sub=ar` : `${p.base}?tmdb=${tmdbId}&season=${season}&episode=${episode}&sub=ar`
  }
  if (p.id === 'multiembed') {
    return type === 'movie' ? `${p.base}/directstream.php?video_id=${tmdbId}&tmdb=1&sub_lang=ar` : `${p.base}/directstream.php?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}&sub_lang=ar`
  }
  if (p.id === 'embed_su') {
    return type === 'movie' ? `${p.base}/movie/${tmdbId}?language=ar` : `${p.base}/tv/${tmdbId}/${season}/${episode}?language=ar`
  }
  if (p.id === '2embed') {
    return type === 'movie' ? `${p.base}/${tmdbId}?lang=ar` : `${p.base}/${tmdbId}?s=${season}&e=${episode}&lang=ar`
  }
  return type === 'movie' ? `${p.base}/movie/${tmdbId}` : `${p.base}/tv/${tmdbId}/${season}/${episode}`
}

export const useServers = (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number, imdbId?: string) => {
  const [baseServers, setBaseServers] = useState<Server[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reporting, setReporting] = useState(false)
  const [statuses, setStatuses] = useState<Record<string, Server['status']>>({})

  // content-specific statuses (for this specific movie/episode)
  const [contentStatuses, setContentStatuses] = useState<Record<string, Server['status']>>({})

  // Function to check a single server for the current content
  const checkContentAvailability = async (url: string, id: string) => {
    try {
      // Strategy: Use a timeout to avoid long waits
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      // We use no-cors to at least see if the domain is reachable
      await fetch(url, { 
        mode: 'no-cors', 
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setContentStatuses(prev => ({ ...prev, [id]: 'online' }));
    } catch (e: any) {
      const isOffline = e.name !== 'AbortError';
      const status = isOffline ? 'offline' : 'unknown';
      
      setContentStatuses(prev => ({ ...prev, [id]: status }));

      // Log broken link to database if definitely offline
      if (isOffline) {
        supabase.from('link_checks').upsert({
          content_id: tmdbId,
          content_type: type,
          season_number: season || null,
          episode_number: episode || null,
          source_name: id,
          status_code: 0, // Mark as dead
          last_checked: new Date().toISOString()
        }, { onConflict: 'content_id,source_name,season_number,episode_number' }).then(({ error }) => {
          if (error) console.error('Failed to log broken link:', error);
        });
      }
    }
  }

  // Fetch server statuses on mount
  useEffect(() => {
    // Reset content statuses when content changes
    setContentStatuses({})
  }, [tmdbId, type, season, episode])

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
        let url = generateServerUrl(p, type, tmdbId, season, episode, imdbId)

        // Override with DB link if exists
        if (dbLinks[p.id]) url = dbLinks[p.id]

        if (!url) return null

        const status = statuses[p.id] || 'unknown'
        
        return {
          id: p.id,
          name: p.name,
          url,
          priority: status === 'offline' ? -100 : (10 - idx),
          status,
          responseTime: undefined
        }
      })
      .filter(Boolean) as Server[]

      // Sort by priority (offline servers will be last)
      generatedServers.sort((a, b) => b.priority - a.priority)

      if (mounted) {
        setBaseServers(generatedServers)
        if (active >= generatedServers.length) setActive(0)
        setLoading(false)
      }
    }

    init()
    return () => { mounted = false }
  }, [tmdbId, type, season, episode, imdbId, statuses])

  const reportBroken = async () => {
    setReporting(true)
    const s = finalServers[active]
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
    if (active < finalServers.length - 1) {
      setActive(prev => prev + 1)
    } else {
      setActive(0) // Loop back to start
    }
    setReporting(false)
  }

  // Pre-check for multiple episodes availability (for lists)
  const checkBatchAvailability = async (episodes: { s: number, e: number }[]) => {
    const results: Record<string, boolean> = {}
    
    // Limit batch size to prevent overloading
    const batch = episodes.slice(0, 30)
    
    // Check in chunks of 5 to not hit browser connection limits too hard
    const chunkSize = 5
    for (let i = 0; i < batch.length; i += chunkSize) {
      const chunk = batch.slice(i, i + chunkSize)
      await Promise.all(chunk.map(async (ep) => {
        const key = `${ep.s}-${ep.e}`
        
        // Check top 2 providers for each episode
        const topProviders = PROVIDERS.slice(0, 2)
        let isAvailable = false
        
        for (const p of topProviders) {
          const url = generateServerUrl(p, type, tmdbId, ep.s, ep.e, imdbId)
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 3000)
            
            await fetch(url, { 
              mode: 'no-cors', 
              signal: controller.signal
            })
            
            clearTimeout(timeoutId)
            isAvailable = true
            break // One provider working is enough
          } catch (e) {
            // This provider failed, try next one
          }
        }
        
        results[key] = isAvailable
      }))
    }
    
    return results
  }

  // Calculate final servers list with current statuses
  const finalServers = useMemo(() => {
    if (!baseServers.length) return []
    
    return baseServers.map((s) => ({
      ...s,
      status: contentStatuses[s.id || s.name] || s.status
    })).sort((a, b) => {
      // Offline servers last
      if (a.status === 'offline' && b.status !== 'offline') return 1
      if (a.status !== 'offline' && b.status === 'offline') return -1
      return b.priority - a.priority
    })
  }, [baseServers, contentStatuses])

  // Trigger content checks for all servers in chunks
  useEffect(() => {
    if (finalServers.length > 0 && !loading) {
      const checkAll = async () => {
        // Filter out already checked servers
        const unchecked = finalServers.filter(s => s.id && !contentStatuses[s.id])
        if (unchecked.length === 0) return

        // Check in chunks of 4 to balance speed and connection limits
        const chunkSize = 4
        for (let i = 0; i < unchecked.length; i += chunkSize) {
          const chunk = unchecked.slice(i, i + chunkSize)
          await Promise.all(chunk.map(s => checkContentAvailability(s.url, s.id!)))
        }
      }

      checkAll()
    }
  }, [tmdbId, type, season, episode, finalServers.length, loading])

  return {
    servers: finalServers,
    active,
    setActive,
    loading,
    reportBroken,
    reporting,
    checkBatchAvailability
  }
}
