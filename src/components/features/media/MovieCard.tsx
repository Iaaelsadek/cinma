import { motion } from 'framer-motion'
import { Play, Star, Plus, Info, Check } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState, type MouseEvent } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '../../../lib/supabase'

type Movie = {
  id: number
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  overview?: string
  media_type?: 'movie' | 'tv'
}

const IMG = (path?: string | null, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : ''

export const MovieCard = ({ movie, index = 0 }: { movie: Movie; index?: number }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [listBusy, setListBusy] = useState(false)
  const [inList, setInList] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const title = movie.title || movie.name || 'Untitled'
  const date = movie.release_date || movie.first_air_date || ''
  const year = date ? new Date(date).getFullYear() : ''
  const isTv = movie.media_type === 'tv' || (!!movie.name && !movie.title)
  const href = isTv ? `/series/${movie.id}` : `/movie/${movie.id}`
  const watchUrl = isTv ? `/watch/tv/${movie.id}?season=1&episode=1` : `/watch/movie/${movie.id}`
  const contentType = isTv ? 'tv' : 'movie'
  const rating = typeof movie.vote_average === 'number' ? Math.round(movie.vote_average * 10) / 10 : null
  const toggleList = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || listBusy) {
      if (!user) navigate('/login')
      return
    }
    setListBusy(true)
    try {
      const current = await isInWatchlist(user.id, movie.id, contentType)
      if (current) {
        await removeFromWatchlist(user.id, movie.id, contentType)
        setInList(false)
      } else {
        await addToWatchlist(user.id, movie.id, contentType)
        setInList(true)
      }
    } finally {
      setListBusy(false)
    }
  }
  const onWatch = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(watchUrl)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="relative z-0"
    >
      <Link
        to={href}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group/card block relative"
      >
        <div className="relative overflow-hidden rounded-xl bg-luxury-charcoal border border-white/5 transition-all duration-500 transform-gpu glass-smooth hover:scale-[1.05] hover:shadow-glass hover:border-primary/50">
          {/* Poster Image */}
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
            {movie.poster_path ? (
              <img
                src={IMG(movie.poster_path)}
                alt={title}
                className={`h-full w-full object-cover transition-transform duration-700 ${isHovered ? 'scale-110 blur-[1px]' : 'scale-100'}`}
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-600">
                <Play size={40} className="opacity-20" />
              </div>
            )}

            {/* Rating Tag */}
            {rating != null && (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 px-1.5 py-0.5 text-[10px] font-bold text-yellow-500">
                <Star size={10} fill="currentColor" />
                {rating}
              </div>
            )}

            {/* Hover Content Overlay */}
            <div className={`absolute inset-0 z-20 flex flex-col justify-end p-4 bg-gradient-to-t from-luxury-obsidian via-luxury-obsidian/40 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2 mb-3">
                <motion.button 
                  initial={{ scale: 0 }}
                  animate={{ scale: isHovered ? 1 : 0 }}
                  className="rounded-full bg-primary text-white shadow-[0_0_15px_rgba(225,29,72,0.5)] h-11 w-11 flex items-center justify-center"
                  type="button"
                  onClick={onWatch}
                  aria-label="watch"
                >
                  <Play size={16} fill="currentColor" />
                </motion.button>
                <div className="flex gap-1.5">
                  <button
                    className="rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md h-11 w-11 flex items-center justify-center"
                    onClick={toggleList}
                    disabled={listBusy}
                    type="button"
                    aria-label="my-list"
                  >
                    {inList ? <Check size={14} className="text-white" /> : <Plus size={14} className="text-white" />}
                  </button>
                  <button className="rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md h-11 w-11 flex items-center justify-center">
                    <Info size={14} className="text-white" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-300 line-clamp-3 leading-relaxed">
                {movie.overview}
              </p>
            </div>
          </div>

          {/* Title and Info */}
          <div className="p-3">
            <h3 className="line-clamp-1 text-sm font-bold text-zinc-100 group-hover/card:text-primary transition-colors">
              {title}
            </h3>
            <div className="mt-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              <span>{year}</span>
              <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5">
                {isTv ? 'TV Series' : 'Movie'}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
