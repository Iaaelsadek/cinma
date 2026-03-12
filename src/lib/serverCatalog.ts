export type ServerProvider = {
  id: string
  name: string
  base: string
  movie_template?: string | null
  tv_template?: string | null
  is_active?: boolean
  supports_movie?: boolean
  supports_tv?: boolean
  is_download?: boolean
  priority?: number
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

const CANONICAL_PROVIDER_BASES: Record<string, string> = {
  autoembed_co: 'https://autoembed.co',
  vidsrc_net: 'https://vidsrc.net/embed',
  vidsrc_io: 'https://vidsrc.io/embed',
  vidsrc_cc: 'https://vidsrc.cc/v2/embed',
  vidsrc_xyz: 'https://vidsrc.xyz/embed',
  vidsrc_me: 'https://vidsrc.me/embed',
  vidsrc_vip: 'https://vidsrc.vip/embed',
  '2embed_cc': 'https://www.2embed.cc/embed',
  '2embed_skin': 'https://www.2embed.skin/embed',
  smashystream: 'https://player.smashy.stream',
  '111movies': 'https://111movies.com'
}

const resolveProviderBase = (provider: ServerProvider) => {
  const canonical = CANONICAL_PROVIDER_BASES[provider.id]
  return canonical || provider.base
}

const EMBED_BLOCKED_HOST_PATTERNS = [
  'd1vidsrc.'
]

const isKnownBlockedEmbedHost = (url: string) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
    return EMBED_BLOCKED_HOST_PATTERNS.some((pattern) => host.includes(pattern))
  } catch {
    return false
  }
}

const buildVidRockUrl = (type: 'movie' | 'tv', tmdbId: number, season: number, episode: number) => {
  if (type === 'movie') return `https://vidrock.net/movie/${tmdbId}`
  return `https://vidrock.net/tv/${tmdbId}/${season}/${episode}`
}

const LEGACY_VIDSRC_HOSTS = [
  'vidsrc.net',
  'vidsrc.me',
  'vidsrc.vip',
  'vidsrc.io',
  'vidsrc.xyz',
  'vidsrc.cc',
  '2embed.cc',
  '2embed.skin',
  'vsembed.ru',
  'vsembed.su',
  'vidsrcme.ru'
]

const shouldFallbackToVidRock = (url: string) => {
  return false // Disable fallback to VidRock as it might be blocking localhost
  /*
  if (!url) return true
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase()
    if (LEGACY_VIDSRC_HOSTS.includes(host)) return true
    if (host.includes('vidsrc')) return true
    return false
  } catch {
    return false
  }
  */
}

const buildAutoEmbedUrl = (base: string, type: 'movie' | 'tv', tmdbId: number, season: number, episode: number) => {
  if (type === 'movie') return `${base}/movie/tmdb/${tmdbId}`
  return `${base}/tv/tmdb/${tmdbId}-${season}-${episode}`
}

const addParamIfMissing = (url: string, key: string, value: string) => {
  const hasParam = new RegExp(`([?&])${key}=`, 'i').test(url)
  if (hasParam) return url
  const sep = url.includes('?') ? '&' : (url.includes('&season=') && !url.includes('?') ? '&' : '?')
  return `${url}${sep}${key}=${value}`
}

const withArabicSubtitleHint = (url: string, providerId: string, type: 'movie' | 'tv', lang: string = 'ar') => {
  if (!lang) return url
  const lower = providerId.toLowerCase()
  if (type === 'movie') {
    if (lower === 'autoembed_co' || lower === '111movies') {
      return addParamIfMissing(url, 'lang', lang)
    }
    return url
  }
  if (lower === 'smashystream' && url.includes('&season=') && !url.includes('?')) {
    return `${url}&sub=${lang}`
  }
  if (lower.startsWith('vidsrc_')) {
    let next = url
    next = addParamIfMissing(next, 'subtitles', lang)
    next = addParamIfMissing(next, 'lang', lang)
    return next
  }
  if (lower === 'autoembed_co') {
    let next = url
    next = addParamIfMissing(next, 'lang', lang)
    next = addParamIfMissing(next, 'subtitles', lang)
    return next
  }
  if (lower.startsWith('2embed')) {
    let next = url
    next = addParamIfMissing(next, 'subtitles', lang)
    next = addParamIfMissing(next, 'lang', lang)
    return next
  }
  if (lower === '111movies') {
    return addParamIfMissing(url, 'lang', lang)
  }
  if (lower === 'smashystream' || lower === 'moviebox' || lower === 'streamwish') {
    let next = url
    next = addParamIfMissing(next, 'sub', lang)
    next = addParamIfMissing(next, 'lang', lang)
    return next
  }
  return url
}

