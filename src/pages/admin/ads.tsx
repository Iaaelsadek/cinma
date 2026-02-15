import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

type AdRow = {
  id?: number
  name: string
  type: 'popunder' | 'banner' | 'preroll' | 'midroll'
  position: 'top' | 'bottom' | 'sidebar' | 'player'
  code: string
  active: boolean
  impressions?: number
  clicks?: number
}

async function getAds() {
  const { data, error } = await supabase.from('ads').select('*').order('id', { ascending: false })
  if (error) throw error
  return data as AdRow[]
}

const AdminAdsPage = () => {
  const q = useQuery({ queryKey: ['ads'], queryFn: getAds })
  const { register, handleSubmit, reset } = useForm<AdRow>({ defaultValues: { name: '', type: 'banner', position: 'top', code: '', active: true } as any })
  const addAd = useMutation({
    mutationFn: async (values: AdRow) => {
      const { error } = await supabase.from('ads').insert(values as any)
      if (error) throw error
    },
    onSuccess: () => {
      q.refetch()
      reset({ name: '', type: 'banner', position: 'top', code: '', active: true } as any)
      toast.success('تمت إضافة الإعلان')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الإضافة')
  })
  const updateAd = useMutation({
    mutationFn: async (values: Partial<AdRow> & { id: number }) => {
      const { id, ...rest } = values
      const { error } = await supabase.from('ads').update(rest as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { q.refetch(); toast.success('تم التحديث') },
    onError: (e: any) => toast.error(e?.message || 'فشل التحديث')
  })
  const removeAd = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('ads').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { q.refetch(); toast.success('تم الحذف') },
    onError: (e: any) => toast.error(e?.message || 'فشل الحذف')
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">إدارة الإعلانات</h1>
      <form onSubmit={handleSubmit(v => addAd.mutate(v))} className="grid gap-3 rounded-lg border border-zinc-800 p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">الاسم</label>
          <input {...register('name')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">النوع</label>
          <select {...register('type')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2">
            <option value="banner">banner</option>
            <option value="popunder">popunder</option>
            <option value="preroll">preroll</option>
            <option value="midroll">midroll</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">الموضع</label>
          <select {...register('position')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2">
            <option value="top">top</option>
            <option value="bottom">bottom</option>
            <option value="sidebar">sidebar</option>
            <option value="player">player</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-300">نشط</label>
          <input type="checkbox" {...register('active')} />
        </div>
        <div className="md:col-span-4">
          <label className="mb-1 block text-xs text-zinc-400">الكود</label>
          <textarea rows={4} {...register('code')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-xs" />
        </div>
        <div className="md:col-span-4">
          <button className="rounded-md bg-primary px-4 h-11 text-white">إضافة</button>
        </div>
      </form>
      <div className="space-y-2">
        {(q.data || []).map((ad) => (
          <div key={ad.id} className="rounded-lg border border-zinc-800 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">
                {ad.name} • {ad.type} • {ad.position} • {ad.active ? 'نشط' : 'غير نشط'} •
                <span className="ms-2 text-xs text-zinc-400">Impr: {ad.impressions || 0} / Clicks: {ad.clicks || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => ad.id && updateAd.mutate({ id: ad.id, active: !ad.active })}
                  className="rounded-md border border-white/10 bg-white/10 px-3 h-11 text-sm text-white hover:bg-white/20"
                >
                  {ad.active ? 'إيقاف' : 'تفعيل'}
                </button>
                {ad.id != null && <button onClick={() => removeAd.mutate(ad.id!)} className="rounded-md border border-red-900/50 bg-red-900/20 px-3 h-11 text-sm text-red-400 hover:bg-red-900/30">حذف</button>}
              </div>
            </div>
            <textarea
              defaultValue={ad.code}
              onBlur={(e) => ad.id && updateAd.mutate({ id: ad.id, code: e.target.value })}
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-xs"
              rows={4}
            />
          </div>
        ))}
        {q.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="rounded-lg border border-zinc-800 p-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-52 animate-pulse rounded bg-zinc-800" />
                  <div className="h-11 w-40 animate-pulse rounded bg-zinc-800" />
                </div>
                <div className="mt-2 h-20 w-full animate-pulse rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAdsPage
