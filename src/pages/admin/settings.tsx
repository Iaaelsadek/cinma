import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import * as Switch from '@radix-ui/react-switch'
import { toast } from '../../lib/toast-manager'

const API_BASE = import.meta.env.VITE_API_URL || 'https://cooperative-nevsa-cinma-71a99c5c.koyeb.app'

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

const parseLegacyRow = (row: Record<string, unknown>): Partial<SettingsForm> => ({
  site_name: (row?.site_name as string) || DEFAULTS.site_name,
  logo_url: (row?.logo_url as string) || DEFAULTS.logo_url,
  seo_title: (row?.seo_title as string) || DEFAULTS.seo_title,
  seo_desc: (row?.seo_desc as string) || DEFAULTS.seo_desc,
  seo_keywords: (row?.seo_keywords as string) || DEFAULTS.seo_keywords,
  embed_servers_json: JSON.stringify(row?.embed_servers || JSON.parse(DEFAULTS.embed_servers_json), null, 2),
  tmdb_sync_enabled: (row?.tmdb_sync_enabled as boolean) ?? DEFAULTS.tmdb_sync_enabled,
  tmdb_sync_interval: Number(row?.tmdb_sync_interval ?? DEFAULTS.tmdb_sync_interval)
})

async function readSettings() {
  try {
    const response = await fetch(`${API_BASE}/api/settings`)
    if (!response.ok) throw new Error('Failed to fetch settings')

    const { settings } = await response.json()

    return {
      site_name: settings?.site_name || DEFAULTS.site_name,
      logo_url: settings?.logo_url || DEFAULTS.logo_url,
      seo_title: settings?.seo_title || DEFAULTS.seo_title,
      seo_desc: settings?.seo_desc || DEFAULTS.seo_desc,
      seo_keywords: settings?.seo_keywords || DEFAULTS.seo_keywords,
      embed_servers_json: JSON.stringify(
        settings?.embed_servers ? JSON.parse(settings.embed_servers) : JSON.parse(DEFAULTS.embed_servers_json),
        null,
        2
      ),
      tmdb_sync_enabled: settings?.tmdb_sync_enabled === 'true' || settings?.tmdb_sync_enabled === true || DEFAULTS.tmdb_sync_enabled,
      tmdb_sync_interval: Number(settings?.tmdb_sync_interval || DEFAULTS.tmdb_sync_interval)
    } as SettingsForm
  } catch (error) {
    console.error('Error reading settings:', error)
    return { ...DEFAULTS } as SettingsForm
  }
}

async function saveSettings(values: SettingsForm) {
  let embedServers: any[] = []
  try {
    const parsed = JSON.parse(values.embed_servers_json)
    if (!Array.isArray(parsed)) throw new Error('embed_servers must be an array')
    embedServers = parsed
  } catch {
    throw new Error('❌ صيغة JSON الخاصة بخوادم التضمين غير صحيحة')
  }

  const settingsData = {
    site_name: values.site_name,
    logo_url: values.logo_url,
    seo_title: values.seo_title,
    seo_desc: values.seo_desc,
    seo_keywords: values.seo_keywords,
    embed_servers: JSON.stringify(embedServers),
    tmdb_sync_enabled: String(values.tmdb_sync_enabled),
    tmdb_sync_interval: String(Number(values.tmdb_sync_interval || 24))
  }

  const response = await fetch(`${API_BASE}/api/settings/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: settingsData })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to save settings' }))
    throw new Error(error.error || 'Failed to save settings')
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
    onSuccess: () => toast.success('✅ تم حفظ الإعدادات'),
    onError: (e: any) => toast.error(e?.message || '❌ فشل الحفظ')
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
