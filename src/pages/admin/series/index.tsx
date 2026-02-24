import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAdmin } from '../../../context/AdminContext'
import { Tv, Plus, Trash2, Search } from 'lucide-react'

const AdminSeriesList = () => {
  const { series, loading, addSeries, deleteSeries } = useAdmin()
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('all')

  const genreOptions = useMemo(() => {
    const set = new Set<string>()
    series.forEach((s) => {
      const items = Array.isArray((s as any).genres) ? (s as any).genres as string[] : []
      items.filter(Boolean).forEach((g) => set.add(g))
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [series])

  const filteredSeries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return series.filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.overview.toLowerCase().includes(q)
      const genres = Array.isArray((s as any).genres) ? (s as any).genres as string[] : []
      const matchesGenre = genre === 'all' || genres.includes(genre)
      return matchesSearch && matchesGenre
    })
  }, [series, search, genre])

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading series...</div>

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Tv className="text-primary" /> المسلسلات
        </h1>
        <button 
          onClick={() => addSeries({
            name: 'New Series ' + Date.now(),
            overview: 'Generated series',
            poster_path: null,
            backdrop_path: null,
            first_air_date: new Date().toISOString().split('T')[0],
            vote_average: 0,
            seasons_count: 0
          })}
          className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> إضافة مسلسل (Mock)
        </button>
      </div>

      <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
          <input
            type="text"
            placeholder="بحث عن مسلسل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-zinc-700 rounded-md py-1 pr-8 pl-2 text-xs focus:border-primary outline-none text-right"
            dir="rtl"
          />
        </div>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="bg-black/20 border border-zinc-700 rounded-md py-1 px-2 text-xs text-zinc-200 focus:border-primary outline-none"
        >
          <option value="all">كل التصنيفات</option>
          {genreOptions.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filteredSeries.map((s) => (
          <div key={s.id} className="group relative bg-zinc-900/40 border border-zinc-800 hover:border-primary/50 rounded-xl p-2 transition-all hover:-translate-y-1 overflow-hidden">
            <Link 
              to={`/admin/series/${s.id}`} 
              className="block"
            >
              <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-800 relative">
                {s.poster_path ? (
                  <img 
            src={`https://image.tmdb.org/t/p/w200${s.poster_path}`} 
            alt={s.name} 
            className="h-full w-full object-cover transition-transform group-hover:scale-105" 
            loading="lazy"
            decoding="async"
          />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-zinc-600">
                    <Tv size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <span className="text-xs font-bold text-white">{s.vote_average.toFixed(1)} ★</span>
                </div>
              </div>
              <div className="mt-2 space-y-0.5 px-1">
                <h3 className="truncate text-sm font-medium text-zinc-200 group-hover:text-primary transition-colors">
                  {s.name}
                </h3>
                <p className="text-[10px] text-zinc-500">
                  {s.first_air_date?.split('-')[0]} • {s.seasons_count} seasons
                </p>
              </div>
            </Link>
            
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (confirm('هل أنت متأكد من حذف هذا المسلسل؟')) {
                  deleteSeries(s.id)
                }
              }}
              className="absolute top-3 left-3 p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
              title="حذف المسلسل"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      
      {filteredSeries.length === 0 && (
        <div className="text-center py-12 text-zinc-500 bg-zinc-900/20 rounded-xl border border-zinc-800 border-dashed">
          <Tv size={48} className="mx-auto mb-4 opacity-20" />
          <p>لا توجد مسلسلات مطابقة</p>
        </div>
      )}
    </div>
  )
}

export default AdminSeriesList
