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
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-black tracking-tight text-white text-center">تسجيل الدخول</h1>
        <p className="mt-1 text-center text-sm text-zinc-400">أكمل الدخول ببريدك أو عبر Google</p>
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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white focus:border-primary outline-none pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <div className="text-sm text-red-400">{error}</div>}
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-white font-bold hover:brightness-110 transition disabled:opacity-50"
          >
            دخول
          </button>
          {/* Google Auth Disabled - Not configured in Supabase
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full h-12 rounded-xl border border-white/10 bg-white/10 text-white font-bold hover:bg-white/20 transition disabled:opacity-50"
          >
            المتابعة عبر Google
          </button>
          */}
          <div className="text-center text-sm text-zinc-400">
            لا تملك حساباً؟ <Link to="/register" className="text-primary font-bold">إنشاء حساب</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
