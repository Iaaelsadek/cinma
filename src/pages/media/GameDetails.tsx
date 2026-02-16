import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import { Star } from 'lucide-react'
import { incrementClicks, supabase } from '../../lib/supabase'
import { useLang } from '../../state/useLang'

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

  const starCount = useMemo(() => {
    const stars = Math.round((rating / 10) * 5)
    return Math.max(0, Math.min(5, stars))
  }, [rating])

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Helmet>
        <title>{title} | {lang === 'ar' ? 'الألعاب' : 'Gaming'}</title>
        <meta name="description" content={description.slice(0, 160)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description.slice(0, 160)} />
        <meta property="og:image" content={backdrop || poster || '/og-image.jpg'} />
        <link rel="canonical" href={typeof window !== 'undefined' ? `${location.origin}${location.pathname}` : ''} />
      </Helmet>

      <div className="relative">
        {backdrop ? (
          <>
            <img
              src={backdrop}
              alt={title}
              className="absolute inset-0 h-[46vh] w-full object-cover object-center opacity-60 blur-2xl scale-105"
            />
            <div className="absolute inset-0 h-[46vh] bg-gradient-to-b from-black/50 via-[#0f0f0f]/70 to-[#0f0f0f]" />
          </>
        ) : (
          <div className="absolute inset-0 h-[36vh] bg-[#1a1a1a]" />
        )}

        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-8 pb-10">
          {loading ? (
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="aspect-[2/3] w-60 animate-pulse rounded-lg bg-zinc-800" />
              <div className="flex-1 space-y-3">
                <div className="h-7 w-1/2 animate-pulse rounded bg-zinc-800" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-800" />
                <div className="h-24 w-full animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px]">
              <div className="order-2 md:order-1">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white" dir="auto">{title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                  {year && (
                    <span className="inline-flex items-center gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest">{year}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-yellow-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={16} className={i < starCount ? 'fill-yellow-400' : 'text-zinc-600'} />
                    ))}
                    <span className="ml-1 text-xs font-bold text-yellow-400">{rating.toFixed(1)}/10</span>
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest">{category}</span>
                </div>
                <p className="mt-4 max-w-3xl text-zinc-300">{description}</p>
                <div className="mt-6">
                  <a
                    href={row?.download_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (row?.id) incrementClicks('games', row.id).catch(() => undefined)
                    }}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-8 text-sm font-bold text-white shadow-md hover:brightness-110"
                  >
                    {lang === 'ar' ? 'تحميل اللعبة' : 'Download Game'}
                  </a>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                  <div className="aspect-[2/3] w-full bg-[#1a1a1a]">
                    {poster && <img src={poster} alt={title} className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
