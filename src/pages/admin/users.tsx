import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { errorLogger } from '../../services/errorLogging'

const API_BASE = import.meta.env.VITE_API_BASE || ''

type ProfileRow = {
  id: string
  username: string | null
  role: 'user' | 'admin' | 'supervisor' | null
  banned?: boolean | null
  created_at?: string | null
}

async function getProfiles(search: string) {
  try {
    let q = supabase.from('profiles').select('id,username,role,banned,created_at').order('created_at', { ascending: false })
    if (search.trim()) {
      q = q.ilike('username', `%${search.trim()}%`)
    }
    const { data, error } = await q
    if (error) throw error
    return data as ProfileRow[]
  } catch (err) {
    errorLogger.logError({
      message: 'Direct profiles list failed, trying proxy',
      severity: 'medium',
      category: 'network',
      context: { error: err }
    })
    const res = await fetch(`${API_BASE}/api/profiles?search=${encodeURIComponent(search)}`)
    if (!res.ok) throw err
    return await res.json()
  }
}

const AdminUsersPage = () => {
  const [search, setSearch] = useState('')
  const q = useQuery({ queryKey: ['profiles', search], queryFn: () => getProfiles(search) })
  const updateRole = useMutation({
    mutationFn: async (args: { id: string; role: 'user' | 'admin' | 'supervisor' }) => {
      const { error } = await supabase.from('profiles').update({ role: args.role }).eq('id', args.id)
      if (error) {
         errorLogger.logError({
            message: 'Direct role update failed, trying proxy',
            severity: 'medium',
            category: 'network',
            context: { error, args }
         })
         const res = await fetch(`${API_BASE}/api/profile/${args.id}/role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: args.role })
         })
         if (!res.ok) throw error
      }
      return true
    },
    onSuccess: () => {
      q.refetch()
      toast.success('تم تحديث الدور')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل التحديث')
  })
  const toggleBan = useMutation({
    mutationFn: async (args: { id: string; banned: boolean }) => {
      const { error } = await supabase.from('profiles').update({ banned: args.banned }).eq('id', args.id)
      if (error) {
         errorLogger.logError({
            message: 'Direct ban update failed, trying proxy',
            severity: 'medium',
            category: 'network',
            context: { error, args }
         })
         const res = await fetch(`${API_BASE}/api/profile/${args.id}/ban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ banned: args.banned })
         })
         if (!res.ok) throw error
      }
      return true
    },
    onSuccess: () => {
      q.refetch()
      toast.success('تم تحديث الحالة')
    },
    onError: (e: any) => toast.error(e?.message || 'فشل التحديث')
  })
  const rows = q.data || []
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">المستخدمون</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث باسم المستخدم"
          className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-xs"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-3 py-2 text-start">ID</th>
              <th className="px-3 py-2 text-start">Username</th>
              <th className="px-3 py-2 text-start">Role</th>
              <th className="px-3 py-2 text-start">Banned</th>
              <th className="px-3 py-2 text-start">Created</th>
              <th className="px-3 py-2 text-start">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p: ProfileRow) => (
              <tr key={p.id} className="border-t border-zinc-800">
                <td className="px-3 py-1.5">{p.id}</td>
                <td className="px-3 py-1.5">{p.username || '—'}</td>
                <td className="px-3 py-1.5">
                  <select
                    value={p.role || 'user'}
                    onChange={(e) => updateRole.mutate({ id: p.id, role: e.target.value as 'user' | 'admin' | 'supervisor' })}
                    className="rounded-md border border-zinc-700 bg-zinc-900 p-1 h-7 text-xs"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="supervisor">Supervisor</option>
                  </select>
                </td>
                <td className="px-3 py-1.5">{p.banned ? 'نعم' : 'لا'}</td>
                <td className="px-3 py-1.5">{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-1.5">
                  <button
                    onClick={() => toggleBan.mutate({ id: p.id, banned: !p.banned })}
                    className="rounded-md border border-zinc-700 px-2 h-7 text-[10px]"
                  >
                    {p.banned ? 'إلغاء الحظر' : 'حظر'}
                  </button>
                </td>
              </tr>
            ))}
            {q.isLoading && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-t border-zinc-800">
                    <td className="px-3 py-1.5"><div className="h-4 w-28 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-3 py-1.5"><div className="h-4 w-20 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-3 py-1.5"><div className="h-6 w-24 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-3 py-1.5"><div className="h-4 w-10 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-3 py-1.5"><div className="h-4 w-24 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-3 py-1.5"><div className="h-7 w-24 animate-pulse rounded bg-zinc-800" /></td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminUsersPage
