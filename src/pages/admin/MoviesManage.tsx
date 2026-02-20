import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAdmin } from '../../context/AdminContext'
import { Film, Plus, Search, Edit, Trash2, Eye, MoreHorizontal } from 'lucide-react'

export const MoviesManage = () => {
  const { movies, deleteMovie, loading, updateMovie } = useAdmin()
  const [search, setSearch] = useState('')
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editOverview, setEditOverview] = useState('')
  const [editYear, setEditYear] = useState('')
  const [editRating, setEditRating] = useState('')
  const [saving, setSaving] = useState(false)

  const filteredMovies = movies.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase()) || 
    m.category.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading movies...</div>
  }

  const handleEdit = (movie: any) => {
    setEditId(movie.id)
    setEditTitle(movie.title || '')
    setEditOverview(movie.overview || '')
    setEditYear(movie.release_date ? String(movie.release_date).split('-')[0] : '')
    setEditRating(movie.vote_average != null ? String(movie.vote_average) : '')
    setIsEditOpen(true)
  }

  const handleSave = async () => {
    if (!editId) return
    const year = Number(editYear)
    const rating = Number(editRating)
    const release_date = Number.isFinite(year) && year > 1800 ? `${year}-01-01` : undefined
    setSaving(true)
    await updateMovie(editId, {
      title: editTitle.trim(),
      overview: editOverview,
      release_date,
      vote_average: Number.isFinite(rating) ? rating : undefined
    })
    setSaving(false)
    setIsEditOpen(false)
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
        <Link 
          to="/admin/add-movie" 
          className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <Plus size={14} /> إضافة فيلم
        </Link>
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
                      />
                    )}
                    <span className="font-semibold group-hover:text-primary transition-colors line-clamp-1">{movie.title}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] border border-zinc-700">
                    {movie.category}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-400">{movie.release_date?.split('-')[0]}</td>
                <td className="px-3 py-2">
                  <span className={`font-bold ${movie.vote_average >= 7 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {movie.vote_average}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-300 flex items-center gap-1">
                  <Eye size={12} className="text-zinc-500" />
                  {movie.views.toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(movie)}
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
      {isEditOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">تعديل الفيلم</h2>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <Plus className="rotate-45" />
              </button>
            </div>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">العنوان</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                  dir="auto"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">الوصف</label>
                <textarea
                  value={editOverview}
                  onChange={(e) => setEditOverview(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none resize-none focus:border-primary transition-colors"
                  dir="auto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">السنة</label>
                  <input
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">التقييم</label>
                  <input
                    value={editRating}
                    onChange={(e) => setEditRating(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800/50">
              <button
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/40"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
