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
    <div className="space-y-3">
      <h1 className="text-xl font-bold">إدارة الإعلانات</h1>
      <form onSubmit={handleSubmit(v => addAd.mutate(v))} className="grid gap-2.5 rounded-lg border border-zinc-800 p-3 md:grid-cols-4 bg-zinc-900/30">
        <div>
          <label className="mb-1 block text-[10px] text-zinc-400">الاسم</label>
          <input {...register('name')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-xs focus:border-primary outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-zinc-400">النوع</label>
          <select {...register('type')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 text-white p-1.5 text-xs focus:border-primary outline-none">
            <option value="banner" className="bg-zinc-900 text-white">banner</option>
            <option value="popunder" className="bg-zinc-900 text-white">popunder</option>
            <option value="preroll" className="bg-zinc-900 text-white">preroll</option>
            <option value="midroll" className="bg-zinc-900 text-white">midroll</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-zinc-400">الموضع</label>
          <select {...register('position')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 text-white p-1.5 text-xs focus:border-primary outline-none">
            <option value="top" className="bg-zinc-900 text-white">top</option>
            <option value="bottom" className="bg-zinc-900 text-white">bottom</option>
            <option value="sidebar" className="bg-zinc-900 text-white">sidebar</option>
            <option value="player" className="bg-zinc-900 text-white">player</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-300">نشط</label>
          <input type="checkbox" {...register('active')} className="rounded border-zinc-700 bg-zinc-900" />
        </div>
        <div className="md:col-span-4">
          <label className="mb-1 block text-[10px] text-zinc-400">الكود</label>
          <textarea rows={3} {...register('code')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-1.5 font-mono text-[10px] focus:border-primary outline-none" />
        </div>
        <div className="md:col-span-4">
          <button className="rounded-md bg-primary px-4 h-8 text-xs text-white hover:bg-primary/90 transition-colors">إضافة</button>
        </div>
      </form>
      <div className="space-y-2">
        {(q.data || []).map((ad) => (
          <div key={ad.id} className="rounded-lg border border-zinc-800 p-2.5 hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold flex items-center gap-2">
                <span>{ad.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">{ad.type}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">{ad.position}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${ad.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {ad.active ? 'نشط' : 'غير نشط'}
                </span>
                <span className="ms-2 text-[10px] text-zinc-500 hidden md:inline">Impr: {ad.impressions || 0} / Clicks: {ad.clicks || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => ad.id && updateAd.mutate({ id: ad.id, active: !ad.active })}
                  className="rounded-md border border-white/10 bg-white/5 px-2.5 h-7 text-[10px] text-white hover:bg-white/10 transition-colors"
                >
                  {ad.active ? 'إيقاف' : 'تفعيل'}
                </button>
                {ad.id != null && <button onClick={() => removeAd.mutate(ad.id!)} className="rounded-md border border-red-900/30 bg-red-900/10 px-2.5 h-7 text-[10px] text-red-400 hover:bg-red-900/20 transition-colors">حذف</button>}
              </div>
            </div>
            <textarea
              defaultValue={ad.code}
              onBlur={(e) => ad.id && updateAd.mutate({ id: ad.id, code: e.target.value })}
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 p-1.5 font-mono text-[10px] text-zinc-400 focus:text-zinc-200 focus:border-zinc-600 outline-none transition-colors"
              rows={2}
            />
          </div>
        ))}
        {q.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="rounded-lg border border-zinc-800 p-2.5">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-52 animate-pulse rounded bg-zinc-800" />
                  <div className="h-7 w-40 animate-pulse rounded bg-zinc-800" />
                </div>
                <div className="mt-2 h-12 w-full animate-pulse rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAdsPage
