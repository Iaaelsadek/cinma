import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { ensureProfile } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff, Mail, Lock, User, Chrome, ArrowRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const Auth = () => {
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { syncLocalData } = useAuth()

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (data.user) {
          toast.success('تم تسجيل الدخول بنجاح')
          await syncLocalData()
          navigate('/', { replace: true })
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { username }
          }
        })
        if (error) throw error
        if (data.user) {
          await ensureProfile(data.user.id, data.user.email)
          toast.success('تم إنشاء الحساب بنجاح')
          navigate('/', { replace: true })
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] bg-cyan-600/20 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10 p-6"
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="p-8 pb-0 text-center">
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 mb-6 shadow-lg shadow-purple-500/20"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Sparkles className="text-white w-8 h-8" />
            </motion.div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">
              {mode === 'login' ? 'مرحباً بعودتك' : 'انضم إلينا'}
            </h1>
            <p className="text-zinc-400 text-sm">
              {mode === 'login' 
                ? 'استكمل رحلة المشاهدة السينمائية' 
                : 'أنشئ حسابك واستمتع بتجربة فريدة'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">اسم المستخدم</label>
                <div className="relative group">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-11 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                    placeholder="Username"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">البريد الإلكتروني</label>
              <div className="relative group">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-11 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-11 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold tracking-wide hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
                  <ArrowRight size={18} className="group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0a0a0a] px-2 text-zinc-500">أو المتابعة باستخدام</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors"
            >
              <Chrome size={20} />
              <span>Google</span>
            </button>
          </form>

          {/* Footer */}
          <div className="p-6 bg-white/5 border-t border-white/5 text-center">
            <p className="text-sm text-zinc-400">
              {mode === 'login' ? 'لا تملك حساباً؟' : 'لديك حساب بالفعل؟'}
              <button
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="mx-2 font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 hover:opacity-80 transition-opacity"
              >
                {mode === 'login' ? 'أنشئ حساباً الآن' : 'سجل دخولك'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Auth
