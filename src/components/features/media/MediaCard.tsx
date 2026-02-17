
import { HolographicCard } from '../../effects/HolographicCard'
import { PrefetchLink } from '../../common/PrefetchLink'
import { Star } from 'lucide-react'
import { generateWatchPath } from '../../../lib/utils'
import { useDualTitles } from '../../../hooks/useDualTitles'

interface MediaCardProps {
  movie: any
  index: number
  genre?: string
}

export const MediaCard = ({ movie, index, genre }: MediaCardProps) => {
  const titles = useDualTitles(movie)

  return (
    <div className="w-[200px] md:w-[280px]">
      <HolographicCard className="aspect-[2/3] w-full">
        <PrefetchLink to={generateWatchPath(movie)} className="block h-full relative group">
          {/* Poster */}
          <img
            src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={titles.main}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          
          {/* Overlay Info */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 opacity-80 group-hover:opacity-100 transition-opacity" />
          
          {/* Top Meta Info */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 items-start z-20">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-yellow-400 font-black text-xs border border-yellow-500/20">
                <Star size={10} className="fill-yellow-400" />
                {movie.vote_average?.toFixed(1)}
              </span>
              <span className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-cyan-400 font-mono text-xs border border-cyan-500/20">
                {movie.release_date?.split('-')[0] || 'N/A'}
              </span>
            </div>
            {genre && (
              <span className="bg-purple-500/80 backdrop-blur-md px-2 py-1 rounded-lg text-white font-bold text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                {genre}
              </span>
            )}
          </div>

          {/* Bottom Title (Dual) */}
          <div className="absolute bottom-0 left-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 w-full bg-gradient-to-t from-black/90 to-transparent pt-12">
            {/* English/Main Title */}
            <h3 className="text-lg font-black text-white leading-tight drop-shadow-lg line-clamp-1 mb-1">
              {titles.main}
            </h3>
            {/* Arabic/Sub Title */}
            {titles.sub && (
              <p className="text-sm font-bold text-cyan-400 leading-tight drop-shadow-md line-clamp-1 font-arabic">
                {titles.sub}
              </p>
            )}
          </div>

          {/* Index Number */}
          <div className="absolute top-4 right-4 text-5xl font-black text-white/20 stroke-text group-hover:text-cyan-500/40 transition-colors z-10">
            {String(index + 1).padStart(2, '0')}
          </div>
        </PrefetchLink>
      </HolographicCard>
    </div>
  )
}
