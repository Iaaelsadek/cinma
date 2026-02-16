import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ensureProfile } from '../../lib/supabase'

export const Register = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const signUp = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (data?.user) {
        navigate('/', { replace: true })
      }
    } catch (e: any) {
      setError(e?.message || 'فشل إنشاء الحساب')
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-black tracking-tight text-white text-center">إنشاء حساب</h1>
        <p className="mt-1 text-center text-sm text-zinc-400">سجل ببريدك أو عبر Google</p>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">البريد الإلكتروني</label>
            <input
              type="email"
              className="w-full h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white focus:border-primary outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">كلمة المرور</label>
            <input
              type="password"
              className="w-full h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white focus:border-primary outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}

          <button
            onClick={signUp}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-white font-bold hover:brightness-110 transition disabled:opacity-50"
          >
            إنشاء حساب
          </button>
          {/* Google Auth Disabled
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full h-12 rounded-xl border border-white/10 bg-white/10 text-white font-bold hover:bg-white/20 transition disabled:opacity-50"
          >
            المتابعة عبر Google
          </button>
          */}
        </div>

        <div className="mt-6 text-center text-sm text-zinc-400">
          لديك حساب بالفعل؟ <Link to="/login" className="text-primary font-bold">تسجيل الدخول</Link>
        </div>
      </div>
    </div>
  )
}
