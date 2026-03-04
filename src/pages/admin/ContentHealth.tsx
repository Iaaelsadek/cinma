import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { 
  Activity, AlertCircle, CheckCircle2, Search, Play, 
  Trash2, ExternalLink, RefreshCw, Filter, Film, Tv,
  ChevronRight, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

interface BrokenContent {
  tmdb_id: number
  type: 'movie' | 'tv'
  title: string
  poster: string
  broken_count: number
  total_units: number // 1 for movie, total episodes for series
  dead_units: number // units with 15+ broken servers
  status: 'dead' | 'partial'
}

export const ContentHealth = () => {
  const [content, setContent] = useState<BrokenContent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'dead' | 'partial'>('all')
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Get all broken reports
      const { data: reports, error: reportError } = await supabase
        .from('link_checks')
        .select('content_id, content_type, source_name, status_code, season_number, episode_number')
      
      if (reportError) throw reportError

      // 2. Process reports into content units
      const movieUnits = new Map<number, Map<string, number>>() // tmdb_id -> Map<source_name, status_code>
      const seriesEpisodeUnits = new Map<number, Map<string, Map<string, number>>>() // series_id -> Map<season-episode, Map<source_name, status_code>>
      const seriesIds = new Set<number>()
      const movieIds = new Set<number>()

      reports.forEach(r => {
        if (r.content_type === 'tv') {
          seriesIds.add(Number(r.content_id))
          const seriesId = Number(r.content_id)
          const epKey = `${r.season_number || 1}-${r.episode_number || 1}`
          
          if (!seriesEpisodeUnits.has(seriesId)) seriesEpisodeUnits.set(seriesId, new Map())
          const eps = seriesEpisodeUnits.get(seriesId)!
          if (!eps.has(epKey)) eps.set(epKey, new Map())
          
          const currentStatus = eps.get(epKey)!.get(r.source_name)
          if (currentStatus !== 200) {
            eps.get(epKey)!.set(r.source_name, r.status_code)
          }
        } else {
          movieIds.add(Number(r.content_id))
          const movieId = Number(r.content_id)
          if (!movieUnits.has(movieId)) movieUnits.set(movieId, new Map())
          
          const currentStatus = movieUnits.get(movieId)!.get(r.source_name)
          if (currentStatus !== 200) {
            movieUnits.get(movieId)!.set(r.source_name, r.status_code)
          }
        }
      })

      // 3. Get basic info for these IDs (titles, posters) and episode counts for series
      const [moviesRes, seriesRes, episodesRes] = await Promise.all([
        supabase.from('movies').select('id, title, poster_path').in('id', Array.from(movieIds)),
        supabase.from('tv_series').select('id, name, poster_path').in('id', Array.from(seriesIds)),
        supabase.from('episodes').select('series_id').in('series_id', Array.from(seriesIds))
      ])

      // Map series_id to episode count
      const episodeCounts = new Map<number, number>()
      episodesRes.data?.forEach(e => {
        episodeCounts.set(e.series_id, (episodeCounts.get(e.series_id) || 0) + 1)
      })

      const processed: BrokenContent[] = []

      // Helper to calculate status
      const getStatus = (sources: Map<string, number>) => {
        let broken = 0
        sources.forEach(status => {
          if (status !== 200 && status !== 201 && status !== 301 && status !== 302) {
            broken++
          }
        })
        const isDead = broken >= 15 || (sources.size > 0 && broken === sources.size)
        return { isDead, broken }
      }

      // Process Movies
      moviesRes.data?.forEach(m => {
        const sources = movieUnits.get(m.id)
        if (sources && sources.size > 0) {
          const { isDead, broken } = getStatus(sources)
          processed.push({
            tmdb_id: m.id,
            type: 'movie',
            title: m.title,
            poster: m.poster_path,
            broken_count: broken,
            total_units: 1,
            dead_units: isDead ? 1 : 0,
            status: isDead ? 'dead' : 'partial'
          })
        }
      })

      // Process Series
      seriesRes.data?.forEach(s => {
        const episodes = seriesEpisodeUnits.get(s.id)
        if (episodes && episodes.size > 0) {
          let totalBrokenCount = 0
          let deadEpisodesCount = 0
          
          episodes.forEach(sources => {
            const { isDead, broken } = getStatus(sources)
            totalBrokenCount += broken
            if (isDead) deadEpisodesCount++
          })

          const totalEpisodes = episodeCounts.get(s.id) || episodes.size
          const isDead = deadEpisodesCount >= totalEpisodes

          processed.push({
            tmdb_id: s.id,
            type: 'tv',
            title: s.name,
            poster: s.poster_path,
            broken_count: totalBrokenCount,
            total_units: totalEpisodes,
            dead_units: deadEpisodesCount,
            status: isDead ? 'dead' : 'partial'
          })
        }
      })

      setContent(processed.sort((a, b) => b.broken_count - a.broken_count))
    } catch (err) {
      console.error(err)
      toast.error('فشل تحميل بيانات صحة المحتوى')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const deleteReports = async (tmdbId: number, type: 'movie' | 'tv') => {
    if (!confirm('هل أنت متأكد من مسح جميع بلاغات هذا العمل؟')) return
    const { error } = await supabase.from('link_checks').delete().eq('content_id', tmdbId).eq('content_type', type)
    if (!error) {
      setContent(prev => prev.filter(c => !(c.tmdb_id === tmdbId && c.type === type)))
      toast.success('تم مسح البلاغات وتنشيط العمل')
    }
  }

  const filtered = content.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase())
    if (filter === 'dead') return matchesSearch && c.status === 'dead'
    if (filter === 'partial') return matchesSearch && c.status === 'partial'
    return matchesSearch
  })

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="text-primary" /> صحة المحتوى (Content Health)
          </h1>
          <p className="text-sm text-zinc-500">إدارة الأعمال المعطلة والمخفية بسبب السيرفرات</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            title="تحديث"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
          <div className="text-zinc-500 text-xs mb-1">إجمالي المتأثر</div>
          <div className="text-2xl font-bold">{content.length}</div>
          <div className="text-[10px] text-zinc-600">أعمال بها سيرفرات معطلة</div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
          <div className="text-rose-500 text-xs mb-1">أفلام مخفية</div>
          <div className="text-2xl font-bold text-rose-500">
            {content.filter(c => c.type === 'movie' && c.status === 'dead').length}
          </div>
          <div className="text-[10px] text-rose-500/50">تخطت 15 سيرفر معطل</div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
          <div className="text-rose-500 text-xs mb-1">مسلسلات مخفية</div>
          <div className="text-2xl font-bold text-rose-500">
            {content.filter(c => c.type === 'tv' && c.status === 'dead').length}
          </div>
          <div className="text-[10px] text-rose-500/50">جميع حلقاتها معطلة (15+)</div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
          <div className="text-amber-500 text-xs mb-1">أعطال جزئية</div>
          <div className="text-2xl font-bold text-amber-500">
            {content.filter(c => c.status === 'partial').length}
          </div>
          <div className="text-[10px] text-amber-500/50">لا تزال تظهر للمستخدمين</div>
        </div>
      </div>

      {/* Summary Alert */}
      {!loading && content.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-zinc-400" size={20} />
            <div className="text-sm">
              <span className="text-zinc-400">ملخص النظام:</span> هناك <span className="text-rose-500 font-bold">{content.filter(c => c.status === 'dead').length}</span> عمل تم إخفاؤهم تلقائياً من الموقع بسبب تعطل السيرفرات بالكامل أو تجاوز الحد المسموح (15 سيرفر).
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full">
            تحديث تلقائي كل 30 ثانية
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
          <input 
            type="text" 
            placeholder="بحث في العناوين..."
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg py-2 pr-10 pl-4 text-sm focus:outline-none focus:border-primary transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-800/50 p-1 rounded-lg border border-zinc-700">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-md text-xs transition-all ${filter === 'all' ? 'bg-primary text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            الكل
          </button>
          <button 
            onClick={() => setFilter('dead')}
            className={`px-4 py-1.5 rounded-md text-xs transition-all ${filter === 'dead' ? 'bg-rose-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            ميت تماماً
          </button>
          <button 
            onClick={() => setFilter('partial')}
            className={`px-4 py-1.5 rounded-md text-xs transition-all ${filter === 'partial' ? 'bg-amber-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
          >
            جزئي
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
          <CheckCircle2 size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500">لا يوجد محتوى معطل حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div 
              key={`${item.type}-${item.tmdb_id}`}
              className="group relative bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all flex"
            >
              {/* Poster */}
              <div className="w-24 shrink-0 aspect-[2/3] relative overflow-hidden">
                <img 
                  src={`https://image.tmdb.org/t/p/w200${item.poster}`} 
                  alt="" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className={`absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity`}>
                   <Link 
                     to={item.type === 'movie' ? `/watch/movie/${item.tmdb_id}` : `/watch/tv/${item.tmdb_id}/1/1`}
                     className="p-2 bg-primary rounded-full text-black hover:scale-110 transition-transform"
                   >
                     <Play size={16} fill="currentColor" />
                   </Link>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {item.type === 'movie' ? <Film size={12} className="text-zinc-500" /> : <Tv size={12} className="text-zinc-500" />}
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">{item.type === 'movie' ? 'فيلم' : 'مسلسل'}</span>
                  </div>
                  <h3 className="text-sm font-bold truncate mb-2" title={item.title}>{item.title}</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500">الحلقات المعطلة</span>
                      <span className={item.dead_units > 0 ? 'text-rose-500' : 'text-zinc-400'}>
                        {item.dead_units} / {item.total_units}
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${item.status === 'dead' ? 'bg-rose-500' : 'bg-amber-500'}`}
                        style={{ width: `${(item.dead_units / item.total_units) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500">إجمالي بلاغات السيرفرات</span>
                      <span className="text-zinc-300">{item.broken_count}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800/50">
                   <button 
                     onClick={() => deleteReports(item.tmdb_id, item.type)}
                     className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-zinc-800 hover:bg-rose-900/30 hover:text-rose-500 rounded-lg text-[10px] transition-all"
                   >
                     <Trash2 size={12} /> مسح البلاغات
                   </button>
                   <Link 
                     to={item.type === 'movie' ? `/admin/movies?id=${item.tmdb_id}` : `/admin/series/manage/${item.tmdb_id}`}
                     className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all"
                   >
                     <ChevronRight size={14} />
                   </Link>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                item.status === 'dead' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
              }`}>
                {item.status === 'dead' ? 'مخفي (ميت)' : 'يعمل جزئياً'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Quick Tips */}
      <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl flex gap-3 items-start">
        <AlertTriangle className="text-primary shrink-0" size={18} />
        <div className="text-xs text-zinc-400 leading-relaxed">
          <strong className="text-primary block mb-1">نصيحة للأدمن:</strong>
          الأعمال المعروضة هنا هي التي قام النظام أو المستخدمون بالإبلاغ عن تعطل سيرفراتها. 
          يمكنك الضغط على "مسح البلاغات" لإعادة إظهار العمل فوراً للمستخدمين إذا قمت بإصلاح السيرفرات أو إضافة روابط جديدة يدوياً.
          المحتوى "الميت" مخفي تماماً عن الزوار، أما "الجزئي" فيظهر مع تحذير داخلي.
        </div>
      </div>
    </div>
  )
}

export default ContentHealth