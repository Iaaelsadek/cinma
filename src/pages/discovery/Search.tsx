import { useEffect, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import InfiniteScroll from 'react-infinite-scroll-component'
import { advancedSearch, fetchGenres } from '../../lib/tmdb'
import { MovieCard } from '../../components/features/media/MovieCard'
import { VideoCard, VideoItem } from '../../components/features/media/VideoCard'
import { useDebounce } from '../../hooks/useDebounce'
import { supabase } from '../../lib/supabase'
import { SeoHead } from '../../components/common/SeoHead'
import { CONFIG } from '../../lib/constants'
import { SkeletonGrid } from '../../components/common/Skeletons'
import { Button } from '../../components/common/Button'
import { FileQuestion } from 'lucide-react'
import { useLang } from '../../state/useLang'

type SearchItem = {
  id: number
  media_type: 'movie' | 'tv'
  title?: string
  name?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
}

type GenreItem = { id: number; name: string }
type GameRow = { id: number; title: string; poster_url: string | null; category: string | null; rating: number | null }
type SoftwareRow = { id: number; title: string; poster_url: string | null; category: string | null; rating: number | null }
type AnimeRow = { id: number; title: string; image_url: string | null; category: string | null; score: number | null }
type ReciterRow = { id: number; name: string; image: string | null; rewaya: string | null }

export const Search = () => {
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') || ''
  const types = (sp.get('types') || 'movie').split(',').filter(Boolean)
  const rawGenres = sp.get('genres') || ''
  const keywords = sp.get('keywords') || ''
  const filterLang = sp.get('lang') || undefined
  const genres = rawGenres.split(',').filter(Boolean).map(Number).filter(n => !isNaN(n))
  const yfrom = Number(sp.get('yfrom') || '') || undefined
  const yto = Number(sp.get('yto') || '') || undefined
  const rfrom = Number(sp.get('rfrom') || '') || undefined
  const rto = Number(sp.get('rto') || '') || undefined
  const rcolor = (sp.get('rcolor') || '').split(',').filter(Boolean) as Array<'green'|'yellow'|'red'>
  const sort = sp.get('sort') || 'popularity.desc'
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<SearchItem[]>([])

  const supabaseQuery = useQuery<VideoItem[]>({
    queryKey: ['search-supabase', q],
    queryFn: async () => {
      if (!q || q.length < 2) return []
      // Use fuzzy search RPC function
      const { data, error } = await supabase.rpc('fuzzy_search_videos', { query_text: q })
      if (!error && data) return data as VideoItem[]
      
      // Fallback if RPC not ready or error
      const { data: fallback } = await supabase
        .from('videos')
        .select('*')
        .ilike('title', `%${q}%`)
        .limit(20)
      return fallback || []
    },
    enabled: q.length >= 2,
    placeholderData: keepPreviousData
  })

  const gamesQuery = useQuery<GameRow[]>({
    queryKey: ['search-games', q, types.join(','), rawGenres, keywords],
    queryFn: async () => {
      let query = supabase.from('games').select('id,title,poster_url,category,rating')
      
      if (q && q.length >= 2) {
        query = query.ilike('title', `%${q}%`)
      } else if (types.includes('game')) {
        if (keywords) query = query.ilike('category', `%${keywords}%`)
        else if (rawGenres) query = query.ilike('category', `%${rawGenres}%`)
      } else {
        return []
      }

      const { data } = await query.limit(20)
      return (data as GameRow[]) || []
    },
    enabled: (q.length >= 2) || (types.includes('game') && (keywords.length > 0 || rawGenres.length > 0)),
    placeholderData: keepPreviousData
  })

  const softwareQuery = useQuery<SoftwareRow[]>({
    queryKey: ['search-software', q, types.join(','), rawGenres, keywords],
    queryFn: async () => {
      let query = supabase.from('software').select('id,title,poster_url,category,rating')
      
      if (q && q.length >= 2) {
        query = query.ilike('title', `%${q}%`)
      } else if (types.includes('software')) {
        if (keywords) query = query.ilike('category', `%${keywords}%`)
        else if (rawGenres) query = query.ilike('category', `%${rawGenres}%`)
      } else {
        return []
      }

      const { data } = await query.limit(20)
      return (data as SoftwareRow[]) || []
    },
    enabled: (q.length >= 2) || (types.includes('software') && (keywords.length > 0 || rawGenres.length > 0)),
    placeholderData: keepPreviousData
  })

  const animeQuery = useQuery<AnimeRow[]>({
    queryKey: ['search-anime', q, types.join(','), rawGenres, keywords],
    queryFn: async () => {
      let query = supabase.from('anime').select('id,title,image_url,category,score')
      
      if (q && q.length >= 2) {
        query = query.ilike('title', `%${q}%`)
      } else if (types.includes('anime')) {
        if (keywords) query = query.ilike('category', `%${keywords}%`)
        else if (rawGenres) query = query.ilike('category', `%${rawGenres}%`)
      } else {
        return []
      }

      const { data } = await query.limit(20)
      return (data as AnimeRow[]) || []
    },
    enabled: (q.length >= 2) || (types.includes('anime') && (keywords.length > 0 || rawGenres.length > 0)),
    placeholderData: keepPreviousData
  })

  const recitersQuery = useQuery<ReciterRow[]>({
    queryKey: ['search-reciters', q, types.join(','), keywords],
    queryFn: async () => {
      let query = supabase.from('quran_reciters').select('id,name,image,rewaya')
      
      if (q && q.length >= 2) {
        query = query.ilike('name', `%${q}%`)
      } else if (types.includes('quran')) {
        if (keywords === 'famous') {
          // Just return top ones
          query = query.limit(20)
        } else if (keywords === 'hafs') {
          query = query.ilike('rewaya', '%حفص%')
        } else if (keywords === 'warsh') {
          query = query.ilike('rewaya', '%ورش%')
        } else if (keywords) {
          query = query.ilike('rewaya', `%${keywords}%`)
        }
      } else {
        return []
      }

      const { data } = await query.limit(20)
      return (data as ReciterRow[]) || []
    },
    enabled: (q.length >= 2) || (types.includes('quran') && keywords.length > 0),
    placeholderData: keepPreviousData
  })

  useEffect(() => {
    setPage(1)
    setItems([])
  }, [q, sp.toString()])
  type PageRes = { page: number; results: SearchItem[]; total_pages: number }
  const { data, isLoading, isFetching } = useQuery<PageRes>({
    queryKey: ['search-adv', q, types.join(','), genres.join(','), yfrom, yto, rfrom, rto, rcolor.join(','), sort, page, filterLang, keywords],
    queryFn: async () => {
      // If no query but we have text keywords (not IDs), use keywords as search query
      const isKeywordSearch = !q && keywords && !/^\d+(,\d+)*$/.test(keywords)
      const searchQuery = q || (isKeywordSearch ? keywords : '')
      
      const res = await advancedSearch({
        query: searchQuery,
        types: (types.length ? types : ['movie']) as any,
        genres,
        yearFrom: yfrom,
        yearTo: yto,
        ratingFrom: rfrom,
        ratingTo: rto,
        rating_color: rcolor,
        sort_by: sort,
        page,
        with_original_language: filterLang,
        with_keywords: !isKeywordSearch ? keywords : undefined
      })
      return res as PageRes
    },
    enabled: !!CONFIG.TMDB_API_KEY && (q.trim().length > 0 || genres.length > 0 || !!yfrom || !!yto || !!rfrom || !!rto || rcolor.length > 0 || !!sort || !!filterLang || !!keywords),
    placeholderData: keepPreviousData
  })
  const gq = useQuery<GenreItem[]>({
    queryKey: ['genres', types.join(',')],
    queryFn: async () => {
      const t = types.includes('movie') ? 'movie' : 'tv'
      const list = await fetchGenres(t as 'movie'|'tv')
      return list
    }
  })
  const totalPages = data?.total_pages ?? 1
  const hasMore = useMemo(() => page < totalPages, [page, totalPages])
  useEffect(() => {
    if (data?.results?.length) {
      setItems(prev => (page === 1 ? data.results : [...prev, ...data.results]))
    }
  }, [data, page])

 
  const [searchText, setSearchText] = useState(q)
  const debouncedQuery = useDebounce(searchText, 400)
  useEffect(() => setSearchText(q), [q])
  useEffect(() => {
    const value = debouncedQuery
    setSp(prev => {
      const p = new URLSearchParams(prev)
      if (value) p.set('q', value); else p.delete('q')
      p.set('page', '1')
      return p
    })
  }, [debouncedQuery, setSp])
  const [showFilters, setShowFilters] = useState(true)
  const years = useMemo(() => {
    const arr: number[] = []
    for (let y = 2026; y >= 1980; y--) arr.push(y)
    return arr
  }, [])
  const contentTypes: Array<'movie' | 'tv'> = ['movie', 'tv']

  const setParam = (key: string, value?: string) => {
    setSp(prev => {
      const p = new URLSearchParams(prev)
      if (value && value.length) p.set(key, value); else p.delete(key)
      p.set('page', '1')
      return p
    })
  }

  const { lang } = useLang()

  const searchTitle = q ? `${q} - البحث | سينما أونلاين` : 'البحث | سينما أونلاين'
  const searchDesc = q
    ? `نتائج البحث عن "${q}" - أفلام، مسلسلات، ألعاب، برمجيات على سينما أونلاين`
    : 'ابحث عن الأفلام والمسلسلات حسب الاسم والتصنيف والسنة والتقييم على سينما أونلاين'

  return (
    <div className="grid grid-cols-1 gap-2 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <SeoHead title={searchTitle} description={searchDesc} />
      <section className="space-y-3 pt-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-3">
          <div className="flex items-center gap-2">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="ابحث..."
              className="flex-1 h-10 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white focus:border-primary outline-none"
            />
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`h-10 rounded-xl px-4 text-sm font-bold text-white transition-colors ${showFilters ? 'bg-primary text-black' : 'bg-white/10'}`}
            >
              {showFilters ? 'إخفاء المرشحات' : 'إظهار المرشحات'}
            </button>
          </div>
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid gap-3 pt-3 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-3">
                    {contentTypes.map((t) => {
                      const checked = types.includes(t)
                      return (
                        <button
                          key={t}
                          onClick={() => {
                            const next = checked ? types.filter(x => x !== t) : Array.from(new Set([...types, t]))
                            setParam('types', next.join(',') || 'movie')
                          }}
                          className={`h-9 rounded-lg border px-3 text-xs font-bold uppercase tracking-widest transition-all ${checked ? 'bg-primary border-primary text-black' : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'}`}
                        >
                          {t === 'movie' ? 'فيلم' : 'مسلسل'}
                        </button>
                      )
                    })}

                    <div className="h-6 w-px bg-white/10" />

                    <div className="flex items-center gap-1">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const active = (rfrom || 0) >= (i + 1)
                        return (
                          <button
                            key={i}
                            onClick={() => setParam('rfrom', String(i + 1))}
                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                            aria-label={`rating-${i + 1}+`}
                            title={`${i + 1}+`}
                          >
                            <Star size={16} className={active ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'} />
                          </button>
                        )
                      })}
                      <span className="ml-2 text-xs text-zinc-400 font-bold uppercase tracking-widest">+{rfrom || 0}</span>
                    </div>

                    <div className="h-6 w-px bg-white/10" />

                    <select
                      value={yfrom && yto && yfrom === yto ? yfrom : ''}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v) {
                      setParam('yfrom', v)
                      setParam('yto', v)
                    } else {
                      setParam('yfrom', '')
                      setParam('yto', '')
                    }
                  }}
                  className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white focus:border-primary outline-none"
                >
                  <option value="">{'السنة'}</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                {(gq.data || []).map((g) => {
                  const on = genres.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        const next = on ? genres.filter(x => x !== g.id) : [...genres, g.id]
                        setParam('genres', next.join(','))
                      }}
                      className={`px-3 h-9 rounded-full border text-xs font-bold ${on ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white'}`}
                    >
                      {g.name}
                    </button>
                  )
                })}
              </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
        
        <h1 className="text-xl font-bold">نتائج البحث</h1>
        
        {supabaseQuery.data && supabaseQuery.data.length > 0 && (
          <div className="mb-4 space-y-3">
            <h2 className="text-lg font-semibold text-zinc-300">محتوى حصري</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {supabaseQuery.data.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          </div>
        )}

        {gamesQuery.data && gamesQuery.data.length > 0 && (
          <div className="mb-4 space-y-3">
            <h2 className="text-lg font-semibold text-zinc-300">الألعاب</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {gamesQuery.data.map((g, idx) => (
                <MovieCard 
                  key={g.id} 
                  movie={{
                    id: g.id,
                    title: g.title,
                    poster_path: g.poster_url,
                    vote_average: g.rating || 0,
                    media_type: 'game',
                    category: g.category || ''
                  }} 
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}

        {softwareQuery.data && softwareQuery.data.length > 0 && (
          <div className="mb-4 space-y-3">
            <h2 className="text-lg font-semibold text-zinc-300">البرمجيات</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {softwareQuery.data.map((g, idx) => (
                <MovieCard 
                  key={g.id} 
                  movie={{
                    id: g.id,
                    title: g.title,
                    poster_path: g.poster_url,
                    vote_average: g.rating || 0,
                    media_type: 'software',
                    category: g.category || ''
                  }} 
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}

        {animeQuery.data && animeQuery.data.length > 0 && (
          <div className="mb-4 space-y-3">
            <h2 className="text-lg font-semibold text-zinc-300">الأنمي</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {animeQuery.data.map((g, idx) => (
                <MovieCard 
                  key={g.id} 
                  movie={{
                    id: g.id,
                    title: g.title,
                    poster_path: g.image_url,
                    vote_average: g.score || 0,
                    media_type: 'anime',
                    category: g.category || ''
                  }} 
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}

        {recitersQuery.data && recitersQuery.data.length > 0 && (
          <div className="mb-4 space-y-3">
            <h2 className="text-lg font-semibold text-zinc-300">القرّاء</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {recitersQuery.data.map((g, idx) => (
                <MovieCard 
                  key={g.id} 
                  movie={{
                    id: g.id,
                    title: g.name,
                    poster_path: g.image,
                    media_type: 'quran',
                    category: g.rewaya || '',
                    vote_average: 0
                  }} 
                  index={idx}
                />
              ))}
            </div>
          </div>
        )}

        {isLoading && <SkeletonGrid count={10} variant="poster" />}
        {!isLoading && items.length === 0 && !supabaseQuery.data?.length && !gamesQuery.data?.length && !softwareQuery.data?.length && !animeQuery.data?.length && !recitersQuery.data?.length && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-white/5 p-4">
              <FileQuestion size={40} className="text-zinc-500" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">
              {lang === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found'}
            </h3>
            <p className="mb-6 max-w-md text-sm text-zinc-400">
              {lang === 'ar' 
                ? 'جرب البحث بكلمات مختلفة أو تحقق من الإملاء. إذا لم تجد ما تبحث عنه، يمكنك طلبه.'
                : 'Try searching with different keywords or check spelling. If you can\'t find it, you can request it.'}
            </p>
            <Link to="/request">
              <Button variant="primary" size="sm">
                {lang === 'ar' ? 'طلب محتوى جديد' : 'Request New Content'}
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <InfiniteScroll
            dataLength={items.length}
            next={() => setPage((p) => p + 1)}
            hasMore={hasMore}
            loader={<SkeletonGrid count={10} variant="poster" />}
            scrollThreshold={0.8}
          >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {items.map((m) => (
                <MovieCard key={`${m.media_type}-${m.id}`} movie={m} />
              ))}
            </div>
            {isFetching && <div className="mt-4"><SkeletonGrid count={6} variant="poster" /></div>}
          </InfiniteScroll>
        )}
      </section>
    </div>
  )
}
