import { useEffect, useState } from 'react'

export type Server = {
  id?: string
  name: string
  url: string
  priority: number
  status: 'unknown' | 'online' | 'offline' | 'degraded'
  responseTime?: number
}

// ------------------------------------------------------------------
// CURATED SERVER LIST - FINAL ORDER (USER SPECIFIED)
// ------------------------------------------------------------------
const PROVIDERS = [
  { id: 'autoembed_co', name: 'AutoEmbed Co', base: 'https://autoembed.co/movie/tmdb' },
  { id: 'vidsrc_net', name: 'VidSrc.net', base: 'https://vidsrc.net/embed' },
  { id: '2embed_cc', name: '2Embed.cc', base: 'https://www.2embed.cc/embed' },
  { id: '111movies', name: '111Movies', base: 'https://111movies.com' },
  { id: 'smashystream', name: 'SmashyStream', base: 'https://player.smashy.stream' },
  { id: 'vidsrc_io', name: 'VidSrc.io', base: 'https://vidsrc.io/embed' },
  { id: 'vidsrc_cc', name: 'VidSrc.cc', base: 'https://vidsrc.cc/v2/embed' },
  { id: 'vidsrc_xyz', name: 'VidSrc.xyz', base: 'https://vidsrc.xyz/embed' },
  { id: '2embed_skin', name: '2Embed.skin', base: 'https://www.2embed.skin/embed' },
  { id: 'vidsrc_me', name: 'VidSrc.me', base: 'https://vidsrc.me/embed' },
  { id: 'vidsrc_vip', name: 'VidSrc.vip', base: 'https://vidsrc.vip/embed' },
]
const DOWNLOAD_SERVER_IDS = ['autoembed_co', 'vidsrc_net', '2embed_cc']

const buildAutoEmbedUrl = (type: 'movie' | 'tv', tmdbId: number, season: number, episode: number) => {
  if (type === 'movie') return `https://autoembed.co/movie/tmdb/${tmdbId}`
  return `https://autoembed.co/tv/tmdb/${tmdbId}-${season}-${episode}`
}

const addParamIfMissing = (url: string, key: string, value: string) => {
  const hasParam = new RegExp(`([?&])${key}=`, 'i').test(url)
  if (hasParam) return url
  const sep = url.includes('?') ? '&' : (url.includes('&season=') && !url.includes('?') ? '&' : '?')
  return `${url}${sep}${key}=${value}`
}

const withArabicSubtitleHint = (url: string, providerId: string, type: 'movie' | 'tv') => {
  const lower = providerId.toLowerCase()
  // Movies: Only safe providers get params automatically
  if (type === 'movie') {
    if (lower === 'autoembed_co' || lower === '111movies') {
      return addParamIfMissing(url, 'lang', 'ar')
    }
    return url
  }
  // TV Shows: Apply full subtitle logic
  if (lower === 'smashystream' && url.includes('&season=') && !url.includes('?')) {
    return `${url}&sub=ar`
  }
  if (lower.startsWith('vidsrc_')) {
    let next = url
    next = addParamIfMissing(next, 'subtitles', 'ar')
    next = addParamIfMissing(next, 'lang', 'ar')
    return next
  }
  if (lower === 'autoembed_co') {
    let next = url
    next = addParamIfMissing(next, 'lang', 'ar')
    next = addParamIfMissing(next, 'subtitles', 'ar')
    return next
  }
  if (lower.startsWith('2embed')) {
    let next = url
    next = addParamIfMissing(next, 'subtitles', 'ar')
    next = addParamIfMissing(next, 'lang', 'ar')
    return next
  }
  if (lower === '111movies') {
    return addParamIfMissing(url, 'lang', 'ar')
  }
  if (lower === 'smashystream' || lower === 'moviebox' || lower === 'streamwish') {
    let next = url
    next = addParamIfMissing(next, 'sub', 'ar')
    next = addParamIfMissing(next, 'lang', 'ar')
    return next
  }
  return url
}

