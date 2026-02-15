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
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="relative z-0 group/card"
    >
      <Link
        to={href}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="block relative h-full w-full"
      >
        <div className="relative overflow-hidden rounded-2xl bg-luxury-charcoal border border-white/5 transition-all duration-500 transform-gpu hover:scale-[1.03] hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] hover:border-primary/40 h-full flex flex-col">
          {/* Poster Image */}
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
            {movie.poster_path ? (
              <img
                src={IMG(movie.poster_path)}
                alt={title}
                className={`h-full w-full object-cover transition-transform duration-700 will-change-transform ${isHovered ? 'scale-110 blur-[2px] brightness-50' : 'scale-100'}`}
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-zinc-600">
                <Play size={40} className="opacity-20" />
              </div>
            )}

            {/* Rating Tag */}
            {rating != null && (
              <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 text-[10px] font-bold text-yellow-400 shadow-lg">
                <Star size={10} fill="currentColor" />
                {rating}
              </div>
            )}

            {/* Hover Content Overlay */}
            <div className={`absolute inset-0 z-20 flex flex-col justify-center items-center p-4 transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              
              <div className="flex items-center gap-3 transform translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-full bg-primary text-white shadow-[0_0_20px_rgba(225,29,72,0.6)] h-12 w-12 flex items-center justify-center hover:brightness-110"
                  type="button"
                  onClick={onWatch}
                  aria-label="watch"
                >
                  <Play size={20} fill="currentColor" className="ml-0.5" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md h-10 w-10 flex items-center justify-center"
                  onClick={toggleList}
                  disabled={listBusy}
                  type="button"
                  aria-label="my-list"
                >
                  {inList ? <Check size={16} className="text-primary" /> : <Plus size={16} className="text-white" />}
                </motion.button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover/card:translate-y-0 transition-transform duration-300">
                 <p className="text-[10px] text-zinc-300 line-clamp-2 leading-relaxed text-center font-medium drop-shadow-md">
                  {movie.overview || "No description available."}
                </p>
              </div>
            </div>
          </div>

          {/* Title and Info */}
          <div className="p-3 flex-1 flex flex-col justify-between bg-gradient-to-b from-transparent to-black/20">
            <h3 className="line-clamp-1 text-sm font-bold text-zinc-100 group-hover/card:text-primary transition-colors">
              {title}
            </h3>
            <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              <span>{year}</span>
              <span className={`px-1.5 py-0.5 rounded border ${isTv ? 'border-purple-500/20 text-purple-400' : 'border-blue-500/20 text-blue-400'} bg-white/5`}>
                {isTv ? 'Series' : 'Movie'}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
