export type ServerProvider = {
  id: string
  name: string
  base: string
}

export const SERVER_PROVIDERS: ServerProvider[] = [
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

export const DOWNLOAD_SERVER_IDS = ['autoembed_co', 'vidsrc_net', '2embed_cc']

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
  if (type === 'movie') {
    if (lower === 'autoembed_co' || lower === '111movies') {
      return addParamIfMissing(url, 'lang', 'ar')
    }
    return url
  }
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

export const generateServerUrl = (
  provider: ServerProvider,
  type: 'movie' | 'tv',
  tmdbId: number,
  season?: number,
  episode?: number,
  imdbId?: string
) => {
  const s = season || 1
  const e = episode || 1

  if (provider.id === 'smashystream') {
    const url = type === 'movie'
      ? `${provider.base}/movie/${tmdbId}`
      : `${provider.base}/tv/${tmdbId}?season=${s}&episode=${e}`
    return withArabicSubtitleHint(url, provider.id, type)
  }

  if (provider.id === 'autoembed_co') {
    const url = buildAutoEmbedUrl(type, tmdbId, s, e)
    return withArabicSubtitleHint(url, provider.id, type)
  }

  if (provider.id.startsWith('2embed')) {
    const url = type === 'movie' ? `${provider.base}/${tmdbId}` : `${provider.base}/${tmdbId}/${s}/${e}`
    return withArabicSubtitleHint(url, provider.id, type)
  }

  if (provider.id.startsWith('vidsrc_')) {
    if (provider.id === 'vidsrc_cc') {
      const tvId = imdbId || String(tmdbId)
      const url = type === 'movie'
        ? `${provider.base}/movie/${tmdbId}`
        : `${provider.base}/tv/${tvId}?autoPlay=false&s=${s}&e=${e}`
      return withArabicSubtitleHint(url, provider.id, type)
    }
    if (provider.id === 'vidsrc_io') {
      const url = type === 'movie'
        ? `${provider.base}/movie/${tmdbId}`
        : `${provider.base}/tv/${tmdbId}/${s}/${e}`
      return withArabicSubtitleHint(url, provider.id, type)
    }
    const url = type === 'movie'
      ? (imdbId ? `${provider.base}/movie/${imdbId}` : `${provider.base}/movie/${tmdbId}`)
      : (imdbId ? `${provider.base}/tv/${imdbId}/${s}/${e}` : `${provider.base}/tv/${tmdbId}/${s}/${e}`)
    return withArabicSubtitleHint(url, provider.id, type)
  }

  if (provider.id === '111movies') {
    const url = type === 'movie'
      ? `${provider.base}/movie/${tmdbId}`
      : `https://111movies.net/tv/${tmdbId}/${s}/${e}`
    return withArabicSubtitleHint(url, provider.id, type)
  }

  return ''
}

export const buildDlVidsrcUrl = (type: 'movie' | 'tv', tmdbId: number, season: number, episode: number) => {
  if (type === 'movie') return `https://dl.vidsrc.vip/movie/${tmdbId}`
  return `https://dl.vidsrc.vip/tv/${tmdbId}/${season}/${episode}`
}
