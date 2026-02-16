import { useState } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { HolographicCard } from '../../effects/HolographicCard'
import { Star, Calendar, Film, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, FreeMode, Navigation } from 'swiper/modules'
import { useLang } from '../../../state/useLang'
import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'

const GENRES: Record<number, { ar: string, en: string }> = {
  28: { ar: 'أكشن', en: 'Action' },
  12: { ar: 'مغامرة', en: 'Adventure' },
  16: { ar: 'رسوم متحركة', en: 'Animation' },
  35: { ar: 'كوميديا', en: 'Comedy' },
  80: { ar: 'جريمة', en: 'Crime' },
  99: { ar: 'وثائقي', en: 'Documentary' },
  18: { ar: 'دراما', en: 'Drama' },
  10751: { ar: 'عائلي', en: 'Family' },
  14: { ar: 'خيال', en: 'Fantasy' },
  36: { ar: 'تاريخي', en: 'History' },
  27: { ar: 'رعب', en: 'Horror' },
  10402: { ar: 'موسيقى', en: 'Music' },
  9648: { ar: 'غموض', en: 'Mystery' },
  10749: { ar: 'رومانسي', en: 'Romance' },
  878: { ar: 'خيال علمي', en: 'Sci-Fi' },
  10770: { ar: 'تلفزيوني', en: 'TV Movie' },
  53: { ar: 'إثارة', en: 'Thriller' },
  10752: { ar: 'حرب', en: 'War' },
  37: { ar: 'غربي', en: 'Western' }
}

export const QuantumTrain = ({ items, title, link }: { items: any[], title?: string, link?: string }) => {
  const { lang } = useLang()
  const [prevEl, setPrevEl] = useState<HTMLElement | null>(null)
  const [nextEl, setNextEl] = useState<HTMLElement | null>(null)
  
  if (!items.length) return null
  
  const displayTitle = title || (lang === 'ar' ? 'الأعلى تقييما' : 'Top Rated')

  return (
    <div className="relative py-12 w-full perspective-1000 group/section">
      <div className="absolute top-0 left-4 md:left-12 text-9xl font-black text-white/5 uppercase select-none pointer-events-none z-0 whitespace-nowrap">
        {displayTitle}
      </div>
      
      <div className="relative z-10 w-full px-4 md:px-12 mb-8 flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
          <span className="w-1 h-8 bg-cyan-500 rounded-full" />
          {link ? (
            <Link to={link} className="hover:text-cyan-400 transition-colors flex items-center gap-2 group">
              {displayTitle}
              <ChevronLeft className={`w-6 h-6 transform transition-transform group-hover:-translate-x-1 ${lang === 'ar' ? '' : 'rotate-180'}`} />
            </Link>
          ) : displayTitle}
        </h2>

        <div className="flex items-center gap-2">
          <button ref={setPrevEl} className="w-10 h-10 rounded-full border border-white/10 bg-black/40 hover:bg-cyan-500/20 hover:border-cyan-500/50 flex items-center justify-center transition-all disabled:opacity-30">
            <ChevronRight className={`w-5 h-5 ${lang === 'ar' ? '' : 'rotate-180'}`} />
          </button>
          <button ref={setNextEl} className="w-10 h-10 rounded-full border border-white/10 bg-black/40 hover:bg-cyan-500/20 hover:border-cyan-500/50 flex items-center justify-center transition-all disabled:opacity-30">
            <ChevronLeft className={`w-5 h-5 ${lang === 'ar' ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </div>
      
      <div className="relative z-10 w-full">
        <Swiper
          modules={[FreeMode, Navigation]}
          spaceBetween={20}
          slidesPerView="auto"
          freeMode={true}
          navigation={{
            prevEl,
            nextEl,
          }}
          className="!pb-12 !overflow-visible"
        >
          {items.map((movie, index) => {
            const genre = GENRES[movie.genre_ids?.[0]]?.[lang === 'ar' ? 'ar' : 'en'] || movie.category
            
            return (
            <SwiperSlide key={movie.id} className="!h-auto !w-auto">
              <div className="w-[200px] md:w-[280px]">
                <HolographicCard className="aspect-[2/3] w-full">
                <Link to={`/watch/${movie.media_type || 'movie'}/${movie.id}`} className="block h-full relative group">
                  {/* Poster */}
                  <img
                    src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                    alt={movie.title}
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

                  {/* Bottom Title */}
                  <div className="absolute bottom-0 left-0 p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 w-full">
                    <h3 className="text-2xl font-black text-white leading-tight mb-2 text-glitch drop-shadow-lg line-clamp-2" data-text={movie.title}>
                      {movie.title}
                    </h3>
                  </div>

                  {/* Index Number */}
                  <div className="absolute top-4 right-4 text-5xl font-black text-white/20 stroke-text group-hover:text-cyan-500/40 transition-colors z-10">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                </Link>
              </HolographicCard>
              </div>
            </SwiperSlide>
          )})}
        </Swiper>
      </div>
    </div>
  )
}
