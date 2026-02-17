import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getContinueWatching } from '../../../lib/supabase'
import { tmdb } from '../../../lib/tmdb'
import { Clock } from 'lucide-react'

type CwItem = {
  content_id: number
  content_type: 'movie' | 'tv'
  season_number: number | null
  episode_number: number | null
  progress_seconds: number
  duration_seconds: number
  updated_at: string
}

type EnrichedCwItem = CwItem & {
  poster_path?: string
  title?: string
  name?: string
  vote_average?: number
}

export const ContinueWatchingRow = ({ userId }: { userId: string }) => {
  const cwQuery = useQuery<CwItem[]>({
    queryKey: ['continue', userId],
    queryFn: () => getContinueWatching(userId),
    staleTime: 60 * 1000
  })

  const enriched = useQuery<EnrichedCwItem[]>({
    queryKey: ['continue-enriched', cwQuery.data?.map(c => `${c.content_type}-${c.content_id}`).join(',')],
    queryFn: async () => {
      const items = cwQuery.data || []
      const promises = items.slice(0, 12).map(async (r) => {
        try {
          const path = r.content_type === 'movie' ? `/movie/${r.content_id}` : `/tv/${r.content_id}`
          const { data } = await tmdb.get(path)
          return { ...r, poster_path: data.poster_path, title: data.title, name: data.name, vote_average: data.vote_average } as EnrichedCwItem
        } catch {
          return r as EnrichedCwItem
        }
      })
      return Promise.all(promises)
    },
    enabled: !!cwQuery.data?.length
  })

  const data = enriched.data || []

  if (!cwQuery.data?.length) return null
  if (cwQuery.isPending) {
    return (
      <section className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[160px] aspect-[2/3] animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
          <Clock size={24} className="text-cyan-400" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
          تابع المشاهدة
        </h2>
      </div>
      <div className="flex gap-6 overflow-x-auto pb-6 snap-x scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
        {data.map((r, i) => {
          const href = r.content_type === 'movie'
            ? `/watch/movie/${r.content_id}`
            : `/watch/${r.content_id}?type=tv&season=${r.season_number || 1}&episode=${r.episode_number || 1}`
          const progress = r.duration_seconds > 0
            ? Math.min(99, Math.round((r.progress_seconds / r.duration_seconds) * 100))
            : 0
          const movie = {
            id: r.content_id,
            title: r.title,
            name: r.name,
            poster_path: r.poster_path,
            vote_average: r.vote_average,
            media_type: r.content_type
          }

          return (
            <Link
              key={`${r.content_type}-${r.content_id}`}
              to={href}
              className="snap-center shrink-0 w-[160px] md:w-[180px] group"
            >
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md transition-transform duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,255,204,0.3)]">
                <div className="aspect-[2/3] bg-zinc-900">
                  {r.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w342${r.poster_path}`}
                      alt={movie.title || movie.name || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">?</div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                  <div
                    className="h-full bg-cyan-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-bold text-cyan-400">
                  {progress}%
                </div>
              </div>
              <h3 className="mt-2 text-sm font-bold text-zinc-200 truncate group-hover:text-cyan-400 transition-colors">
                {movie.title || movie.name || `#${r.content_id}`}
              </h3>
              {r.content_type === 'tv' && (r.season_number || r.episode_number) && (
                <p className="text-[10px] text-zinc-500">
                  S{r.season_number || 1} E{r.episode_number || 1}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
