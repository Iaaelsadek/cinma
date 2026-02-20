import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info, Volume2, VolumeX, ChevronRight, Star, Calendar, Film } from 'lucide-react'
import { PrefetchLink } from '../../common/PrefetchLink'
import { TmdbImage } from '../../common/TmdbImage'
import { useLang } from '../../../state/useLang'
import { tmdb } from '../../../lib/tmdb'
import { getGenreName } from '../../../lib/genres'
import ReactPlayer from 'react-player/youtube'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay } from 'swiper/modules'
import 'swiper/css'

const getLocalizedType = (type: string, lang: string) => {
  if (lang !== 'ar') return type === 'tv' ? 'Series' : 'Movie'
  return type === 'tv' ? 'مسلسل' : 'فيلم'
}

const getLocalizedOrigin = (origin: string, lang: string) => {
  if (lang !== 'ar') return origin.toUpperCase()
  const map: Record<string, string> = {
    'en': 'أجنبي',
    'ar': 'عربي',
    'ko': 'كوري',
    'zh': 'صيني',
    'tr': 'تركي',
    'ja': 'ياباني',
    'hi': 'هندي',
    'es': 'إسباني'
  }
  return map[origin] || 'عالمي'
}

/**
 * QUANTUM HERO - DIVERSE CAROUSEL
 * Features:
 * - 5 Visible Columns
 * - Continuous Smooth Scrolling (Marquee-like)
 * - Diverse Content (Movies/Series from various regions)
 * - Auto-play Trailers on Active/Hover (Optional, simplified for marquee)
 */
export const QuantumHero = ({ items, type }: { items: any[], type?: string }) => {
  const { lang } = useLang()
  const [activeId, setActiveId] = useState<number | null>(null)
  const [trailers, setTrailers] = useState<Record<number, string>>({})
  const [isMuted, setIsMuted] = useState(true)
  
  // Use all items provided by the diverse fetcher
  const heroItems = items

  useEffect(() => {
    if (!heroItems.length) return

    const fetchTrailers = async () => {
      const newTrailers: Record<number, string> = {}
      
      await Promise.all(heroItems.map(async (item) => {
        try {
          const type = item.media_type || 'movie'
          const { data } = await tmdb.get(`/${type}/${item.id}/videos`)
          const trailer = data.results?.find(
            (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
          )
          if (trailer?.key) {
            newTrailers[item.id] = trailer.key
          }
        } catch (e) {
          console.error(`Failed to fetch trailer for ${item.id}`, e)
        }
      }))
      
      setTrailers(newTrailers)
    }

    fetchTrailers()
  }, [heroItems.map(i => i.id).join(',')])

  if (!heroItems.length) return null

  return (
    <div className="relative h-[85vh] w-full bg-black overflow-hidden">
      <Swiper
        modules={[Autoplay]}
        spaceBetween={0}
        slidesPerView={1}
        loop={true}
        speed={1000} // Smooth transition speed
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        }}
        breakpoints={{
          640: { slidesPerView: 2 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
          1280: { slidesPerView: 5 },
        }}
        className="h-full w-full"
      >
        {heroItems.map((item) => {
          const trailerKey = trailers[item.id]
          const isHovered = activeId === item.id
          
          return (
            <SwiperSlide key={item.id} className="h-full">
              <div 
                className="relative h-full w-full border-r border-white/10 overflow-hidden group"
                onMouseEnter={() => setActiveId(item.id)}
                onMouseLeave={() => setActiveId(null)}
              >
                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                  <TmdbImage
                    path={item.poster_path}
                    alt={item.title || item.name}
                    size="original"
                    priority={true} // Improve LCP
                    className="w-full h-full"
                    imgClassName="object-cover object-center transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />
                </div>

                {/* Video Player (On Hover) */}
                <AnimatePresence>
                  {isHovered && trailerKey && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                      className="absolute inset-0 z-10 bg-black"
                    >
                      <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] pointer-events-none opacity-60">
                        <ReactPlayer
                          url={`https://www.youtube.com/watch?v=${trailerKey}`}
                          playing={true}
                          loop={true}
                          muted={isMuted}
                          controls={false}
                          width="100%"
                          height="100%"
                          config={{
                            playerVars: { showinfo: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0 }
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content Layer */}
                <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 transition-all duration-500 group-hover:pb-12">
                  <div className="space-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    {/* Category Label */}
                    <div className="inline-flex items-center px-2 py-1 rounded bg-lumen-gold/20 text-lumen-gold text-xs font-bold uppercase tracking-wider backdrop-blur-sm border border-lumen-gold/20">
                      {getLocalizedOrigin(item.original_language, lang)}
                      <span className="mx-1">•</span>
                      {getLocalizedType(item.media_type || 'movie', lang)}
                    </div>

                    {/* Title */}
                    <h2 className="font-syne font-black text-white leading-tight text-2xl lg:text-3xl line-clamp-2 drop-shadow-lg" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                      {item.title || item.name}
                    </h2>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-3 text-xs text-zinc-300 font-medium">
                       {item.vote_average > 0 && (
                         <div className="flex items-center gap-1 text-yellow-400">
                           <Star size={12} fill="currentColor" />
                           <span>{item.vote_average.toFixed(1)}</span>
                         </div>
                       )}
                       
                       {(item.release_date || item.first_air_date) && (
                         <div className="flex items-center gap-1">
                           <Calendar size={12} />
                           <span>{(item.release_date || item.first_air_date).substring(0, 4)}</span>
                         </div>
                       )}
                       
                       {item.genre_ids?.[0] && (
                         <div className="flex items-center gap-1 text-lumen-blue">
                           <Film size={12} />
                           <span>{getGenreName(item.genre_ids[0], lang)}</span>
                         </div>
                       )}
                    </div>

                    {/* Expanded Content (Hover) */}
                    <div className="max-h-0 overflow-hidden group-hover:max-h-[300px] transition-all duration-500 ease-in-out opacity-0 group-hover:opacity-100">
                      <p className="text-zinc-300 text-sm line-clamp-3 mb-4 pt-2">
                        {item.overview}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <PrefetchLink
                          to={`/watch/${item.media_type || 'movie'}/${item.id}`}
                          className="flex items-center gap-2 bg-lumen-gold text-black px-4 py-2 rounded-lg font-bold text-xs hover:bg-yellow-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Play size={14} fill="currentColor" />
                          <span>{lang === 'ar' ? 'مشاهدة' : 'Watch'}</span>
                        </PrefetchLink>
                        
                        {trailerKey && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsMuted(!isMuted)
                            }}
                            className="p-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors"
                          >
                            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          )
        })}
      </Swiper>
    </div>
  )
}
