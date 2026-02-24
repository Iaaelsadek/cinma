import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX, SkipBack, SkipForward, X, Share2 } from 'lucide-react'
import { useLang } from '../state/useLang'
import { toast } from 'sonner'
import { SURAHS, NATURE_IMAGES } from '../data/quran'

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
        preload="metadata"
        {...{ referrerPolicy: "no-referrer" } as any}
        onEnded={() => skipNext()}
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
      hideTimerRef.current = setTimeout(() => setIsVisible(false), 5000)
    }
  }

  useEffect(() => {
    const events = ['mousemove', 'click', 'keydown', 'scroll']
    events.forEach(e => window.addEventListener(e, resetTimer))
    
    // Initial timer
    resetTimer()

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [isPlaying])

  if (!currentTrack) return null

  const formatTime = (time: number) => {
    if (!time) return '0:00'
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success(lang === 'ar' ? 'تم نسخ الرابط' : 'Link copied')
  }

  // Determine image source
  const reciterId = parseInt(currentTrack.id.toString().split('-')[0]) || 0
  const fallbackImage = NATURE_IMAGES[reciterId % NATURE_IMAGES.length]
  const finalImage = (imgError || !currentTrack.image) ? fallbackImage : currentTrack.image

  const renderImage = () => {
    if (fallbackError) {
       return (
         <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-teal-900 flex items-center justify-center">
             <div className="w-1/2 h-1/2 rounded-full bg-emerald-500/20 animate-pulse" />
         </div>
       )
    }
    return (
      <img 
        src={finalImage} 
        alt={currentTrack.reciter} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
        onError={() => {
            if (!imgError && currentTrack.image) {
                setImgError(true)
            } else {
                setFallbackError(true)
            }
        }}
        loading="lazy"
      />
    )
  }

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-[200] border-t border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-in-out ${
        isVisible ? 'translate-y-0' : 'translate-y-[85%]'
      } hover:translate-y-0`}
      onMouseEnter={() => setIsVisible(true)}
    >
      {/* Floating Track Info (Compact & Above) */}
      <div className={`absolute bottom-full left-4 mb-4 z-50 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-xl">
            <div className={`relative w-10 h-10 rounded-full overflow-hidden border border-emerald-500/30 shrink-0 group`}>
              {renderImage()}
              <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex gap-0.5 items-end h-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-0.5 bg-white animate-music-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col min-w-[100px] max-w-[200px]">
              <h3 className="text-white font-bold text-xs truncate leading-tight">{currentTrack.title}</h3>
              <p className="text-emerald-400 text-[10px] truncate leading-tight">{currentTrack.reciter}</p>
            </div>
        </div>
      </div>

      {/* Progress Bar (Interactive) */}
      <div className="absolute -top-1 left-0 right-0 h-1.5 group cursor-pointer">
        <div className="absolute inset-0 bg-white/10" />
        <div 
          className="absolute inset-0 z-10"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const p = (e.clientX - rect.left) / rect.width
            seek(p * duration)
          }}
        />
        <div 
          className="h-full bg-emerald-500 relative transition-all duration-100 group-hover:h-2.5 -top-0.5"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        
        {/* Left Side (Empty now, or simplified) */}
        <div className="hidden md:block w-1/4"></div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-1 flex-1 max-w-md">
          <div className="flex items-center gap-6">
            <button onClick={skipPrev} className="text-zinc-400 hover:text-white transition-colors">
              <SkipBack size={20} />
            </button>
            <button 
              onClick={toggle}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={skipNext} className="text-zinc-400 hover:text-white transition-colors">
              <SkipForward size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 w-full font-mono">
            <span className="min-w-[40px] text-right">{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-white/30" style={{ width: `${(currentTime / duration) * 100}%` }} />
            </div>
            <span className="min-w-[40px]">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Actions */}
        <div className="flex items-center justify-end gap-4 w-1/4 min-w-[150px]">
          <div className="hidden md:flex items-center gap-2 group">
            <button onClick={() => setVolume(volume === 0 ? 0.8 : 0)}>
              {volume === 0 ? <VolumeX size={18} className="text-zinc-400" /> : <Volume2 size={18} className="text-zinc-400 group-hover:text-white" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100"
            />
          </div>
          <button onClick={handleShare} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors hidden sm:block">
            <Share2 size={20} />
          </button>
          <button onClick={stop} className="text-zinc-400 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

      </div>
    </div>
  )
}
