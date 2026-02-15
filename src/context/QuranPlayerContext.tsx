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
}

const QuranPlayerContext = createContext<QuranPlayerContextValue | null>(null)

export const QuranPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<QuranTrack | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = volume
  }, [volume])

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

  const value = useMemo<QuranPlayerContextValue>(() => ({
    currentTrack,
    isPlaying,
    volume,
    playTrack,
    toggle,
    stop,
    setVolume
  }), [currentTrack, isPlaying, volume])

  return (
    <QuranPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={currentTrack?.url || undefined}
        onEnded={() => setIsPlaying(false)}
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

import { X } from 'lucide-react'

export const QuranPlayerBar = () => {
  const { currentTrack, isPlaying, toggle, volume, setVolume, stop } = useQuranPlayer()
  const { lang } = useLang()

  if (!currentTrack) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
        <button
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-neon-emerald hover:bg-primary/90 transition-transform active:scale-95"
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">{currentTrack.title}</div>
          <div className="truncate text-xs text-zinc-400">{currentTrack.reciter}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-zinc-300">
            {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1 w-20 accent-primary cursor-pointer rounded-full bg-white/20"
              aria-label={lang === 'ar' ? 'مستوى الصوت' : 'Volume'}
            />
          </div>
          <button
            onClick={stop}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:bg-white/20 hover:text-white transition-colors"
            title={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
