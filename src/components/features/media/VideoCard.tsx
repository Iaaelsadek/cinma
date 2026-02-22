import { motion } from 'framer-motion'
import { Play, Info, Plus, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../../../state/useLang'
import { useEffect, useState, type MouseEvent, memo } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '../../../lib/supabase'

import { useDualTitles } from '../../../hooks/useDualTitles'

export type VideoItem = {
  id: string | number
  title: string
  thumbnail?: string | null
  url?: string
  views?: number | null
  duration?: number | null
  category?: string | null
  created_at?: string | null
  description?: string | null
  quality?: string | null
  year?: number | null
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
  return views.toString()
}

export const VideoCard = memo(({ video, index = 0 }: { video: VideoItem; index?: number }) => {
  const { lang } = useLang()
  const titles = useDualTitles(video)
  const displayTitle = lang === 'ar' ? (titles.sub || titles.main) : titles.main
  const [isHovered, setIsHovered] = useState(false)
  const [inList, setInList] = useState(false)
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [imageSrc, setImageSrc] = useState(() => {
    const raw = video.thumbnail || ''
    // Default to hqdefault (safe) instead of maxresdefault (often missing)
    if (raw.includes('maxresdefault')) {
      return raw.replace('maxresdefault', 'hqdefault').replace('vi_webp', 'vi').replace('.webp', '.jpg')
    }
    return raw
  })
  
  // Handle image updates when prop changes
  useEffect(() => {
    const raw = video.thumbnail || ''
    if (raw.includes('maxresdefault')) {
      setImageSrc(raw.replace('maxresdefault', 'hqdefault').replace('vi_webp', 'vi').replace('.webp', '.jpg'))
    } else {
      setImageSrc(raw)
    }
  }, [video.thumbnail])

  const handleImageError = () => {
    // If image fails, don't try fallback chains to avoid console spam.
    // hqdefault should exist for 99% of videos. If not, just show placeholder.
    setImageSrc('')
  }

  const duration = video.duration ? formatDuration(video.duration) : ''
  const contentId = Number(video.id)
  const canToggle = Number.isFinite(contentId)
  const contentType = video.category === 'series' ? 'tv' : 'movie'

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!user || !canToggle) {
        if (mounted) setInList(false)
        return
      }
      const inside = await isInWatchlist(user.id, contentId, contentType)
      if (mounted) setInList(inside)
    })()
    return () => { mounted = false }
  }, [user, contentId, contentType, canToggle])

  const toggleList = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || busy || !canToggle) {
      if (!user) navigate('/login')
      return
    }
    setBusy(true)
    try {
      const current = await isInWatchlist(user.id, contentId, contentType)
      if (current) {
        await removeFromWatchlist(user.id, contentId, contentType)
        setInList(false)
      } else {
        await addToWatchlist(user.id, contentId, contentType)
        setInList(true)
      }
    } catch (error) {
      console.error('Watchlist toggle error:', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/watch/${video.category === 'series' ? 'tv' : 'movie'}/${video.id}`)}
    >
      <div className="aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-white/5 relative">
        {imageSrc ? (
          <img 
            src={imageSrc}
            alt={displayTitle}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <Play className="text-zinc-600" />
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
        
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-cyan-500/90 flex items-center justify-center backdrop-blur-sm shadow-lg shadow-cyan-500/20 transform scale-50 group-hover:scale-100 transition-transform">
            <Play fill="white" className="text-white ml-1" size={20} />
          </div>
        </div>

        {/* Duration Badge */}
        {duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-medium text-white backdrop-blur-sm">
            {duration}
          </div>
        )}

        {/* Quality Badge */}
        {video.quality && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-cyan-500/80 text-[10px] font-bold text-white backdrop-blur-sm">
            {video.quality}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="font-bold text-sm text-zinc-100 line-clamp-2 group-hover:text-cyan-400 transition-colors leading-snug">
          {displayTitle}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            {video.year && <span>{video.year}</span>}
            {video.views && (
              <>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span>{formatViews(video.views)}</span>
              </>
            )}
          </div>
          
          <button 
            onClick={toggleList}
            disabled={busy || !canToggle}
            className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${inList ? 'text-cyan-400' : 'text-zinc-500'}`}
          >
            {inList ? <Check size={14} /> : <Plus size={14} />}
          </button>
        </div>
      </div>
    </motion.div>
  )
}, (prev, next) => {
  return prev.video.id === next.video.id && prev.index === next.index
})
