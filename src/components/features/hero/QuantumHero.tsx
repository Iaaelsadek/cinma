import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info } from 'lucide-react'
import { PrefetchLink } from '../../common/PrefetchLink'
import { TmdbImage } from '../../common/TmdbImage'
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
  const titles = useDualTitles(current)

  if (!items.length || !current) return null

  // Use hook titles
  const title = titles.main
  const subtitle = titles.sub
  
  const year = current.release_date?.split('-')[0] || current.first_air_date?.split('-')[0] || '—'
  const rating = current.vote_average != null ? current.vote_average.toFixed(1) : null
  const watchHref = `/watch/${current.media_type || 'movie'}/${current.id}`

  return (
    <div className="relative h-[45vh] md:h-[50vh] w-full overflow-hidden">
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
            <TmdbImage
              path={current.backdrop_path}
              alt={title || 'Backdrop'}
              size="original"
              priority={true}
              className="absolute inset-0 h-full w-full"
              imgClassName="object-cover object-center"
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
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 md:pb-10">
        <div className="max-w-[2400px] mx-auto px-6 md:px-12 lg:px-16">
          <motion.div
            key={`hero-text-${current.id}`}
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <div className="flex flex-col gap-2 md:gap-4">
              <h1
                className={`hero-title font-syne font-black text-lumen-cream leading-none tracking-tighter ${
                  title.length > 40 
                    ? 'text-3xl md:text-4xl lg:text-5xl' 
                    : title.length > 20 
                      ? 'text-4xl md:text-5xl lg:text-6xl' 
                      : 'text-5xl md:text-6xl lg:text-7xl xl:text-8xl'
                }`}
                style={{ 
                  textShadow: '0 2px 30px rgba(0,0,0,0.5)',
                  textWrap: 'balance',
                  maxWidth: '100%'
                }}
              >
                {title}
              </h1>
              
              {subtitle && subtitle !== title && (
                <h2 
                  className="text-lumen-gold/90 font-medium tracking-wide opacity-90 line-clamp-2 md:line-clamp-none"
                  style={{ 
                    fontSize: 'clamp(1rem, 1.5vw, 1.5rem)',
                    textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                    fontFamily: 'sans-serif' 
                  }}
                >
                  {subtitle}
                </h2>
              )}
            </div>

            {/* Meta row */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="px-2.5 py-1 rounded-full border border-lumen-muted text-lumen-silver font-medium text-xs">
                {year}
              </span>
              {rating && (
                <span className="flex items-center gap-1.5 text-lumen-gold font-semibold text-xs">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-lumen-gold" />
                  {rating}
                </span>
              )}
            </div>

            {/* CTAs — LUMEN: one primary (gold), one secondary (outline) */}
            <div className="mt-5 flex flex-wrap gap-3">
              <PrefetchLink
                to={watchHref}
                className="btn-primary inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumen-gold py-2 px-5 text-sm"
              >
                <Play size={18} fill="currentColor" className="shrink-0" />
                <span>{lang === 'ar' ? 'مشاهدة الآن' : 'Watch now'}</span>
              </PrefetchLink>
              <PrefetchLink
                to={current.media_type === 'tv' ? `/series/${current.id}` : `/movie/${current.id}`}
                className="btn-secondary inline-flex items-center gap-2 py-2 px-5 text-sm"
              >
                <Info size={16} className="shrink-0" />
                <span>{lang === 'ar' ? 'تفاصيل' : 'Details'}</span>
              </PrefetchLink>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
