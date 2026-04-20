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
  // VidSrc Family (most reliable first)
  { id: 'vidsrc_vip', name: 'VidSrc.vip', base: 'https://vidrock.net/embed' },
  { id: 'vidsrc_net', name: 'VidSrc.net', base: 'https://vidsrc.net/embed' },
  { id: 'vidsrc_io', name: 'VidSrc.io', base: 'https://vidsrc.io/embed' },
  { id: 'vidsrc_cc', name: 'VidSrc.cc', base: 'https://vidsrc.cc/v2/embed' },
  { id: 'vidsrc_xyz', name: 'VidSrc.xyz', base: 'https://vidsrc.xyz/embed' },
  { id: 'vidsrc_me', name: 'VidSrc.me', base: 'https://vidsrc.me/embed' },
  { id: 'vidsrc_to', name: 'VidSrc.to', base: 'https://vidsrc.to/embed' },
  { id: 'vidsrc_pm', name: 'VidSrc.pm', base: 'https://vidsrc.pm/embed' },
  { id: 'vidsrc_rip', name: 'VidSrc.rip', base: 'https://vidsrc.rip/embed' },
  { id: 'vidsrc_in', name: 'VidSrc.in', base: 'https://vidsrc.in/embed' },

  // 2Embed Family (6)
  { id: '2embed_cc', name: '2Embed.cc', base: 'https://www.2embed.cc/embed' },
  { id: '2embed_skin', name: '2Embed.skin', base: 'https://www.2embed.skin/embed' },
  { id: '2embed_to', name: '2Embed.to', base: 'https://www.2embed.to/embed' },
  { id: '2embed_org', name: '2Embed.org', base: 'https://www.2embed.org/embed' },
  { id: '2embed_stream', name: '2Embed.stream', base: 'https://www.2embed.stream/embed' },
  { id: '2embed_ru', name: '2Embed.ru', base: 'https://www.2embed.ru/embed' },

  // AutoEmbed Family (3)
  { id: 'autoembed_co', name: 'AutoEmbed.co', base: 'https://autoembed.co/movie/tmdb' },
  { id: 'autoembed_cc', name: 'AutoEmbed.cc', base: 'https://autoembed.cc/movie/tmdb' },
  { id: 'autoembed_to', name: 'AutoEmbed.to', base: 'https://autoembed.to/movie/tmdb' },

  // Embed Family (5)
  { id: 'embedsu', name: 'Embed.su', base: 'https://embed.su/embed' },
  { id: 'embedflix', name: 'EmbedFlix', base: 'https://embedflix.net/embed' },
  { id: 'embedto', name: 'Embed.to', base: 'https://embed.to/embed' },
  { id: 'embedme', name: 'Embed.me', base: 'https://embed.me/embed' },
  { id: 'embedstream', name: 'EmbedStream', base: 'https://embedstream.me/embed' },

  // Multi/Super Embed (4)
  { id: 'multiembed', name: 'MultiEmbed', base: 'https://multiembed.mov/directstream.php' },
  { id: 'superembed', name: 'SuperEmbed', base: 'https://multiembed.mov' },
  { id: 'multimovies', name: 'MultiMovies', base: 'https://multimovies.cloud/embed' },
  { id: 'superstream', name: 'SuperStream', base: 'https://superstream.site/embed' },

  // Movies Sites (6)
  { id: '111movies', name: '111Movies', base: 'https://111movies.com' },
  { id: 'moviesapi', name: 'MoviesAPI', base: 'https://moviesapi.club/movie' },
  { id: 'moviee', name: 'Moviee', base: 'https://moviee.tv/embed' },
  { id: 'movieshd', name: 'MoviesHD', base: 'https://movieshd.watch/embed' },
  { id: 'moviebox', name: 'MovieBox', base: 'https://moviebox.pro/embed' },
  { id: 'movienight', name: 'MovieNight', base: 'https://movienight.stream/embed' },

  // Streaming Services (8)
  { id: 'smashystream', name: 'SmashyStream', base: 'https://player.smashy.stream' },
  { id: 'vidlink', name: 'VidLink', base: 'https://vidlink.pro/movie' },
  { id: 'vidcloud', name: 'VidCloud', base: 'https://vidcloud.pro/embed' },
  { id: 'streamtape', name: 'StreamTape', base: 'https://streamtape.com/e' },
  { id: 'streamwish', name: 'StreamWish', base: 'https://streamwish.to/e' },
  { id: 'doodstream', name: 'DoodStream', base: 'https://dood.to/e' },
  { id: 'upstream', name: 'UpStream', base: 'https://upstream.to/embed' },
  { id: 'mixdrop', name: 'MixDrop', base: 'https://mixdrop.co/e' },

  // International (8)
  { id: 'nontonGo', name: 'NontonGo', base: 'https://www.NontonGo.win/embed' },
  { id: 'ridomovies', name: 'RidoMovies', base: 'https://ridomovies.tv/embed' },
  { id: 'warezcdn', name: 'WarezCDN', base: 'https://warezcdn.com/embed' },
  { id: 'vidshar', name: 'VidShar', base: 'https://vidshar.org/embed' },
  { id: 'filemoon', name: 'FileMoon', base: 'https://filemoon.sx/e' },
  { id: 'streamvid', name: 'StreamVid', base: 'https://streamvid.net/embed' },
  { id: 'vidmoly', name: 'VidMoly', base: 'https://vidmoly.to/embed' },
  { id: 'voe', name: 'VOE', base: 'https://voe.sx/e' },

  // VidSrc Extended Family (20)
  { id: 'vidsrc_pro', name: 'VidSrc.pro', base: 'https://vidsrc.pro/embed' },
  { id: 'vidsrc_stream', name: 'VidSrc.stream', base: 'https://vidsrc.stream/embed' },
  { id: 'vidsrc_icu', name: 'VidSrc.icu', base: 'https://vidsrc.icu/embed' },
  { id: 'vidsrc_nl', name: 'VidSrc.nl', base: 'https://vidsrc.nl/embed' },
  { id: 'vidsrc_im', name: 'VidSrc.im', base: 'https://vidsrc.im/embed' },
  { id: 'vidsrc_dev', name: 'VidSrc.dev', base: 'https://vidsrc.dev/embed' },
  { id: 'vidsrc_nz', name: 'VidSrc.nz', base: 'https://vidsrc.nz/embed' },
  { id: 'vidsrc_pk', name: 'VidSrc.pk', base: 'https://vidsrc.pk/embed' },
  { id: 'vidsrc_one', name: 'VidSrc.one', base: 'https://vidsrc.one/embed' },
  { id: 'vidsrc_site', name: 'VidSrc.site', base: 'https://vidsrc.site/embed' },
  { id: 'vidsrc_online', name: 'VidSrc.online', base: 'https://vidsrc.online/embed' },
  { id: 'vidsrc_tv', name: 'VidSrc.tv', base: 'https://vidsrc.tv/embed' },
  { id: 'vidsrc_app', name: 'VidSrc.app', base: 'https://vidsrc.app/embed' },
  { id: 'vidsrc_live', name: 'VidSrc.live', base: 'https://vidsrc.live/embed' },
  { id: 'vidsrc_watch', name: 'VidSrc.watch', base: 'https://vidsrc.watch/embed' },
  { id: 'vidsrc_fun', name: 'VidSrc.fun', base: 'https://vidsrc.fun/embed' },
  { id: 'vidsrc_tech', name: 'VidSrc.tech', base: 'https://vidsrc.tech/embed' },
  { id: 'vidsrc_club', name: 'VidSrc.club', base: 'https://vidsrc.club/embed' },
  { id: 'vidsrc_world', name: 'VidSrc.world', base: 'https://vidsrc.world/embed' },
  { id: 'vidsrc_space', name: 'VidSrc.space', base: 'https://vidsrc.space/embed' },

  // 2Embed Extended (15)
  { id: '2embed_net', name: '2Embed.net', base: 'https://www.2embed.net/embed' },
  { id: '2embed_xyz', name: '2Embed.xyz', base: 'https://www.2embed.xyz/embed' },
  { id: '2embed_io', name: '2Embed.io', base: 'https://www.2embed.io/embed' },
  { id: '2embed_me', name: '2Embed.me', base: 'https://www.2embed.me/embed' },
  { id: '2embed_vip', name: '2Embed.vip', base: 'https://www.2embed.vip/embed' },
  { id: '2embed_pro', name: '2Embed.pro', base: 'https://www.2embed.pro/embed' },
  { id: '2embed_online', name: '2Embed.online', base: 'https://www.2embed.online/embed' },
  { id: '2embed_tv', name: '2Embed.tv', base: 'https://www.2embed.tv/embed' },
  { id: '2embed_watch', name: '2Embed.watch', base: 'https://www.2embed.watch/embed' },
  { id: '2embed_site', name: '2Embed.site', base: 'https://www.2embed.site/embed' },
  { id: '2embed_app', name: '2Embed.app', base: 'https://www.2embed.app/embed' },
  { id: '2embed_fun', name: '2Embed.fun', base: 'https://www.2embed.fun/embed' },
  { id: '2embed_live', name: '2Embed.live', base: 'https://www.2embed.live/embed' },
  { id: '2embed_tech', name: '2Embed.tech', base: 'https://www.2embed.tech/embed' },
  { id: '2embed_space', name: '2Embed.space', base: 'https://www.2embed.space/embed' },

  // Embed Extended (20)
  { id: 'embed_watch', name: 'Embed.watch', base: 'https://embed.watch/embed' },
  { id: 'embed_fun', name: 'Embed.fun', base: 'https://embed.fun/embed' },
  { id: 'embed_pro', name: 'Embed.pro', base: 'https://embed.pro/embed' },
  { id: 'embed_vip', name: 'Embed.vip', base: 'https://embed.vip/embed' },
  { id: 'embed_online', name: 'Embed.online', base: 'https://embed.online/embed' },
  { id: 'embed_tv', name: 'Embed.tv', base: 'https://embed.tv/embed' },
  { id: 'embed_site', name: 'Embed.site', base: 'https://embed.site/embed' },
  { id: 'embed_app', name: 'Embed.app', base: 'https://embed.app/embed' },
  { id: 'embed_live', name: 'Embed.live', base: 'https://embed.live/embed' },
  { id: 'embed_tech', name: 'Embed.tech', base: 'https://embed.tech/embed' },
  { id: 'embed_space', name: 'Embed.space', base: 'https://embed.space/embed' },
  { id: 'embed_world', name: 'Embed.world', base: 'https://embed.world/embed' },
  { id: 'embed_club', name: 'Embed.club', base: 'https://embed.club/embed' },
  { id: 'embed_stream', name: 'Embed.stream', base: 'https://embed.stream/embed' },
  { id: 'embed_icu', name: 'Embed.icu', base: 'https://embed.icu/embed' },
  { id: 'embed_im', name: 'Embed.im', base: 'https://embed.im/embed' },
  { id: 'embed_dev', name: 'Embed.dev', base: 'https://embed.dev/embed' },
  { id: 'embed_one', name: 'Embed.one', base: 'https://embed.one/embed' },
  { id: 'embed_pk', name: 'Embed.pk', base: 'https://embed.pk/embed' },
  { id: 'embed_nl', name: 'Embed.nl', base: 'https://embed.nl/embed' },

  // Movie Sites Extended (25)
  { id: 'movies7', name: 'Movies7', base: 'https://movies7.to/embed' },
  { id: 'movies123', name: 'Movies123', base: 'https://movies123.net/embed' },
  { id: 'movies4u', name: 'Movies4u', base: 'https://movies4u.vip/embed' },
  { id: 'moviesjoy', name: 'MoviesJoy', base: 'https://moviesjoy.to/embed' },
  { id: 'moviesbay', name: 'MoviesBay', base: 'https://moviesbay.live/embed' },
  { id: 'moviesflix', name: 'MoviesFlix', base: 'https://moviesflix.pro/embed' },
  { id: 'movieshub', name: 'MoviesHub', base: 'https://movieshub.vip/embed' },
  { id: 'moviesland', name: 'MoviesLand', base: 'https://moviesland.site/embed' },
  { id: 'moviesverse', name: 'MoviesVerse', base: 'https://moviesverse.com/embed' },
  { id: 'moviesworld', name: 'MoviesWorld', base: 'https://moviesworld.fun/embed' },
  { id: 'moviestream', name: 'MovieStream', base: 'https://moviestream.to/embed' },
  { id: 'movieplay', name: 'MoviePlay', base: 'https://movieplay.online/embed' },
  { id: 'moviewatch', name: 'MovieWatch', base: 'https://moviewatch.app/embed' },
  { id: 'moviefree', name: 'MovieFree', base: 'https://moviefree.site/embed' },
  { id: 'movieonline', name: 'MovieOnline', base: 'https://movieonline.io/embed' },
  { id: 'movieplus', name: 'MoviePlus', base: 'https://movieplus.watch/embed' },
  { id: 'moviemax', name: 'MovieMax', base: 'https://moviemax.pro/embed' },
  { id: 'moviepro', name: 'MoviePro', base: 'https://moviepro.app/embed' },
  { id: 'movievip', name: 'MovieVIP', base: 'https://movievip.site/embed' },
  { id: 'movieclub', name: 'MovieClub', base: 'https://movieclub.tv/embed' },
  { id: 'moviespace', name: 'MovieSpace', base: 'https://moviespace.watch/embed' },
  { id: 'movietech', name: 'MovieTech', base: 'https://movietech.site/embed' },
  { id: 'movielive', name: 'MovieLive', base: 'https://movielive.fun/embed' },
  { id: 'moviefun', name: 'MovieFun', base: 'https://moviefun.app/embed' },
  { id: 'moviesite', name: 'MovieSite', base: 'https://moviesite.pro/embed' },

  // Streaming Extended (30)
  { id: 'streamplay', name: 'StreamPlay', base: 'https://streamplay.to/e' },
  { id: 'streamhub', name: 'StreamHub', base: 'https://streamhub.to/e' },
  { id: 'streamflix', name: 'StreamFlix', base: 'https://streamflix.one/e' },
  { id: 'streamvid_pro', name: 'StreamVid Pro', base: 'https://streamvid.pro/e' },
  { id: 'streamfast', name: 'StreamFast', base: 'https://streamfast.live/e' },
  { id: 'streammax', name: 'StreamMax', base: 'https://streammax.fun/e' },
  { id: 'streamplus', name: 'StreamPlus', base: 'https://streamplus.site/e' },
  { id: 'streamvip', name: 'StreamVIP', base: 'https://streamvip.cc/e' },
  { id: 'streamclub', name: 'StreamClub', base: 'https://streamclub.xyz/e' },
  { id: 'streamworld', name: 'StreamWorld', base: 'https://streamworld.fun/e' },
  { id: 'streamspace', name: 'StreamSpace', base: 'https://streamspace.xyz/e' },
  { id: 'streamtech', name: 'StreamTech', base: 'https://streamtech.site/e' },
  { id: 'streamlive', name: 'StreamLive', base: 'https://streamlive.to/e' },
  { id: 'streamfun', name: 'StreamFun', base: 'https://streamfun.xyz/e' },
  { id: 'streamsite', name: 'StreamSite', base: 'https://streamsite.pro/e' },
  { id: 'streamonline', name: 'StreamOnline', base: 'https://streamonline.to/e' },
  { id: 'streamwatch', name: 'StreamWatch', base: 'https://streamwatch.app/e' },
  { id: 'streamfree', name: 'StreamFree', base: 'https://streamfree.site/e' },
  { id: 'streampro', name: 'StreamPro', base: 'https://streampro.cc/e' },
  { id: 'streamapp', name: 'StreamApp', base: 'https://streamapp.xyz/e' },
  { id: 'vidstream', name: 'VidStream', base: 'https://vidstream.pro/e' },
  { id: 'vidplay', name: 'VidPlay', base: 'https://vidplay.site/e' },
  { id: 'vidhub', name: 'VidHub', base: 'https://vidhub.to/e' },
  { id: 'vidmax', name: 'VidMax', base: 'https://vidmax.pro/e' },
  { id: 'vidplus', name: 'VidPlus', base: 'https://vidplus.site/e' },
  { id: 'vidvip', name: 'VidVIP', base: 'https://vidvip.cc/e' },
  { id: 'vidclub', name: 'VidClub', base: 'https://vidclub.xyz/e' },
  { id: 'vidworld', name: 'VidWorld', base: 'https://vidworld.fun/e' },
  { id: 'vidspace', name: 'VidSpace', base: 'https://vidspace.xyz/e' },
  { id: 'vidtech', name: 'VidTech', base: 'https://vidtech.site/e' },

  // File Hosts (20)
  { id: 'filerio', name: 'Filer.io', base: 'https://filer.io/e' },
  { id: 'fileup', name: 'FileUp', base: 'https://fileup.to/e' },
  { id: 'fileload', name: 'FileLoad', base: 'https://fileload.io/e' },
  { id: 'filestream', name: 'FileStream', base: 'https://filestream.me/e' },
  { id: 'fileplay', name: 'FilePlay', base: 'https://fileplay.net/e' },
  { id: 'filehub', name: 'FileHub', base: 'https://filehub.to/e' },
  { id: 'filemax', name: 'FileMax', base: 'https://filemax.pro/e' },
  { id: 'fileplus', name: 'FilePlus', base: 'https://fileplus.site/e' },
  { id: 'filevip', name: 'FileVIP', base: 'https://filevip.cc/e' },
  { id: 'fileclub', name: 'FileClub', base: 'https://fileclub.xyz/e' },
  { id: 'fileworld', name: 'FileWorld', base: 'https://fileworld.fun/e' },
  { id: 'filespace', name: 'FileSpace', base: 'https://filespace.xyz/e' },
  { id: 'filetech', name: 'FileTech', base: 'https://filetech.site/e' },
  { id: 'filelive', name: 'FileLive', base: 'https://filelive.to/e' },
  { id: 'filefun', name: 'FileFun', base: 'https://filefun.xyz/e' },
  { id: 'filesite', name: 'FileSite', base: 'https://filesite.pro/e' },
  { id: 'fileonline', name: 'FileOnline', base: 'https://fileonline.to/e' },
  { id: 'filewatch', name: 'FileWatch', base: 'https://filewatch.app/e' },
  { id: 'filefree', name: 'FileFree', base: 'https://filefree.site/e' },
  { id: 'filepro', name: 'FilePro', base: 'https://filepro.cc/e' },

  // International Extended (30)
  { id: 'vidoza', name: 'Vidoza', base: 'https://vidoza.net/embed' },
  { id: 'supervideo', name: 'SuperVideo', base: 'https://supervideo.tv/e' },
  { id: 'streamlare', name: 'Streamlare', base: 'https://streamlare.com/e' },
  { id: 'streamsb', name: 'StreamSB', base: 'https://streamsb.net/e' },
  { id: 'streamruby', name: 'StreamRuby', base: 'https://streamruby.com/e' },
  { id: 'fembed', name: 'Fembed', base: 'https://fembed.com/v' },
  { id: 'gounlimited', name: 'GoUnlimited', base: 'https://gounlimited.to/embed' },
  { id: 'jetload', name: 'JetLoad', base: 'https://jetload.net/e' },
  { id: 'vidlox', name: 'Vidlox', base: 'https://vidlox.me/embed' },
  { id: 'clipwatching', name: 'ClipWatching', base: 'https://clipwatching.com/embed' },
  { id: 'powvideo', name: 'PowVideo', base: 'https://powvideo.net/embed' },
  { id: 'speedvid', name: 'SpeedVid', base: 'https://speedvid.net/embed' },
  { id: 'vidfast', name: 'VidFast', base: 'https://vidfast.co/embed' },
  { id: 'vidup', name: 'VidUp', base: 'https://vidup.me/embed' },
  { id: 'vidgg', name: 'Vid.gg', base: 'https://vid.gg/embed' },
  { id: 'vidnode', name: 'VidNode', base: 'https://vidnode.net/embed' },
  { id: 'vidtodo', name: 'VidTodo', base: 'https://vidtodo.com/embed' },
  { id: 'vup', name: 'Vup', base: 'https://vup.to/embed' },
  { id: 'wolfstream', name: 'WolfStream', base: 'https://wolfstream.tv/embed' },
  { id: 'xstreamcdn', name: 'XStreamCDN', base: 'https://xstreamcdn.com/v' },
  { id: 'yourupload', name: 'YourUpload', base: 'https://yourupload.com/embed' },
  { id: 'zplayer', name: 'ZPlayer', base: 'https://zplayer.live/embed' },
  { id: 'ninjastream', name: 'NinjaStream', base: 'https://ninjastream.to/embed' },
  { id: 'fastplay', name: 'FastPlay', base: 'https://fastplay.to/embed' },
  { id: 'hydrax', name: 'Hydrax', base: 'https://hydrax.net/embed' },
  { id: 'mp4upload', name: 'Mp4Upload', base: 'https://mp4upload.com/embed' },
  { id: 'netu', name: 'Netu', base: 'https://netu.tv/watch' },
  { id: 'okru', name: 'Ok.ru', base: 'https://ok.ru/videoembed' },
  { id: 'sendvid', name: 'SendVid', base: 'https://sendvid.com/embed' },
  { id: 'uqload', name: 'Uqload', base: 'https://uqload.com/embed' },
]

