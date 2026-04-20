import { useState, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { HolographicCard } from '../../effects/HolographicCard'
import { Film, ChevronLeft, ChevronRight } from 'lucide-react'
import { PrefetchLink } from '../../common/PrefetchLink'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode, Navigation } from 'swiper/modules'
import { VideoCard } from './VideoCard'
import { MovieCard } from './MovieCard'
import { useLang } from '../../../state/useLang'
import { SectionHeader } from '../../common/SectionHeader'
import { useAggregateRatings } from '../../../hooks/useAggregateRatings'

import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'

export const QuantumTrain = memo(({
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
  color?: 'cyan' | 'purple' | 'gold' | 'red' | 'pink' | 'blue' | 'green' | 'indigo' | 'orange'
}) => {
  const { lang } = useLang()
  const [prevEl, setPrevEl] = useState<HTMLElement | null>(null)
  const [nextEl, setNextEl] = useState<HTMLElement | null>(null)
  const isVideo = type === 'video'
  const railItems = useMemo(() => isVideo
    ? items
    : items.filter((item) => {
      const title = item?.title || item?.name || item?.original_title || item?.original_name
      const poster = item?.poster_path || item?.backdrop_path
      const hasValidSlug = item?.slug && item.slug.trim() !== '' && item.slug !== 'content'
      return Boolean(item?.id) && Boolean(title) && Boolean(poster) && hasValidSlug
    }), [items, isVideo])

  // Determine content type for batch rating fetch
  const contentType = railItems.length > 0 && railItems[0]?.media_type === 'tv' ? 'tv' : 'movie'

  // Batch fetch aggregate ratings for all items
  const { ratings } = useAggregateRatings(railItems, contentType)

  // Merge ratings into items - memoized to prevent unnecessary re-renders
  const itemsWithRatings = useMemo(() => railItems.map(item => ({
    ...item,
    aggregate_rating: ratings[String(item.id)]?.average_rating,
    rating_count: ratings[String(item.id)]?.rating_count,
    review_count: ratings[String(item.id)]?.review_count
  })), [railItems, ratings])

  if (!railItems.length) return null

  const displayTitle = title || (lang === 'ar' ? 'الأعلى تقييما' : 'Top Rated')
  const displayIcon = icon || <Film />

  return (
    <div className={`relative py-3 w-full perspective-1000 group/section ${className || ''}`}>

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

      <div className="relative z-10 w-full">
        <Swiper
          modules={[FreeMode, Navigation]}
          spaceBetween={10}
          slidesPerView="auto"
          freeMode={true}
          watchSlidesProgress={true}
          navigation={{
            prevEl,
            nextEl,
          }}
          className="!pb-6"
        >
          {itemsWithRatings.map((movie, index) => {
            const isInInitialView = index < 6
            return (
              <SwiperSlide
                key={`${movie.id}-${index}`}
                className={isVideo
                  ? "!h-auto !w-auto !min-w-[200px] !max-w-[280px] md:!min-w-[240px] md:!max-w-[320px]"
                  : "!h-auto !w-auto !min-w-[100px] !max-w-[140px] md:!min-w-[120px] md:!max-w-[160px]"
                }
              >
                {isVideo ? (
                  <VideoCard video={movie} index={index} />
                ) : (
                  <MovieCard movie={movie} index={index} isVisible={isInInitialView} />
                )}
              </SwiperSlide>
            )
          })}
        </Swiper>
      </div>
    </div>
  )
}, (prev, next) => {
  // Only re-render if title changes or items length changes or first item id changes
  // This avoids re-renders when parent state changes but data is same
  if (prev.title !== next.title) return false
  if (prev.items.length !== next.items.length) return false
  if (prev.items.length > 0 && next.items.length > 0) {
    // Check if any ID in the first 5 items changed (more robust than just the first)
    for (let i = 0; i < Math.min(prev.items.length, 5); i++) {
      if (prev.items[i].id !== next.items[i].id) return false
    }
  }
  return true
})
