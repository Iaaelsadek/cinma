import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { Star, Download, Image as ImageIcon } from 'lucide-react'
import { incrementClicks, supabase } from '../../lib/supabase'
import { SectionHeader } from '../../components/common/SectionHeader'
import { useLang } from '../../state/useLang'
import { motion } from 'framer-motion'

type GameRow = {
  id: number
  title: string
  poster_url?: string | null
  backdrop_url?: string | null
  rating?: number | null
  year?: number | null
  release_year?: number | null
  description?: string | null
  category?: string | null
  download_url?: string | null
  screenshots?: string[]
}

export const GameDetails = () => {
  const { id } = useParams()
  const { lang } = useLang()
  const [row, setRow] = useState<GameRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!id) return
      setLoading(true)
      const { data } = await supabase.from('games').select('*').eq('id', Number(id)).maybeSingle()
      if (!cancelled) {
        setRow((data || null) as GameRow | null)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const title = row?.title || (lang === 'ar' ? 'لعبة' : 'Game')
  const rating = typeof row?.rating === 'number' ? row.rating : 0
  const year = row?.year ?? row?.release_year ?? null
  const category = row?.category || 'Others'
  const description = row?.description || (lang === 'ar' ? 'لا يوجد وصف متاح' : 'No description available')
  const poster = row?.poster_url || ''
  const backdrop = row?.backdrop_url || row?.poster_url || ''
  const downloadUrl = row?.download_url || '#'
  const screenshots = row?.screenshots || []

  const starCount = useMemo(() => {
    const stars = Math.round((rating / 10) * 5)
    return Math.max(0, Math.min(5, stars))
  }, [rating])

  return (
    <div className="min-h-screen bg-[#050505] pb-4 text-zinc-100">
      <Helmet>
        <title>{`${title} | ${lang === 'ar' ? 'ألعاب' : 'Games'}`}</title>
      </Helmet>

      {/* Hero Background */}
      <div className="absolute inset-0 h-[25vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/80 to-[#050505] z-10" />
        {backdrop && (
          <motion.img
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 1.5 }}
            src={backdrop}
            alt="Backdrop"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="relative z-20 px-4 md:px-8 max-w-[2400px] mx-auto">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-2 pt-2">
          {/* Poster Column */}
          <div className="hidden lg:block space-y-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 shadow-2xl"
            >
              {poster ? (
                <img src={poster} alt={title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                  <span className="text-zinc-500">No Poster</span>
                </div>
              )}
            </motion.div>
            
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-500 transition-colors text-xs"
            >
              <Download size={16} />
              {lang === 'ar' ? 'تحميل اللعبة' : 'Download Game'}
            </a>
          </div>

          {/* Details Column */}
          <div className="space-y-2">
            <div className="space-y-1">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl md:text-3xl font-black text-white leading-tight"
              >
                {title}
              </motion.h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                {year && (
                  <span className="rounded bg-white/10 px-2 py-0.5 text-white">
                    {year}
                  </span>
                )}
                {rating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={14} className="fill-current" />
                    <span className="text-white font-bold">{rating.toFixed(1)}</span>
                  </div>
                )}
                <span className="text-emerald-400 font-medium">{category}</span>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="lg:hidden">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-500 transition-colors text-sm"
              >
                <Download size={18} />
                {lang === 'ar' ? 'تحميل اللعبة' : 'Download Game'}
              </a>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="prose prose-invert max-w-4xl"
            >
              <p className="text-sm md:text-base leading-relaxed text-zinc-300">
                {description}
              </p>
            </motion.div>

            {/* Screenshots */}
            {screenshots && screenshots.length > 0 && (
              <div className="pt-6">
                <SectionHeader 
                  title={lang === 'ar' ? 'لقطات الشاشة' : 'Screenshots'} 
                  icon={<ImageIcon />} 
                  color="cyan"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {screenshots.map((shot, idx) => (
                    <div key={idx} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900 aspect-video">
                      <img src={shot} alt={`Screenshot ${idx + 1}`} className="h-full w-full object-cover transition-transform hover:scale-105" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
