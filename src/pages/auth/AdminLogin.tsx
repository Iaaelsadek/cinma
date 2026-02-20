import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase, getProfile } from '../../lib/supabase'

export const AdminLogin = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user) return
      const p = await getProfile(user.id)
      if (cancelled) return
      if (p?.role === 'admin') {
        navigate('/admin', { replace: true })
      }
    })()
    return () => { cancelled = true }
  }, [user, navigate])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/admin', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xs rounded-lg border border-zinc-800 p-5 mt-10">
      <h1 className="mb-3 text-lg font-bold">تسجيل دخول المشرف</h1>
      <form onSubmit={onSubmit} className="space-y-2">
        <div className="space-y-1">
          <label className="text-xs text-zinc-300">البريد الإلكتروني</label>
          <input
            type="email"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-sm outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-300">كلمة المرور</label>
          <input
            type="password"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-1.5 text-sm outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="text-xs text-red-400">{error}</div>}
        <button
          className="w-full rounded-md bg-primary p-1.5 text-sm text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}
