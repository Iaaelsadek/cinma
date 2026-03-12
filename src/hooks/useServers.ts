import { useEffect, useState } from 'react'
import { DOWNLOAD_SERVER_IDS, SERVER_PROVIDERS, generateServerUrl } from '../lib/serverCatalog'
import { supabase } from '../lib/supabase'

export type Server = {
  id?: string
  name: string
  url: string
  priority: number
  status: 'unknown' | 'online' | 'offline' | 'degraded'
  responseTime?: number
}

export const useServers = (tmdbId: number, type: 'movie' | 'tv', season?: number, episode?: number, imdbId?: string) => {
  const [baseServers, setBaseServers] = useState<Server[]>([])
  const [downloadServerIds, setDownloadServerIds] = useState<string[]>(DOWNLOAD_SERVER_IDS)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)

  // Initialize providers
  useEffect(() => {
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
      setBaseServers([])
      setActive(0)
      setLoading(true)
      return
    }
    const loadProviders = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('server_provider_configs')
        .select('*')
        .order('priority', { ascending: true })

      const sourceProviders = !error && data && data.length > 0
        ? data.map((row: any) => ({
            id: row.id,
            name: row.name,
            base: row.base,
            movie_template: row.movie_template,
            tv_template: row.tv_template,
            is_active: row.is_active,
            supports_movie: row.supports_movie,
            supports_tv: row.supports_tv,
            is_download: row.is_download,
            priority: row.priority
          }))
        : SERVER_PROVIDERS

      const filtered = sourceProviders.filter((provider) => {
        if (provider.is_active === false) return false
        if (type === 'movie' && provider.supports_movie === false) return false
        if (type === 'tv' && provider.supports_tv === false) return false
        return true
      })

      const allServers = filtered
        .map((p, index) => ({
          name: p.name,
          url: generateServerUrl(p, type, tmdbId, season, episode, imdbId),
          priority: Number.isFinite(Number(p.priority)) ? Number(p.priority) : index,
          status: 'online' as const,
          id: p.id
        }))
        .filter((s) => Boolean(s.url))

      setBaseServers(allServers)
      const resolvedDownloadIds = sourceProviders
        .filter((provider) => provider.is_download === true)
        .map((provider) => provider.id)
      setDownloadServerIds(resolvedDownloadIds.length > 0 ? resolvedDownloadIds : DOWNLOAD_SERVER_IDS)
      setActive(0)
      setLoading(false)
    }

    loadProviders()
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
  const downloadServers = downloadServerIds
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
