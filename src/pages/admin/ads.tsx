import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { Plus, Search, CheckSquare, Square, Eye, EyeOff, Trash2, BarChart3 } from 'lucide-react'

type AdRow = {
  id?: number
  name: string | null
  type: 'popunder' | 'banner' | 'preroll' | 'midroll' | string
  position: 'top' | 'bottom' | 'sidebar' | 'player' | string
  code: string
  active: boolean | null
  impressions?: number
  clicks?: number
  created_at?: string | null
}

async function getAds() {
  const { data, error } = await supabase.from('ads').select('*').order('id', { ascending: false })
  if (error) throw error
  return (data || []) as AdRow[]
}

const AdminAdsPage = () => {
  const q = useQuery({ queryKey: ['ads'], queryFn: getAds })
  const { register, handleSubmit, reset } = useForm<AdRow>({
    defaultValues: { name: '', type: 'banner', position: 'top', code: '', active: true } as any
  })
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [selected, setSelected] = useState<number[]>([])

  const addAd = useMutation({
    mutationFn: async (values: AdRow) => {
      const payload = {
        name: values.name || 'Untitled Ad',
        type: values.type || 'banner',
        position: values.position || 'top',
        code: values.code || '',
        active: values.active !== false
      }
      const { error } = await supabase.from('ads').insert(payload as any)
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

  const ads = q.data || []
  const filteredAds = useMemo(() => {
    const qText = search.trim().toLowerCase()
    return ads.filter((ad) => {
      const matchesSearch =
        !qText ||
        String(ad.name || '').toLowerCase().includes(qText) ||
        String(ad.type || '').toLowerCase().includes(qText) ||
        String(ad.position || '').toLowerCase().includes(qText)
      const matchesFilter =
        filter === 'all' ? true : filter === 'active' ? ad.active !== false : ad.active === false
      return matchesSearch && matchesFilter
    })
  }, [ads, search, filter])

  const totals = useMemo(() => {
    const total = ads.length
    const activeCount = ads.filter((a) => a.active !== false).length
    const inactiveCount = total - activeCount
    const impressions = ads.reduce((sum, a) => sum + Number(a.impressions || 0), 0)
    const clicks = ads.reduce((sum, a) => sum + Number(a.clicks || 0), 0)
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00'
    return { total, activeCount, inactiveCount, impressions, clicks, ctr }
  }, [ads])

  const selectedInView = filteredAds
    .map((ad) => Number(ad.id || 0))
    .filter((id) => id > 0 && selected.includes(id))

  const allSelectedInView = filteredAds.length > 0 && selectedInView.length === filteredAds.length

  const toggleSelect = (id?: number, checked?: boolean) => {
    if (!id) return
    setSelected((prev) => {
      if (checked) return Array.from(new Set([...prev, id]))
      return prev.filter((x) => x !== id)
    })
  }

  const toggleSelectAllInView = (checked: boolean) => {
    const ids = filteredAds.map((ad) => Number(ad.id || 0)).filter((id) => id > 0)
    setSelected((prev) => checked ? Array.from(new Set([...prev, ...ids])) : prev.filter((id) => !ids.includes(id)))
  }

  const bulkSetActive = async (active: boolean) => {
    if (selected.length === 0) {
      toast.error('حدد إعلاناً واحداً على الأقل')
      return
    }
    const { error } = await supabase.from('ads').update({ active }).in('id', selected)
    if (error) {
      toast.error(error.message || 'فشل التحديث الجماعي')
      return
    }
    toast.success(active ? 'تم تفعيل الإعلانات المحددة' : 'تم إيقاف الإعلانات المحددة')
    setSelected([])
    q.refetch()
  }

  const bulkDelete = async () => {
    if (selected.length === 0) {
      toast.error('حدد إعلاناً واحداً على الأقل')
      return
    }
    if (!confirm(`سيتم حذف ${selected.length} إعلان. هل تريد المتابعة؟`)) return
    const { error } = await supabase.from('ads').delete().in('id', selected)
    if (error) {
      toast.error(error.message || 'فشل الحذف الجماعي')
      return
    }
    toast.success('تم حذف الإعلانات المحددة')
    setSelected([])
    q.refetch()
  }

  return (
    <div className="space-y-4 p-2">
      <h1 className="text-xl font-bold">إدارة الإعلانات</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[11px] text-zinc-500">إجمالي الإعلانات</div>
          <div className="text-lg font-bold">{totals.total}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[11px] text-zinc-500">نشط</div>
          <div className="text-lg font-bold text-emerald-400">{totals.activeCount}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[11px] text-zinc-500">غير نشط</div>
          <div className="text-lg font-bold text-rose-400">{totals.inactiveCount}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[11px] text-zinc-500">Impressions</div>
          <div className="text-lg font-bold">{totals.impressions.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1"><BarChart3 size={12} /> CTR</div>
          <div className="text-lg font-bold">{totals.ctr}%</div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو النوع أو الموضع"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 pr-8 text-xs focus:border-primary outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="rounded-md border border-zinc-700 bg-zinc-900 p-2 text-xs min-w-[130px]"
        >
          <option value="all">الكل</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
        <button
          onClick={() => bulkSetActive(true)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 h-8 text-[11px] hover:bg-zinc-800 inline-flex items-center gap-1"
        >
          <Eye size={12} /> تفعيل المحدد
        </button>
        <button
          onClick={() => bulkSetActive(false)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 h-8 text-[11px] hover:bg-zinc-800 inline-flex items-center gap-1"
        >
          <EyeOff size={12} /> إيقاف المحدد
        </button>
        <button
          onClick={bulkDelete}
          className="rounded-md border border-rose-900/40 bg-rose-900/10 px-3 h-8 text-[11px] text-rose-300 hover:bg-rose-900/20 inline-flex items-center gap-1"
        >
          <Trash2 size={12} /> حذف المحدد
        </button>
      </div>

      <form onSubmit={handleSubmit(v => addAd.mutate(v))} className="grid gap-2.5 rounded-lg border border-zinc-800 p-3 md:grid-cols-2 lg:grid-cols-6 bg-zinc-900/30">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-[10px] text-zinc-400">الاسم</label>
          <input {...register('name')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-xs focus:border-primary outline-none" />
        </div>
        <div className="lg:col-span-1">
          <label className="mb-1 block text-[10px] text-zinc-400">النوع</label>
          <select {...register('type')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 text-white p-1.5 text-xs focus:border-primary outline-none">
            <option value="banner" className="bg-zinc-900 text-white">banner</option>
            <option value="popunder" className="bg-zinc-900 text-white">popunder</option>
            <option value="preroll" className="bg-zinc-900 text-white">preroll</option>
            <option value="midroll" className="bg-zinc-900 text-white">midroll</option>
          </select>
        </div>
        <div className="lg:col-span-1">
          <label className="mb-1 block text-[10px] text-zinc-400">الموضع</label>
          <select {...register('position')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 text-white p-1.5 text-xs focus:border-primary outline-none">
            <option value="top" className="bg-zinc-900 text-white">top</option>
            <option value="bottom" className="bg-zinc-900 text-white">bottom</option>
            <option value="sidebar" className="bg-zinc-900 text-white">sidebar</option>
            <option value="player" className="bg-zinc-900 text-white">player</option>
          </select>
        </div>
        <div className="lg:col-span-1 flex items-center gap-2">
          <label className="text-xs text-zinc-300">نشط</label>
          <input type="checkbox" {...register('active')} className="rounded border-zinc-700 bg-zinc-900" />
        </div>
        <div className="lg:col-span-1 flex items-end">
          <button className="w-full rounded-md bg-primary px-4 h-8 text-xs text-white hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-1">
            <Plus size={12} /> إضافة
          </button>
        </div>
        <div className="md:col-span-2 lg:col-span-6">
          <label className="mb-1 block text-[10px] text-zinc-400">الكود</label>
          <textarea rows={3} {...register('code')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-1.5 font-mono text-[10px] focus:border-primary outline-none" />
        </div>
      </form>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <button
            onClick={() => toggleSelectAllInView(!allSelectedInView)}
            className="inline-flex items-center gap-1 hover:text-white"
          >
            {allSelectedInView ? <CheckSquare size={14} /> : <Square size={14} />}
            تحديد الكل (المعروض)
          </button>
          <span>المحدد: {selected.length}</span>
        </div>
        {filteredAds.map((ad) => (
          <div key={ad.id} className="rounded-lg border border-zinc-800 p-2.5 hover:bg-white/5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={ad.id != null ? selected.includes(ad.id) : false}
                  onChange={(e) => toggleSelect(ad.id, e.target.checked)}
                />
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
        {!q.isLoading && filteredAds.length === 0 && (
          <div className="rounded-lg border border-zinc-800 p-6 text-center text-zinc-500 text-sm">
            لا توجد إعلانات مطابقة
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAdsPage
