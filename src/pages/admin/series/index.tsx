import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAdmin } from '../../../context/AdminContext'
import { Tv, Plus, Trash2, Search, X, Save } from 'lucide-react'
import { createPortal } from 'react-dom'

type SeriesFormState = {
  name: string
  overview: string
  first_air_date: string
  vote_average: string
  poster_path: string
  backdrop_path: string
}

const emptySeriesForm: SeriesFormState = {
  name: '',
  overview: '',
  first_air_date: '',
  vote_average: '',
  poster_path: '',
  backdrop_path: ''
}

const AdminSeriesList = () => {
  const { series, loading, addSeries, deleteSeries } = useAdmin()
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<SeriesFormState>(emptySeriesForm)

  const genreOptions = useMemo(() => {
    const set = new Set<string>()
    series.forEach((s) => {
      const rawItems = Array.isArray((s as any).genres) ? (s as any).genres : []
      const items = rawItems.map((g: any) => String(g || '').trim()).filter(Boolean)
      items.forEach((g: string) => set.add(g))
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [series])

  const filteredSeries = useMemo(() => {
    const q = search.trim().toLowerCase()
    return series.filter((s) => {
      const name = String(s.name || '').toLowerCase()
      const overview = String(s.overview || '').toLowerCase()
      const matchesSearch = !q || name.includes(q) || overview.includes(q)
      const rawGenres = Array.isArray((s as any).genres) ? (s as any).genres : []
      const genres = rawGenres.map((g: any) => String(g || '').trim()).filter(Boolean)
      const matchesGenre = genre === 'all' || genres.includes(genre)
      return matchesSearch && matchesGenre
    })
  }, [series, search, genre])

  const createSeries = async () => {
    const name = form.name.trim()
    if (!name) return
    setSaving(true)
    await addSeries({
      name,
      overview: form.overview.trim(),
      poster_path: form.poster_path.trim() || null,
      backdrop_path: form.backdrop_path.trim() || null,
      first_air_date: form.first_air_date || new Date().toISOString().slice(0, 10),
      vote_average: Number.isFinite(Number(form.vote_average)) ? Number(form.vote_average) : 0,
      seasons_count: 0,
      genres: []
    })
    setSaving(false)
    setForm(emptySeriesForm)
    setIsAddOpen(false)
  }

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading series...</div>

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Tv className="text-primary" /> المسلسلات
        </h1>
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> إضافة مسلسل
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
          className="bg-[#1C1B1F] border border-zinc-700 rounded-md py-1 px-2 text-xs text-zinc-200 focus:border-primary outline-none hover:bg-[#0F0F14] transition-colors"
        >
          <option value="all" className="bg-[#1C1B1F] text-white">كل التصنيفات</option>
          {genreOptions.map((g) => (
            <option key={g} value={g} className="bg-[#1C1B1F] text-white">{g}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
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
                  <span className="text-xs font-bold text-white">{Number(s.vote_average || 0).toFixed(1)} ★</span>
                </div>
              </div>
              <div className="mt-2 space-y-0.5 px-1">
                <h3 className="truncate text-sm font-medium text-zinc-200 group-hover:text-primary transition-colors">
                  {s.name || `Series #${s.id}`}
                </h3>
                <p className="text-[10px] text-zinc-500">
                  {(s.first_air_date ? String(s.first_air_date).split('-')[0] : '-') || '-'} • {s.seasons_count} seasons
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

      {isAddOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-950 p-5 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">إضافة مسلسل جديد</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">الاسم</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">تاريخ العرض الأول</label>
                <input
                  type="date"
                  value={form.first_air_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, first_air_date: e.target.value }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">التقييم</label>
                <input
                  value={form.vote_average}
                  onChange={(e) => setForm((prev) => ({ ...prev, vote_average: e.target.value }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Poster Path</label>
                <input
                  value={form.poster_path}
                  onChange={(e) => setForm((prev) => ({ ...prev, poster_path: e.target.value }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-zinc-400">Backdrop Path</label>
                <input
                  value={form.backdrop_path}
                  onChange={(e) => setForm((prev) => ({ ...prev, backdrop_path: e.target.value }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs text-zinc-400">الوصف</label>
                <textarea
                  rows={4}
                  value={form.overview}
                  onChange={(e) => setForm((prev) => ({ ...prev, overview: e.target.value }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm resize-none focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsAddOpen(false)}
                className="rounded-md border border-zinc-700 px-4 h-9 text-sm text-zinc-300 hover:text-white"
              >
                إلغاء
              </button>
              <button
                onClick={createSeries}
                disabled={saving}
                className="rounded-md bg-primary px-4 h-9 text-sm text-white inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Save size={14} /> {saving ? 'جارٍ الحفظ...' : 'إنشاء'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default AdminSeriesList
