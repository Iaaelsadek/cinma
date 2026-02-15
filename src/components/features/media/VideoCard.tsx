import { motion } from 'framer-motion'
import { Play, Info, Plus, Check } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang } from '../../../state/useLang'
import { useEffect, useState, type MouseEvent } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { addToWatchlist, isInWatchlist, removeFromWatchlist } from '../../../lib/supabase'

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

export const VideoCard = ({ video, index = 0 }: { video: VideoItem; index?: number }) => {
  const { lang } = useLang()
  const [isHovered, setIsHovered] = useState(false)
  const [inList, setInList] = useState(false)
  const [busy, setBusy] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const img = video.thumbnail || ''
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
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="relative z-0"
    >
      <Link 
        to={`/watch/yt/${video.id}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group/card block relative"
      >
        <div className="relative overflow-hidden rounded-xl bg-luxury-charcoal border border-white/5 transition-all duration-500 transform-gpu glass-smooth hover:scale-[1.05] hover:shadow-glass hover:border-primary/50">
          {/* Thumbnail Container */}
          <div className="aspect-video w-full relative overflow-hidden bg-zinc-900">
            {img ? (
              <img 
                src={img} 
                alt={video.title} 
                className={`h-full w-full object-cover transition-transform duration-700 ${isHovered ? 'scale-110 blur-[2px]' : 'scale-100'}`}
                loading="lazy" 
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                <Play size={32} />
              </div>
            )}

            {/* Quality Tag */}
            {video.quality && (
              <div className="absolute top-2 left-2 z-10 rounded-md bg-black/60 backdrop-blur-md border border-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                {video.quality}
              </div>
            )}

            {/* Duration Tag */}
            {duration && (
              <div className="absolute bottom-2 right-2 z-10 rounded bg-black/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-bold text-white">
                {duration}
              </div>
            )}

            {/* Hover Overlay Content */}
            <div className={`absolute inset-0 z-20 flex flex-col justify-end p-4 bg-gradient-to-t from-luxury-obsidian via-luxury-obsidian/40 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-2 mb-3">
                <motion.button 
                  initial={{ scale: 0 }}
                  animate={{ scale: isHovered ? 1 : 0 }}
                  className="rounded-full bg-primary text-white shadow-[0_0_15px_rgba(225,29,72,0.5)] h-11 w-11 flex items-center justify-center"
                  type="button"
                  onClick={() => navigate(`/watch/yt/${video.id}`)}
                  aria-label="watch"
                >
                  <Play size={16} fill="currentColor" />
                </motion.button>
                <div className="flex gap-1.5">
                  <button
                    className="rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md h-11 w-11 flex items-center justify-center"
                    onClick={toggleList}
                    disabled={busy || !canToggle}
                    type="button"
                    aria-label="my-list"
                  >
                    {inList ? <Check size={14} className="text-white" /> : <Plus size={14} className="text-white" />}
                  </button>
                  <button className="rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 backdrop-blur-md h-11 w-11 flex items-center justify-center">
                    <Info size={14} className="text-white" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-300 line-clamp-2 leading-relaxed">
                {video.description || video.title}
              </p>
            </div>
          </div>

          {/* Static Info (Visible when not hovered or small screens) */}
          <div className="p-3">
            <h3 className="line-clamp-1 text-sm font-bold text-zinc-100 group-hover/card:text-primary transition-colors text-right">
              {video.title}
            </h3>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-primary" />
                {video.category || (lang === 'ar' ? 'فيديو' : 'Video')}
              </span>
              {video.views ? (
                <span className="flex items-center gap-1">
                  {formatViews(video.views)} {lang === 'ar' ? 'مشاهدة' : 'views'}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
