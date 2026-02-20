import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../lib/constants'
import { ensureProfile } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { logAuthError, errorLogger } from '../services/errorLogging'
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const navigate = useNavigate()
  const { syncLocalData, refreshProfile, user } = useAuth()
  const isSupabaseConfigured = Boolean(
    CONFIG.SUPABASE_URL &&
    CONFIG.SUPABASE_ANON_KEY &&
    !CONFIG.SUPABASE_URL.includes('placeholder') &&
    CONFIG.SUPABASE_ANON_KEY !== 'placeholder'
  )

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])
  const runWithTimeout = async <T,>(promise: Promise<T>, ms: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), ms)
    })
    try {
      return await Promise.race([promise, timeout])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }
  const signInWithPasswordFallback = async (emailValue: string, passwordValue: string) => {
    // محاولة فقط إذا كان هناك مشكلة في الشبكة، وليس خطأ في كلمة المرور
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)
    try {
      const response = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: CONFIG.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: emailValue, password: passwordValue }),
        signal: controller.signal
      })
      const payload = await response.json().catch(() => ({} as any))
      if (!response.ok) {
        // إذا كان الخطأ "Invalid login credentials"، لا نريد إخفاءه، بل رميه
        const message = payload?.error_description || payload?.msg || payload?.message || payload?.error || 'فشل تسجيل الدخول'
        throw new Error(message)
      }
      const accessToken = payload?.access_token
      const refreshToken = payload?.refresh_token
      if (!accessToken || !refreshToken) throw new Error('فشل إنشاء جلسة الدخول')
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      if (error) throw error
      return data
    } catch (err: any) {
      if (err?.name === 'AbortError') throw new Error('TIMEOUT')
      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  }
  const handleLoginSuccess = async () => {
    toast.success('تم تسجيل الدخول بنجاح')
    try {
      await runWithTimeout(refreshProfile(), 3000)
    } catch (e) {
      errorLogger.logError({
        message: 'Failed to refresh profile or timed out',
        severity: 'low',
        category: 'auth',
        context: { error: e }
      })
    }
    void runWithTimeout(syncLocalData(), 4000).catch(() => null)
    navigate('/', { replace: true })
  }

  useEffect(() => {
    setMode(initialMode)
    setErrorMsg(null)

    // تنظيف الجلسات العالقة عند فتح الصفحة
    const cleanupSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          await supabase.auth.signOut()
        }
        // تنظيف مفاتيح Supabase من التخزين المحلي لضمان بداية نظيفة
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key)
          }
        })
      } catch (e) {
        errorLogger.logError({
          message: 'Session cleanup failed',
          severity: 'low',
          category: 'auth',
          context: { error: e }
        })
    }
  }
  cleanupSession()
}, [initialMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSupabaseConfigured) {
      setErrorMsg('بيانات Supabase غير مُعدّة. تحقق من ملف .env وأعد التشغيل.')
      return
    }
    setLoading(true)
    setErrorMsg(null)

    try {
      if (mode === 'login') {
        try {
          const { data, error } = await runWithTimeout(
            supabase.auth.signInWithPassword({ email, password }),
            8000
          )
          if (error) throw error
          if (data.user) {
            await handleLoginSuccess()
          }
        } catch (err: any) {
          errorLogger.logError({
            message: 'Login attempt 1 failed',
            severity: 'low',
            category: 'auth',
            context: { error: err, email }
          })
          // المحاولة باستخدام المسار البديل في حال انتهاء المهلة أو خطأ في الشبكة
          const isNetworkError = err?.message === 'TIMEOUT' || 
                                 err?.message?.toLowerCase().includes('fetch') ||
                                 err?.message?.toLowerCase().includes('network')
          
          if (!isNetworkError) throw err

          const fallbackData = await signInWithPasswordFallback(email, password)
          if (fallbackData?.user) {
            await handleLoginSuccess()
          }
        }
      } else {
        const { data, error } = await runWithTimeout(
          supabase.auth.signUp({ 
            email, 
            password,
            options: {
              data: { username }
            }
          }),
          8000
        )
        if (error) throw error
        if (data.user) {
          await runWithTimeout(ensureProfile(data.user.id, data.user.email), 8000)
          toast.success('تم إنشاء الحساب بنجاح')
          navigate('/', { replace: true })
        }
      }
    } catch (err: any) {
      logAuthError('Login error:', err)
      let msg = err?.message || 'حدث خطأ غير متوقع'
      
      if (msg === 'TIMEOUT') {
        msg = 'انتهت مهلة الاتصال. تحقق من إعدادات Supabase أو الشبكة ثم حاول مرة أخرى.'
      } else if (
        msg.includes('Invalid login credentials') || 
        msg.includes('invalid_grant') ||
        msg.includes('wrong password')
      ) {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      } else if (msg.includes('Email not confirmed')) {
        msg = 'البريد الإلكتروني غير مفعل. يرجى التحقق من بريدك الوارد.'
      } else if (msg.includes('network') || msg.includes('fetch')) {
        msg = 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك.'
      }

      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      if (!isSupabaseConfigured) {
        setErrorMsg('بيانات Supabase غير مُعدّة. تحقق من ملف .env وأعد التشغيل.')
        return
      }
      setLoading(true)
      setErrorMsg(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      if (error) throw error
    } catch (err: any) {
      logAuthError('Google Auth Error:', err)
      let msg = err.message || 'فشل تسجيل الدخول بجوجل'
      if (err.message?.includes('provider is not enabled')) {
        msg = 'تسجيل الدخول بجوجل غير مفعل حالياً. يرجى استخدام البريد الإلكتروني.'
      } else if (err?.message === 'TIMEOUT') {
        msg = 'انتهت مهلة الاتصال. تحقق من إعدادات Supabase أو الشبكة ثم حاول مرة أخرى.'
      }
      setErrorMsg(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black py-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] bg-cyan-600/20 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10 p-3"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="p-3 pb-0 text-center">
            <motion.div 
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 mb-1.5 shadow-lg shadow-purple-500/20"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Sparkles className="text-white w-4 h-4" />
            </motion.div>
            <h1 className="text-base font-black text-white tracking-tight mb-1">
              {mode === 'login' ? 'مرحباً بعودتك' : 'انضم إلينا'}
            </h1>
            <p className="text-zinc-400 text-[10px] mb-1.5">
              {mode === 'login' 
                ? 'استكمل رحلة المشاهدة السينمائية' 
                : 'أنشئ حسابك واستمتع بتجربة فريدة'}
            </p>
            
            {errorMsg && (
              <div className="mx-auto w-full rounded-lg bg-red-500/10 border border-red-500/20 p-1.5 text-[10px] text-red-400">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-3 space-y-1.5">
            {mode === 'register' && (
              <div className="space-y-0.5">
                <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">اسم المستخدم</label>
                <div className="relative group">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={14} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-8 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                    placeholder="Username"
                  />
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">البريد الإلكتروني</label>
              <div className="relative group">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={14} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-8 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={14} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-8 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 mt-1 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs tracking-wide hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
                  <ArrowRight size={14} className="group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[9px] uppercase">
                <span className="bg-[#0a0a0a] px-2 text-zinc-500">أو المتابعة باستخدام</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-9 rounded-lg bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <Chrome size={16} />
              <span>Google</span>
            </button>
          </form>

          {/* Footer */}
          <div className="p-3 bg-white/5 border-t border-white/5 text-center">
            <p className="text-[10px] text-zinc-400">
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
