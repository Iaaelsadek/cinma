import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

type ProfileRow = {
  id: string
  username: string | null
  role: 'user' | 'admin' | null
  banned?: boolean | null
  created_at?: string | null
}

async function getProfiles(search: string) {
  let q = supabase.from('profiles').select('id,username,role,banned,created_at').order('created_at', { ascending: false })
  if (search.trim()) {
    // basic server-side filtering by username equality; for contains use ilike if enabled
    q = q.ilike?.('username', `%${search.trim()}%`) || q
  }
  const { data, error } = await q
  if (error) throw error
  return data as ProfileRow[]
}

const AdminUsersPage = () => {
  const [search, setSearch] = useState('')
  const q = useQuery({ queryKey: ['profiles', search], queryFn: () => getProfiles(search) })
  const updateRole = useMutation({
    mutationFn: async (args: { id: string; role: 'user' | 'admin' }) => {
      const { error } = await supabase.from('profiles').update({ role: args.role }).eq('id', args.id)
      if (error) throw error
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
      if (error) throw error
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">المستخدمون</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث باسم المستخدم"
          className="h-11 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
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
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-zinc-800">
                <td className="px-3 py-2">{p.id}</td>
                <td className="px-3 py-2">{p.username || '—'}</td>
                <td className="px-3 py-2">
                  <select
                    value={p.role || 'user'}
                    onChange={(e) => updateRole.mutate({ id: p.id, role: e.target.value as 'user' | 'admin' })}
                    className="rounded-md border border-zinc-700 bg-zinc-900 p-1"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-3 py-2">{p.banned ? 'نعم' : 'لا'}</td>
                <td className="px-3 py-2">{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleBan.mutate({ id: p.id, banned: !p.banned })}
                    className="rounded-md border border-zinc-700 px-3 h-11"
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
                    <td className="px-3 py-2"><div className="h-4 w-28 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-3 py-2"><div className="h-4 w-20 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-3 py-2"><div className="h-7 w-24 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-3 py-2"><div className="h-4 w-10 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-3 py-2"><div className="h-4 w-24 animate-pulse rounded bg-zinc-800" /></td>
                    <td className="px-3 py-2"><div className="h-11 w-24 animate-pulse rounded bg-zinc-800" /></td>
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