export const DOWNLOAD_SERVER_IDS = ['autoembed_co', 'vidsrc_net', '2embed_cc']

const CANONICAL_PROVIDER_BASES: Record<string, string> = {
  autoembed_co: 'https://autoembed.co',
  vidsrc_net: 'https://vidsrc.net/embed',
  vidsrc_io: 'https://vidsrc.io/embed',
  vidsrc_cc: 'https://vidsrc.cc/v2/embed',
  vidsrc_xyz: 'https://vidsrc.xyz/embed',
  vidsrc_me: 'https://vidsrc.me/embed',
  vidsrc_vip: 'https://vidrock.net/embed',
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

  // Servers: Use different parameter format
  // Most embed services support these standard parameters
  if (lower === 'vidsrc_vip') {
    let next = url
    next = addParamIfMissing(next, 'sub.lang', lang)
    next = addParamIfMissing(next, 'lang', lang)
    return next
  }

  if (lower === 'autoembed_co') {
    return addParamIfMissing(url, 'lang', lang)
  }

  if (lower.startsWith('vidsrc_') && lower !== 'vidsrc_vip') {
    // For VidSrc variants, try different parameters
    let next = url
    next = addParamIfMissing(next, 'sub', lang)
    next = addParamIfMissing(next, 'caption', lang)
    return next
  }

  if (lower.startsWith('2embed')) {
    return addParamIfMissing(url, 'lang', lang)
  }

  if (lower === '111movies') {
    return addParamIfMissing(url, 'lang', lang)
  }

  if (lower === 'smashystream') {
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
    return url
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
