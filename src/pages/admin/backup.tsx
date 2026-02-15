import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

async function exportAll() {
  const tables = ['movies', 'tv_series', 'seasons', 'episodes', 'profiles', 'settings', 'ads', 'history', 'watchlist', 'continue_watching']
  const result: Record<string, any[]> = {}
  for (const t of tables) {
    const { data, error } = await supabase.from(t as any).select('*')
    if (error) continue
    result[t] = data || []
  }
  return result
}

const AdminBackupPage = () => {
  const [busy, setBusy] = useState(false)
  const serverOnly = true
  const onExport = async () => {
    if (serverOnly) {
      toast.error('ميزة النسخ الاحتياطي يجب نقلها للسيرفر أو Edge Function')
      return
    }
    setBusy(true)
    try {
      const data = await exportAll()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cinma-online-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (serverOnly) {
      toast.error('ميزة الاستيراد يجب نقلها للسيرفر أو Edge Function')
      return
    }
    const f = e.target.files?.[0]
    if (!f) return
    const confirm = window.confirm('سيتم استيراد البيانات وقد تستبدل قيماً موجودة. هل أنت متأكد؟')
    if (!confirm) return
    setBusy(true)
    try {
      const text = await f.text()
      const json = JSON.parse(text) as Record<string, any[]>
      for (const [table, rows] of Object.entries(json)) {
        if (!Array.isArray(rows)) continue
        if (!rows.length) continue
        try {
          await supabase.from(table as any).upsert(rows as any)
        } catch {}
      }
      toast.success('تم الاستيراد')
    } catch (e: any) {
      toast.error(e?.message || 'فشل الاستيراد')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">النسخ الاحتياطي</h1>
      <div className="rounded-lg border border-zinc-800 p-4">
        <button onClick={onExport} disabled={busy || serverOnly} className="rounded-md bg-primary px-4 h-11 text-white disabled:opacity-50">
          {busy ? 'جارٍ التصدير...' : 'تصدير قاعدة البيانات'}
        </button>
        <label className={`ml-3 inline-flex items-center rounded-md border border-zinc-700 px-4 h-11 ${serverOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
          استيراد قاعدة البيانات
          <input type="file" accept="application/json" onChange={onImport} className="hidden" disabled={serverOnly} />
        </label>
      </div>
      <div className="text-sm text-zinc-400">هذه الميزة يجب تنفيذها على السيرفر مع صلاحيات مقيدة وRLS</div>
    </div>
  )
}

export default AdminBackupPage
