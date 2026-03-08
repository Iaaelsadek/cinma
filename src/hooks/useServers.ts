import { useEffect, useState } from 'react'
import { DOWNLOAD_SERVER_IDS, SERVER_PROVIDERS, generateServerUrl } from '../lib/serverCatalog'

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
    const allServers = SERVER_PROVIDERS.map((p, index) => ({
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
