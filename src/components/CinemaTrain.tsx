import { useNavigate } from 'react-router-dom'

type MovieMeta = { id: number; poster_path?: string | null; media_type?: 'movie' | 'tv' }

const IMG = (path?: string | null, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : ''

export const CinemaTrain = ({ items }: { items: MovieMeta[] }) => {
  const navigate = useNavigate()
  const goTo = (m: MovieMeta) => {
    const isTv = m.media_type === 'tv'
    navigate(isTv ? `/series/${m.id}` : `/movie/${m.id}`)
  }

  if (!items || items.length === 0) return null

  return (
    <div className="relative hidden md:flex z-20 justify-center">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent" />
      
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none w-32 h-32">
        <img 
          src="https://media.tenor.com/B9O5875t8xcAAAAi/walking.gif" 
          alt="Walking Character"
          className="w-full h-full object-contain drop-shadow-2xl"
        />
      </div>

      <div className="relative mx-auto h-40 max-w-[95vw] overflow-visible">
        <div className="pause-on-hover animate-slow-train relative flex items-end gap-4">
          {items.map((m) => (
            <div
              key={m.id}
              className="group relative shrink-0 cursor-pointer"
              onClick={() => goTo(m)}
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
            </div>
          ))}
          {items.map((m) => (
            <div
              key={`dup-${m.id}`}
              className="group relative shrink-0 cursor-pointer"
              onClick={() => goTo(m)}
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
            </div>
          ))}
        </div>
        <div className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-white/5 backdrop-blur-md" />
      </div>
    </div>
  )
}
