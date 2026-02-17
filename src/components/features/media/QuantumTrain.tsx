import { useState } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { HolographicCard } from '../../effects/HolographicCard'
import { Star, Calendar, Film, ChevronLeft, ChevronRight } from 'lucide-react'
import { PrefetchLink } from '../../common/PrefetchLink'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, FreeMode, Navigation } from 'swiper/modules'
import { MovieCard } from './MovieCard'
import { useLang } from '../../../state/useLang'

import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'

export const QuantumTrain = ({ items, title, link, type }: { items: any[], title?: string, link?: string, type?: string }) => {
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
            <PrefetchLink to={link} className="hover:text-cyan-400 transition-colors flex items-center gap-2 group">
              {displayTitle}
              <ChevronLeft className={`w-6 h-6 transform transition-transform group-hover:-translate-x-1 ${lang === 'ar' ? '' : 'rotate-180'}`} />
            </PrefetchLink>
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
            return (
            <SwiperSlide key={movie.id} className="!h-auto !w-auto !min-w-[200px] !max-w-[240px]">
              <MovieCard movie={movie} index={index} />
            </SwiperSlide>
            )})}
        </Swiper>
      </div>
    </div>
  )
}
