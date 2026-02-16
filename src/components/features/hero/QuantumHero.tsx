import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLang } from '../../../state/useLang'

export const QuantumHero = ({ items }: { items: any[] }) => {
  const { lang } = useLang()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [items.length])

  if (!items.length) return null

  const current = items[index]

  return (
    <div className="relative h-[85vh] w-full overflow-hidden perspective-1000 group">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear scale-110 group-hover:scale-100"
            style={{ backgroundImage: `url(${current.backdrop_path?.startsWith('http') ? current.backdrop_path : `https://image.tmdb.org/t/p/original${current.backdrop_path}`})` }}
          />
          
          {/* Cinematic Vignette & Noise */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/40 to-transparent" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
        </motion.div>
      </AnimatePresence>

      {/* Floating UI Content */}
      <div className="absolute bottom-8 md:bottom-12 w-full z-20">
        <div className="max-w-[2400px] mx-auto px-4 md:px-12">
          <motion.div
            key={`text-${current.id}`}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="space-y-4 max-w-4xl"
          >
          {/* Title with Glitch Effect */}
          <h1 
            className="w-fit text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50 leading-tight text-glitch"
            data-text={current.title || current.name}
          >
            {current.title || current.name}
          </h1>

          {/* Meta Tags */}
          <div className="flex items-center gap-4 text-cyan-400 font-mono text-xs tracking-widest uppercase">
            <span className="px-3 py-1 border border-cyan-500/30 rounded-full backdrop-blur-md">
              {current.release_date?.split('-')[0] || '2050'}
            </span>
            <span className="flex items-center gap-2">
              <Star size={14} className="fill-cyan-400" />
              {current.vote_average?.toFixed(1)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Link 
              to={`/watch/${current.media_type || 'movie'}/${current.id}`}
              className="btn-primary flex items-center gap-2 bg-cyan-400 text-black hover:bg-cyan-300 px-6 py-3 text-sm"
            >
              <Play size={18} fill="currentColor" />
              <span>{lang === 'ar' ? 'مشاهدة الآن' : 'Initiate Playback'}</span>
            </Link>
            
            <Link to={`/watch/${current.media_type || 'movie'}/${current.id}`} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 backdrop-blur-md transition-all group text-sm">
              <Info size={18} className="group-hover:rotate-12 transition-transform" />
              <span className="font-bold tracking-widest uppercase">{lang === 'ar' ? 'تفاصيل' : 'Data Log'}</span>
            </Link>
          </div>
        </motion.div>
        </div>
      </div>

      {/* Progress Bar Removed */}
    </div>
  )
}
