import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { Server as ServerIcon, Radio, AlertTriangle, Loader2 } from 'lucide-react'

type Props = {
  tmdbId: number
  type: 'movie' | 'tv'
  season?: number
  episode?: number
}

type Server = {
  name: string
  url: string
  priority: number
  responseTime?: number
}

export const ServerGrid = ({ tmdbId, type, season, episode }: Props) => {
  const [servers, setServers] = useState<Server[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    loadServers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tmdbId, type, season, episode])

  async function loadServers() {
    setLoading(true)
    let dbLinks: Record<string, string> = {}

    // DB fetch (movies / episodes)
    try {
      if (type === 'movie') {
        const { data } = await supabase
          .from('movies')
          .select('embed_links')
          .eq('id', tmdbId)
          .maybeSingle()
        if (data?.embed_links) dbLinks = data.embed_links
      } else if (type === 'tv' && season && episode) {
        const { data: seasonRow } = await supabase
          .from('seasons')
          .select('id')
          .eq('series_id', tmdbId)
          .eq('season_number', season)
          .maybeSingle()
        if (seasonRow?.id) {
          const { data: epRow } = await supabase
            .from('episodes')
            .select('embed_links')
            .eq('season_id', seasonRow.id)
            .eq('episode_number', episode)
            .maybeSingle()
          if (epRow?.embed_links) dbLinks = epRow.embed_links
        }
      }
    } catch {}

    // Fallback generation
    const defaults = ['vidsrc', '2embed', 'embed_su', 'autoembed']
    defaults.forEach((name) => {
      if (!dbLinks[name]) {
        let url = ''
        if (name === 'vidsrc') {
          url = type === 'movie'
            ? `https://vidsrc.to/embed/movie/${tmdbId}`
            : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`
        } else if (name === '2embed') {
          url = type === 'movie'
            ? `https://www.2embed.cc/embed/${tmdbId}`
            : `https://www.2embed.cc/embed/tv/${tmdbId}&s=${season}&e=${episode}`
        } else if (name === 'embed_su') {
          url = type === 'movie'
            ? `https://embed.su/embed/movie/${tmdbId}`
            : `https://embed.su/embed/tv/${tmdbId}/${season}/${episode}`
        } else if (name === 'autoembed') {
          url = type === 'movie'
            ? `https://autoembed.to/movie/tmdb/${tmdbId}`
            : `https://autoembed.to/tv/tmdb/${tmdbId}-${season}x${episode}`
        }
        if (url) dbLinks[name] = url
      }
    })

    // Prepare servers list
    const list = Object.entries(dbLinks).map(([name, url]) => ({
      name,
      url,
      priority: 5,
      responseTime: undefined
    } as Server))

    setServers(list)
    setActive(0)
    setLoading(false)
  }

  async function reportBroken() {
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
      setServers((prev) => prev.filter((_, i) => i !== active))
      setActive(0)
    } catch {}
    setReporting(false)
  }

  if (loading) {
    return <div className="h-80 rounded-2xl border border-white/10 bg-zinc-900 animate-pulse" />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {servers.map((s, idx) => {
          const isActive = idx === active
          return (
            <button
              key={s.name}
              onClick={() => setActive(idx)}
              className={`group flex items-center gap-3 rounded-xl border p-3 text-sm font-bold transition-all
                ${isActive
                  ? 'bg-[#e50914] border-[#e50914] text-white shadow-[0_0_20px_rgba(229,9,20,0.4)] scale-[1.02]'
                  : 'bg-[#1a1a1a] border-white/10 text-zinc-300 hover:bg-zinc-900 hover:border-white/20'}`}
              title={s.url}
            >
              <Radio size={16} className={isActive ? 'animate-pulse' : 'text-zinc-400'} />
              <span>
                {s.name === 'vidsrc' ? 'VidSrc' : s.name === '2embed' ? '2Embed' : s.name}
              </span>
              {s.responseTime && s.responseTime < 1000 && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          )
        })}
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl ring-1 ring-white/5">
        {servers[active] ? (
          <iframe
            key={servers[active].url}
            src={servers[active].url}
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-500">
            <ServerIcon className="mr-2" size={18} /> لا تتوفر خوادم
          </div>
        )}
        <button
          onClick={reportBroken}
          disabled={reporting}
          className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 h-10 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/20"
        >
          {reporting ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} className="text-red-400" />}
          <span>تبليغ عن عطل</span>
        </button>
      </div>
    </div>
  )
}
