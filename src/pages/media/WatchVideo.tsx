import { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getDailyMotionByIdDB } from '../../lib/db'
import { VideoPlayer } from '../../components/features/media/VideoPlayer'
import { ChevronLeft, Eye, Clock, Calendar, AlertTriangle, Heart, Share2 } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useLang } from '../../state/useLang'
import { motion } from 'framer-motion'
import { logger } from '../../lib/logger'
import { useAuth } from '../../hooks/useAuth'
import { toast } from '../../lib/toast-manager'

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
  tmdb_id?: number
  intro_start?: number
  intro_end?: number
}

export const WatchVideo = () => {
  const { id: idParam, slug } = useParams()
  const location = useLocation()
  const { lang } = useLang()
  const { user } = useAuth()

  const isDailyMotion = location.pathname.startsWith('/watch/dm/')

  const id = useMemo(() => {
    if (idParam) {
      return idParam
    }
    if (slug) {
      const parts = slug.split('-')
      const lastPart = parts[parts.length - 1]
      return lastPart || null
    }
    return null
  }, [idParam, slug])

  const [video, setVideo] = useState<VideoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    let mounted = true
    async function load() {
      setLoading(true)

      try {
        if (isDailyMotion && id) {
          const dmVideo = await getDailyMotionByIdDB(id)

          if (dmVideo && mounted) {
            setVideo({
              id: dmVideo.id,
              title: dmVideo.title,
              url: dmVideo.embed_url,
              thumbnail: dmVideo.thumbnail_url,
              description: dmVideo.description,
              views: dmVideo.view_count,
              duration: dmVideo.duration,
              category: dmVideo.category,
              created_at: dmVideo.created_at,
            })
            setLoading(false)
            return
          }
        } else {
          let { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('id', id)
            .single()

          if ((error || !data) && slug) {
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
          if (mounted) {
            setVideo(data)
            setLoading(false)
            return
          }
        }

        if (mounted) {
          setLoading(false)
        }
      } catch (err: any) {
        if (mounted) setLoading(false)
        logger.error('Video load error', err)
      }
    }
    load()
    return () => { mounted = false }
  }, [id, slug, isDailyMotion])

  useEffect(() => {
    if (!user?.id || !id) return

    async function checkWatchlist() {
      try {
        const { data } = await supabase
          .from('watchlist')
          .select('id')
          .eq('user_id', user!.id)
          .eq('content_id', id)
          .eq('content_type', 'video')
          .maybeSingle()

        setIsInWatchlist(!!data)
      } catch (err) {
        logger.error('Check watchlist error', err)
      }
    }

    checkWatchlist()
  }, [user, id])

  const handleWatchlistToggle = async () => {
    if (!user) {
      toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first')
      return
    }

    if (!id) return

    setWatchlistLoading(true)

    try {
      if (isInWatchlist) {
        await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', id)
          .eq('content_type', 'video')

        setIsInWatchlist(false)
        toast.success(lang === 'ar' ? 'تم الإزالة من قائمة المشاهدة' : 'Removed from watchlist')
      } else {
        await supabase
          .from('watchlist')
          .insert({
            user_id: user.id,
            content_id: id,
            content_type: 'video'
          })

        setIsInWatchlist(true)
        toast.success(lang === 'ar' ? 'تم الإضافة لقائمة المشاهدة' : 'Added to watchlist')
      }
    } catch (err) {
      logger.error('Watchlist toggle error', err)
      toast.error(lang === 'ar' ? 'حدث خطأ' : 'An error occurred')
    } finally {
      setWatchlistLoading(false)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: effectiveVideo.title,
      text: effectiveVideo.description || effectiveVideo.title,
      url: window.location.href
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        toast.success(lang === 'ar' ? 'تم نسخ الرابط' : 'Link copied')
      }
    } catch (err) {
      logger.error('Share error', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-lumen-400 border-t-transparent animate-spin mb-4" />
          <p>{lang === 'ar' ? 'جاري تحميل الفيديو...' : 'Loading video...'}</p>
        </div>
      </div>
    )
  }

  const effectiveVideo = video || {
    id: id || 'unknown',
    title: 'Unknown Video',
    url: '',
    description: '',
    views: 0,
    duration: 0,
    category: '',
    year: undefined,
    intro_start: undefined,
    intro_end: undefined
  }

  if (!effectiveVideo.url && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">{lang === 'ar' ? 'عذراً، الفيديو غير موجود' : 'Video Not Found'}</h1>
          <p className="text-zinc-400 mb-6">
            {lang === 'ar'
              ? 'قد يكون الرابط غير صحيح أو تم حذف الفيديو.'
              : 'The link might be incorrect or the video has been removed.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-lumen-gold text-black px-6 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
          >
            <ChevronLeft size={20} className={lang === 'ar' ? '' : 'rotate-180'} />
            {lang === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
          </Link>
        </div>
      </div>
    )
  }

  const title = effectiveVideo.title || 'Untitled Video'
  const description = effectiveVideo.description || ''
  const poster = effectiveVideo.thumbnail || '/placeholder.jpg'
  const videoUrl = effectiveVideo.url || ''

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": title,
    "description": description,
    "thumbnailUrl": [poster],
    "uploadDate": effectiveVideo.created_at || new Date().toISOString(),
    "duration": effectiveVideo.duration ? `PT${Math.floor(effectiveVideo.duration / 60)}M${effectiveVideo.duration % 60}S` : undefined,
    "contentUrl": videoUrl,
    "embedUrl": videoUrl,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": { "@type": "WatchAction" },
      "userInteractionCount": effectiveVideo.views || 0
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Helmet>
        <title>{title} - Cinema Online</title>
        <meta name="description" content={description.slice(0, 160)} />
        <meta property="og:type" content="video.other" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description.slice(0, 200)} />
        <meta property="og:image" content={poster} />
        <meta property="og:video" content={videoUrl} />
        <meta property="twitter:card" content="player" />
        <meta property="twitter:url" content={window.location.href} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description.slice(0, 200)} />
        <meta property="twitter:image" content={poster} />
        <meta property="twitter:player" content={videoUrl} />
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <div className="relative z-50">
        <div className="mx-auto w-full px-4 md:px-12 py-4 max-w-3xl">
          <div className="flex items-center justify-between mb-3">
            <Link to="/" className="inline-flex items-center gap-2 transition-colors text-sm text-zinc-400 hover:text-white">
              <ChevronLeft size={16} className={lang === 'ar' ? 'rotate-180' : ''} />
              {lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={handleWatchlistToggle}
                disabled={watchlistLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${isInWatchlist
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white'
                  }`}
              >
                <Heart size={16} className={isInWatchlist ? 'fill-current' : ''} />
                <span className="text-xs font-bold hidden sm:block">
                  {isInWatchlist
                    ? (lang === 'ar' ? 'في قائمتي' : 'In Watchlist')
                    : (lang === 'ar' ? 'أضف لقائمتي' : 'Add to Watchlist')}
                </span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-white/5 text-zinc-400 border-white/10 hover:border-white/20 hover:text-white transition-all duration-300"
              >
                <Share2 size={16} />
                <span className="text-xs font-bold hidden sm:block">
                  {lang === 'ar' ? 'مشاركة' : 'Share'}
                </span>
              </button>
            </div>
          </div>

          <div className="relative group">
            <div className="relative overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
              <div className="aspect-video w-full">
                <VideoPlayer
                  url={effectiveVideo.url}
                  introStart={effectiveVideo.intro_start}
                  introEnd={effectiveVideo.intro_end}
                />
              </div>
            </div>
          </div>

          <motion.div layout className="mt-6 space-y-4">
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
    </div>
  )
}
