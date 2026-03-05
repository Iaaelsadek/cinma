import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX, SkipBack, SkipForward, X, Share2, Music } from 'lucide-react'
import { useLang } from '../state/useLang'
import { toast } from 'sonner'
import { SURAHS, NATURE_IMAGES } from '../data/quran'
import { motion, AnimatePresence } from 'framer-motion'

type QuranTrack = {
  id: number | string
  title: string
  reciter: string
  url: string
  image?: string | null
}

type QuranPlayerContextValue = {
  currentTrack: QuranTrack | null
  isPlaying: boolean
  volume: number
  playTrack: (track: QuranTrack) => void
  toggle: () => void
  stop: () => void
  setVolume: (value: number) => void
  currentTime: number
  duration: number
  seek: (time: number) => void
  skipNext: () => void
  skipPrev: () => void
}

const QuranPlayerContext = createContext<QuranPlayerContextValue | null>(null)

export const QuranPlayerProvider = ({ children }: { children: ReactNode }) => {
  const { lang } = useLang()
  const [currentTrack, setCurrentTrack] = useState<QuranTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
    }
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    if (!currentTrack?.url) return
    
    let isCancelled = false

    const playAudio = async () => {
      try {
        if (isCancelled) return
        if (isPlaying) {
          await audioRef.current?.play()
        } else {
          audioRef.current?.pause()
        }
      } catch (error: any) {
        if (isCancelled) return
        console.error('Playback error:', error)
        setIsPlaying(false)
        if (error.name !== 'AbortError') {
             toast.error(lang === 'ar' ? 'خطأ في تشغيل الملف الصوتي' : 'Audio playback error')
        }
      }
    }

    if (currentTrack?.url) {
        playAudio()
    }

    return () => {
      isCancelled = true
      if (audioRef.current && isPlaying) {
         // Don't pause on cleanup because component might just re-render
         // But here dependencies are [currentTrack, isPlaying]
         // If currentTrack changes, we probably WANT to stop the previous track?
         // Actually, HTML Audio element handles src change automatically (stops previous).
      }
    }
  }, [currentTrack, isPlaying])

  const playTrack = (track: QuranTrack) => {
    if (currentTrack?.id === track.id) {
      toggle()
      return
    }
    setCurrentTrack(track)
    setIsPlaying(true)
  }

  const toggle = () => {
    if (!currentTrack) return
    setIsPlaying((v) => !v)
  }

  const stop = () => {
    setIsPlaying(false)
    setCurrentTrack(null)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const skipNext = () => {
    if (!currentTrack) return
    try {
      const parts = currentTrack.id.toString().split('-')
      if (parts.length === 2) {
        const reciterId = parts[0]
        const surahId = parseInt(parts[1])
        if (surahId < 114) {
          const nextSurahId = surahId + 1
          const paddedId = nextSurahId.toString().padStart(3, '0')
          // Replace last 3 digits + extension
          const nextUrl = currentTrack.url.replace(/\/\d{3}\.mp3$/, `/${paddedId}.mp3`)
          
          const nextSurah = SURAHS.find(s => s.id === nextSurahId)
          const nextTitle = nextSurah 
            ? (lang === 'ar' ? nextSurah.name : nextSurah.englishName)
            : `Surah ${nextSurahId}`
          
          playTrack({
            ...currentTrack,
            id: `${reciterId}-${nextSurahId}`,
            title: nextTitle,
            url: nextUrl
          })
        }
      }
    } catch (e) {
      console.error("Skip failed", e)
    }
  }

  const skipPrev = () => {
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
          
          const prevSurah = SURAHS.find(s => s.id === prevSurahId)
          const prevTitle = prevSurah 
            ? (lang === 'ar' ? prevSurah.name : prevSurah.englishName)
            : `Surah ${prevSurahId}`

          playTrack({
            ...currentTrack,
            id: `${reciterId}-${prevSurahId}`,
            title: prevTitle,
            url: prevUrl
          })
        }
      }
    } catch (e) {
      console.error("Skip failed", e)
    }
  }

  const value = useMemo<QuranPlayerContextValue>(() => ({
    currentTrack,
    isPlaying,
    volume,
    playTrack,
    toggle,
    stop,
    setVolume,
    currentTime,
    duration,
    seek,
    skipNext,
    skipPrev
  }), [currentTrack, isPlaying, volume, currentTime, duration, lang])

  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    // Reset retry count when track changes
    setRetryCount(0)
  }, [currentTrack?.id])

  return (
    <QuranPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={currentTrack?.url || undefined}
        preload="auto"
        crossOrigin="anonymous"
        {...{ referrerPolicy: "no-referrer" } as any}
        onEnded={() => skipNext()}
        onCanPlay={() => {
          if (isPlaying) {
            audioRef.current?.play().catch(err => {
              if (err.name !== 'AbortError') {
                console.error("Autoplay failed:", err)
              }
            })
          }
        }}
        onError={(e) => {
          console.error('Audio error details:', {
             error: e.currentTarget.error,
             src: e.currentTarget.src,
             networkState: e.currentTarget.networkState,
             readyState: e.currentTarget.readyState
          })
          
          if (retryCount < 2 && currentTrack?.url) {
             const delay = (retryCount + 1) * 1000
             
             // Try to fix URL if it's HTTP
             if (currentTrack.url.startsWith('http:')) {
                const newUrl = currentTrack.url.replace('http:', 'https:')
                // We can't easily update currentTrack here without causing a loop if not careful
                // But we can try to reload
             }

             setRetryCount(prev => prev + 1)
             setTimeout(() => {
                 if (audioRef.current && isPlaying) {
                     audioRef.current.load()
                     audioRef.current.play().catch(err => console.error("Retry play failed", err))
                 }
             }, delay)
             return
          }

          setIsPlaying(false)
          toast.error(lang === 'ar' ? 'فشل تحميل الملف الصوتي' : 'Failed to load audio')
        }}
      />
    </QuranPlayerContext.Provider>
  )
}

