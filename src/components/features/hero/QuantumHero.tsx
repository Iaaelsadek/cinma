import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info, Volume2, VolumeX, ChevronRight } from 'lucide-react'
import { PrefetchLink } from '../../common/PrefetchLink'
import { TmdbImage } from '../../common/TmdbImage'
import { useLang } from '../../../state/useLang'
import { tmdb } from '../../../lib/tmdb'
import ReactPlayer from 'react-player/youtube'

/**
 * INTERACTIVE SPLIT-GRID HERO
 * Features:
 * - 3-Column Split Layout (Desktop) / Vertical Stack (Mobile)
 * - Hover-to-Expand Interaction
 * - Instant Trailer Playback on Expand
 * - Framer Motion Smooth Transitions
 */
export const QuantumHero = ({ items, type }: { items: any[], type?: string }) => {
  const { lang } = useLang()
  const [activeId, setActiveId] = useState<number | null>(null)
  const [trailers, setTrailers] = useState<Record<number, string>>({})
  const [isMuted, setIsMuted] = useState(true)
  
  // Take top 3 items only
  const heroItems = items.slice(0, 3)
  
  // Default active item is the first one if none selected (optional)
  // But for "Split Grid", usually they start equal or first expanded.
  // Let's make the first one expanded by default on mount? 
  // User said "Expand on hover". So default: equal or first?
  // Let's default to the first one being active on mobile, but on desktop maybe equal until hover?
  // "Display 3 leading movies ... on hover, expand". Implies they are equal or compressed initially.
  // I'll make them equal initially (flex: 1) and expand to flex: 3 on hover.
  
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
    <div className="relative h-[85vh] w-full bg-black overflow-hidden flex flex-col md:flex-row">
      {heroItems.map((item, index) => {
        const isActive = activeId === item.id
        const trailerKey = trailers[item.id]
        
        return (
          <motion.div
            key={item.id}
            layout
            onHoverStart={() => setActiveId(item.id)}
            onHoverEnd={() => setActiveId(null)}
            onClick={() => setActiveId(isActive ? null : item.id)} // Tap to toggle on mobile
            initial={{ flex: 1 }}
            animate={{ 
              flex: isActive ? 3 : 1,
              filter: activeId && !isActive ? 'brightness(0.5)' : 'brightness(1)'
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative h-full border-b md:border-b-0 md:border-r border-white/10 overflow-hidden cursor-pointer group min-h-[150px]"
          >
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
               <TmdbImage
                path={item.poster_path} // Use poster for vertical slice? Or backdrop? Backdrop covers better.
                // Actually, for narrow columns, poster might be better? 
                // But backdrop is high res landscape. 
                // Let's use backdrop with object-cover.
                // Wait, standard hero uses backdrop. 
                // Let's try backdrop but center it.
                // Actually, for mobile stack, backdrop is good.
                // For desktop narrow column, center-cropped backdrop works.
                alt={item.title || item.name}
                size="original"
                className="w-full h-full"
                imgClassName="object-cover object-center transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />
            </div>

            {/* Video Player (Only if active & has trailer) */}
            <AnimatePresence>
              {isActive && trailerKey && (
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
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-10">
              <motion.div 
                layout="position"
                className="space-y-2 md:space-y-4"
              >
                {/* Title */}
                <motion.h2 
                  layout="position"
                  className={`font-syne font-black text-white leading-tight ${
                    isActive 
                      ? 'text-2xl md:text-4xl lg:text-5xl' 
                      : 'text-lg md:text-xl opacity-90'
                  }`}
                >
                  {item.title || item.name}
                </motion.h2>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-zinc-300 text-sm md:text-base line-clamp-3 md:line-clamp-4 max-w-xl mb-6">
                        {item.overview}
                      </p>

                      <div className="flex flex-wrap gap-3">
                        <PrefetchLink
                          to={`/watch/${item.media_type || 'movie'}/${item.id}`}
                          className="flex items-center gap-2 bg-lumen-gold text-black px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-yellow-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Play size={18} fill="currentColor" />
                          <span>{lang === 'ar' ? 'مشاهدة' : 'Watch'}</span>
                        </PrefetchLink>
                        
                        <PrefetchLink
                          to={`/${item.media_type === 'tv' ? 'series' : 'movie'}/${item.id}`}
                          className="flex items-center gap-2 bg-white/10 text-white border border-white/10 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-white/20 transition-colors backdrop-blur-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info size={18} />
                          <span>{lang === 'ar' ? 'تفاصيل' : 'Details'}</span>
                        </PrefetchLink>

                        {trailerKey && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsMuted(!isMuted)
                            }}
                            className="p-2.5 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/20 transition-colors"
                          >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Collapsed State Indicator (Desktop) */}
                {!isActive && (
                   <div className="hidden md:flex items-center gap-2 text-lumen-gold/80 text-sm font-medium uppercase tracking-wider mt-2">
                     <span>{lang === 'ar' ? 'اكتشف المزيد' : 'Discover'}</span>
                     <ChevronRight size={16} className={lang === 'ar' ? 'rotate-180' : ''} />
                   </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
