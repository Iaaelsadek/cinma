import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useLang } from '../state/useLang'

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
}

const QuranPlayerContext = createContext<QuranPlayerContextValue | null>(null)

export const QuranPlayerProvider = ({ children }: { children: ReactNode }) => {
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
    const onEnd = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', onEnd)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    if (!currentTrack?.url) return
    if (isPlaying) {
      audioRef.current.play().catch(() => undefined)
    } else {
      audioRef.current.pause()
    }
  }, [currentTrack, isPlaying])

  const playTrack = (track: QuranTrack) => {
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
    seek
  }), [currentTrack, isPlaying, volume, currentTime, duration])

  return (
    <QuranPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={currentTrack?.url || undefined}
        preload="none"
      />
    </QuranPlayerContext.Provider>
  )
}

export const useQuranPlayer = () => {
  const ctx = useContext(QuranPlayerContext)
  if (!ctx) throw new Error('QuranPlayerProvider missing')
  return ctx
}

import { Share2, X } from 'lucide-react'
import { toast } from 'sonner'

export const QuranPlayerBar = () => {
  const { currentTrack, isPlaying, toggle, volume, setVolume, stop, currentTime, duration, seek } = useQuranPlayer()
  const { lang } = useLang()

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#050505]/90 backdrop-blur-2xl shadow-2xl">
      {/* Progress Bar (Top Line) */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/10 group cursor-pointer">
        {/* Background Track */}
        <div 
          className="absolute inset-0 w-full h-full"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const p = x / rect.width
            seek(p * duration)
          }}
        />
        
        {/* Filled Progress */}
        <div 
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 relative pointer-events-none"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        >
          {/* Draggable Knob (Simulated) */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-0 group-hover:scale-100 transition-transform duration-200" />
        </div>

        {/* Hidden Range Input for Accessibility & Dragging */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => {
            const val = Number(e.target.value)
            seek(val)
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 md:py-4">
        {/* Play Button with Image */}
        <div className="relative group shrink-0">
          <button
            onClick={toggle}
            className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-primary/50 shadow-neon-emerald transition-transform active:scale-95 hover:border-primary"
          >
            {currentTrack.image ? (
              <img src={currentTrack.image} alt={currentTrack.reciter} className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" />
            ) : (
              <div className="absolute inset-0 bg-zinc-800" />
            )}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
            <div className="relative z-10 text-white drop-shadow-md">
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </div>
          </button>
        </div>

        {/* Info & Progress */}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-white leading-tight mb-0.5">
                {currentTrack.title}
              </div>
              <div className="truncate text-xs text-zinc-400 font-medium">
                {currentTrack.reciter}
              </div>
            </div>
            {/* Time Display (Hidden on very small screens) */}
            <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-zinc-400">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="opacity-50">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="hidden sm:flex items-center justify-center h-10 w-10 rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
            title={lang === 'ar' ? 'مشاركة' : 'Share'}
          >
            <Share2 size={18} />
          </button>

          {/* Volume Control */}
          <div className="hidden md:flex items-center gap-2 group/vol">
            <button 
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-1 w-20 accent-primary cursor-pointer rounded-full bg-white/20"
              />
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={stop}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
            title={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
