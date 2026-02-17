/** Route prefetch - load JS chunks on link hover for instant navigation */

const prefetchedLoaders = new Set<() => Promise<unknown>>()

const routeMap: Array<{ match: RegExp | string; load: () => Promise<unknown> }> = [
  { match: /^\/$/, load: () => import('../pages/Home') },
  { match: /^\/movie\/\d+$/, load: () => import('../pages/media/MovieDetails') },
  { match: /^\/watch\/yt\/\d+$/, load: () => import('../pages/media/WatchVideo') },
  { match: /^\/video\/\d+$/, load: () => import('../pages/media/WatchVideo') },
  { match: /^\/watch/, load: () => import('../pages/media/Watch') },
  { match: /^\/series\/\d+$/, load: () => import('../pages/media/SeriesDetails') },
  { match: /^\/series\/\d+\/season/, load: () => import('../pages/media/Watch') },
  { match: /^\/movies\/[^/]+(\/|$)/, load: () => import('../pages/CategoryHub') },
  { match: /^\/movies$/, load: () => import('../pages/discovery/Movies') },
  { match: /^\/series\/[^/]+(\/|$)/, load: () => import('../pages/CategoryHub') },
  { match: /^\/series$/, load: () => import('../pages/discovery/Series') },
  { match: /^\/search/, load: () => import('../pages/discovery/Search') },
  { match: /^\/auth$|^\/login$|^\/register$/, load: () => import('../pages/Auth') },
  { match: /^\/profile/, load: () => import('../pages/user/Profile') },
  { match: /^\/category\/|^\/kids$/, load: () => import('../pages/discovery/Category') },
  { match: /^\/anime/, load: () => import('../pages/discovery/Anime') },
  { match: /^\/gaming$/, load: () => import('../pages/discovery/Gaming') },
  { match: /^\/game\/\d+/, load: () => import('../pages/media/GameDetails') },
  { match: /^\/software$/, load: () => import('../pages/discovery/Software') },
  { match: /^\/software\/\d+/, load: () => import('../pages/media/SoftwareDetails') },
  { match: /^\/quran/, load: () => import('../pages/discovery/Quran') },
  { match: /^\/cinematic/, load: () => import('../pages/media/CinematicDetails') },
  { match: /^\/plays$/, load: () => import('../pages/discovery/Plays') },
  { match: /^\/classics$/, load: () => import('../pages/discovery/Classics') },
  { match: /^\/request/, load: () => import('../pages/user/Request') },
  { match: /^\/terms/, load: () => import('../pages/legal/Terms') },
  { match: /^\/privacy/, load: () => import('../pages/legal/Privacy') },
]

function getPath(to: string | { pathname?: string }): string {
  if (typeof to === 'string') return to.split('?')[0]
  return (to.pathname || '/').split('?')[0]
}

export function prefetchRoute(to: string | { pathname?: string }): void {
  const path = getPath(to)
  for (const { match, load } of routeMap) {
    const ok = typeof match === 'string' ? path === match : match.test(path)
    if (ok) {
      if (prefetchedLoaders.has(load)) return
      prefetchedLoaders.add(load)
      load().catch(() => {})
      return
    }
  }
}
