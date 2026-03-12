import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import { Film, Plus, Search, Edit, Trash2, Eye, X, Save } from 'lucide-react'

type MovieFormState = {
  title: string
  overview: string
  release_year: string
  vote_average: string
  poster_path: string
  backdrop_path: string
  genres_csv: string
  trailer_url: string
  video_url: string
  status: 'active' | 'inactive'
}

const emptyForm: MovieFormState = {
  title: '',
  overview: '',
  release_year: '',
  vote_average: '',
  poster_path: '',
  backdrop_path: '',
  genres_csv: '',
  trailer_url: '',
  video_url: '',
  status: 'active'
}

const parseGenres = (value: unknown) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean)
    } catch {}
    return trimmed.split(',').map((v) => v.trim()).filter(Boolean)
  }
  return []
}

export const MoviesManage = () => {
  const { movies, deleteMovie, loading, updateMovie, addMovie } = useAdmin()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<MovieFormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const filteredMovies = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return movies
    return movies.filter((m) => {
      const genres = parseGenres((m as any).genres)
      return (
        String(m.title || '').toLowerCase().includes(q) ||
        String(m.category || '').toLowerCase().includes(q) ||
        genres.join(' ').toLowerCase().includes(q)
      )
    })
  }, [movies, search])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  useEffect(() => {
    const idParam = Number(searchParams.get('id') || '')
    if (!Number.isFinite(idParam) || idParam <= 0) return
    if (loading) return
    const found = movies.find((m) => Number(m.id) === idParam)
    if (!found) return
    openEdit(found as any)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('id')
      return next
    }, { replace: true })
  }, [searchParams, setSearchParams, loading, movies])

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading movies...</div>
  }

  const openEdit = (movie: any) => {
    const genres = parseGenres(movie.genres)
    setEditingId(Number(movie.id))
    setForm({
      title: movie.title || '',
      overview: movie.overview || '',
      release_year: movie.release_date ? String(movie.release_date).split('-')[0] : '',
      vote_average: movie.vote_average != null ? String(movie.vote_average) : '',
      poster_path: movie.poster_path || '',
      backdrop_path: movie.backdrop_path || '',
      genres_csv: genres.join(', '),
      trailer_url: movie.trailer_url || '',
      video_url: movie.video_url || '',
      status: movie.status === 'inactive' ? 'inactive' : 'active'
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    const title = form.title.trim()
    if (!title) return
    const year = Number(form.release_year)
    const rating = Number(form.vote_average)
    const release_date = Number.isFinite(year) && year > 1800 ? `${year}-01-01` : ''
    const genres = form.genres_csv.split(',').map((g) => g.trim()).filter(Boolean)
    setSaving(true)
    if (editingId) {
      await updateMovie(editingId, {
        title,
        overview: form.overview,
        release_date: release_date || undefined,
        vote_average: Number.isFinite(rating) ? rating : null,
        poster_path: form.poster_path || null,
        backdrop_path: form.backdrop_path || null,
        genres,
        category: genres[0] || '',
        trailer_url: form.trailer_url || null,
        video_url: form.video_url || null,
        status: form.status
      })
    } else {
      await addMovie({
        title,
        overview: form.overview,
        release_date: release_date || new Date().toISOString().slice(0, 10),
        vote_average: Number.isFinite(rating) ? rating : null,
        poster_path: form.poster_path || null,
        backdrop_path: form.backdrop_path || null,
        genres,
        category: genres[0] || '',
        trailer_url: form.trailer_url || null,
        video_url: form.video_url || null,
        status: form.status
      })
    }
    setSaving(false)
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Film className="text-primary" /> إدارة الأفلام
          </h1>
          <p className="text-xs text-zinc-400">إجمالي {movies.length} فيلم</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> إضافة فيلم
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
          <input 
            type="text" 
            placeholder="بحث عن فيلم..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-zinc-700 rounded-md py-1 pr-8 pl-2 text-xs focus:border-primary outline-none text-right"
            dir="rtl"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900/30">
        <table className="w-full text-right text-xs">
          <thead className="bg-zinc-900/80 text-zinc-400 font-medium">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">العنوان</th>
              <th className="px-3 py-2">التصنيف</th>
              <th className="px-3 py-2">السنة</th>
              <th className="px-3 py-2">التقييم</th>
              <th className="px-3 py-2">المشاهدات</th>
              <th className="px-3 py-2">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filteredMovies.map(movie => (
              <tr key={movie.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-3 py-2 font-mono text-zinc-500">{movie.id}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {movie.poster_path && (
                      <img 
                        src={movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w92${movie.poster_path}`} 
                        alt={movie.title} 
                        className="w-6 h-9 object-cover rounded shadow-sm"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <span className="font-semibold group-hover:text-primary transition-colors line-clamp-1">{movie.title}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {parseGenres((movie as any).genres).slice(0, 3).map((genre) => (
                      <span key={`${movie.id}-${genre}`} className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] border border-zinc-700">
                        {genre}
                      </span>
                    ))}
                    {parseGenres((movie as any).genres).length === 0 && (
                      <span className="text-zinc-500">—</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-zinc-400">{movie.release_date ? String(movie.release_date).split('-')[0] : '—'}</td>
                <td className="px-3 py-2">
                  {movie.vote_average != null ? (
                    <span className={`font-bold ${movie.vote_average >= 7 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {Number(movie.vote_average).toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-300 flex items-center gap-1">
                  <Eye size={12} className="text-zinc-500" />
                  {movie.views.toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(movie)}
                      className="p-1 hover:bg-blue-500/20 hover:text-blue-400 rounded transition-colors"
                      title="تعديل"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm('هل أنت متأكد من حذف هذا الفيلم؟')) deleteMovie(movie.id)
                      }}
                      className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors" 
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredMovies.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  لا توجد أفلام مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">{editingId ? 'تعديل الفيلم' : 'إضافة فيلم جديد'}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X />
              </button>
            </div>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">العنوان</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                    dir="auto"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">الحالة</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">الوصف</label>
                <textarea
                  value={form.overview}
                  onChange={(e) => setForm((prev) => ({ ...prev, overview: e.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none resize-none focus:border-primary transition-colors"
                  dir="auto"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Poster Path</label>
                  <input
                    value={form.poster_path}
                    onChange={(e) => setForm((prev) => ({ ...prev, poster_path: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                    placeholder="poster_path (url or /path)"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Backdrop Path</label>
                  <input
                    value={form.backdrop_path}
                    onChange={(e) => setForm((prev) => ({ ...prev, backdrop_path: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                    placeholder="backdrop_path (url or /path)"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">السنة</label>
                  <input
                    value={form.release_year}
                    onChange={(e) => setForm((prev) => ({ ...prev, release_year: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">التقييم</label>
                  <input
                    value={form.vote_average}
                    onChange={(e) => setForm((prev) => ({ ...prev, vote_average: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Genres (CSV)</label>
                  <input
                    value={form.genres_csv}
                    onChange={(e) => setForm((prev) => ({ ...prev, genres_csv: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                    placeholder="Action, Drama, Sci-Fi"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Trailer URL</label>
                  <input
                    value={form.trailer_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, trailer_url: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Video URL (Direct Stream)</label>
                  <input
                    value={form.video_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800/50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/40"
              >
                <span className="inline-flex items-center gap-2">
                  <Save size={14} />
                  {saving ? 'جاري الحفظ...' : editingId ? 'حفظ التغييرات' : 'إنشاء الفيلم'}
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
