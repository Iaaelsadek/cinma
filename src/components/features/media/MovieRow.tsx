import { useRef } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { MovieCard } from './MovieCard'
import { useLang } from '../../../state/useLang'
import { motion } from 'framer-motion'

type Item = {
  id: number
  title?: string
  name?: string
  media_type?: 'movie' | 'tv'
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  overview?: string
  release_date?: string
  first_air_date?: string
}

type Props = {
  title: string
  movies: Item[]
  isSeries?: boolean
}

export const MovieRow = ({ title, movies, isSeries }: Props) => {
  const { lang } = useLang()
  const ref = useRef<HTMLDivElement>(null)
  
  const onLeft = () => ref.current?.scrollBy({ left: -window.innerWidth * 0.8, behavior: 'smooth' })
  const onRight = () => ref.current?.scrollBy({ left: window.innerWidth * 0.8, behavior: 'smooth' })

  if (!movies.length) return null

  return (
    <section className="group relative py-8">
      <div className="mb-6 flex items-end justify-between px-4 lg:px-12">
        <div className="space-y-1">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-black tracking-tight text-white md:text-3xl"
          >
            {title}
          </motion.h2>
          <div className="h-1 w-12 rounded-full bg-primary" />
        </div>
        
        <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-primary group/link">
          {lang === 'ar' ? 'عرض الكل' : 'View All'}
          <ArrowRight size={14} className="transition-transform group-hover/link:translate-x-1" />
        </button>
      </div>

      <div className="relative">
        <div
          ref={ref}
          className="scrollbar-hide no-scrollbar flex snap-x snap-mandatory flex-row flex-nowrap gap-6 overflow-x-auto overflow-y-hidden scroll-smooth px-4 lg:px-12 pb-6"
        >
          {movies.map((m, idx) => (
            <div key={`${m.media_type || 'm'}-${m.id}`} className="snap-start w-[160px] md:w-[220px] shrink-0">
              <MovieCard movie={m as any} index={idx} />
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <button
          aria-label="prev"
          onClick={onLeft}
          className="absolute top-1/2 -translate-y-1/2 left-0 z-40 hidden h-[calc(100%-1.5rem)] w-16 items-center justify-center bg-gradient-to-r from-luxury-obsidian via-luxury-obsidian/80 to-transparent text-white opacity-0 transition-all duration-300 hover:opacity-100 group-hover:flex lg:w-24"
        >
          <div className="rounded-full bg-white/5 p-3 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
            <ChevronLeft size={32} />
          </div>
        </button>
        
        <button
          aria-label="next"
          onClick={onRight}
          className="absolute top-1/2 -translate-y-1/2 right-0 z-40 hidden h-[calc(100%-1.5rem)] w-16 items-center justify-center bg-gradient-to-l from-luxury-obsidian via-luxury-obsidian/80 to-transparent text-white opacity-0 transition-all duration-300 hover:opacity-100 group-hover:flex lg:w-24"
        >
          <div className="rounded-full bg-white/5 p-3 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors">
            <ChevronRight size={32} />
          </div>
        </button>
      </div>
    </section>
  )
}
