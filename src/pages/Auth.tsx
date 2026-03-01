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
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password' | 'mfa' | 'update-password'> (initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [mfaToken, setMfaToken] = useState('')
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
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
    // Check for password recovery hash in URL
    if (window.location.hash.includes('type=recovery')) {
      setMode('update-password')
    } else {
      setMode(initialMode)
    }
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني')
      return
    }
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني')
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرسال رابط الاستعادة')
    } finally {
      setLoading(false)
    }
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaToken || !challengeId) return
    
    setLoading(true)
    setErrorMsg(null)

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: challengeId,
        challengeId,
        code: mfaToken
      })
      
      if (error) throw error
      await handleLoginSuccess()
    } catch (err: any) {
      setErrorMsg(err.message || 'رمز التحقق غير صحيح')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setErrorMsg('كلمات المرور غير متطابقة')
      return
    }
    if (newPassword.length < 6) {
      setErrorMsg('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      setSuccessMsg('تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.')
      setTimeout(() => setMode('login'), 2000)
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحديث كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'forgot-password') return handleForgotPassword(e)
    if (mode === 'mfa') return handleMfaVerify(e)
    if (mode === 'update-password') return handleUpdatePassword(e)
    
    if (!isSupabaseConfigured) {
      setErrorMsg('بيانات Supabase غير مُعدّة. تحقق من ملف .env وأعد التشغيل.')
      return
    }
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      if (mode === 'login') {
        try {
          const { data, error } = await runWithTimeout(
            supabase.auth.signInWithPassword({ email, password }),
            8000
          )
          
          if (error) {
            // Check for MFA requirement
            if (error.message.includes('mfa_required')) {
              const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
              if (factorsError) throw factorsError
              
              const totpFactor = factors.totp[0]
              if (!totpFactor) throw new Error('لم يتم العثور على عامل مصادقة ثنائية')
              
              const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: totpFactor.id
              })
              if (challengeError) throw challengeError
              
              setChallengeId(challenge.id)
              setMode('mfa')
              setLoading(false)
              return
            }
            throw error
          }

          if (data.user) {
            await handleLoginSuccess()
          }
        } catch (err: any) {
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
      logAuthError('Auth error:', err)
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

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'مرحباً بعودتك'
      case 'register': return 'انضم إلينا'
      case 'forgot-password': return 'استعادة كلمة المرور'
      case 'mfa': return 'التحقق الثنائي'
      case 'update-password': return 'تغيير كلمة المرور'
    }
  }

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'استكمل رحلة المشاهدة السينمائية'
      case 'register': return 'أنشئ حسابك واستمتع بتجربة فريدة'
      case 'forgot-password': return 'أدخل بريدك الإلكتروني لاستلام رابط الاستعادة'
      case 'mfa': return 'أدخل الرمز المكون من 6 أرقام من تطبيق التحقق'
      case 'update-password': return 'أدخل كلمة المرور الجديدة لحسابك'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-lumen-void py-8">
      {/* LUMEN Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-lumen-gold/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] bg-lumen-gold/5 rounded-full blur-[100px] animate-pulse-slow delay-1000" />
        <div className="lumen-grain opacity-10" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10 p-4"
      >
        <div className="relative overflow-hidden rounded-2xl border border-lumen-muted bg-lumen-surface/60 backdrop-blur-2xl shadow-2xl">
          {/* Header */}
          <div className="p-6 pb-2 text-center">
            <motion.div 
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-lumen-gold mb-4 shadow-lg shadow-lumen-gold/20"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Sparkles className="text-lumen-void w-6 h-6" />
            </motion.div>
            <h1 className="text-2xl font-black text-lumen-cream tracking-tight mb-2 font-syne">
              {getTitle()}
            </h1>
            <p className="text-lumen-silver text-sm mb-4">
              {getSubtitle()}
            </p>
            
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto w-full rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 mb-4"
              >
                {errorMsg}
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto w-full rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-400 mb-4"
              >
                {successMsg}
              </motion.div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-lumen-silver/60">اسم المستخدم</label>
                <div className="relative group">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-silver/40 group-focus-within:text-lumen-gold transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full h-11 rounded-xl bg-lumen-void/50 border border-lumen-muted px-10 text-sm text-lumen-cream placeholder:text-lumen-silver/30 focus:outline-none focus:border-lumen-gold/50 focus:bg-lumen-void/80 transition-all"
                    placeholder="Username"
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'forgot-password') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-lumen-silver/60">البريد الإلكتروني</label>
                <div className="relative group">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-silver/40 group-focus-within:text-lumen-gold transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 rounded-xl bg-lumen-void/50 border border-lumen-muted px-10 text-sm text-lumen-cream placeholder:text-lumen-silver/30 focus:outline-none focus:border-lumen-gold/50 focus:bg-lumen-void/80 transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-lumen-silver/60">كلمة المرور</label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => setMode('forgot-password')}
                      className="text-[10px] text-lumen-gold hover:underline transition-all"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-silver/40 group-focus-within:text-lumen-gold transition-colors" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 rounded-xl bg-lumen-void/50 border border-lumen-muted px-10 text-sm text-lumen-cream placeholder:text-lumen-silver/30 focus:outline-none focus:border-lumen-gold/50 focus:bg-lumen-void/80 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-lumen-silver/40 hover:text-lumen-cream transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'update-password' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-lumen-silver/60">كلمة المرور الجديدة</label>
                  <div className="relative group">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-silver/40 group-focus-within:text-lumen-gold transition-colors" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-11 rounded-xl bg-lumen-void/50 border border-lumen-muted px-10 text-sm text-lumen-cream placeholder:text-lumen-silver/30 focus:outline-none focus:border-lumen-gold/50 focus:bg-lumen-void/80 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-lumen-silver/60">تأكيد كلمة المرور</label>
                  <div className="relative group">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-silver/40 group-focus-within:text-lumen-gold transition-colors" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-11 rounded-xl bg-lumen-void/50 border border-lumen-muted px-10 text-sm text-lumen-cream placeholder:text-lumen-silver/30 focus:outline-none focus:border-lumen-gold/50 focus:bg-lumen-void/80 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            )}

            {mode === 'mfa' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-lumen-silver/60">رمز التحقق (TOTP)</label>
                <div className="relative group">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-lumen-silver/40 group-focus-within:text-lumen-gold transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    className="w-full h-11 rounded-xl bg-lumen-void/50 border border-lumen-muted px-10 text-sm text-lumen-cream placeholder:text-lumen-silver/30 focus:outline-none focus:border-lumen-gold/50 focus:bg-lumen-void/80 transition-all"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-lumen-void/30 border-t-lumen-void rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'تسجيل الدخول' : 
                   mode === 'register' ? 'إنشاء حساب' : 
                   mode === 'mfa' ? 'تحقق' : 
                   mode === 'update-password' ? 'تحديث كلمة المرور' :
                   'إرسال رابط الاستعادة'}
                  <ArrowRight size={18} className="group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {mode !== 'mfa' && (
              <>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-lumen-muted"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-lumen-surface px-3 text-lumen-silver/60">أو المتابعة باستخدام</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center gap-3 w-full h-11 rounded-xl border border-lumen-muted bg-lumen-void/30 hover:bg-lumen-void/60 text-lumen-cream text-sm transition-all"
                  >
                    <Chrome size={18} />
                    Google
                  </button>
                </div>
              </>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                className="text-sm text-lumen-silver hover:text-lumen-gold transition-colors"
              >
                {mode === 'login' ? 'ليس لديك حساب؟ انضم إلينا' : 'لديك حساب بالفعل؟ سجل دخولك'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default Auth
