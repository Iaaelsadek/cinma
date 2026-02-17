import { motion } from 'framer-motion'
import { Play, Star, Plus, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PrefetchLink } from '../../common/PrefetchLink'
import { useState, type MouseEvent } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '../../../lib/supabase'
import { getGenreName } from '../../../lib/genres'
import { generateWatchPath } from '../../../lib/utils'
import { useLang } from '../../../state/useLang'
import { useDualTitles } from '../../../hooks/useDualTitles'

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
  genre_ids?: number[]
  original_language?: string
}

const IMG = (path?: string | null, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : ''

export const MovieCard = ({ movie, index = 0 }: { movie: Movie; index?: number }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [listBusy, setListBusy] = useState(false)
  const [inList, setInList] = useState(false)
  const { user } = useAuth()
  const { lang } = useLang()
  const titles = useDualTitles(movie)
  const navigate = useNavigate()
  const title = movie.title || movie.name || 'Untitled'
  const date = movie.release_date || movie.first_air_date || ''
  const year = date ? new Date(date).getFullYear() : ''
  const isTv = movie.media_type === 'tv' || (!!movie.name && !movie.title)
  const watchUrl = generateWatchPath({ ...movie, media_type: isTv ? 'tv' : 'movie' })
  const href = watchUrl
  const contentType = isTv ? 'tv' : 'movie'
  const rating = typeof movie.vote_average === 'number' ? Math.round(movie.vote_average * 10) / 10 : null
  
  const genre = getGenreName(movie.genre_ids?.[0], lang) || (movie as any).category
  const currentYear = new Date().getFullYear()
  const isCurrentYear = year === currentYear
  
  // Truncate overview to max 15 words
  const getShortOverview = (text?: string) => {
    if (!text) return ''
    const words = text.split(' ')
    if (words.length <= 15) return text
    return words.slice(0, 15).join(' ') + '...'
  }
  const shortOverview = getShortOverview(movie.overview)

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
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-0 group/card"
    >
      <PrefetchLink
        to={href}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="block relative h-full w-full lumen-focus-ring rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-lumen-gold focus-visible:outline-offset-2"
      >
        <div className="lumen-card h-full flex flex-col transition-transform duration-300 ease-lumen hover:scale-[1.03] focus-within:scale-[1.02]">
          {/* Poster */}
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-lumen-muted">
            {movie.poster_path ? (
              <img
                src={IMG(movie.poster_path)}
                alt={title}
                className={`h-full w-full object-cover transition-all duration-500 ease-lumen ${isHovered ? 'scale-105 brightness-75' : 'scale-100'}`}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-lumen-muted text-lumen-silver">
                <Play size={40} className="opacity-30" />
              </div>
            )}

            {/* LUMEN grain overlay (subtle) */}
            <div className="lumen-grain rounded-2xl" aria-hidden />

            {/* Rating - Moved to bottom */}

            {/* Hover overlay — actions */}
            <div
              className={`absolute inset-0 z-20 flex flex-col justify-center items-center p-4 transition-all duration-300 ease-lumen ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
              <div className="flex items-center gap-3 transform translate-y-3 group-hover/card:translate-y-0 transition-transform duration-300 ease-lumen">
                <motion.button
                  type="button"
                  onClick={onWatch}
                  aria-label="play"
                  className="rounded-full bg-lumen-gold text-lumen-void h-12 w-12 flex items-center justify-center hover:brightness-110 shadow-lumen-glow transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumen-cream"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Play size={20} fill="currentColor" className="ml-0.5" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={toggleList}
                  disabled={listBusy}
                  aria-label="add to list"
                  className="rounded-full bg-lumen-surface/90 border border-lumen-muted backdrop-blur-md h-10 w-10 flex items-center justify-center text-lumen-cream hover:border-lumen-gold/50 hover:bg-lumen-gold/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumen-gold"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {inList ? <Check size={16} className="text-lumen-gold" /> : <Plus size={16} />}
                </motion.button>
              </div>
              <p className="absolute bottom-3 left-3 right-3 text-[10px] text-lumen-silver line-clamp-2 leading-relaxed text-center opacity-0 group-hover/card:opacity-100 transform translate-y-2 group-hover/card:translate-y-0 transition-all duration-300">
                {shortOverview}
              </p>
            </div>
          </div>

          {/* Title & meta */}
          <div className="p-3 flex-1 flex flex-col justify-end bg-gradient-to-b from-transparent to-lumen-void/60">
            <h3 className="line-clamp-1 text-sm font-semibold text-lumen-cream group-hover/card:text-lumen-gold transition-colors duration-200">
              {titles.main}
            </h3>
            {titles.sub && (
               <p className="line-clamp-1 text-xs text-lumen-gold/80 font-arabic mt-0.5">
                 {titles.sub}
               </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-lumen-silver">
               {/* Rating */}
               {rating != null && (
                 <span className="flex items-center gap-0.5 text-lumen-gold">
                   <Star size={10} fill="currentColor" />
                   {rating}
                 </span>
               )}
               
               {/* Genre */}
               {genre && (
                 <>
                   <span className="w-0.5 h-0.5 rounded-full bg-lumen-silver/50" />
                   <span className="truncate max-w-[80px]">{genre}</span>
                 </>
               )}

               {/* Year */}
               {year && (
                 <>
                   <span className="w-0.5 h-0.5 rounded-full bg-lumen-silver/50" />
                   <span className={isCurrentYear ? 'text-cyan-400 animate-neon-flash font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]' : ''}>
                     {year}
                   </span>
                 </>
               )}

               {/* Type */}
               <span className="w-0.5 h-0.5 rounded-full bg-lumen-silver/50" />
               <span>{isTv ? (lang === 'ar' ? 'مسلسل' : 'Series') : (lang === 'ar' ? 'فيلم' : 'Movie')}</span>
            </div>
          </div>
        </div>
      </PrefetchLink>
    </motion.div>
  )
}
