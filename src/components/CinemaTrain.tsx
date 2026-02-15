import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

type MovieMeta = { id: number; poster_path: string | null }

const IMG = (path?: string | null, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : ''

export const CinemaTrain = () => {
  const navigate = useNavigate()
  const items = useMemo<MovieMeta[]>(
    () => [
      { id: 634649, poster_path: '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg' },
      { id: 603692, poster_path: '/lNyLSOKMMeUPr1RsL4KcRuIXwHt.jpg' },
      { id: 447365, poster_path: '/rjkmN1dniUHVYAtwuV3Tji7FsDO.jpg' },
      { id: 76600, poster_path: '/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg' },
      { id: 315162, poster_path: '/bQXAqRx2Fgc46uCVWgoPz5L5Dtr.jpg' }
    ],
    []
  )

  return (
    <div className="relative hidden md:flex z-20 justify-center">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent" />
      <div className="relative mx-auto h-40 max-w-7xl overflow-visible">
        <div className="pause-on-hover animate-slow-train relative flex items-end gap-6">
          <div
            className="glass-panel relative h-28 w-44 shrink-0 cursor-pointer rounded-2xl px-4 py-3 transition-transform duration-300 hover:scale-105 hover:shadow-neon-emerald"
            onClick={() => navigate(`/movie/${items[0].id}`)}
          >
            <div className="absolute -top-4 left-4 h-3 w-3 rounded-full bg-primary/80 shadow-neon-emerald" />
            <div className="absolute -top-4 left-8 h-3 w-3 rounded-full bg-neon-blue/80 shadow-neon-blue" />
            <div className="h-full w-full overflow-hidden rounded-xl border border-white/10 bg-black/50">
              {items[0].poster_path && (
                <img
                  src={IMG(items[0].poster_path)}
                  alt=""
                  className="h-full w-full object-cover opacity-80"
                  loading="lazy"
                />
              )}
            </div>
          </div>
          {items.slice(1).map((m) => (
            <div
              key={m.id}
              className="group relative shrink-0 cursor-pointer"
              onClick={() => navigate(`/movie/${m.id}`)}
            >
              <div className="glass-card h-28 w-40 overflow-hidden rounded-2xl transition-all duration-300 group-hover:scale-105 group-hover:shadow-neon-blue group-hover:brightness-110">
                <div className="h-full w-full overflow-hidden rounded-xl border border-white/10 bg-black/50">
                  {m.poster_path && (
                    <img
                      src={IMG(m.poster_path)}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  )}
                </div>
              </div>
              <div className="absolute -bottom-3 left-4 flex gap-3">
                <div className="h-3 w-3 rounded-full bg-white/30 backdrop-blur-md border border-white/20" />
                <div className="h-3 w-3 rounded-full bg-white/30 backdrop-blur-md border border-white/20" />
              </div>
            </div>
          ))}
        </div>
        <div className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-white/5 backdrop-blur-md" />
      </div>
    </div>
  )
}
