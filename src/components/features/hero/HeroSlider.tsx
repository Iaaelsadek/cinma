import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Info, Play, Plus, Check } from 'lucide-react'
import { Button } from '../../common/Button'
import { useAuth } from '../../../hooks/useAuth'
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '../../../lib/supabase'
import { useLang } from '../../../state/useLang'
import { Swiper, SwiperSlide } from 'swiper/react'
import type { Swiper as SwiperClass } from 'swiper'
import { Autoplay, EffectFade, Parallax } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/parallax'

type HeroItem = {
  id: number
  title?: string
  name?: string
  overview?: string
  backdrop_path?: string | null
  poster_path?: string | null
  release_date?: string
  first_air_date?: string
  vote_average?: number
}

type Props = {
  items: HeroItem[]
}

export const HeroSlider = ({ items }: Props) => {
  const [idx, setIdx] = useState(0)
  const [isInList, setIsInList] = useState(false)
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const { lang } = useLang()
  const swiperRef = useRef<SwiperClass | null>(null)

  const current = items[idx] || null

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user || !current) {
        if (mounted) setIsInList(false)
        return
      }
      const inside = await isInWatchlist(user.id, current.id, 'movie')
      if (mounted) setIsInList(inside)
    })()
    return () => {
      mounted = false
    }
  }, [user, current?.id])

  const onToggleList = async () => {
    if (!user || !current) return
    setBusy(true)
    try {
      if (isInList) {
        await removeFromWatchlist(user.id, current.id, 'movie')
        setIsInList(false)
      } else {
        await addToWatchlist(user.id, current.id, 'movie')
        setIsInList(true)
      }
    } finally {
      setBusy(false)
    }
  }

  if (!current) return null

  return (
    <section className="relative h-[85vh] min-h-[600px] overflow-hidden group">
      <Swiper
        modules={[Autoplay, EffectFade, Parallax]}
        effect="fade"
        parallax={true}
        speed={1000}
        loop={items.length > 1}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        onSwiper={(swiper) => { swiperRef.current = swiper }}
        onSlideChange={(swiper) => setIdx(swiper.realIndex)}
        className="absolute inset-0 h-full w-full"
      >
        {items.map((item) => {
          const slideUrl = item.backdrop_path || item.poster_path || ''
          const src = slideUrl ? `https://image.tmdb.org/t/p/original${slideUrl}` : ''
          return (
            <SwiperSlide key={item.id} className="h-full w-full overflow-hidden">
              <div 
                className="absolute inset-0 h-full w-full"
                data-swiper-parallax="50%"
                data-swiper-parallax-scale="1.1"
              >
                {src ? (
                  <img src={src} alt={item.title || item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-zinc-900" />
                )}
                {/* Advanced Vignette & Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/90 via-[#050505]/20 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#050505_120%)] opacity-60" />
              </div>
            </SwiperSlide>
          )
        })}
      </Swiper>

      <div className="relative z-10 mx-auto flex h-full max-w-[1920px] items-center px-6 lg:px-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { 
                opacity: 1, 
                x: 0,
                transition: { 
                  staggerChildren: 0.1,
                  delayChildren: 0.2
                }
              },
              exit: { opacity: 0, x: 20, transition: { duration: 0.3 } }
            }}
            className="max-w-3xl space-y-6 pt-20"
          >
            {/* Metadata Tags */}
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-widest"
            >
              <span className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-black">
                HD
              </span>
              {(current.release_date || current.first_air_date) && (
                <span className="text-zinc-300 border-l border-white/20 pl-3">
                  {(current.release_date || current.first_air_date || '').slice(0, 4)}
                </span>
              )}
              {current.vote_average && (
                <span className="flex items-center gap-1 text-yellow-400 border-l border-white/20 pl-3">
                  <span className="text-[10px]">★</span>
                  {current.vote_average.toFixed(1)}
                </span>
              )}
            </motion.div>

            {/* Title */}
            <motion.h1 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight text-white drop-shadow-2xl"
            >
              {current.title || current.name}
            </motion.h1>

            {/* Overview */}
            <motion.div 
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
              className="glass-panel p-6 rounded-2xl max-w-2xl border-l-4 border-l-primary/50"
            >
              <p className="line-clamp-3 text-sm md:text-lg text-zinc-200 leading-relaxed font-medium">
                {current.overview}
              </p>
            </motion.div>

            {/* Actions */}
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="flex flex-wrap items-center gap-4 pt-2"
            >
              <Link to={(current.name && !current.title) ? `/watch/tv/${current.id}?season=1&episode=1` : `/watch/movie/${current.id}`}>
                <Button variant="primary" size="lg" className="h-14 px-8 text-lg hover:shadow-neon-emerald transition-all duration-300">
                  <Play size={20} fill="currentColor" />
                  {lang === 'ar' ? 'شاهد الآن' : 'Watch Now'}
                </Button>
              </Link>
              <Link to={(current.name && !current.title) ? `/series/${current.id}` : `/movie/${current.id}`}>
                <Button variant="glass" size="lg" className="h-14 px-8 text-lg hover:bg-white/10">
                  <Info size={20} />
                  {lang === 'ar' ? 'المزيد' : 'More Info'}
                </Button>
              </Link>
              {user && (
                <button 
                  onClick={onToggleList} 
                  disabled={busy}
                  className="h-14 w-14 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white backdrop-blur-md transition hover:bg-white/10 hover:border-white/30"
                >
                  {isInList ? <Check size={20} className="text-primary" /> : <Plus size={20} />}
                </button>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        <div className="absolute bottom-12 right-12 hidden gap-3 lg:flex">
          <button
            onClick={() => swiperRef.current?.slidePrev()}
            className="group flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md transition hover:bg-primary hover:border-primary hover:text-black"
            aria-label="prev"
          >
            <ChevronLeft size={24} className="transition-transform group-hover:-translate-x-1" />
          </button>
          <button
            onClick={() => swiperRef.current?.slideNext()}
            className="group flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md transition hover:bg-primary hover:border-primary hover:text-black"
            aria-label="next"
          >
            <ChevronRight size={24} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-12 left-6 lg:left-16 z-20 flex gap-3">
        {items.map((item, i) => (
          <button
            key={item.id}
            onClick={() => swiperRef.current?.slideToLoop(i)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === idx ? 'w-12 bg-primary shadow-neon-emerald' : 'w-2 bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`slide-${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
