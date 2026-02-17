import ReactPlayer from 'react-player'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export const VideoPlayer = ({ url, subtitles = [] }: { url: string, subtitles?: { label: string, src: string, srcLang: string, kind?: string, default?: boolean }[] }) => {
  const [error, setError] = useState(false)

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
    <ReactPlayer
      url={url}
      width="100%"
      height="100%"
      controls
      onError={() => setError(true)}
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
  )
}
