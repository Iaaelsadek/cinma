import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info } from 'lucide-react'
import { PrefetchLink } from '../../common/PrefetchLink'
import { useLang } from '../../../state/useLang'
import { useLocation } from 'react-router-dom'
import { tmdb } from '../../../lib/tmdb'
import { useDualTitles } from '../../../hooks/useDualTitles'

/**
 * LUMEN Hero — full-viewport, cinematic.
 * Backdrop + vignette + grain; title & CTAs bottom; gold accent.
 */
export const QuantumHero = ({ items, type }: { items: any[], type?: string }) => {
  const { lang } = useLang()
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [index, setIndex] = useState(0)
  
  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [items.length])

  const current = items[index]
  const titles = useDualTitles(current || {})

  if (!items.length || !current) return null

  // Use hook titles
  const title = titles.main
  const subtitle = titles.sub
  
  const year = current.release_date?.split('-')[0] || current.first_air_date?.split('-')[0] || '—'
  const rating = current.vote_average != null ? current.vote_average.toFixed(1) : null
  const watchHref = `/watch/${current.media_type || 'movie'}/${current.id}`

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {isHome ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {/* Backdrop — single layer, no animation for performance */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${current.backdrop_path?.startsWith('http') ? current.backdrop_path : `https://image.tmdb.org/t/p/original${current.backdrop_path}`})`,
              }}
            />
            {/* LUMEN vignette — warm pull to bottom */}
            <div className="lumen-vignette" />
            {/* Optional: very subtle gradient for text legibility */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to top, rgba(8,8,12,0.92) 0%, rgba(8,8,12,0.4) 40%, transparent 70%)',
              }}
            />
            {/* Film grain */}
            <div className="lumen-grain" aria-hidden />
          </motion.div>
        </AnimatePresence>
      ) : (
        /* Non-home: lightweight CSS-only background */
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-lumen-void" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(201,169,98,0.08) 0%, transparent 60%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>
      )}

      {/* Content — bottom, max-width for readability on TV */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-12 md:pb-16 lg:pb-20">
        <div className="max-w-[2400px] mx-auto px-6 md:px-12 lg:px-16">
          <motion.div
            key={`hero-text-${current.id}`}
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <div className="flex flex-col gap-2">
              <h1
                className={`hero-title font-syne font-extrabold text-lumen-cream leading-tight tracking-tight ${
                  title.length > 40 
                    ? 'text-base md:text-lg lg:text-xl xl:text-2xl' 
                    : title.length > 23 
                      ? 'text-lg md:text-xl lg:text-2xl xl:text-3xl' 
                      : 'text-xl md:text-2xl lg:text-3xl xl:text-4xl'
                }`}
                style={{ 
                  textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.4)',
                  textWrap: 'balance',
                  maxWidth: '90%'
                }}
              >
                {title}
              </h1>
              
              {subtitle && subtitle !== title && (
                <h2 
                  className="text-lumen-gold/90 font-medium tracking-wide opacity-90"
                  style={{ 
                    fontSize: 'clamp(1rem, 1.5vw, 1.4rem)',
                    textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                    fontFamily: 'sans-serif' 
                  }}
                >
                  {subtitle}
                </h2>
              )}
            </div>

            {/* Meta row */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="px-3 py-1.5 rounded-full border border-lumen-muted text-lumen-silver font-medium">
                {year}
              </span>
              {rating && (
                <span className="flex items-center gap-1.5 text-lumen-gold font-semibold">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-lumen-gold" />
                  {rating}
                </span>
              )}
            </div>

            {/* CTAs — LUMEN: one primary (gold), one secondary (outline) */}
            <div className="mt-6 flex flex-wrap gap-4">
              <PrefetchLink
                to={watchHref}
                className="btn-primary inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumen-gold"
              >
                <Play size={20} fill="currentColor" className="shrink-0" />
                <span>{lang === 'ar' ? 'مشاهدة الآن' : 'Watch now'}</span>
              </PrefetchLink>
              <PrefetchLink
                to={current.media_type === 'tv' ? `/series/${current.id}` : `/movie/${current.id}`}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <Info size={18} className="shrink-0" />
                <span>{lang === 'ar' ? 'تفاصيل' : 'Details'}</span>
              </PrefetchLink>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
