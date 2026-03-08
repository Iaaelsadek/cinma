import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pause, Play, Volume2, VolumeX, SkipBack, SkipForward, X, Share2, Music } from 'lucide-react'
import { useLang } from '../../../state/useLang'
import { useQuranPlayerStore } from '../../../state/useQuranPlayerStore'
import { NATURE_IMAGES, SURAHS } from '../../../data/quran'
import { toast } from 'sonner'
import { logger } from '../../../lib/logger'

export const QuranPlayerBar = () => {
  const { 
    currentTrack, 
    isPlaying, 
    toggle, 
    volume, 
    setVolume, 
    stop, 
    currentTime, 
    duration, 
    seek, 
    // We need to implement skip logic in the store or use the helper from controller?
    // For now, let's just duplicate the skip logic or move it to store actions properly.
    // Ideally actions should be self-contained. 
    // But since skip depends on SURAHS data, maybe it's fine to keep it in component for now
    // or better, inject it into the store.
    // Let's use the store actions we defined (even if empty for now, we will fix them).
  } = useQuranPlayerStore()
  
  const { lang } = useLang()
  const [isVisible, setIsVisible] = useState(true)
  const [imgError, setImgError] = useState(false)
  const [fallbackError, setFallbackError] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Skip Logic (Duplicated for now, should be centralized)
  // Actually, let's implement skipNext/Prev in the component using playTrack
  const handleSkipNext = () => {
      if (!currentTrack) return
      try {
        const parts = currentTrack.id.toString().split('-')
        if (parts.length === 2) {
          const reciterId = parts[0]
          const surahId = parseInt(parts[1])
          if (surahId < 114) {
            const nextSurahId = surahId + 1
            const paddedId = nextSurahId.toString().padStart(3, '0')
            const nextUrl = currentTrack.url.replace(/\/\d{3}\.mp3$/, `/${paddedId}.mp3`)
            
            // We need to import SURAHS here? Yes.
            // Lazy load or import top level? Top level is fine.
            
            const nextSurah = SURAHS.find((s: any) => s.id === nextSurahId)
            const nextTitle = nextSurah 
              ? (lang === 'ar' ? nextSurah.name : nextSurah.englishName)
              : `Surah ${nextSurahId}`
            
            useQuranPlayerStore.getState().playTrack({
              ...currentTrack,
              id: `${reciterId}-${nextSurahId}`,
              title: nextTitle,
              url: nextUrl
            })
          }
        }
      } catch (e) { logger.error(e) }
  }

  const handleSkipPrev = () => {
    if (!currentTrack) return
      try {
        const parts = currentTrack.id.toString().split('-')
        if (parts.length === 2) {
          const reciterId = parts[0]
          const surahId = parseInt(parts[1])
          if (surahId > 1) {
            const prevSurahId = surahId - 1
            const paddedId = prevSurahId.toString().padStart(3, '0')
            const prevUrl = currentTrack.url.replace(/\/\d{3}\.mp3$/, `/${paddedId}.mp3`)
             
            
            const prevSurah = SURAHS.find((s: any) => s.id === prevSurahId)
            const prevTitle = prevSurah 
              ? (lang === 'ar' ? prevSurah.name : prevSurah.englishName)
              : `Surah ${prevSurahId}`
  
            useQuranPlayerStore.getState().playTrack({
              ...currentTrack,
              id: `${reciterId}-${prevSurahId}`,
              title: prevTitle,
              url: prevUrl
            })
          }
        }
      } catch (e) { logger.error(e) }
  }

  useEffect(() => {
    setImgError(false)
    setFallbackError(false)
  }, [currentTrack?.id])

  const resetTimer = () => {
    setIsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setIsVisible(false), 5000)
    }
  }

  useEffect(() => {
    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [isPlaying])

  if (!currentTrack) return null

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Deterministic fallback image
  const getFallbackImage = () => {
    if (!currentTrack) return NATURE_IMAGES[0]
    const idNum = typeof currentTrack.id === 'string' 
      ? parseInt(currentTrack.id.split('-')[0]) || 0 
      : 0
    return NATURE_IMAGES[idNum % NATURE_IMAGES.length]
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 pointer-events-none"
        >
          <div className="max-w-4xl mx-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl pointer-events-auto flex items-center gap-4 relative overflow-hidden group">
            
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-lumen-gold/5 via-transparent to-lumen-gold/5 opacity-50" />
            
            {/* Progress Bar (Top) */}
            <div 
              className="absolute top-0 left-0 right-0 h-1 bg-white/10 cursor-pointer group/progress"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percent = (e.clientX - rect.left) / rect.width
                seek(percent * duration)
              }}
            >
              <div 
                className="h-full bg-lumen-gold relative"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Close Button */}
            <button 
              onClick={stop}
              className="absolute -top-3 -right-3 bg-red-500/80 hover:bg-red-600 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
            >
              <X size={14} />
            </button>

            {/* Reciter Image */}
            <div className="relative w-14 h-14 rounded-full overflow-hidden border border-white/10 shrink-0">
               {currentTrack.image && !imgError ? (
                  <img 
                    src={currentTrack.image} 
                    alt={currentTrack.reciter}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
               ) : (
                  <img 
                    src={getFallbackImage()}
                    alt="Nature"
                    className="w-full h-full object-cover opacity-80"
                  />
               )}
               {/* Spinning Vinyl Effect */}
               <div className={`absolute inset-0 border-2 border-white/20 rounded-full ${isPlaying ? 'animate-spin-slow' : ''}`} 
                    style={{ animationDuration: '10s' }} 
               />
               <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-2 h-2 bg-black rounded-full border border-white/30" />
               </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium truncate">{currentTrack.title}</h3>
              <p className="text-white/60 text-sm truncate">{currentTrack.reciter}</p>
              <div className="flex items-center gap-2 text-xs text-white/40 mt-1 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={handleSkipPrev} className="p-2 text-white/60 hover:text-white transition-colors">
                <SkipForward size={20} className={lang === 'ar' ? '' : 'rotate-180'} />
              </button>
              
              <button 
                onClick={toggle}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>

              <button onClick={handleSkipNext} className="p-2 text-white/60 hover:text-white transition-colors">
                <SkipBack size={20} className={lang === 'ar' ? '' : 'rotate-180'} />
              </button>
            </div>

            {/* Volume (Hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-2 group/volume relative">
              <button 
                onClick={() => setVolume(volume === 0 ? 1 : 0)}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <div className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 accent-white bg-white/20 rounded-lg cursor-pointer"
                />
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
