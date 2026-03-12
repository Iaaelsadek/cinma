import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import * as Switch from '@radix-ui/react-switch'
import { toast } from 'sonner'

type SettingsForm = {
  site_name: string
  logo_url: string
  seo_title: string
  seo_desc: string
  seo_keywords: string
  embed_servers_json: string
  tmdb_sync_enabled: boolean
  tmdb_sync_interval: number
}

const DEFAULTS: SettingsForm = {
  site_name: 'Cinema Online',
  logo_url: 'https://cinma.online/logo.png',
  seo_title: 'Best Movies & Series',
  seo_desc: 'Watch the latest movies and series online in high quality.',
  seo_keywords: 'movies, series, cinema, online, watch',
  embed_servers_json: JSON.stringify([
    { name: 'VidSrc', key: 'vidsrc' },
    { name: '2Embed', key: '2embed' },
    { name: 'Embed.su', key: 'embed_su' }
  ], null, 2),
  tmdb_sync_enabled: true,
  tmdb_sync_interval: 24
}

const parseLegacyRow = (row: any): Partial<SettingsForm> => ({
  site_name: row?.site_name || DEFAULTS.site_name,
  logo_url: row?.logo_url || DEFAULTS.logo_url,
  seo_title: row?.seo_title || DEFAULTS.seo_title,
  seo_desc: row?.seo_desc || DEFAULTS.seo_desc,
  seo_keywords: row?.seo_keywords || DEFAULTS.seo_keywords,
  embed_servers_json: JSON.stringify(row?.embed_servers || JSON.parse(DEFAULTS.embed_servers_json), null, 2),
  tmdb_sync_enabled: row?.tmdb_sync_enabled ?? DEFAULTS.tmdb_sync_enabled,
  tmdb_sync_interval: Number(row?.tmdb_sync_interval ?? DEFAULTS.tmdb_sync_interval)
})

async function readSettings() {
  const [kvRes, legacyRes] = await Promise.all([
    supabase.from('settings').select('key,value'),
    supabase.from('settings').select('*').eq('id', 1).maybeSingle()
  ])

  let values: Partial<SettingsForm> = {}

  if (!kvRes.error && Array.isArray(kvRes.data) && kvRes.data.length > 0) {
    const map = new Map<string, any>()
    kvRes.data.forEach((row: any) => map.set(String(row.key), row.value))
    values = {
      site_name: String(map.get('site_name') ?? DEFAULTS.site_name),
      logo_url: String(map.get('logo_url') ?? DEFAULTS.logo_url),
      seo_title: String(map.get('seo_title') ?? DEFAULTS.seo_title),
      seo_desc: String(map.get('seo_desc') ?? DEFAULTS.seo_desc),
      seo_keywords: String(map.get('seo_keywords') ?? DEFAULTS.seo_keywords),
      embed_servers_json: JSON.stringify(map.get('embed_servers') ?? JSON.parse(DEFAULTS.embed_servers_json), null, 2),
      tmdb_sync_enabled: Boolean(map.get('tmdb_sync_enabled') ?? DEFAULTS.tmdb_sync_enabled),
      tmdb_sync_interval: Number(map.get('tmdb_sync_interval') ?? DEFAULTS.tmdb_sync_interval)
    }
  } else if (!legacyRes.error && legacyRes.data) {
    values = parseLegacyRow(legacyRes.data)
  } else {
    values = { ...DEFAULTS }
  }

  return {
    ...DEFAULTS,
    ...values
  } as SettingsForm
}

async function saveSettings(values: SettingsForm) {
  let embedServers: any[] = []
  try {
    const parsed = JSON.parse(values.embed_servers_json)
    if (!Array.isArray(parsed)) throw new Error('embed_servers must be an array')
    embedServers = parsed
  } catch {
    throw new Error('صيغة JSON الخاصة بخوادم التضمين غير صحيحة')
  }

  const kvRows = [
    { key: 'site_name', value: values.site_name },
    { key: 'logo_url', value: values.logo_url },
    { key: 'seo_title', value: values.seo_title },
    { key: 'seo_desc', value: values.seo_desc },
    { key: 'seo_keywords', value: values.seo_keywords },
    { key: 'embed_servers', value: embedServers },
    { key: 'tmdb_sync_enabled', value: values.tmdb_sync_enabled },
    { key: 'tmdb_sync_interval', value: Number(values.tmdb_sync_interval || 24) }
  ]

  const kvRes = await supabase.from('settings').upsert(kvRows as any, { onConflict: 'key' })
  if (kvRes.error) {
    const legacyPayload = {
      id: 1,
      site_name: values.site_name,
      logo_url: values.logo_url || null,
      seo_title: values.seo_title || null,
      seo_desc: values.seo_desc || null,
      seo_keywords: values.seo_keywords || null,
      embed_servers: embedServers,
      tmdb_sync_enabled: values.tmdb_sync_enabled,
      tmdb_sync_interval: Number(values.tmdb_sync_interval || 24)
    }
    const legacyRes = await supabase.from('settings').upsert(legacyPayload as any, { onConflict: 'id' })
    if (legacyRes.error) throw legacyRes.error
  }
}

const AdminSettingsPage = () => {
  const q = useQuery({ queryKey: ['settings-v2'], queryFn: readSettings })
  const { register, handleSubmit, reset, watch, setValue } = useForm<SettingsForm>({ defaultValues: DEFAULTS })

  useEffect(() => {
    if (q.data) reset(q.data)
  }, [q.data, reset])

  const save = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => toast.success('تم حفظ الإعدادات'),
    onError: (e: any) => toast.error(e?.message || 'فشل الحفظ')
  })

  return (
    <div className="space-y-4 p-2">
      <h1 className="text-xl font-bold">إعدادات الموقع</h1>
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-3 rounded-xl border border-zinc-800 p-4 md:grid-cols-2 bg-zinc-900/30">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">اسم الموقع</label>
          <input {...register('site_name')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">رابط الشعار</label>
          <input {...register('logo_url')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">SEO Title</label>
          <input {...register('seo_title')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">SEO Description</label>
          <textarea rows={2} {...register('seo_desc')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none resize-none" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">SEO Keywords</label>
          <input {...register('seo_keywords')} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-zinc-400">خوادم التضمين (JSON)</label>
          <textarea
            rows={6}
            value={watch('embed_servers_json')}
            onChange={(e) => setValue('embed_servers_json', e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-xs focus:border-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-300">مزامنة TMDB تلقائياً</label>
          <Switch.Root
            checked={!!watch('tmdb_sync_enabled')}
            onCheckedChange={(v) => setValue('tmdb_sync_enabled', v as boolean)}
            className="relative h-5 w-9 rounded-full bg-zinc-700 data-[state=checked]:bg-primary"
          >
            <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-4.5" />
          </Switch.Root>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">فترة المزامنة (ساعات)</label>
          <input type="number" {...register('tmdb_sync_interval', { valueAsNumber: true })} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm focus:border-primary outline-none" />
        </div>
        <div className="md:col-span-2">
          <button disabled={save.isPending} className="rounded-md bg-primary px-4 h-10 text-white disabled:opacity-50 text-sm">
            {save.isPending ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdminSettingsPage
