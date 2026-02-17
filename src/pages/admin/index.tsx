import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { Film, Tv, Gamepad2, Laptop, Sparkles, BookOpen, Server, Rocket, RefreshCw, Trash2, Loader2, CheckCircle2, Pencil, BarChart3, AlertTriangle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { CONFIG } from '../../lib/constants'

type GameRow = { id: number; title: string; category: string | null; download_url: string | null }
type SoftwareRow = { id: number; title: string; category: string | null; download_url: string | null }
type AnimeRow = { id: number; title: string | null; category: string | null }
type QuranRow = { id: number; name: string | null; category: string | null }
type Health = { lastSyncAt: string | null; lastSyncStatus: string }
type ClickRow = { id: number | string; title: string | null; clicks: number | null }

const apiBase = CONFIG.API_BASE || ''

async function getCounts() {
  const movies = await supabase.from('movies').select('id', { count: 'exact', head: true })
  const tv = await supabase.from('tv_series').select('id', { count: 'exact', head: true })
  const games = await supabase.from('games').select('id', { count: 'exact', head: true })
  const software = await supabase.from('software').select('id', { count: 'exact', head: true })
  const anime = await supabase.from('anime').select('id', { count: 'exact', head: true })
  const quran = await supabase.from('quran_reciters').select('id', { count: 'exact', head: true })
  return {
    movies: movies.count || 0,
    tv: tv.count || 0,
    games: games.count || 0,
    software: software.count || 0,
    anime: anime.count || 0,
    quran: quran.count || 0
  }
}

async function getHealth(): Promise<Health> {
  try {
    const res = await fetch(`${apiBase}/api/admin/health`)
    if (!res.ok) throw new Error('health_failed')
    return await res.json()
  } catch {
    return { lastSyncAt: null, lastSyncStatus: 'unknown' }
  }
}

async function getGames() {
  const { data, error } = await supabase.from('games').select('id,title,category,download_url').order('id', { ascending: false }).limit(50)
  if (error) throw error
  return data as GameRow[]
}

async function getSoftware() {
  const { data, error } = await supabase.from('software').select('id,title,category,download_url').order('id', { ascending: false }).limit(50)
  if (error) throw error
  return data as SoftwareRow[]
}

async function getAnime() {
  const { data, error } = await supabase.from('anime').select('id,title,category').order('id', { ascending: false }).limit(50)
  if (error) throw error
  return data as AnimeRow[]
}

async function getQuran() {
  const { data, error } = await supabase.from('quran_reciters').select('id,name,category').order('id', { ascending: false }).limit(50)
  if (error) throw error
  return data as QuranRow[]
}

async function getTopMovies() {
  const { data, error } = await supabase.from('movies').select('id,title,clicks').order('clicks', { ascending: false }).limit(5)
  if (error) throw error
  return data as ClickRow[]
}

async function getTopGames() {
  const { data, error } = await supabase.from('games').select('id,title,clicks').order('clicks', { ascending: false }).limit(5)
  if (error) throw error
  return data as ClickRow[]
}

async function getTopSoftware() {
  const { data, error } = await supabase.from('software').select('id,title,clicks').order('clicks', { ascending: false }).limit(5)
  if (error) throw error
  return data as ClickRow[]
}

async function getVisits() {
  const { count } = await supabase.from('history').select('id', { count: 'exact', head: true })
  return count || 0
}

async function getEngineLogs() {
  try {
    const res = await fetch(`${apiBase}/api/admin/logs`)
    if (!res.ok) throw new Error('logs_failed')
    return (await res.json()) as { logs: string[] }
  } catch {
    return { logs: [] }
  }
}

async function getSoftwareCategoryBreakdown() {
  const { data, error } = await supabase.from('software').select('category').limit(1000)
  if (error) throw error
  const counts: Record<string, number> = {}
  ;(data || []).forEach((row: any) => {
    const key = row?.category || 'Others'
    counts[key] = (counts[key] || 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

type LinkReportRow = { id: number; content_id: number; content_type: string; source_name: string | null; url: string | null; created_at?: string }
async function getLinkReports(): Promise<LinkReportRow[]> {
  const { data, error } = await supabase
    .from('link_checks')
    .select('id, content_id, content_type, source_name, url, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return []
  return (data || []) as LinkReportRow[]
}

const AdminDashboard = () => {
  const queryClient = useQueryClient()
  const counts = useQuery({ queryKey: ['admin-counts'], queryFn: getCounts })
  const health = useQuery({ queryKey: ['admin-health'], queryFn: getHealth, refetchInterval: 60000 })
  const games = useQuery({ queryKey: ['admin-games'], queryFn: getGames })
  const software = useQuery({ queryKey: ['admin-software'], queryFn: getSoftware })
  const anime = useQuery({ queryKey: ['admin-anime'], queryFn: getAnime })
  const quran = useQuery({ queryKey: ['admin-quran'], queryFn: getQuran })
  const topMovies = useQuery({ queryKey: ['admin-top-movies'], queryFn: getTopMovies })
  const topGames = useQuery({ queryKey: ['admin-top-games'], queryFn: getTopGames })
  const topSoftware = useQuery({ queryKey: ['admin-top-software'], queryFn: getTopSoftware })
  const visits = useQuery({ queryKey: ['admin-visits'], queryFn: getVisits })
  const engineLogs = useQuery({ queryKey: ['admin-engine-logs'], queryFn: getEngineLogs, refetchInterval: 60000 })
  const softwareCategories = useQuery({ queryKey: ['admin-software-categories'], queryFn: getSoftwareCategoryBreakdown })
  const linkReports = useQuery({ queryKey: ['admin-link-reports'], queryFn: getLinkReports })
  const [activeTab, setActiveTab] = useState<'games' | 'software' | 'anime' | 'quran' | 'insights' | 'reports'>('games')
  const [gameSearch, setGameSearch] = useState('')
  const [softwareSearch, setSoftwareSearch] = useState('')
  const [animeSearch, setAnimeSearch] = useState('')
  const [quranSearch, setQuranSearch] = useState('')
  const [gameLinks, setGameLinks] = useState<Record<number, string>>({})
  const [softwareLinks, setSoftwareLinks] = useState<Record<number, string>>({})
  const [syncLogs, setSyncLogs] = useState<string[]>([])

  const runSync = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase}/api/admin/sync`, { method: 'POST' })
      if (!res.ok) throw new Error('sync_failed')
      return (await res.json()) as { ok: boolean; logs: string[] }
    },
    onSuccess: (data) => {
      setSyncLogs(data.logs || [])
      queryClient.invalidateQueries({ queryKey: ['admin-health'] })
      toast.success('تم تشغيل المزامنة بنجاح')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل تشغيل المزامنة')
  })

  const refreshAnime = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase}/api/admin/refresh/anime`, { method: 'POST' })
      if (!res.ok) throw new Error('refresh_failed')
      return await res.json()
    },
    onSuccess: () => {
      anime.refetch()
      toast.success('تم تحديث الأنمي')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل تحديث الأنمي')
  })

  const refreshQuran = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase}/api/admin/refresh/quran`, { method: 'POST' })
      if (!res.ok) throw new Error('refresh_failed')
      return await res.json()
    },
    onSuccess: () => {
      quran.refetch()
      toast.success('تم تحديث القرّاء')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل تحديث القرّاء')
  })

  const updateGameLink = useMutation({
    mutationFn: async (args: { id: number; download_url: string }) => {
      const { error } = await supabase.from('games').update({ download_url: args.download_url }).eq('id', args.id)
      if (error) throw error
      return true
    },
    onSuccess: () => {
      games.refetch()
      toast.success('تم حفظ رابط اللعبة')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل حفظ الرابط')
  })

  const updateSoftwareLink = useMutation({
    mutationFn: async (args: { id: number; download_url: string }) => {
      const { error } = await supabase.from('software').update({ download_url: args.download_url }).eq('id', args.id)
      if (error) throw error
      return true
    },
    onSuccess: () => {
      software.refetch()
      toast.success('تم حفظ رابط البرنامج')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل حفظ الرابط')
  })

  const deleteItem = useMutation({
    mutationFn: async (args: { table: 'games' | 'software' | 'anime' | 'quran_reciters'; id: number }) => {
      const { error } = await supabase.from(args.table).delete().eq('id', args.id)
      if (error) throw error
      return true
    },
    onSuccess: (_, vars) => {
      if (vars.table === 'games') games.refetch()
      if (vars.table === 'software') software.refetch()
      if (vars.table === 'anime') anime.refetch()
      if (vars.table === 'quran_reciters') quran.refetch()
      toast.success('تم الحذف')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل الحذف')
  })

  const filteredGames = useMemo(() => {
    const q = gameSearch.trim().toLowerCase()
    return (games.data || []).filter((g) => g.title?.toLowerCase().includes(q))
  }, [games.data, gameSearch])

  const filteredSoftware = useMemo(() => {
    const q = softwareSearch.trim().toLowerCase()
    return (software.data || []).filter((s) => s.title?.toLowerCase().includes(q))
  }, [software.data, softwareSearch])

  const filteredAnime = useMemo(() => {
    const q = animeSearch.trim().toLowerCase()
    return (anime.data || []).filter((a) => a.title?.toLowerCase().includes(q))
  }, [anime.data, animeSearch])

  const filteredQuran = useMemo(() => {
    const q = quranSearch.trim().toLowerCase()
    return (quran.data || []).filter((r) => r.name?.toLowerCase().includes(q))
  }, [quran.data, quranSearch])

  const statusColor = health.data?.lastSyncStatus === 'success'
    ? 'bg-green-500'
    : health.data?.lastSyncStatus === 'running'
      ? 'bg-yellow-500'
      : health.data?.lastSyncStatus === 'error'
        ? 'bg-red-500'
        : 'bg-zinc-500'

  const lastRunLabel = health.data?.lastSyncAt ? new Date(health.data.lastSyncAt).toLocaleString() : '—'

  const distributionData = [
    { name: 'Movies', value: counts.data?.movies || 0 },
    { name: 'Series', value: counts.data?.tv || 0 },
    { name: 'Games', value: counts.data?.games || 0 },
    { name: 'Software', value: counts.data?.software || 0 },
    { name: 'Anime', value: counts.data?.anime || 0 },
    { name: 'Quran', value: counts.data?.quran || 0 }
  ]

  const distributionColors = ['#f43f5e', '#a855f7', '#22c55e', '#38bdf8', '#eab308', '#f97316']

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">لوحة القيادة</h1>
        <button
          onClick={() => runSync.mutate()}
          disabled={runSync.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 h-12 text-white disabled:opacity-60"
        >
          {runSync.isPending ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
          {runSync.isPending ? 'جاري المزامنة...' : 'تشغيل المزامنة الكاملة'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-sm text-zinc-400"><span>الأفلام</span><Film size={16} /></div>
          <div className="mt-2 text-3xl font-extrabold">{counts.data?.movies ?? '—'}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-sm text-zinc-400"><span>المسلسلات</span><Tv size={16} /></div>
          <div className="mt-2 text-3xl font-extrabold">{counts.data?.tv ?? '—'}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-sm text-zinc-400"><span>الألعاب</span><Gamepad2 size={16} /></div>
          <div className="mt-2 text-3xl font-extrabold">{counts.data?.games ?? '—'}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-sm text-zinc-400"><span>البرمجيات</span><Laptop size={16} /></div>
          <div className="mt-2 text-3xl font-extrabold">{counts.data?.software ?? '—'}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-sm text-zinc-400"><span>الأنمي</span><Sparkles size={16} /></div>
          <div className="mt-2 text-3xl font-extrabold">{counts.data?.anime ?? '—'}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-sm text-zinc-400"><span>قرّاء القرآن</span><BookOpen size={16} /></div>
          <div className="mt-2 text-3xl font-extrabold">{counts.data?.quran ?? '—'}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between text-sm text-zinc-400"><span>إجمالي الزيارات</span><BarChart3 size={16} /></div>
          <div className="mt-2 text-3xl font-extrabold">{visits.data ?? '—'}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
            <span>حالة النظام</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Server size={16} />
              <span>آخر تشغيل: {lastRunLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>تنبيهات البريد مفعّلة</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(['games', 'software', 'anime', 'quran', 'insights', 'reports'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 h-11 text-sm font-bold ${activeTab === tab ? 'bg-primary text-white' : 'bg-white/5 text-zinc-300 border border-white/10'}`}
          >
            {tab === 'games' ? 'الألعاب' : tab === 'software' ? 'البرمجيات' : tab === 'anime' ? 'الأنمي' : tab === 'quran' ? 'القرّاء' : tab === 'reports' ? 'الإبلاغات' : 'التحليلات'}
          </button>
        ))}
      </div>

      {activeTab === 'games' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={gameSearch}
              onChange={(e) => setGameSearch(e.target.value)}
              placeholder="بحث في الألعاب"
              className="h-11 w-full max-w-sm rounded-xl border border-white/10 bg-black/40 px-4 text-sm"
            />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-start">العنوان</th>
                  <th className="px-4 py-3 text-start">الفئة</th>
                  <th className="px-4 py-3 text-start">رابط التحميل</th>
                  <th className="px-4 py-3 text-start">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((g) => (
                  <tr key={g.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{g.title}</td>
                    <td className="px-4 py-3">{g.category || '—'}</td>
                    <td className="px-4 py-3">
                      <input
                        value={gameLinks[g.id] ?? g.download_url ?? ''}
                        onChange={(e) => setGameLinks((s) => ({ ...s, [g.id]: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateGameLink.mutate({ id: g.id, download_url: gameLinks[g.id] ?? g.download_url ?? '' })}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 h-9 text-xs text-white"
                        >
                          <Pencil size={14} />
                          حفظ
                        </button>
                        <button
                          onClick={() => deleteItem.mutate({ table: 'games', id: g.id })}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 h-9 text-xs text-red-400"
                        >
                          <Trash2 size={14} />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {games.isLoading && (
                  <tr>
                    <td className="px-4 py-6 text-zinc-400" colSpan={4}>جاري التحميل...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'software' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={softwareSearch}
              onChange={(e) => setSoftwareSearch(e.target.value)}
              placeholder="بحث في البرمجيات"
              className="h-11 w-full max-w-sm rounded-xl border border-white/10 bg-black/40 px-4 text-sm"
            />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-start">العنوان</th>
                  <th className="px-4 py-3 text-start">الفئة</th>
                  <th className="px-4 py-3 text-start">رابط التحميل</th>
                  <th className="px-4 py-3 text-start">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSoftware.map((s) => (
                  <tr key={s.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{s.title}</td>
                    <td className="px-4 py-3">{s.category || '—'}</td>
                    <td className="px-4 py-3">
                      <input
                        value={softwareLinks[s.id] ?? s.download_url ?? ''}
                        onChange={(e) => setSoftwareLinks((state) => ({ ...state, [s.id]: e.target.value }))}
                        className="h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateSoftwareLink.mutate({ id: s.id, download_url: softwareLinks[s.id] ?? s.download_url ?? '' })}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 h-9 text-xs text-white"
                        >
                          <Pencil size={14} />
                          حفظ
                        </button>
                        <button
                          onClick={() => deleteItem.mutate({ table: 'software', id: s.id })}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 h-9 text-xs text-red-400"
                        >
                          <Trash2 size={14} />
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {software.isLoading && (
                  <tr>
                    <td className="px-4 py-6 text-zinc-400" colSpan={4}>جاري التحميل...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'anime' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={animeSearch}
              onChange={(e) => setAnimeSearch(e.target.value)}
              placeholder="بحث في الأنمي"
              className="h-11 w-full max-w-sm rounded-xl border border-white/10 bg-black/40 px-4 text-sm"
            />
            <button
              onClick={() => refreshAnime.mutate()}
              disabled={refreshAnime.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 h-11 text-sm text-white"
            >
              {refreshAnime.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              تحديث الأنمي
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-start">العنوان</th>
                  <th className="px-4 py-3 text-start">الفئة</th>
                  <th className="px-4 py-3 text-start">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnime.map((a) => (
                  <tr key={a.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{a.title || `#${a.id}`}</td>
                    <td className="px-4 py-3">{a.category || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteItem.mutate({ table: 'anime', id: a.id })}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 h-9 text-xs text-red-400"
                      >
                        <Trash2 size={14} />
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
                {anime.isLoading && (
                  <tr>
                    <td className="px-4 py-6 text-zinc-400" colSpan={3}>جاري التحميل...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'quran' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              value={quranSearch}
              onChange={(e) => setQuranSearch(e.target.value)}
              placeholder="بحث في القرّاء"
              className="h-11 w-full max-w-sm rounded-xl border border-white/10 bg-black/40 px-4 text-sm"
            />
            <button
              onClick={() => refreshQuran.mutate()}
              disabled={refreshQuran.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 h-11 text-sm text-white"
            >
              {refreshQuran.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              تحديث القرّاء
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-start">الاسم</th>
                  <th className="px-4 py-3 text-start">الفئة</th>
                  <th className="px-4 py-3 text-start">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuran.map((r) => (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{r.name || `#${r.id}`}</td>
                    <td className="px-4 py-3">{r.category || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteItem.mutate({ table: 'quran_reciters', id: r.id })}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 h-9 text-xs text-red-400"
                      >
                        <Trash2 size={14} />
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
                {quran.isLoading && (
                  <tr>
                    <td className="px-4 py-6 text-zinc-400" colSpan={3}>جاري التحميل...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-sm text-zinc-300">
                <span>أعلى الأفلام</span>
                <Film size={16} />
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {(topMovies.data || []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <span className="truncate">{m.title || `#${m.id}`}</span>
                    <span className="text-zinc-400">{m.clicks || 0}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-sm text-zinc-300">
                <span>أعلى الألعاب</span>
                <Gamepad2 size={16} />
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {(topGames.data || []).map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <span className="truncate">{g.title || `#${g.id}`}</span>
                    <span className="text-zinc-400">{g.clicks || 0}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-sm text-zinc-300">
                <span>أعلى البرمجيات</span>
                <Laptop size={16} />
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {(topSoftware.data || []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <span className="truncate">{s.title || `#${s.id}`}</span>
                    <span className="text-zinc-400">{s.clicks || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between text-sm text-zinc-300">
                <span>توزيع المحتوى</span>
                <BarChart3 size={16} />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distributionData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {distributionData.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={distributionColors[i % distributionColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between text-sm text-zinc-300">
                <span>تفصيل المنصات</span>
                <Server size={16} />
              </div>
              <div className="space-y-2 text-sm">
                {(softwareCategories.data || []).map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                    <span>{c.name}</span>
                    <span className="text-zinc-400">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm text-zinc-300">
              <CheckCircle2 size={16} />
              آخر سجلات المحرك
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs text-zinc-400">{(engineLogs.data?.logs || []).slice(-20).join('')}</pre>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-300">
            <AlertTriangle size={20} />
            <span>إبلاغات روابط لا تعمل (آخر 100)</span>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/40 text-zinc-400">
                <tr>
                  <th className="px-4 py-3 text-start">المحتوى (ID)</th>
                  <th className="px-4 py-3 text-start">النوع</th>
                  <th className="px-4 py-3 text-start">السيرفر</th>
                  <th className="px-4 py-3 text-start">الرابط</th>
                  <th className="px-4 py-3 text-start">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {(linkReports.data || []).map((r) => (
                  <tr key={r.id} className="border-t border-white/10">
                    <td className="px-4 py-3">{r.content_id}</td>
                    <td className="px-4 py-3">{r.content_type || '—'}</td>
                    <td className="px-4 py-3">{r.source_name || '—'}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate" title={r.url || ''}>{r.url || '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG') : '—'}</td>
                  </tr>
                ))}
                {linkReports.isLoading && (
                  <tr>
                    <td className="px-4 py-6 text-zinc-400" colSpan={5}>جاري التحميل...</td>
                  </tr>
                )}
                {!linkReports.isLoading && (linkReports.data || []).length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-zinc-400" colSpan={5}>لا توجد إبلاغات</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {syncLogs.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-xs">
          <div className="mb-3 flex items-center gap-2 text-zinc-300">
            <CheckCircle2 size={16} />
            سجل المزامنة
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-zinc-400">{syncLogs.join('')}</pre>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
