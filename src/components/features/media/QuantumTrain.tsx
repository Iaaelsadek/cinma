import { useState } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { HolographicCard } from '../../effects/HolographicCard'
import { Star, Calendar, Film, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { PrefetchLink } from '../../common/PrefetchLink'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, FreeMode, Navigation, Virtual } from 'swiper/modules'
import { VideoCard } from './VideoCard'
import { MovieCard } from './MovieCard'
import { useLang } from '../../../state/useLang'
import { SectionHeader } from '../../common/SectionHeader'

import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'
import 'swiper/css/virtual'

export const QuantumTrain = ({ 
  items, 
  title, 
  link, 
  type,
  icon,
  badge,
  className,
  color = 'cyan'
}: { 
  items: any[], 
  title?: string, 
  link?: string, 
  type?: string,
  icon?: React.ReactNode,
  badge?: string,
  className?: string,
  color?: 'cyan' | 'purple' | 'gold' | 'red' | 'pink'
}) => {
  const { lang } = useLang()
  const [prevEl, setPrevEl] = useState<HTMLElement | null>(null)
  const [nextEl, setNextEl] = useState<HTMLElement | null>(null)
  
  if (!items.length) return null
  
  const displayTitle = title || (lang === 'ar' ? 'الأعلى تقييما' : 'Top Rated')
  const displayIcon = icon || <Film />
  const isVideo = type === 'video'

  return (
    <div className={`relative py-12 w-full perspective-1000 group/section ${className || ''}`}>
      
      <div className="px-4 md:px-12">
        <SectionHeader 
          title={displayTitle}
          icon={displayIcon}
          link={link}
          badge={badge}
          color={color}
          actions={
            <div className="flex items-center gap-2">
              <button ref={setPrevEl} className="w-10 h-10 rounded-full border border-white/10 bg-black/40 hover:bg-cyan-500/20 hover:border-cyan-500/50 flex items-center justify-center transition-all disabled:opacity-30">
                <ChevronRight className={`w-5 h-5 ${lang === 'ar' ? '' : 'rotate-180'}`} />
              </button>
              <button ref={setNextEl} className="w-10 h-10 rounded-full border border-white/10 bg-black/40 hover:bg-cyan-500/20 hover:border-cyan-500/50 flex items-center justify-center transition-all disabled:opacity-30">
                <ChevronLeft className={`w-5 h-5 ${lang === 'ar' ? '' : 'rotate-180'}`} />
              </button>
            </div>
          }
        />
      </div>
      
      <div className="relative z-10 w-full">
        <Swiper
          modules={[FreeMode, Navigation, Virtual]}
          spaceBetween={10}
          slidesPerView="auto"
          freeMode={true}
          virtual={true}
          navigation={{
            prevEl,
            nextEl,
          }}
          className="!pb-6 !overflow-visible"
        >
          {items.map((movie, index) => {
            return (
            <SwiperSlide 
              key={`${movie.id}-${index}`} 
              virtualIndex={index}
              className={isVideo 
                ? "!h-auto !w-auto !min-w-[200px] !max-w-[280px] md:!min-w-[240px] md:!max-w-[320px]"
                : "!h-auto !w-auto !min-w-[100px] !max-w-[140px] md:!min-w-[120px] md:!max-w-[160px]"
              }
            >
              {isVideo ? (
                <VideoCard video={movie} index={index} />
              ) : (
                <MovieCard movie={movie} index={index} />
              )}
            </SwiperSlide>
            )})}
        </Swiper>
      </div>
    </div>
  )
}