const renderTemplate = (
  template: string,
  type: 'movie' | 'tv',
  tmdbId: number,
  season: number,
  episode: number,
  imdbId?: string,
  lang: string = 'ar'
) => {
  const replacements: Record<string, string> = {
    '{tmdbId}': String(tmdbId),
    '{imdbId}': imdbId || String(tmdbId),
    '{season}': String(season),
    '{episode}': String(episode),
    '{type}': type,
    '{lang}': lang
  }
  let output = template
  Object.entries(replacements).forEach(([key, value]) => {
    output = output.split(key).join(value)
  })
  return output
}

const isUsableTemplateUrl = (value: string) => {
  const raw = value.trim()
  if (!raw) return false
  if (raw.includes('...')) return false
  try {
    const parsed = new URL(raw)
    const host = parsed.hostname.replace(/^www\./i, '')
    if (!host || host === '...') return false
    if (isKnownBlockedEmbedHost(raw)) return false
    return true
  } catch {
    return false
  }
}

export const generateServerUrl = (
  provider: ServerProvider,
  type: 'movie' | 'tv',
  tmdbId: number,
  season?: number,
  episode?: number,
  imdbId?: string,
  options?: { language?: string; disableFallback?: boolean }
) => {
  const s = season || 1
  const e = episode || 1
  const language = options?.language ?? 'ar'
  const disableFallback = options?.disableFallback === true
  const base = resolveProviderBase(provider)
  const maybeFallback = (url: string) => {
    if (isKnownBlockedEmbedHost(url)) return ''
    return disableFallback ? url : (shouldFallbackToVidRock(url) ? buildVidRockUrl(type, tmdbId, s, e) : url)
  }
  const customTemplate = type === 'movie' ? provider.movie_template : provider.tv_template
  if (customTemplate && customTemplate.trim()) {
    const rendered = renderTemplate(customTemplate, type, tmdbId, s, e, imdbId, language)
    if (isUsableTemplateUrl(rendered)) {
      return maybeFallback(rendered)
    }
  }

  if (provider.id === 'smashystream') {
    const tvBase = 'https://smashy.stream'
    const url = type === 'movie'
      ? `${provider.base}/movie/${tmdbId}`
      : `${tvBase}/tv/${tmdbId}/${s}/${e}/player`
    if (type === 'tv') return url
    return withArabicSubtitleHint(url, provider.id, type, language)
  }

  if (provider.id === 'autoembed_co') {
    const url = buildAutoEmbedUrl(base, type, tmdbId, s, e)
    return withArabicSubtitleHint(url, provider.id, type, language)
  }

  if (provider.id.startsWith('2embed')) {
    const url = type === 'movie' ? `${base}/${tmdbId}` : `${base}/${tmdbId}/${s}/${e}`
    const hinted = withArabicSubtitleHint(url, provider.id, type, language)
    return maybeFallback(hinted)
  }

  if (provider.id.startsWith('vidsrc_')) {
    if (provider.id === 'vidsrc_cc') {
      const url = type === 'movie'
        ? `${base}/movie/${tmdbId}`
        : `${base}/tv/${tmdbId}?autoPlay=false&s=${s}&e=${e}`
      const hinted = withArabicSubtitleHint(url, provider.id, type, language)
      return maybeFallback(hinted)
    }
    if (provider.id === 'vidsrc_io') {
      const url = type === 'movie'
        ? `${base}/movie/${tmdbId}`
        : `${base}/tv/${tmdbId}/${s}/${e}`
      const hinted = withArabicSubtitleHint(url, provider.id, type, language)
      return maybeFallback(hinted)
    }
    const url = type === 'movie'
      ? `${base}/movie/${tmdbId}`
      : `${base}/tv/${tmdbId}/${s}/${e}`
    const hinted = withArabicSubtitleHint(url, provider.id, type, language)
    return maybeFallback(hinted)
  }

  if (provider.id === '111movies') {
    const url = type === 'movie'
      ? `${base}/movie/${tmdbId}`
      : `https://111movies.net/tv/${tmdbId}/${s}/${e}`
    return withArabicSubtitleHint(url, provider.id, type, language)
  }

  return ''
}

export const buildDlVidsrcUrl = (type: 'movie' | 'tv', tmdbId: number, season: number, episode: number) => {
  if (type === 'movie') return `https://dl.vidsrc.vip/movie/${tmdbId}`
  return `https://dl.vidsrc.vip/tv/${tmdbId}/${season}/${episode}`
}