export const useQuranPlayer = () => {
  const ctx = useContext(QuranPlayerContext)
  if (!ctx) throw new Error('QuranPlayerProvider missing')
  return ctx
}

export const QuranPlayerBar = () => {
  const { currentTrack, isPlaying, toggle, volume, setVolume, stop, currentTime, duration, seek, skipNext, skipPrev } = useQuranPlayer()
  const { lang } = useLang()
  const [isVisible, setIsVisible] = useState(true)
  const [imgError, setImgError] = useState(false)
  const [fallbackError, setFallbackError] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setImgError(false)
    setFallbackError(false)
  }, [currentTrack?.id])

  const resetTimer = () => {
    setIsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setIsVisible(false), 8000)
    }
  }

  useEffect(() => {
    const events = ['mousemove', 'click', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [isPlaying])

  if (!currentTrack) return null

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00'
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success(lang === 'ar' ? 'تم نسخ الرابط بنجاح' : 'Link copied successfully')
  }

  const reciterId = parseInt(currentTrack.id.toString().split('-')[0]) || 0
  const fallbackImage = NATURE_IMAGES[reciterId % NATURE_IMAGES.length]
  const finalImage = (imgError || !currentTrack.image) ? fallbackImage : currentTrack.image

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: isVisible ? 0 : '80%', opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onMouseEnter={() => setIsVisible(true)}
        className="fixed bottom-0 left-0 right-0 z-[200] pb-safe"
      >
        {/* Main Player Container */}
        <div className="relative mx-auto max-w-6xl mb-4 px-4">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-emerald-950/40 backdrop-blur-3xl border border-emerald-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group">
            
            {/* Islamic Geometric Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0l5 15h15l-12 9 5 16-13-10-13 10 5-16-12-9h15z' fill='%2310b981'/%3E%3C/svg%3E")` }} />
            
            {/* Progress Bar (Top) */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/10 cursor-pointer group/progress"
                 onClick={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect()
                   const p = (e.clientX - rect.left) / rect.width
                   seek(p * duration)
                 }}>
              <motion.div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 relative"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)] opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </motion.div>
            </div>

            <div className="flex items-center justify-between gap-4 p-4 md:p-6">
              
              {/* Left: Track Info */}
              <div className="flex items-center gap-4 w-1/3 min-w-0">
                <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border-2 border-emerald-500/20 shrink-0 group/img">
                  {fallbackError ? (
                    <div className="w-full h-full bg-emerald-900/40 flex items-center justify-center">
                      <Music className="text-emerald-500/40" />
                    </div>
                  ) : (
                    <img 
                      src={finalImage} 
                      alt={currentTrack.reciter} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" 
                      onError={() => imgError ? setFallbackError(true) : setImgError(true)}
                    />
                  )}
                  {isPlaying && (
                    <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
                      <div className="flex gap-1 items-end h-4">
                        {[0.1, 0.3, 0.2, 0.4].map((delay, i) => (
                          <motion.div 
                            key={i}
                            animate={{ height: [4, 16, 8, 12, 4] }}
                            transition={{ duration: 1, repeat: Infinity, delay }}
                            className="w-1 bg-emerald-400 rounded-full" 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-white font-bold text-lg md:text-xl font-amiri truncate leading-tight group-hover:text-emerald-400 transition-colors">
                    سورة {currentTrack.title}
                  </h3>
                  <p className="text-emerald-500/70 text-sm font-amiri truncate leading-tight">
                    {currentTrack.reciter}
                  </p>
                </div>
              </div>

              {/* Center: Controls */}
              <div className="flex flex-col items-center gap-2 flex-1 max-w-sm">
                <div className="flex items-center gap-6 md:gap-8">
                  <button 
                    onClick={skipPrev} 
                    className="text-emerald-500/40 hover:text-emerald-400 transition-all hover:scale-110 active:scale-95"
                  >
                    <SkipBack size={24} fill="currentColor" />
                  </button>
                  
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggle}
                    className="w-14 h-14 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all"
                  >
                    {isPlaying ? (
                      <Pause size={28} fill="currentColor" />
                    ) : (
                      <Play size={28} fill="currentColor" className="ml-1" />
                    )}
                  </motion.button>

                  <button 
                    onClick={skipNext} 
                    className="text-emerald-500/40 hover:text-emerald-400 transition-all hover:scale-110 active:scale-95"
                  >
                    <SkipForward size={24} fill="currentColor" />
                  </button>
                </div>

                <div className="flex items-center gap-3 w-full text-[10px] md:text-xs font-mono text-emerald-500/40">
                  <span className="w-10 text-right">{formatTime(currentTime)}</span>
                  <div className="flex-1 h-1 bg-emerald-500/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-emerald-500/40" 
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} 
                    />
                  </div>
                  <span className="w-10">{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center justify-end gap-3 md:gap-5 w-1/3">
                <div className="hidden lg:flex items-center gap-3 group/vol">
                  <button 
                    onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                    className="text-emerald-500/40 hover:text-emerald-400 transition-colors"
                  >
                    {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <div className="w-20 h-1 bg-emerald-500/10 rounded-full overflow-hidden relative">
                    <input
                      type="range" min="0" max="1" step="0.01" value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div 
                      className="h-full bg-emerald-500/40 transition-all"
                      style={{ width: `${volume * 100}%` }}
                    />
                  </div>
                </div>

                <button 
                  onClick={handleShare} 
                  className="p-2.5 text-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                  title={lang === 'ar' ? 'مشاركة' : 'Share'}
                >
                  <Share2 size={20} />
                </button>
                
                <button 
                  onClick={stop} 
                  className="p-2.5 text-emerald-500/40 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  title={lang === 'ar' ? 'إغلاق' : 'Close'}
                >
                  <X size={20} />
                </button>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
