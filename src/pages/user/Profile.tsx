import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getProfile, updateUsername, uploadAvatar, supabase, getWatchlist, getContinueWatching, getHistory, removeFromWatchlist } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useQuery as useRQ } from '@tanstack/react-query'
import { getRecommendations, RecommendationItem } from '../../services/recommendations'
import { Helmet } from 'react-helmet-async'
import { SkeletonGrid, SkeletonProfile } from '../../components/common/Skeletons'
import { getArabicErrorMessage, getArabicSuccessMessage } from '../../lib/arabic-messages'
import { errorLogger, logAuthError } from '../../services/errorLogging'

type Role = 'user' | 'admin' | 'supervisor'

// Error Boundary Component for Profile Page
const ProfileErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      errorLogger.logError({
        message: 'Profile Error: ' + event.message,
        stack: event.error?.stack,
        severity: 'high',
        category: 'user_action',
        context: { error: event.error }
      })
      setHasError(true)
      setError(event.error)
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">حدث خطأ في صفحة الملف الشخصي</h2>
          <p className="text-zinc-300 mb-4">نأسف للإزعاج، حدث خطأ غير متوقع</p>
          <button 
            onClick={() => {
              setHasError(false)
              setError(null)
              window.location.reload()
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Loading Skeleton Component
// const ProfileSkeleton = () => (
//   <div className="mx-auto max-w-5xl space-y-4 animate-pulse">
//     <div className="h-10 w-48 bg-zinc-800 rounded mb-8"></div>
//     <div className="rounded-lg border border-zinc-800 p-6 h-64 bg-zinc-900/50">
//       <div className="flex items-center gap-4 mb-6">
//         <div className="w-24 h-24 bg-zinc-800 rounded-full"></div>
//         <div className="flex-1">
//           <div className="h-6 w-32 bg-zinc-800 rounded mb-2"></div>
//           <div className="h-4 w-48 bg-zinc-800 rounded"></div>
//         </div>
//       </div>
//       <div className="space-y-4">
//         <div className="h-10 bg-zinc-800 rounded"></div>
//         <div className="flex gap-2">
//           <div className="h-10 w-24 bg-zinc-800 rounded"></div>
//           <div className="h-10 w-32 bg-zinc-800 rounded"></div>
//         </div>
//       </div>
//     </div>
//     <div className="grid md:grid-cols-2 gap-4">
//       <div className="rounded-lg border border-zinc-800 p-4 h-48 bg-zinc-900/50"></div>
//       <div className="rounded-lg border border-zinc-800 p-4 h-48 bg-zinc-900/50"></div>
//     </div>
//   </div>
// )

export const Profile = () => {
  const { user, profile: authProfile, loading, refreshProfile, error: authError } = useAuth()
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('user')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [targetId, setTargetId] = useState('')
  const [targetUsername, setTargetUsername] = useState('')
  const [adminMsg, setAdminMsg] = useState<string | null>(null)
  const isAdmin = role === 'admin'
  const isSupervisor = role === 'supervisor'
  const canAccessDashboard = isAdmin || isSupervisor

  // Force refresh profile on mount to ensure role is up to date
  // REMOVED: Managed by useInitAuth globally to prevent duplicate fetches
  /*
  useEffect(() => {
    refreshProfile(true).catch(err => {
      logAuthError('Failed to refresh profile', err)
      setError(getArabicErrorMessage(err))
    })
  }, [])
  */

  useEffect(() => {
    if (authProfile) {
      setUsername(authProfile.username || '')
      setAvatar(authProfile.avatar_url || null)
      setRole(authProfile.role as Role)
      setError(null)
    }
  }, [authProfile])

  // REMOVED: Redundant fetch logic that causes loops and duplicate toasts
  /*
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user) return
      
      // If we already have profile from auth, skip fetch unless forced
      if (authProfile && authProfile.id === user.id) return

      try {
        const p = await getProfile(user.id)
        if (cancelled) return
        if (p) {
          setUsername(p.username || '')
          setAvatar(p.avatar_url || null)
          setRole(p.role as Role)
          setError(null)
        } else {
          // If profile missing, try to refresh/create it via auth
          await refreshProfile()
        }
      } catch (err) {
        logAuthError('Failed to fetch profile', err)
        // Show user-friendly error message
        const errorMsg = getArabicErrorMessage(err as string | Error | null)
        setError(errorMsg)
        toast.error(`فشل تحميل البيانات الشخصية: ${errorMsg}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, authProfile, refreshProfile])
  */

  if (!loading && !user) return <Navigate to="/login" replace />

  // Show loading skeleton only if actually loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] pt-24 px-4">
        <SkeletonProfile />
      </div>
    )
  }

  // If not loading and no profile (despite user being logged in), show error
  if (!authProfile) {
    const displayError = error || (authError?.message ? getArabicErrorMessage(authError) : 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.');
    
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 pt-24">
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">فشل تحميل الملف الشخصي</h2>
          <p className="text-zinc-300 mb-4">{displayError}</p>
          <button 
            onClick={() => {
              setError(null)
              refreshProfile(true).catch(err => setError(getArabicErrorMessage(err)))
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  // Show error state if profile loading failed
  // REMOVED: Redundant as handled by !authProfile check above
  /*
  if (error && !authProfile) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">فشل تحميل الملف الشخصي</h2>
          <p className="text-zinc-300 mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null)
              refreshProfile(true)
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }
  */

  const onSave = async () => {
    if (!user) return
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      await updateUsername(user.id, username)
      setMsg(getArabicSuccessMessage('Username updated'))
      toast.success(getArabicSuccessMessage('Username updated'))
    } catch (e: any) {
      const errorMsg = getArabicErrorMessage(e)
      setMsg(`فشل حفظ الاسم: ${errorMsg}`)
      setError(errorMsg)
      toast.error(`فشل حفظ الاسم: ${errorMsg}`)
    } finally {
      setBusy(false)
    }
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      const url = await uploadAvatar(f, user.id)
      setAvatar(url)
      setMsg(getArabicSuccessMessage('Avatar updated'))
      toast.success(getArabicSuccessMessage('Avatar updated'))
      // Refresh profile to update avatar in auth context
      await refreshProfile()
    } catch (e: any) {
      const errorMsg = getArabicErrorMessage(e)
      setMsg(`فشل رفع الصورة: ${errorMsg}`)
      setError(errorMsg)
      toast.error(`فشل رفع الصورة: ${errorMsg}`)
    } finally {
      setBusy(false)
    }
  }

  const findTargetId = async (): Promise<string | null> => {
    if (targetId.trim()) return targetId.trim()
    if (targetUsername.trim()) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', targetUsername.trim())
        .maybeSingle()
      if (error) throw error
      return data?.id ?? null
    }
    return null
  }

  const setRoleForTarget = async (newRole: Role) => {
    setAdminMsg(null)
    setError(null)
    try {
      const id = await findTargetId()
      if (!id) {
        setAdminMsg('أدخل معرف المستخدم أو اسم المستخدم')
        return
      }
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id)
      if (error) throw error
      setAdminMsg(`تم تحديث دور المستخدم (${id}) إلى ${newRole}`)
      toast.success(`تم تحديث دور المستخدم إلى ${newRole}`)
    } catch (e: any) {
      const errorMsg = getArabicErrorMessage(e)
      setAdminMsg(errorMsg)
      setError(errorMsg)
      toast.error(`فشل تحديث الدور: ${errorMsg}`)
    }
  }

  // Wrap content in error boundary
  return (
    <ProfileErrorBoundary>
      <div className="mx-auto max-w-5xl space-y-4 p-4">
        <Helmet>
          <title>الملف الشخصي - {username || 'مستخدم'}</title>
        </Helmet>

        {/* Error Message Display */}
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message Display */}
        {msg && (
          <div className="rounded-lg border border-green-800 bg-green-900/20 p-4 mb-4">
            <p className="text-green-400 text-sm">{msg}</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="rounded-lg border border-zinc-800 p-6 bg-zinc-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <img
                src={avatar || '/default-avatar.png'}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700"
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.png'
                }}
              />
              <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
                📷
              </label>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">{username || 'مستخدم'}</h2>
              <p className="text-zinc-400 text-sm mb-2">الدور: {role === 'admin' ? 'مدير' : role === 'supervisor' ? 'مشرف' : 'مستخدم'}</p>
              {canAccessDashboard && (
                <Link 
                  to="/admin/dashboard" 
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  ⚡ لوحة التحكم
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">اسم المستخدم</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={onSave}
                disabled={busy}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors font-medium"
              >
                {busy ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button
                onClick={() => {
                  if (authProfile) {
                    setUsername(authProfile.username || '')
                    setMsg(null)
                    setError(null)
                  }
                }}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>

        {/* Admin Panel */}
        {isAdmin && (
          <div className="rounded-lg border border-zinc-800 p-6 bg-zinc-900/50 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              ⚡ لوحة الإدارة
            </h3>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">معرف المستخدم</label>
                  <input
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="أو أدخل اسم المستخدم أدناه"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">اسم المستخدم</label>
                  <input
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    placeholder="أو أدخل المعرف أعلاه"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {adminMsg && (
                <div className="rounded-lg bg-zinc-800 p-3">
                  <p className="text-sm text-zinc-300">{adminMsg}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => setRoleForTarget('admin')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  تعيين كمدير
                </button>
                <button
                  onClick={() => setRoleForTarget('supervisor')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  تعيين كمشرف
                </button>
                <button
                  onClick={() => setRoleForTarget('user')}
                  className="bg-zinc-600 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  تعيين كمستخدم
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Sections */}
        <div className="grid md:grid-cols-2 gap-4">
          <WatchlistSection />
          <ContinueWatchingSection />
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <HistorySection />
          <RecommendationsSection />
        </div>
      </div>
    </ProfileErrorBoundary>
  )
}

// Watchlist Section Component
const WatchlistSection = () => {
  const { user } = useAuth()
  const { data: watchlist, isLoading, error } = useRQ({
    queryKey: ['watchlist', user?.id],
    queryFn: () => getWatchlist(user!.id),
    enabled: !!user
  })

  if (isLoading) return (
    <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
      <div className="h-6 w-24 bg-zinc-800 rounded mb-4"></div>
      <SkeletonGrid count={3} />
    </div>
  )

  if (error) return (
    <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
      <h3 className="text-lg font-semibold text-red-400 mb-2">قائمة المتابعة</h3>
      <p className="text-red-300 text-sm">{getArabicErrorMessage(error)}</p>
    </div>
  )

  return (
    <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        📋 قائمة المتابعة
      </h3>
      {watchlist && watchlist.length > 0 ? (
        <div className="space-y-2">
          {watchlist.slice(0, 5).map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
              <img 
                src={item.poster_path || '/default-poster.jpg'} 
                alt={item.title} 
                className="w-12 h-16 object-cover rounded"
                onError={(e) => e.currentTarget.src = '/default-poster.jpg'}
              />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                <p className="text-xs text-zinc-400">{(item as any).category || 'غير مصنف'}</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await removeFromWatchlist(user!.id, item.id, item.type || 'movie')
                    toast.success('تمت الإزالة من قائمة المتابعة')
                  } catch (err) {
                    toast.error(getArabicErrorMessage(err as string | Error | null))
                  }
                }}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                إزالة
              </button>
            </div>
          ))}
          {watchlist.length > 5 && (
            <Link to="/watchlist" className="text-blue-400 hover:text-blue-300 text-sm">
              عرض الكل ({watchlist.length})
            </Link>
          )}
        </div>
      ) : (
        <p className="text-zinc-400 text-sm">لا توجد عناصر في قائمة المتابعة</p>
      )}
    </div>
  )
}

// Continue Watching Section Component
const ContinueWatchingSection = () => {
  const { user } = useAuth()
  const { data: continueWatching, isLoading, error } = useRQ({
    queryKey: ['continue-watching', user?.id],
    queryFn: () => getContinueWatching(user!.id),
    enabled: !!user
  })

  if (isLoading) return (
    <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
      <div className="h-6 w-32 bg-zinc-800 rounded mb-4"></div>
      <SkeletonGrid count={3} />
    </div>
  )

  if (error) return (
    <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
      <h3 className="text-lg font-semibold text-red-400 mb-2">متابعة المشاهدة</h3>
      <p className="text-red-300 text-sm">{getArabicErrorMessage(error)}</p>
    </div>
  )

  return (
    <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        ⏯️ متابعة المشاهدة
      </h3>
      {continueWatching && continueWatching.length > 0 ? (
        <div className="space-y-2">
          {continueWatching.slice(0, 5).map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
              <img 
                src={item.poster_path || '/default-poster.jpg'} 
                alt={item.title} 
                className="w-12 h-16 object-cover rounded"
                onError={(e) => e.currentTarget.src = '/default-poster.jpg'}
              />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                <div className="w-full bg-zinc-700 rounded-full h-1 mt-1">
                  <div 
                    className="bg-blue-600 h-1 rounded-full" 
                    style={{ width: `${(item.current_time / item.duration) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {Math.floor(item.current_time / 60)}:{(item.current_time % 60).toString().padStart(2, '0')} / 
                  {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <Link
                to={`/watch/${(item as any).type}/${item.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
              >
                استئناف
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-400 text-sm">لا توجد عناصر لمتابعة المشاهدة</p>
      )}
    </div>
  )
}

// History Section Component
const HistorySection = () => {
  const { user } = useAuth()
  const { data: history, isLoading, error } = useRQ({
    queryKey: ['history', user?.id],
    queryFn: () => getHistory(user!.id),
    enabled: !!user
  })

  if (isLoading) return (
    <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
      <div className="h-6 w-20 bg-zinc-800 rounded mb-4"></div>
      <SkeletonGrid count={3} />
    </div>
  )

  if (error) return (
    <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
      <h3 className="text-lg font-semibold text-red-400 mb-2">سجل المشاهدة</h3>
      <p className="text-red-300 text-sm">{getArabicErrorMessage(error)}</p>
    </div>
  )

  return (
    <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        📜 سجل المشاهدة
      </h3>
      {history && history.length > 0 ? (
        <div className="space-y-2">
          {history.slice(0, 5).map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
              <img 
                src={item.poster_path || '/default-poster.jpg'} 
                alt={item.title} 
                className="w-12 h-16 object-cover rounded"
                onError={(e) => e.currentTarget.src = '/default-poster.jpg'}
              />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                <p className="text-xs text-zinc-400">
                  تمت المشاهدة في {new Date(item.watched_at).toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-400 text-sm">لا يوجد سجل مشاهدة</p>
      )}
    </div>
  )
}

// Recommendations Section Component
const RecommendationsSection = () => {
  const { user } = useAuth()
  const { data: recommendations, isLoading, error } = useRQ({
    queryKey: ['recommendations', user?.id],
    queryFn: () => getRecommendations(user!.id),
    enabled: !!user
  })

  if (isLoading) return (
    <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
      <div className="h-6 w-24 bg-zinc-800 rounded mb-4"></div>
      <SkeletonGrid count={3} />
    </div>
  )

  if (error) return (
    <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
      <h3 className="text-lg font-semibold text-red-400 mb-2">التوصيات</h3>
      <p className="text-red-300 text-sm">{getArabicErrorMessage(error)}</p>
    </div>
  )

  return (
    <div className="rounded-lg border border-zinc-800 p-4 bg-zinc-900/50 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        💡 توصيات مخصصة
      </h3>
      {recommendations && recommendations.length > 0 ? (
        <div className="space-y-2">
          {recommendations.slice(0, 5).map((item: RecommendationItem) => (
            <div key={item.id} className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg">
              <img 
                src={item.poster_path || '/default-poster.jpg'} 
                alt={item.title} 
                className="w-12 h-16 object-cover rounded"
                onError={(e) => e.currentTarget.src = '/default-poster.jpg'}
              />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-white">{item.title}</h4>
                <p className="text-xs text-zinc-400">{(item as any).category || 'غير مصنف'}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-400 text-xs">⭐</span>
                  <span className="text-xs text-zinc-300">{(item as any).rating?.toFixed(1)}</span>
                </div>
              </div>
              <Link
                to={`/watch/${(item as any).type}/${item.id}`}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition-colors"
              >
                مشاهدة
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-400 text-sm">لا توجد توصيات حالياً</p>
      )}
    </div>
  )
}