const generateServerUrl = (p: typeof PROVIDERS[0], type: 'movie' | 'tv', tmdbId: number, season?: number, episode?: number, imdbId?: string) => {
  const s = season || 1
  const e = episode || 1

  if (p.id === 'smashystream') {
    const url = type === 'movie'
      ? `${p.base}/movie/${tmdbId}`
      : `${p.base}/tv/${tmdbId}&season=${s}&episode=${e}`
    return withArabicSubtitleHint(url, p.id, type)
  }

  if (p.id === 'moviebox') {
    const url = type === 'movie'
      ? `${p.base}/movie/${tmdbId}`
      : `${p.base}/tv/${tmdbId}/${s}/${e}`
    return withArabicSubtitleHint(url, p.id, type)
  }

  if (p.id === 'streamwish') {
    const url = type === 'movie'
      ? `${p.base}/e/${tmdbId}`
      : `${p.base}/e/${tmdbId}?season=${s}&episode=${e}`
    return withArabicSubtitleHint(url, p.id, type)
  }

  if (p.id === 'autoembed_co') {
      const url = buildAutoEmbedUrl(type, tmdbId, s, e)
      return withArabicSubtitleHint(url, p.id, type)
  }

  // 2. DatabaseGDrive (Special Pattern)
  if (p.id === 'database_gdrive') {
      const url = `https://databasegdriveplayer.co/player.php?tmdb=${tmdbId}${type === 'tv' ? `&s=${s}&e=${e}` : ''}`
      return withArabicSubtitleHint(url, p.id, type)
  }

  // 3. 2Embed Family
  if (p.id.startsWith('2embed')) {
     const url = type === 'movie' ? `${p.base}/${tmdbId}` : `${p.base}/${tmdbId}/${s}/${e}`
     return withArabicSubtitleHint(url, p.id, type)
  }

  // 4. VidSrc Family (Standard Pattern)
  if (p.id.startsWith('vidsrc_')) {
    if (p.id === 'vidsrc_cc') {
        const tvId = imdbId || String(tmdbId)
        const url = type === 'movie'
           ? `${p.base}/movie/${tmdbId}`
           : `${p.base}/tv/${tvId}?autoPlay=false&s=${s}&e=${e}`
        return withArabicSubtitleHint(url, p.id, type)
    }
    if (p.id === 'vidsrc_to') {
        const url = type === 'movie' 
           ? `${p.base}/movie/${tmdbId}` 
           : `${p.base}/tv/${tmdbId}/${s}/${e}`
        return withArabicSubtitleHint(url, p.id, type)
    }
    if (p.id === 'vidsrc_io') {
         const url = type === 'movie' 
           ? `${p.base}/movie/${tmdbId}` 
           : `${p.base}/tv/${tmdbId}/${s}/${e}`
         return withArabicSubtitleHint(url, p.id, type)
    }
    // Standard vidsrc
    const url = type === 'movie' 
       ? (imdbId ? `${p.base}/movie/${imdbId}` : `${p.base}/movie/${tmdbId}`)
       : (imdbId ? `${p.base}/tv/${imdbId}/${s}/${e}` : `${p.base}/tv/${tmdbId}/${s}/${e}`)
    return withArabicSubtitleHint(url, p.id, type)
  }

  // 5. MultiEmbed
  if (p.id === 'multiembed') {
      const url = `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1${type === 'tv' ? `&s=${s}&e=${e}` : ''}`
      return withArabicSubtitleHint(url, p.id, type)
  }

  // 6. 111Movies
  if (p.id === '111movies') {
      const url = type === 'movie' 
         ? `${p.base}/movie/${tmdbId}` 
         : `https://111movies.net/tv/${tmdbId}/${s}/${e}`
      return withArabicSubtitleHint(url, p.id, type)
  }

  // 7. VidLink
  if (p.id === 'vidlink') {
     const url = type === 'movie' 
        ? `${p.base}/movie/${tmdbId}` 
        : `${p.base}/tv/${tmdbId}/${s}/${e}`
     return withArabicSubtitleHint(url, p.id, type)
  }

  return ''
}

export const useServers = (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number, imdbId?: string) => {
  const [baseServers, setBaseServers] = useState<Server[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)

  // Initialize providers
  useEffect(() => {
    const allServers = PROVIDERS.map((p, index) => ({
      name: p.name,
      url: generateServerUrl(p, type, tmdbId, season, episode, imdbId),
      priority: index,
      status: 'online' as const,
      id: p.id
    })).filter(s => Boolean(s.url))
    setBaseServers(allServers)
    setActive(0)
    setLoading(false)
  }, [tmdbId, type, season, episode, imdbId])

  const reportServer = () => {}

  const checkBatchAvailability = async (
    items: Array<{ s: number; e: number }>
  ): Promise<Record<string, boolean>> => {
    const results: Record<string, boolean> = {}
    items.forEach(({ s, e }) => {
      results[`${s}-${e}`] = true
    })
    return results
  }

  const setActiveSafe = (next: number) => {
    if (next < 0 || next >= baseServers.length) return
    setActive(next)
  }

  const activeServer = baseServers[active]
  const downloadServers = DOWNLOAD_SERVER_IDS
    .map((id) => baseServers.find((server) => server.id === id))
    .filter((server): server is Server => Boolean(server))
    .slice(0, 3)

  return {
    servers: baseServers,
    downloadServers,
    activeServer,
    setActiveServer: setActiveSafe,
    active,
    setActive: setActiveSafe,
    loading,
    reportServer,
    reportBroken: reportServer,
    reporting: false,
    checkBatchAvailability
  }
}
