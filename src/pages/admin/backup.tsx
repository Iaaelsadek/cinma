import { useMemo, useState } from 'react'
import { Download, Upload, Database, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from '../../lib/toast-manager'

const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || 'http://localhost:3001'
const TABLES = [
  'movies',
  'tv_series',
  'seasons',
  'episodes',
  'profiles',
  'ads',
  'settings',
  'history',
  'watchlist',
  'continue_watching',
  'server_provider_configs'
  // link_checks removed - now in CockroachDB
]

const AdminBackupPage = () => {
  const [busyExport, setBusyExport] = useState(false)
  const [busyImport, setBusyImport] = useState(false)
  const [lastMeta, setLastMeta] = useState<{ exportedAt?: string; tableCount?: number; mode?: string } | null>(null)
  const [selectedTables, setSelectedTables] = useState<string[]>(TABLES)
  const [importMode, setImportMode] = useState<'upsert' | 'replace'>('upsert')

  const hasSelection = selectedTables.length > 0
  const exportLabel = useMemo(() => {
    if (selectedTables.length === TABLES.length) return 'كل الجداول'
    if (selectedTables.length === 0) return 'بدون تحديد'
    return `${selectedTables.length} جدول`
  }, [selectedTables.length])

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
    return headers
  }

  const toggleTable = (table: string, checked: boolean) => {
    setSelectedTables((prev) => checked ? Array.from(new Set([...prev, table])) : prev.filter((t) => t !== table))
  }

  const toggleAll = (checked: boolean) => {
    setSelectedTables(checked ? [...TABLES] : [])
  }

  const onExport = async () => {
    if (!hasSelection) {
      toast.error('حدد جدولاً واحداً على الأقل')
      return
    }
    setBusyExport(true)
    try {
      const headers = await getAuthHeaders()
      const tablesParam = encodeURIComponent(selectedTables.join(','))
      const response = await fetch(`${API_BASE}/api/admin/backup/export?tables=${tablesParam}`, { headers })
      const body = await response.json()
      if (!response.ok) {
        throw new Error(body?.error || 'فشل تصدير النسخة الاحتياطية')
      }
      const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `4cima-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      a.click()
      URL.revokeObjectURL(url)
      setLastMeta({ exportedAt: body?.exportedAt, tableCount: body?.tableCount })
      toast.success('تم تصدير النسخة الاحتياطية')
    } catch (error: any) {
      toast.error(error?.message || 'فشل تصدير النسخة الاحتياطية')
    } finally {
      setBusyExport(false)
    }
  }

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const confirmed = window.confirm(importMode === 'replace'
      ? 'وضع الاستبدال سيحاول حذف بيانات الجداول ثم إعادة إدخالها. هل أنت متأكد؟'
      : 'سيتم تنفيذ upsert للبيانات المرفوعة. هل تريد المتابعة؟')
    if (!confirmed) return
    setBusyImport(true)
    try {
      const text = await f.text()
      const parsed = JSON.parse(text) as { data?: Record<string, any[]> } | Record<string, any[]>
      const inputData = (parsed as any).data && typeof (parsed as any).data === 'object'
        ? (parsed as any).data
        : parsed
      const filteredData: Record<string, any[]> = {}
      Object.entries(inputData || {}).forEach(([table, rows]) => {
        if (!selectedTables.includes(table)) return
        if (!Array.isArray(rows)) return
        filteredData[table] = rows
      })
      if (Object.keys(filteredData).length === 0) {
        throw new Error('لا توجد بيانات مطابقة للجداول المحددة')
      }
      const headers = await getAuthHeaders()
      const response = await fetch(`${API_BASE}/api/admin/backup/import`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: importMode,
          data: filteredData
        })
      })
      const body = await response.json()
      if (!response.ok) {
        throw new Error(body?.error || 'فشل استيراد النسخة الاحتياطية')
      }
      setLastMeta({ mode: body?.mode })
      toast.success('تم استيراد النسخة الاحتياطية')
    } catch (e: any) {
      toast.error(e?.message || 'فشل الاستيراد')
    } finally {
      setBusyImport(false)
      e.target.value = ''
    }
  }
  return (
    <div className="space-y-4 p-2">
      <h1 className="text-xl font-bold">النسخ الاحتياطي</h1>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-300 flex items-center gap-2">
            <Database size={16} className="text-primary" />
            <span>نطاق النسخ: {exportLabel}</span>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              className="accent-primary"
              checked={selectedTables.length === TABLES.length}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            تحديد الكل
          </label>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {TABLES.map((table) => (
            <label key={table} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-black/20 px-2.5 py-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                className="accent-primary"
                checked={selectedTables.includes(table)}
                onChange={(e) => toggleTable(table, e.target.checked)}
              />
              <span>{table}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center">
          <select
            value={importMode}
            onChange={(e) => setImportMode(e.target.value as 'upsert' | 'replace')}
            className="rounded-md border border-zinc-700 bg-[#1C1B1F] px-3 h-9 text-sm text-white hover:bg-[#0F0F14] transition-colors"
          >
            <option value="upsert" className="bg-[#1C1B1F] text-white">Import Mode: Upsert</option>
            <option value="replace" className="bg-[#1C1B1F] text-white">Import Mode: Replace</option>
          </select>
          <button
            onClick={onExport}
            disabled={busyExport || !hasSelection}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 h-9 text-white disabled:opacity-50 text-sm"
          >
            <Download size={14} />
            {busyExport ? 'جارٍ التصدير...' : 'تصدير النسخة'}
          </button>
          <label className={`inline-flex items-center justify-center gap-2 rounded-md border border-zinc-700 px-4 h-9 text-sm ${busyImport ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
            <Upload size={14} />
            {busyImport ? 'جارٍ الاستيراد...' : 'استيراد النسخة'}
            <input type="file" accept="application/json" onChange={onImport} className="hidden" disabled={busyImport} />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-zinc-800 bg-black/20 p-3 text-zinc-400">
            <div className="flex items-center gap-2 mb-1"><CheckCircle2 size={14} className="text-emerald-400" />أمان التشغيل</div>
            <div>يتطلب Admin JWT، ويعمل عبر API السيرفر مع قائمة جداول مسموحة.</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/20 p-3 text-zinc-400">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-amber-400" />تحذير</div>
            <div>وضع Replace قد يستبدل بيانات مهمة. استخدم Upsert كخيار افتراضي.</div>
          </div>
        </div>

        {lastMeta && (
          <div className="text-xs text-zinc-500">
            {lastMeta.exportedAt && <span className="me-4">آخر تصدير: {new Date(lastMeta.exportedAt).toLocaleString()}</span>}
            {typeof lastMeta.tableCount === 'number' && <span className="me-4">عدد الجداول: {lastMeta.tableCount}</span>}
            {lastMeta.mode && <span>وضع آخر استيراد: {lastMeta.mode}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminBackupPage
