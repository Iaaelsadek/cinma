import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { deleteEpisode, getEpisodes, upsertEpisode } from '../../../lib/supabase'
import { toast } from 'sonner'
import { supabase } from '../../../lib/supabase'
import { useMemo } from 'react'

type EpisodeForm = {
  episode_number: number
  name?: string
  overview?: string
  air_date?: string
  intro_start?: number | null
  intro_end?: number | null
  subtitles_url?: string // JSON string
  download_urls?: string // JSON string
}

const SeasonManage = () => {
  const { id, seasonId } = useParams()
  const sId = Number(seasonId)
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null)
  const eps = useQuery({ queryKey: ['episodes', sId], queryFn: () => getEpisodes(sId), enabled: Number.isFinite(sId) })
  const [drafts, setDrafts] = useState<Record<number, { intro_start?: string; intro_end?: string; subtitles_url?: string; download_urls?: string }>>({})
  const getDraft = (e: any) => {
    const d = drafts[e.id] || {}
    return {
      intro_start: d.intro_start ?? (e.intro_start != null ? String(e.intro_start) : ''),
      intro_end: d.intro_end ?? (e.intro_end != null ? String(e.intro_end) : ''),
      subtitles_url: d.subtitles_url ?? (e.subtitles_url ? JSON.stringify(e.subtitles_url) : ''),
      download_urls: d.download_urls ?? (e.download_urls ? JSON.stringify(e.download_urls) : '')
    }
  }
  const { register, handleSubmit, reset } = useForm<EpisodeForm>({ defaultValues: { episode_number: 1 } })
  useEffect(() => { reset({ episode_number: 1, name: '', overview: '', air_date: '', intro_start: null, intro_end: null, subtitles_url: '', download_urls: '' }) }, [sId, reset])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!sId) return
      const { data } = await supabase.from('seasons').select('season_number').eq('id', sId).maybeSingle()
      if (!cancelled) setSeasonNumber(data?.season_number ?? null)
    })()
    return () => { cancelled = true }
  }, [sId])
  const addEp = useMutation({
    mutationFn: async (values: EpisodeForm) => {
      let subs: any = null
      let dls: any = null
      try { subs = values.subtitles_url ? JSON.parse(values.subtitles_url) : null } catch {}
      try { dls = values.download_urls ? JSON.parse(values.download_urls) : null } catch {}
      await upsertEpisode({
        season_id: sId,
        episode_number: Number(values.episode_number) || 0,
        name: values.name || '',
        overview: values.overview || '',
        air_date: values.air_date || null,
        intro_start: values.intro_start ?? null,
        intro_end: values.intro_end ?? null,
        subtitles_url: subs,
        download_urls: dls
      })
    },
    onSuccess: () => {
      eps.refetch()
      reset({ episode_number: 1, name: '', overview: '', air_date: '', intro_start: null, intro_end: null, subtitles_url: '', download_urls: '' })
      toast.success('تمت إضافة الحلقة')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الإضافة')
  })
  const removeEp = useMutation({
    mutationFn: async (epId: number) => {
      await deleteEpisode(epId)
    },
    onSuccess: () => {
      eps.refetch()
      toast.success('تم حذف الحلقة')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الحذف')
  })
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة حلقات الموسم</h1>
        <div className="flex gap-2">
          <Link to={`/admin/series/${id}`} className="text-sm text-primary">رجوع للمسلسل</Link>
          <Link to="/admin/series" className="text-sm text-primary">كل المسلسلات</Link>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-800 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(eps.data || []).map((e: any) => (
            <div key={e.id} className="rounded-lg border border-zinc-800 p-3">
              <div className="text-sm font-semibold">الحلقة {e.episode_number}: {e.name || 'بدون عنوان'}</div>
              <div className="text-xs text-zinc-400">{e.air_date || '—'}</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">بداية المقدمة (ث)</label>
                  <input
                    value={getDraft(e).intro_start}
                    onChange={(ev) => setDrafts(s => ({ ...s, [e.id]: { ...getDraft(e), intro_start: ev.target.value } }))}
                    type="number"
                    min={0}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">نهاية المقدمة (ث)</label>
                  <input
                    value={getDraft(e).intro_end}
                    onChange={(ev) => setDrafts(s => ({ ...s, [e.id]: { ...getDraft(e), intro_end: ev.target.value } }))}
                    type="number"
                    min={0}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] text-zinc-400">روابط الترجمة (JSON)</label>
                  <textarea
                    rows={3}
                    value={getDraft(e).subtitles_url}
                    onChange={(ev) => setDrafts(s => ({ ...s, [e.id]: { ...getDraft(e), subtitles_url: ev.target.value } }))}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-[11px]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] text-zinc-400">روابط التحميل (JSON)</label>
                  <textarea
                    rows={3}
                    value={getDraft(e).download_urls}
                    onChange={(ev) => setDrafts(s => ({ ...s, [e.id]: { ...getDraft(e), download_urls: ev.target.value } }))}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-[11px]"
                  />
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Link to={`/watch/${id}?type=tv&season=${seasonNumber || 1}&episode=${e.episode_number || 1}`} className="rounded-md bg-primary px-3 h-11 text-xs text-white flex items-center">مشاهدة</Link>
                <button
                  onClick={async () => {
                    try {
                      const d = getDraft(e)
                      let subs = null, dls = null
                      if (d.subtitles_url.trim()) subs = JSON.parse(d.subtitles_url)
                      if (d.download_urls.trim()) dls = JSON.parse(d.download_urls)
                      await upsertEpisode({
                        id: e.id,
                        season_id: sId,
                        episode_number: e.episode_number,
                        name: e.name || '',
                        overview: e.overview || '',
                        air_date: e.air_date || null,
                        intro_start: d.intro_start ? Number(d.intro_start) : null,
                        intro_end: d.intro_end ? Number(d.intro_end) : null,
                        subtitles_url: subs,
                        download_urls: dls
                      })
                      toast.success('تم الحفظ')
                      eps.refetch()
                    } catch (err: any) {
                      toast.error(err?.message || 'فشل الحفظ')
                    }
                  }}
                  className="rounded-md border border-zinc-700 px-3 h-11 text-xs"
                >
                  حفظ
                </button>
                <button onClick={() => removeEp.mutate(e.id)} className="rounded-md border border-zinc-700 px-3 h-11 text-xs">حذف</button>
              </div>
            </div>
          ))}
          {eps.isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="rounded-lg border border-zinc-800 p-3">
              <div className="h-4 w-64 animate-pulse rounded bg-zinc-800" />
              <div className="mt-2 h-3 w-24 animate-pulse rounded bg-zinc-900" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="h-7 w-full animate-pulse rounded bg-zinc-800" />
                <div className="h-7 w-full animate-pulse rounded bg-zinc-800" />
                <div className="col-span-2 h-7 w-full animate-pulse rounded bg-zinc-800" />
                <div className="col-span-2 h-7 w-full animate-pulse rounded bg-zinc-800" />
              </div>
              <div className="mt-2 flex gap-2">
                <div className="h-11 w-24 animate-pulse rounded bg-zinc-800" />
                <div className="h-11 w-20 animate-pulse rounded bg-zinc-800" />
                <div className="h-11 w-16 animate-pulse rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={handleSubmit(values => addEp.mutate(values))} className="grid gap-3 rounded-lg border border-zinc-800 p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">رقم الحلقة</label>
          <input type="number" min={1} {...register('episode_number', { valueAsNumber: true })} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">الاسم</label>
          <input {...register('name')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">تاريخ العرض</label>
          <input type="date" {...register('air_date')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">بداية المقدمة (ث)</label>
          <input type="number" min={0} {...register('intro_start', { valueAsNumber: true })} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">نهاية المقدمة (ث)</label>
          <input type="number" min={0} {...register('intro_end', { valueAsNumber: true })} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div className="self-end">
          <button disabled={addEp.isPending} className="w-full rounded-md bg-primary h-11 text-white disabled:opacity-50">
            {addEp.isPending ? 'جاري الإضافة...' : 'إضافة حلقة'}
          </button>
        </div>
        <div className="md:col-span-4">
          <label className="mb-1 block text-xs text-zinc-400">الوصف</label>
          <textarea rows={3} {...register('overview')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">روابط الترجمة (JSON)</label>
          <textarea rows={3} {...register('subtitles_url')} placeholder='[{"label":"Arabic","lang":"ar","url":"https://.../sub.srt"}]' className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-xs" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">روابط التحميل (JSON)</label>
          <textarea rows={3} {...register('download_urls')} placeholder='[{"label":"1080p","url":"https://.../video.mp4"}]' className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-xs" />
        </div>
      </form>
    </div>
  )
}

export default SeasonManage
