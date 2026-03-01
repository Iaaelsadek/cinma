import ReactPlayer from 'react-player'
import { 
  AlertTriangle, 
  SkipForward, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  Subtitles, 
  RotateCcw, 
  RotateCw,
  FastForward,
  Rewind,
  Loader2,
  Check
} from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '../../common/Button'
import { useLang } from '../../../state/useLang'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'

interface VideoPlayerProps {
  url: string
  subtitles?: { label: string, src: string, srcLang: string, kind?: string, default?: boolean }[]
  introStart?: number
  introEnd?: number
  title?: string
  poster?: string
  onProgress?: (state: { played: number, playedSeconds: number, loaded: number, loadedSeconds: number }) => void
  onPlay?: () => void
  onPause?: () => void
  onDuration?: (duration: number) => void
  ref?: React.RefObject<ReactPlayer | null>
  playing?: boolean
  seekTo?: number
}

export const VideoPlayer = ({ url, subtitles = [], introStart, introEnd, title, poster, onProgress, onPlay, onPause, onDuration, playing: externalPlaying, seekTo }: VideoPlayerProps) => {
  // State
  const [playing, setPlaying] = useState(false)

  // Sync with external playing state
  useEffect(() => {
    if (externalPlaying !== undefined) {
      setPlaying(externalPlaying)
    }
  }, [externalPlaying])

  // Sync with external seek
  useEffect(() => {
    if (seekTo !== undefined && playerRef.current) {
      playerRef.current.seekTo(seekTo)
    }
  }, [seekTo])
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [played, setPlayed] = useState(0)
  const [loaded, setLoaded] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [seeking, setSeeking] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSkip, setShowSkip] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSubtitlesMenu, setShowSubtitlesMenu] = useState(false)
  const [activeSubtitle, setActiveSubtitle] = useState<number>(-1) // -1 for none
  
  // Refs
  const playerRef = useRef<ReactPlayer>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<any>(null)
  
  const { lang } = useLang()

  // Handlers
  const handlePlayPause = () => {
    const nextState = !playing
    setPlaying(nextState)
    if (nextState) onPlay?.()
    else onPause?.()
  }
  
  const handleToggleMuted = () => setMuted(!muted)
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (val > 0) setMuted(false)
  }

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  const handleSeekMouseDown = () => setSeeking(true)
  
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value))
  }
  
  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setSeeking(false)
    const target = e.target as HTMLInputElement
    const seconds = parseFloat(target.value) * duration
    playerRef.current?.seekTo(seconds)
  }

  const handleProgress = (state: { played: number, playedSeconds: number, loaded: number, loadedSeconds: number }) => {
    if (!seeking) {
      setPlayed(state.played)
    }
    setLoaded(state.loaded)
    
    // Intro Skip Logic
    if (introStart !== undefined && introEnd !== undefined) {
      if (state.playedSeconds >= introStart && state.playedSeconds < introEnd) {
        setShowSkip(true)
      } else {
        setShowSkip(false)
      }
    }
    onProgress?.(state)
  }

  const skipIntro = () => {
    if (playerRef.current && introEnd !== undefined) {
      playerRef.current.seekTo(introEnd, 'seconds')
      setShowSkip(false)
    }
  }

  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000)
    const hh = date.getUTCHours()
    const mm = date.getUTCMinutes()
    const ss = date.getUTCSeconds().toString().padStart(2, '0')
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`
    }
    return `${mm}:${ss}`
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault()
          handlePlayPause()
          break
        case 'KeyF':
          e.preventDefault()
          handleToggleFullscreen()
          break
        case 'KeyM':
          e.preventDefault()
          handleToggleMuted()
          break
        case 'ArrowRight':
          e.preventDefault()
          playerRef.current?.seekTo(playerRef.current.getCurrentTime() + 10)
          break
        case 'ArrowLeft':
          e.preventDefault()
          playerRef.current?.seekTo(playerRef.current.getCurrentTime() - 10)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(prev => Math.min(prev + 0.1, 1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(prev => Math.max(prev - 0.1, 0))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playing, muted, isFullscreen])

  // Fullscreen Listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 text-zinc-500 rounded-3xl border border-white/5">
        <AlertTriangle size={48} className="mb-4 text-red-500 opacity-50" />
        <p className="font-bold">{lang === 'ar' ? 'خطأ في التشغيل' : 'Playback Error'}</p>
        <p className="text-xs">{lang === 'ar' ? 'قد يكون المصدر غير متاح حالياً.' : 'The source might be unavailable.'}</p>
        <Button 
          variant="secondary" 
          className="mt-4" 
          onClick={() => window.location.reload()}
        >
          {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={clsx(
        "relative h-full w-full group bg-black overflow-hidden transition-all duration-500",
        isFullscreen ? "rounded-0" : "rounded-3xl border border-white/10"
      )}
    >
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <Loader2 className="animate-spin text-primary" size={48} />
          </motion.div>
        )}
      </AnimatePresence>

      <ReactPlayer
        key={`${url}-${activeSubtitle}`}
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        playing={playing}
        volume={volume}
        muted={muted}
        playbackRate={playbackRate}
        onReady={() => setLoading(false)}
        onBuffer={() => setLoading(true)}
        onBufferEnd={() => setLoading(false)}
        onError={() => setError(true)}
        onProgress={handleProgress}
        onDuration={(d) => setDuration(d)}
        onClick={() => handlePlayPause()}
        config={{ 
          file: { 
            attributes: { 
              crossOrigin: 'anonymous',
              poster: poster
            },
            forceHLS: url.includes('.m3u8'),
            tracks: subtitles.map((sub, idx) => ({
              kind: 'subtitles',
              src: sub.src,
              srcLang: sub.srcLang,
              label: sub.label,
              default: activeSubtitle === idx
            }))
          }
        }}
      />

      {/* Custom Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none"
          >
            {/* Top Bar: Title */}
            <div className="p-6 flex justify-between items-start pointer-events-auto">
              <h3 className="text-white font-bold text-lg drop-shadow-lg opacity-80">
                {title || (lang === 'ar' ? 'مشغل سينما أونلاين' : 'Cinema Online Player')}
              </h3>
            </div>

            {/* Center: Play/Pause Large Icon */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <motion.div
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: playing ? 0 : 1 }}
                 className="p-8 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white"
               >
                 {playing ? <Pause size={48} /> : <Play size={48} className="ml-2" />}
               </motion.div>
            </div>

            {/* Bottom Controls */}
            <div className="p-4 md:p-6 space-y-4 pointer-events-auto">
              {/* Progress Bar */}
              <div className="relative group/progress">
                {/* Buffering bar */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 bg-white/20 rounded-full overflow-hidden w-full"
                >
                  <div 
                    className="h-full bg-white/30 transition-all duration-300"
                    style={{ width: `${loaded * 100}%` }}
                  />
                </div>
                {/* Active progress */}
                <input
                  type="range"
                  min={0}
                  max={0.999999}
                  step="any"
                  value={played}
                  onMouseDown={handleSeekMouseDown}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekMouseUp}
                  className="relative z-10 w-full h-1.5 bg-transparent appearance-none cursor-pointer accent-primary group-hover/progress:h-2 transition-all"
                  style={{
                    background: `linear-gradient(to right, #f5c518 ${played * 100}%, transparent ${played * 100}%)`
                  }}
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 md:gap-6">
                  <button onClick={handlePlayPause} className="text-white hover:text-primary transition-colors">
                    {playing ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
                  </button>

                  <div className="flex items-center gap-2 group/volume">
                    <button onClick={handleToggleMuted} className="text-white hover:text-primary transition-colors">
                      {muted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                    </button>
                    <input 
                      type="range"
                      min={0}
                      max={1}
                      step="any"
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 accent-primary appearance-none bg-white/20 rounded-full cursor-pointer"
                    />
                  </div>

                  <div className="text-white text-sm font-medium tabular-nums opacity-80">
                    {formatTime(duration * played)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={clsx("text-white hover:text-primary transition-colors", showSettings && "text-primary")}
                  >
                    <Settings size={22} />
                  </button>

                  <button 
                    onClick={() => {
                      setShowSubtitlesMenu(!showSubtitlesMenu)
                      setShowSettings(false)
                    }}
                    className={clsx("text-white hover:text-primary transition-colors", showSubtitlesMenu && "text-primary")}
                  >
                    <Subtitles size={22} />
                  </button>

                  <button onClick={handleToggleFullscreen} className="text-white hover:text-primary transition-colors">
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Intro Button */}
      <AnimatePresence>
        {showSkip && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute bottom-28 right-8 z-50 pointer-events-auto"
          >
            <Button
              onClick={skipIntro}
              variant="secondary"
              className="bg-black/80 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white gap-2 h-12 px-6 rounded-2xl shadow-2xl"
            >
              <SkipForward size={20} />
              <span className="font-bold">
                {lang === 'ar' ? 'تخطي المقدمة' : 'Skip Intro'}
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Menu (Simplified) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-24 right-6 z-50 w-48 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl pointer-events-auto"
          >
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-3 py-2 border-b border-white/5 mb-1">
              {lang === 'ar' ? 'الإعدادات' : 'Settings'}
            </div>
            
            <button 
              onClick={() => {
                setPlaybackRate(prev => prev === 2 ? 0.5 : prev + 0.25)
              }}
              className="w-full flex justify-between items-center px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-white transition-colors"
            >
              <span>{lang === 'ar' ? 'السرعة' : 'Speed'}</span>
              <span className="text-primary font-bold">{playbackRate}x</span>
            </button>

            <button 
              className="w-full flex justify-between items-center px-3 py-2 rounded-xl hover:bg-white/5 text-sm text-white transition-colors"
            >
              <span>{lang === 'ar' ? 'الجودة' : 'Quality'}</span>
              <span className="text-zinc-500 font-bold">Auto</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtitles Menu */}
      <AnimatePresence>
        {showSubtitlesMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-24 right-16 z-50 w-48 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl pointer-events-auto"
          >
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-3 py-2 border-b border-white/5 mb-1">
              {lang === 'ar' ? 'الترجمة' : 'Subtitles'}
            </div>
            
            <button 
              onClick={() => {
                setActiveSubtitle(-1)
                setShowSubtitlesMenu(false)
              }}
              className={clsx(
                "w-full flex justify-between items-center px-3 py-2 rounded-xl hover:bg-white/5 text-sm transition-colors",
                activeSubtitle === -1 ? "text-primary bg-primary/5" : "text-white"
              )}
            >
              <span>{lang === 'ar' ? 'إيقاف' : 'Off'}</span>
              {activeSubtitle === -1 && <Check size={14} />}
            </button>

            {subtitles.map((sub, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  setActiveSubtitle(idx)
                  setShowSubtitlesMenu(false)
                }}
                className={clsx(
                  "w-full flex justify-between items-center px-3 py-2 rounded-xl hover:bg-white/5 text-sm transition-colors",
                  activeSubtitle === idx ? "text-primary bg-primary/5" : "text-white"
                )}
              >
                <span>{sub.label}</span>
                {activeSubtitle === idx && <Check size={14} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
