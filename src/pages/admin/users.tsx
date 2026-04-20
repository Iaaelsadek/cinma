import { useEffect, useState, startTransition } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from '../../lib/toast-manager'
import { errorLogger } from '../../services/errorLogging'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

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
  } catch (err: any) {
    errorLogger.logError({
      message: 'Direct profiles list failed, trying proxy',
      severity: 'medium',
      category: 'network',
      context: { error: err }
    })
    const headers = await getAdminRequestHeaders()
    const res = await fetch(`${API_BASE}/api/admin/proxy/profiles?select=id,username,role,banned,created_at&order=created_at&orderAsc=false`, { headers })
    if (!res.ok) throw err
    const rows = await res.json()
    if (!search.trim()) return rows as ProfileRow[]
    const term = search.trim().toLowerCase()
    return (rows as ProfileRow[]).filter(p => (p.username || '').toLowerCase().includes(term))
  }
}

async function getAdminRequestHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }
  return headers
}

const AdminUsersPage = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const [search, setSearch] = useState('')
  const [profileWaitExceeded, setProfileWaitExceeded] = useState(false)
  const q = useQuery({
    queryKey: ['profiles', search],
    queryFn: () => getProfiles(search),
    retry: 1,
    refetchOnWindowFocus: false
  })

  useEffect(() => {
    if (user && !profile) {
      refreshProfile(true).catch(() => {})
    }
  }, [user, profile, refreshProfile])

  useEffect(() => {
    if (user && !profile) {
      const timer = setTimeout(() => setProfileWaitExceeded(true), 6000)
      return () => {
        clearTimeout(timer)
        setProfileWaitExceeded(false)
      }
    }
  }, [user, profile])

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
         const headers = await getAdminRequestHeaders()
         const res = await fetch(`${API_BASE}/api/profile/${args.id}/role`, {
            method: 'POST',
            headers,
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
         const headers = await getAdminRequestHeaders()
         const res = await fetch(`${API_BASE}/api/profile/${args.id}/ban`, {
            method: 'POST',
            headers,
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
        {q.isError && (
          <div className="p-4 text-xs text-rose-300 flex items-center justify-between bg-rose-500/10 border-b border-rose-500/20">
            <span>فشل تحميل قائمة المستخدمين</span>
            <button onClick={() => q.refetch()} className="rounded-md border border-zinc-700 px-2 py-1 hover:bg-zinc-800">
              إعادة المحاولة
            </button>
          </div>
        )}
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
                    className="rounded-md border border-zinc-700 bg-[#1C1B1F] p-1 h-7 text-xs text-white hover:bg-[#0F0F14] transition-colors"
                  >
                    <option value="user" className="bg-[#1C1B1F] text-white">User</option>
                    <option value="admin" className="bg-[#1C1B1F] text-white">Admin</option>
                    <option value="supervisor" className="bg-[#1C1B1F] text-white">Supervisor</option>
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
