import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { getSeasons, getSeriesById, upsertSeason } from '../../../lib/supabase'
import { toast } from 'sonner'

type SeasonForm = {
  season_number: number
  name?: string
  overview?: string
  air_date?: string
}

const SeriesManage = () => {
  const { id } = useParams()
  const tvId = Number(id)
  const series = useQuery({ queryKey: ['series', tvId], queryFn: () => getSeriesById(tvId), enabled: Number.isFinite(tvId) })
  const seasons = useQuery({ queryKey: ['seasons', tvId], queryFn: () => getSeasons(tvId), enabled: Number.isFinite(tvId) })
  const { register, handleSubmit, reset } = useForm<SeasonForm>({ defaultValues: { season_number: 1 } })
  useEffect(() => { reset({ season_number: 1, name: '', overview: '', air_date: '' }) }, [tvId, reset])
  const addSeason = useMutation({
    mutationFn: async (values: SeasonForm) => {
      await upsertSeason({
        series_id: tvId,
        season_number: Number(values.season_number) || 0,
        name: values.name || '',
        overview: values.overview || '',
        air_date: values.air_date || null
      })
    },
    onSuccess: () => {
      seasons.refetch()
      reset({ season_number: 1, name: '', overview: '', air_date: '' })
      toast.success('تمت إضافة الموسم')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الإضافة')
  })
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة مسلسل</h1>
        <Link to="/admin/series" className="text-sm text-primary">رجوع</Link>
      </div>
      <div className="rounded-lg border border-zinc-800 p-4">
        <div className="text-sm text-zinc-400">المعرف: {series.data?.id}</div>
        <div className="text-lg font-semibold">{series.data?.name}</div>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">المواسم</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(seasons.data || []).map((s: any) => (
            <Link key={s.id} to={`/admin/series/${tvId}/season/${s.id}`} className="rounded-lg border border-zinc-800 p-3">
              <div className="text-sm font-semibold">الموسم {s.season_number}</div>
              <div className="text-xs text-zinc-400">{s.name || 'بدون عنوان'}</div>
            </Link>
          ))}
          {seasons.isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="rounded-lg border border-zinc-800 p-3">
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-zinc-900" />
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit(values => addSeason.mutate(values))} className="mt-4 grid gap-3 rounded-lg border border-zinc-800 p-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">الرقم</label>
            <input type="number" min={0} {...register('season_number', { valueAsNumber: true })} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">الاسم</label>
            <input {...register('name')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">تاريخ العرض</label>
            <input type="date" {...register('air_date')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
          </div>
          <div className="self-end">
            <button disabled={addSeason.isPending} className="w-full rounded-md bg-primary h-11 text-white disabled:opacity-50">
              {addSeason.isPending ? 'جاري الإضافة...' : 'إضافة موسم'}
            </button>
          </div>
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs text-zinc-400">الوصف</label>
            <textarea rows={3} {...register('overview')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
          </div>
        </form>
      </section>
    </div>
  )
}

export default SeriesManage
