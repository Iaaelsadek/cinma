import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { useAdmin } from '../../../context/AdminContext'
import { toast } from 'sonner'
import { ChevronRight, Tv, Calendar, Plus, Layers, Trash2 } from 'lucide-react'

type SeasonForm = {
  season_number: number
  name: string
  overview: string
  air_date: string
}

const SeriesManage = () => {
  const { id } = useParams()
  const tvId = Number(id)
  const { getSeriesById, addSeason, deleteSeason } = useAdmin()
  const series = getSeriesById(tvId)
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SeasonForm>({ 
    defaultValues: { season_number: 1 } 
  })

  // Reset form when series changes
  useEffect(() => {
    if (series) {
      reset({ 
        season_number: (series.seasons?.length || 0) + 1, 
        name: '', 
        overview: '', 
        air_date: '' 
      })
    }
  }, [tvId, series, reset])

  const onSubmit = (data: SeasonForm) => {
    if (!series) return
    
    addSeason(tvId, {
      series_id: tvId,
      season_number: data.season_number,
      name: data.name || `Season ${data.season_number}`,
      overview: data.overview,
      air_date: data.air_date,
      episode_count: 0,
      poster_path: null
    })
    
    reset({ 
      season_number: (series.seasons?.length || 0) + 2, 
      name: '', 
      overview: '', 
      air_date: '' 
    })
  }

  if (!series) {
    return <div className="p-8 text-center text-zinc-500">المسلسل غير موجود</div>
  }

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link to="/admin/series" className="hover:text-white transition-colors">المسلسلات</Link>
        <ChevronRight size={14} />
        <span className="text-white font-medium truncate max-w-[200px]">{series.name}</span>
      </div>

      <div className="flex items-start gap-4 bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-xl backdrop-blur-sm">
        {series.poster_path ? (
          <img 
            src={`https://image.tmdb.org/t/p/w200${series.poster_path}`} 
            alt={series.name} 
            className="w-24 h-36 object-cover rounded-lg shadow-lg"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-24 h-36 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600">
            <Tv size={32} />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-bold text-white">{series.name}</h1>
          <p className="text-sm text-zinc-400 line-clamp-3 max-w-2xl">{series.overview}</p>
          <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2">
            <span className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded">
              <Calendar size={12} /> {series.first_air_date}
            </span>
            <span className="flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded">
              <Layers size={12} /> {series.seasons_count} مواسم
            </span>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Layers className="text-primary" size={18} /> المواسم
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {(series.seasons || []).map((season) => (
            <div 
              key={season.id} 
              className="group relative bg-zinc-900/40 border border-zinc-800 hover:border-primary/50 rounded-xl p-3 transition-all hover:-translate-y-1"
            >
              <Link to={`/admin/series/${tvId}/season/${season.id}`} className="flex items-start gap-3">
                {season.poster_path ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w92${season.poster_path}`} 
                    alt={season.name} 
                    className="w-16 h-24 object-cover rounded shadow-sm"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-16 h-24 bg-zinc-800 rounded flex items-center justify-center text-zinc-600">
                    <Tv size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-zinc-200 group-hover:text-primary truncate">
                    {season.name}
                  </h3>
                  <div className="text-xs text-zinc-500 mt-1 space-y-1">
                    <p>الموسم {season.season_number}</p>
                    <p>{season.episode_count} حلقات</p>
                    <p>{season.air_date?.split('-')[0]}</p>
                  </div>
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  if (confirm('هل أنت متأكد من حذف هذا الموسم؟')) {
                    deleteSeason(tvId, season.id)
                  }
                }}
                className="absolute top-2 left-2 p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="حذف الموسم"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          
          {/* Add Season Card (Visual placeholder if needed, or just keep the form below) */}
        </div>

        {/* Add Season Form */}
        <div className="mt-6 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Plus size={16} className="text-green-400" /> إضافة موسم جديد
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 font-medium">رقم الموسم</label>
              <input 
                type="number" 
                min={0} 
                {...register('season_number', { valueAsNumber: true, required: true })} 
                className="w-full bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-colors"
                placeholder="1"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 font-medium">اسم الموسم (اختياري)</label>
              <input 
                {...register('name')} 
                className="w-full bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-colors"
                placeholder="Season 1"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 font-medium">تاريخ العرض</label>
              <input 
                type="date" 
                {...register('air_date')} 
                className="w-full bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-colors"
              />
            </div>

            <div className="lg:col-span-1">
              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> إضافة الموسم
              </button>
            </div>

            <div className="md:col-span-2 lg:col-span-4 space-y-1.5">
              <label className="text-[10px] text-zinc-400 font-medium">ملخص (Overview)</label>
              <textarea 
                rows={2} 
                {...register('overview')} 
                className="w-full bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none transition-colors resize-none"
                placeholder="وصف مختصر لأحداث الموسم..."
              />
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

export default SeriesManage
