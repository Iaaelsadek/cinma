import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import * as Switch from '@radix-ui/react-switch'
import { toast } from 'sonner'

type Settings = {
  id: number
  site_name: string
  logo_url: string | null
  seo_title: string | null
  seo_desc: string | null
  seo_keywords: string | null
  embed_servers: any | null
  tmdb_sync_enabled: boolean | null
  tmdb_sync_interval: number | null
}

async function getSettings() {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle()
  if (error && (error as any).code !== 'PGRST116') throw error
  return (data as Settings) || null
}

const AdminSettingsPage = () => {
  const q = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const { register, handleSubmit, reset, watch, setValue } = useForm<Settings>({
    defaultValues: {
      id: 1,
      site_name: 'cinma.online',
      logo_url: '',
      seo_title: '',
      seo_desc: '',
      seo_keywords: '',
      embed_servers: [{ name: 'VidSrc', key: 'vidsrc' }, { name: '2Embed', key: '2embed' }, { name: 'Embed.su', key: 'embed_su' }],
      tmdb_sync_enabled: false,
      tmdb_sync_interval: 24
    } as any
  })
  useEffect(() => { if (q.data) reset(q.data as any) }, [q.data, reset])
  const save = useMutation({
    mutationFn: async (values: Settings) => {
      const { error } = await supabase.from('settings').upsert({ ...values, id: 1 }, { onConflict: 'id' })
      if (error) throw error
    },
    onSuccess: () => toast.success('تم حفظ الإعدادات'),
    onError: (e: any) => toast.error(e?.message || 'فشل الحفظ')
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">إعدادات الموقع</h1>
      <form onSubmit={handleSubmit(v => save.mutate(v))} className="grid gap-3 rounded-lg border border-zinc-800 p-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">اسم الموقع</label>
          <input {...register('site_name')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">رابط الشعار</label>
          <input {...register('logo_url')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">SEO Title</label>
          <input {...register('seo_title')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">SEO Description</label>
          <textarea rows={3} {...register('seo_desc')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">SEO Keywords</label>
          <input {...register('seo_keywords')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">خوادم التضمين (JSON)</label>
          <textarea rows={4} value={JSON.stringify(watch('embed_servers') || [], null, 2)} onChange={(e) => {
            try {
              const val = JSON.parse(e.target.value)
              setValue('embed_servers', val as any)
            } catch {}
          }} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-xs" />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-300">مزامنة TMDB تلقائياً</label>
          <Switch.Root
            checked={!!watch('tmdb_sync_enabled')}
            onCheckedChange={(v) => setValue('tmdb_sync_enabled', v as any)}
            className="relative h-6 w-11 rounded-full bg-zinc-700 data-[state=checked]:bg-primary"
          >
            <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-6" />
          </Switch.Root>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">فترة المزامنة (ساعات)</label>
          <input type="number" {...register('tmdb_sync_interval', { valueAsNumber: true })} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2" />
        </div>
        <div className="md:col-span-2">
          <button disabled={save.isPending} className="rounded-md bg-primary px-4 h-11 text-white disabled:opacity-50">
            {save.isPending ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminSettingsPage
