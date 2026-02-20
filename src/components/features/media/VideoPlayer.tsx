import ReactPlayer from 'react-player'
import { AlertTriangle, SkipForward } from 'lucide-react'
import { useState, useRef } from 'react'
import { Button } from '../../common/Button'
import { useLang } from '../../../state/useLang'
import { motion, AnimatePresence } from 'framer-motion'

interface VideoPlayerProps {
  url: string
  subtitles?: { label: string, src: string, srcLang: string, kind?: string, default?: boolean }[]
  introStart?: number
  introEnd?: number
}

export const VideoPlayer = ({ url, subtitles = [], introStart, introEnd }: VideoPlayerProps) => {
  const [error, setError] = useState(false)
  const [showSkip, setShowSkip] = useState(false)
  const playerRef = useRef<ReactPlayer>(null)
  const { lang } = useLang()

  const handleProgress = (state: { playedSeconds: number }) => {
    if (introStart !== undefined && introEnd !== undefined) {
      if (state.playedSeconds >= introStart && state.playedSeconds < introEnd) {
        setShowSkip(true)
      } else {
        setShowSkip(false)
      }
    }
  }

  const skipIntro = () => {
    if (playerRef.current && introEnd !== undefined) {
      playerRef.current.seekTo(introEnd, 'seconds')
      setShowSkip(false)
    }
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-zinc-950 text-zinc-500">
        <AlertTriangle size={48} className="mb-4 text-red-500 opacity-50" />
        <p className="font-bold">Playback Error</p>
        <p className="text-xs">The source might be unavailable.</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full group">
      <ReactPlayer
        ref={playerRef}
        url={url}
        width="100%"
        height="100%"
        controls
        onError={() => setError(true)}
        onProgress={handleProgress}
        config={{ 
          file: { 
            attributes: { crossOrigin: 'anonymous' },
            forceHLS: url.includes('.m3u8'),
            tracks: subtitles.map(sub => ({
              kind: 'subtitles',
              src: sub.src,
              srcLang: sub.srcLang,
              label: sub.label,
              default: sub.default
            }))
          },
          youtube: {
            playerVars: { showinfo: 0, modestbranding: 1 }
          }
        }}
      />
      
      <AnimatePresence>
        {showSkip && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 right-8 z-50"
          >
            <Button
              onClick={skipIntro}
              variant="secondary"
              className="bg-black/80 backdrop-blur-md border-white/20 hover:bg-white/20 text-white gap-2"
            >
              <SkipForward size={16} />
              {lang === 'ar' ? 'تخطي المقدمة' : 'Skip Intro'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
