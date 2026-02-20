import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ensureProfile } from '../../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const signIn = async () => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/', { replace: true })
    } catch (e: any) {
      setError(e?.message || 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  const signUp = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      const user = data.user
      if (user) {
        await ensureProfile(user.id, user.email)
      }
      navigate('/', { replace: true })
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
    <div className="min-h-[40vh] flex items-center justify-center px-4 py-2">
      <div className="w-full max-w-[300px] rounded-xl border border-white/10 bg-white/5 backdrop-blur-2xl p-3 shadow-2xl">
        <h1 className="text-base font-black tracking-tight text-white text-center">تسجيل الدخول</h1>
        <p className="mt-1 text-center text-[10px] text-zinc-400">أكمل الدخول ببريدك أو عبر Google</p>
        <div className="mt-4 space-y-2.5">
          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">البريد الإلكتروني</label>
            <input
              type="email"
              className="w-full h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-xs text-white focus:border-primary outline-none transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-xs text-white focus:border-primary outline-none pr-8 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {error && <div className="text-[10px] text-red-400 bg-red-500/10 p-2 rounded-lg text-center">{error}</div>}
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full h-9 rounded-lg bg-primary text-white text-xs font-bold hover:brightness-110 transition disabled:opacity-50 mt-1"
          >
            دخول
          </button>
          <div className="text-center text-[10px] text-zinc-500 pt-1">
            لا تملك حساباً؟ <Link to="/register" className="text-primary font-bold hover:underline">إنشاء حساب</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
