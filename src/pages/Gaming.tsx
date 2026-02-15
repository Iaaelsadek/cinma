import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { useLang } from '../state/useLang'
import { supabase } from '../lib/supabase'

type Platform = 'all' | 'pc' | 'console' | 'mobile' | 'others'

type GameRow = {
  id: number
  title: string
  poster_url?: string | null
  rating?: number | null
  year?: number | null
  release_year?: number | null
  category?: string | null
  download_url?: string | null
}

export const Gaming = () => {
  const { lang } = useLang()
  const [platform, setPlatform] = useState<Platform>('all')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<GameRow[]>([])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      setLoading(true)
      const { data } = await supabase.from('games').select('*').order('rating', { ascending: false })
      if (!ignore) {
        setRows((data || []) as GameRow[])
        setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const platformOptions = useMemo(() => ([
    { key: 'all', label: lang === 'ar' ? 'الكل' : 'All' },
    { key: 'pc', label: 'PC' },
    { key: 'console', label: 'Console' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'others', label: lang === 'ar' ? 'أخرى' : 'Others' }
  ] as Array<{ key: Platform; label: string }>), [lang])

  const filtered = useMemo(() => rows.filter((r) => {
    if (platform === 'all') return true
    if (platform === 'pc') return (r.category || '').toLowerCase() === 'pc'
    if (platform === 'console') return (r.category || '').toLowerCase() === 'console'
    if (platform === 'mobile') return (r.category || '').toLowerCase() === 'mobile'
    if (platform === 'others') return (r.category || '').toLowerCase() === 'others'
    return true
  }), [platform, rows])

  return (
    <div className="px-4 lg:px-12 py-12">
      <Helmet>
        <title>{lang === 'ar' ? 'الألعاب | cinma.online' : 'Gaming | cinma.online'}</title>
        <meta name="description" content={lang === 'ar' ? 'أحدث الألعاب المميزة وروابط التحميل في تجربة عربية فاخرة.' : 'Top gaming picks and downloads in a luxury Arabic experience.'} />
        <meta property="og:title" content={lang === 'ar' ? 'الألعاب' : 'Gaming'} />
        <meta property="og:description" content={lang === 'ar' ? 'أحدث الألعاب المميزة وروابط التحميل في تجربة عربية فاخرة.' : 'Top gaming picks and downloads in a luxury Arabic experience.'} />
        <link rel="canonical" href={typeof window !== 'undefined' ? `${location.origin}${location.pathname}` : ''} />
      </Helmet>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
          {lang === 'ar' ? 'الألعاب' : 'Gaming'}
        </h1>
        <div className="flex gap-2">
          {platformOptions.map((p) => (
            <button
              key={p.key}
              onClick={() => setPlatform(p.key)}
              className={`px-4 h-10 rounded-full border text-xs font-bold uppercase tracking-widest ${
                platform === p.key
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-white/5 bg-luxury-charcoal animate-pulse">
              <div className="aspect-[2/3] w-full bg-zinc-800" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-zinc-800 rounded" />
                <div className="h-3 w-1/2 bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((v) => (
            <Link key={v.id} to={`/game/${v.id}`} className="group rounded-xl overflow-hidden border border-white/5 bg-luxury-charcoal transition-colors hover:border-primary/40">
              <div className="aspect-[2/3] w-full overflow-hidden">
                <img src={v.poster_url || ''} alt={v.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-primary transition-colors">{v.title}</h3>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                  {v.category || 'Others'} • {(v.year ?? v.release_year) || '--'}
                </div>
                <div className="mt-2 text-xs font-bold text-yellow-400">{Number(v.rating || 0).toFixed(1)}/10</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
