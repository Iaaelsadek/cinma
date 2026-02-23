import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { VideoPlayer } from '../../components/features/media/VideoPlayer'
import { SubtitleManager } from '../../components/features/media/SubtitleManager'
import { ChevronLeft, Eye, Clock, Calendar, Users, Send, X, Sparkles } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useLang } from '../../state/useLang'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { errorLogger } from '../../services/errorLogging'

type VideoData = {
  id: string
  title: string
  url: string
  thumbnail?: string
  description?: string
  views?: number
  duration?: number
  category?: string
  created_at?: string
  year?: number
  tmdb_id?: number // Added for subtitle search
  intro_start?: number
  intro_end?: number
}

export const WatchVideo = () => {
  const { id: idParam, slug } = useParams()
  const { lang } = useLang()
  const { user } = useAuth()
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [subtitles, setSubtitles] = useState<{ label: string, src: string, srcLang: string, default?: boolean }[]>([])
  
  // Resolve ID from slug if needed
  useEffect(() => {
    if (idParam) {
      setResolvedId(idParam)
      return
    }
    if (slug) {
      const parts = slug.split('-')
      const potentialId = parts[parts.length - 1]
      // YouTube IDs are 11 chars, but Supabase IDs are UUIDs or integers.
      // If it's a Supabase video, it might be an int or uuid.
      // If it's a YouTube video directly linked, it might be 11 chars.
      // For now, assume the ID is at the end.
      setResolvedId(potentialId)
    }
  }, [idParam, slug])

  const id = resolvedId
  const [video, setVideo] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCinemaMode, setIsCinemaMode] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<any[]>([
    { id: 1, user: 'System', text: lang === 'ar' ? 'مرحباً بك في حفلة المشاهدة!' : 'Welcome to the Watch Party!', time: '12:00' },
    { id: 2, user: 'Admin', text: lang === 'ar' ? 'استمتعوا بالمشاهدة يا شباب 🍿' : 'Enjoy the movie guys 🍿', time: '12:01' }
  ])

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isChatOpen, chatMessages])
  
  useEffect(() => {
    let mounted = true
    async function load() {
      if (!id) return
      try {
        let { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('id', id)
          .single()
        
        // Fallback: If not found by ID, try searching by slug/title
        if ((error || !data) && slug) {
            // Remove ID suffix if present to get title part
            // e.g. "movie-title-123" -> "movie title"
            const titlePart = slug.split('-').filter(p => isNaN(Number(p))).join(' ')
            if (titlePart.length > 2) {
                const { data: searchData, error: searchError } = await supabase
                    .from('videos')
                    .select('*')
                    .ilike('title', `%${titlePart}%`)
                    .limit(1)
                    .maybeSingle()
                
                if (searchData && !searchError) {
                    data = searchData
                    error = null
                }
            }
        }

        if (error) throw error
        if (mounted) setVideo(data)
      } catch (err) {
        console.error('Error loading video:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    load()
    return () => { mounted = false }
  }, [id, slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-luxury-obsidian">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black">
            <div className="aspect-video w-full">
              <div className="h-full w-full animate-pulse bg-gradient-to-r from-zinc-900 via-zinc-800/60 to-zinc-900" />
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-6 w-2/3 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  const ytFallback = id && /^[A-Za-z0-9_-]{11}$/.test(id) ? { id, title: 'YouTube', url: `https://www.youtube.com/embed/${id}` } as VideoData : null
  const effectiveVideo = video || ytFallback

  if (!effectiveVideo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-white">
        <h1 className="text-2xl font-bold">{lang === 'ar' ? 'الفيديو غير موجود' : 'Video not found'}</h1>
        <Link to="/" className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/90">
          {lang === 'ar' ? 'العودة للرئيسية' : 'Go Home'}
        </Link>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-700 ${isCinemaMode ? 'bg-black' : 'bg-luxury-obsidian'} overflow-x-hidden`}>
      <Helmet>
        <title>{effectiveVideo.title} | {lang === 'ar' ? 'سينما أونلاين' : 'Cinema Online'}</title>
        <meta name="description" content={(effectiveVideo.description || effectiveVideo.title).slice(0, 160)} />
        <meta property="og:title" content={effectiveVideo.title} />
        <meta property="og:description" content={(effectiveVideo.description || effectiveVideo.title).slice(0, 160)} />
        <meta property="og:image" content={effectiveVideo.thumbnail || '/og-image.jpg'} />
        <link rel="canonical" href={typeof window !== 'undefined' ? `${location.origin}${location.pathname}` : ''} />
      </Helmet>

      {/* Cinema Mode Overlay */}
      <AnimatePresence>
        {isCinemaMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-40 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className={`relative z-50 transition-all duration-500 flex ${isChatOpen ? 'mr-0 lg:mr-80' : ''}`}>
        <div className="flex-1">
          <div className={`mx-auto max-w-7xl px-4 py-4 ${isCinemaMode ? 'lg:py-6' : 'py-4'}`}>
            <div className="flex items-center justify-between mb-3">
              <Link to="/" className={`inline-flex items-center gap-2 transition-colors text-sm ${isCinemaMode ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-white'}`}>
                <ChevronLeft size={16} className={lang === 'ar' ? 'rotate-180' : ''} />
                {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
              </Link>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsCinemaMode(!isCinemaMode)}
                  className={`flex items-center gap-2 px-3 h-8 rounded-full border transition-all duration-300 ${
                    isCinemaMode 
                      ? 'bg-primary text-white border-primary shadow-[0_0_20px_rgba(225,29,72,0.4)]' 
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  <Sparkles size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">
                    {lang === 'ar' ? 'وضع السينما' : 'Cinema Mode'}
                  </span>
                </button>

                <button 
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className={`flex items-center gap-2 px-3 h-8 rounded-full border transition-all duration-300 ${
                    isChatOpen 
                      ? 'bg-luxury-purple text-white border-luxury-purple shadow-[0_0_20px_rgba(168,85,247,0.4)]' 
                      : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  <Users size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest hidden md:block">
                    {lang === 'ar' ? 'حفلة مشاهدة' : 'Watch Party'}
                  </span>
                </button>
              </div>
            </div>

            <div className="relative group">
              {/* Ambilight/Glow Effect */}
              <div className={`absolute -inset-4 bg-primary/20 blur-[100px] rounded-[2rem] transition-opacity duration-1000 ${isCinemaMode ? 'opacity-100 animate-pulse' : 'opacity-0'}`} />
              
              <div className={`relative overflow-hidden rounded-2xl bg-black shadow-2xl transition-all duration-700 ${isCinemaMode ? 'scale-[1.02] ring-4 ring-primary/20 shadow-primary/20' : 'ring-1 ring-white/10'}`}>
                <div className="aspect-video w-full">
                  <VideoPlayer 
                    url={effectiveVideo.url} 
                    subtitles={subtitles} 
                    introStart={effectiveVideo.intro_start}
                    introEnd={effectiveVideo.intro_end}
                  />
                </div>
              </div>
            </div>

            <SubtitleManager 
              tmdbId={effectiveVideo.tmdb_id || 0} 
              title={effectiveVideo.title} 
              currentLanguage={lang}
              onSelect={(track) => setSubtitles(prev => {
                // Avoid duplicates
                if (prev.find(s => s.src === track.src)) return prev
                return [...prev, { ...track, default: true }]
              })}
            />

            <motion.div 
              layout
              className={`mt-6 space-y-4 transition-opacity duration-500 ${isCinemaMode ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <h1 className="text-2xl font-black text-white md:text-3xl tracking-tight" dir="auto">
                    {effectiveVideo.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 font-medium">
                    {effectiveVideo.category && (
                      <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-primary uppercase tracking-widest">
                        {effectiveVideo.category}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-xs">
                      <Eye size={14} />
                      <span>{effectiveVideo.views?.toLocaleString() || 0} {lang === 'ar' ? 'مشاهدة' : 'views'}</span>
                    </div>
                    {effectiveVideo.duration && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock size={14} />
                        <span>{Math.floor(effectiveVideo.duration / 60)} {lang === 'ar' ? 'دقيقة' : 'min'}</span>
                      </div>
                    )}
                    {effectiveVideo.year && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar size={14} />
                        <span>{effectiveVideo.year}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
              
              <p className="text-zinc-400 leading-relaxed max-w-4xl text-base">
                {effectiveVideo.description || (lang === 'ar' ? 'لا يوجد وصف متاح لهذا الفيديو.' : 'No description available for this video.')}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Watch Party Sidebar */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.aside 
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="fixed top-0 right-0 h-full w-full lg:w-80 bg-luxury-charcoal/95 backdrop-blur-2xl border-l border-white/10 z-[60] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h2 className="font-black text-white uppercase tracking-widest text-sm">
                    {lang === 'ar' ? 'دردشة الحفلة' : 'Party Chat'}
                  </h2>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${msg.user === 'Admin' ? 'text-primary' : 'text-zinc-500'}`}>
                        {msg.user}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-mono">{msg.time}</span>
                    </div>
                    <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 border border-white/5">
                      <p className="text-sm text-zinc-300 leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 bg-black/20 border-t border-white/10">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!message.trim()) return;
                    setChatMessages([...chatMessages, {
                      id: Date.now(),
                      user: user?.email?.split('@')[0] || 'Guest',
                      text: message,
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }]);
                    setMessage('');
                  }}
                  className="relative"
                >
                  <input 
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={lang === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
                    className="w-full bg-white/5 border border-white/10 rounded-full py-3 px-6 pr-12 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-white transition-colors">
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
