import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { Download, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { incrementClicks, supabase } from '../../lib/supabase'
import { useLang } from '../../state/useLang'

type SoftwareRow = {
  id: number
  title: string
  poster_url?: string | null
  backdrop_url?: string | null
  rating?: number | null
  year?: number | null
  release_year?: number | null
  version?: string | null
  description?: string | null
  category?: string | null
  download_url?: string | null
}

export const SoftwareDetails = () => {
  const { id } = useParams()
  const { lang } = useLang()
  const [row, setRow] = useState<SoftwareRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!id) return
      setLoading(true)
      const { data } = await supabase.from('software').select('*').eq('id', Number(id)).maybeSingle()
      if (!cancelled) {
        setRow((data || null) as SoftwareRow | null)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const title = row?.title || (lang === 'ar' ? 'برنامج' : 'Software')
  const rating = typeof row?.rating === 'number' ? row.rating : 0
  const version = row?.version || row?.year || row?.release_year || null
  const platform = row?.category || 'PC'
  const description = row?.description || (lang === 'ar' ? 'لا يوجد وصف متاح' : 'No description available')
  const poster = row?.poster_url || ''
  const backdrop = row?.backdrop_url || row?.poster_url || ''
  const downloadUrl = row?.download_url || '#'

  return (
    <div className="min-h-screen bg-[#050505] pb-6 text-zinc-100">
      <Helmet>
        <title>{`${title} | ${lang === 'ar' ? 'برامج' : 'Software'}`}</title>
      </Helmet>

      {/* Hero Background */}
      <div className="absolute inset-0 h-[30vh] w-full overflow-hidden">
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
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 pt-4">
          {/* Poster Column */}
          <div className="hidden lg:block space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-square overflow-hidden rounded-xl border border-white/10 shadow-2xl"
            >
              {poster ? (
                <img src={poster} alt={title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                  <span className="text-zinc-500">No Icon</span>
                </div>
              )}
            </motion.div>
            
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 font-bold text-white hover:bg-sky-500 transition-colors text-sm"
            >
              <Download size={18} />
              {lang === 'ar' ? 'تحميل البرنامج' : 'Download App'}
            </a>
          </div>

          {/* Details Column */}
          <div className="space-y-3">
            <div className="space-y-2">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl md:text-3xl font-black text-white leading-tight"
              >
                {title}
              </motion.h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                {version && (
                  <span className="rounded bg-white/10 px-2 py-0.5 text-white">
                    v{version}
                  </span>
                )}
                {rating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={14} className="fill-current" />
                    <span className="text-white font-bold">{rating.toFixed(1)}</span>
                  </div>
                )}
                <span className="text-sky-400 font-medium">{platform}</span>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="lg:hidden">
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 font-bold text-white hover:bg-sky-500 transition-colors text-sm"
              >
                <Download size={18} />
                {lang === 'ar' ? 'تحميل البرنامج' : 'Download App'}
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
          </div>
        </div>
      </div>
    </div>
  )
}
