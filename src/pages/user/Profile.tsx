import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { updateProfile, uploadAvatar, supabase, getWatchlist, getContinueWatching, getHistory, removeFromWatchlist, getUserAchievements, getFollowers, getFollowing, followUser, unfollowUser, getActivityFeed, removeFollower } from '../../lib/supabase'
import { fetchBatchContent, ContentDetails } from '../../services/contentAPI'
import { WatchlistCard } from '../../components/features/user/WatchlistCard'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from '../../lib/toast-manager'
import { useQueryClient, useInfiniteQuery, useQuery as useRQ } from '@tanstack/react-query'
import { getRecommendations, RecommendationItem } from '../../services/recommendations'
import { Helmet } from 'react-helmet-async'
import { SkeletonGrid, SkeletonProfile } from '../../components/common/Skeletons'
import { getArabicErrorMessage, getArabicSuccessMessage } from '../../lib/arabic-messages'
import { errorLogger } from '../../services/errorLogging'
import { motion, AnimatePresence } from 'framer-motion'

import { QRCodeSVG } from 'qrcode.react'
import { Shield, Smartphone, AlertCircle, CheckCircle2, Award, Star, Zap, Film, Trophy, Activity, Clock, Heart, Twitter, Instagram, Facebook, Globe, Users, User as UserIcon, Settings, LogOut, Sparkles, Trash2, Share2, Moon, PlayCircle, ThumbsUp, Eye, CheckCircle } from 'lucide-react'
import { FollowList } from '../../components/features/social/FollowList'
import { UserListsTab } from '../../components/features/social/UserListsTab'
import { Challenges } from '../../components/features/social/Challenges'
import { Leaderboard } from '../../components/features/social/Leaderboard'
import { ActivityItem } from '../../components/features/social/ActivityItem'
import { NotificationCenter } from '../../components/features/user/NotificationCenter'
import clsx from 'clsx'

const ICON_MAP: Record<string, any> = {
  Award, Star, Zap, Film, Share2, Moon, Trophy, Users: Shield, Activity, Clock, Heart, PlayCircle
}

const NEUTRAL_AVATARS = [
  { id: 'cam1', url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&h=200&fit=crop', label: 'كاميرا سينمائية' },
  { id: 'reel1', url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&h=200&fit=crop', label: 'بكرة فيلم' },
  { id: 'pop1', url: 'https://images.unsplash.com/photo-1512149177596-f817c7ef5d4c?w=200&h=200&fit=crop', label: 'فشار' },
  { id: 'clap1', url: 'https://images.unsplash.com/photo-1515634928627-2a4e0dae26fd?w=200&h=200&fit=crop', label: 'كلاكيت' },
  { id: 'seat1', url: 'https://images.unsplash.com/photo-1517604401807-930f782c5897?w=200&h=200&fit=crop', label: 'مقعد سينما' },
]

// StatCard Component for Dashboard
const StatCard = ({ icon: Icon, label, value, unit, color }: { icon: React.ComponentType<{ size?: number }>; label: string; value: number; unit: string; color: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-4 backdrop-blur-sm hover:bg-white/[0.05] transition-all group"
  >
    <div className="flex items-center gap-3">
      <div className={clsx("p-2 rounded-xl bg-current/10", color)}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-black text-white">{value}</span>
          <span className="text-[10px] text-zinc-400 font-medium">{unit}</span>
        </div>
      </div>
    </div>
    <div className={clsx("absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity", color)}>
      <Icon size={64} />
    </div>
  </motion.div>
)

type Role = 'user' | 'admin' | 'supervisor'

// Error Boundary Component for Profile Page
const ProfileErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false)

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
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full space-y-4 p-4">
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">حدث خطأ في صفحة الملف الشخصي</h2>
          <p className="text-zinc-300 mb-4">نأسف للإزعاج، حدث خطأ غير متوقع</p>
          <button
            onClick={() => {
              setHasError(false)
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

export const Profile = () => {
  const { user, profile: authProfile, loading, refreshProfile, error: authError, signOut } = useAuth()
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('user')
  const [bio, setBio] = useState('')
  const [website, setWebsite] = useState('')
  const [twitter, setTwitter] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'social' | 'security' | 'admin' | 'leaderboard'>('dashboard')
  const [socialSubTab, setSocialSubTab] = useState<'edit' | 'followers' | 'following' | 'lists' | 'challenges'>('edit')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const {
    data: followersData,
    isLoading: loadingFollowers,
    refetch: refetchFollowers,
    fetchNextPage: fetchNextFollowers,
    hasNextPage: hasMoreFollowers
  } = useInfiniteQuery({
    queryKey: ['followers', user?.id],
    queryFn: ({ pageParam = 0 }) => getFollowers(user!.id, 20, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => lastPage.length === 20 ? allPages.length * 20 : undefined,
    enabled: !!user
  })

  const {
    data: followingData,
    isLoading: loadingFollowing,
    refetch: refetchFollowing,
    fetchNextPage: fetchNextFollowing,
    hasNextPage: hasMoreFollowing
  } = useInfiniteQuery({
    queryKey: ['following', user?.id],
    queryFn: ({ pageParam = 0 }) => getFollowing(user!.id, 20, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => lastPage.length === 20 ? allPages.length * 20 : undefined,
    enabled: !!user
  })

  const followers = followersData?.pages.flat() || []
  const following = followingData?.pages.flat() || []

  const handleFollowAction = async (targetId: string, isFollowing: boolean) => {
    if (!user) return
    try {
      if (isFollowing) {
        await unfollowUser(user.id, targetId)
        toast.success('تم إلغاء المتابعة')
      } else {
        await followUser(user.id, targetId)
        toast.success('تمت المتابعة')
      }
      refetchFollowing()
      refetchFollowers()
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] })
    } catch (e: any) {
      toast.error('حدث خطأ أثناء تنفيذ العملية')
    }
  }

  const handleRemoveFollower = async (followerId: string) => {
    if (!user) return
    try {
      await removeFollower(user.id, followerId)
      toast.success('تم إزالة المتابع')
      refetchFollowers()
    } catch (e: any) {
      toast.error('حدث خطأ أثناء إزالة المتابع')
    }
  }

  const {
    data: activityFeedData,
    fetchNextPage: fetchNextActivity,
    hasNextPage: hasMoreActivity,
    isFetchingNextPage: isFetchingMoreActivity
  } = useInfiniteQuery({
    queryKey: ['activity-feed', user?.id],
    queryFn: ({ pageParam = 0 }) => getActivityFeed(user!.id, 20, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => lastPage.length === 20 ? allPages.length * 20 : undefined,
    enabled: !!user
  })

  const activityFeed = activityFeedData?.pages.flat() || []

  const [targetId, setTargetId] = useState('')
  const [targetUsername, setTargetUsername] = useState('')
  const [adminMsg, setAdminMsg] = useState<string | null>(null)
  const [mfaFactors, setMfaFactors] = useState<any[]>([])
  const [showMfaEnroll, setShowMfaEnroll] = useState(false)
  const [enrollData, setEnrollData] = useState<any>(null)
  const [enrollCode, setEnrollCode] = useState('')

  const isAdmin = role === 'admin'
  const isSupervisor = role === 'supervisor'
  const canAccessDashboard = isAdmin || isSupervisor

  const fetchMfaFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (!error && data) {
      setMfaFactors(data.all)
    }
  }

  useEffect(() => {
    if (user) {
      fetchMfaFactors()
    }
  }, [user])

  const onEnrollMfa = async () => {
    setBusy(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Cinema Online',
        friendlyName: username || 'User'
      })
      if (error) throw error
      setEnrollData(data)
      setShowMfaEnroll(true)
    } catch (e: any) {
      setError(e.message || 'فشل البدء في تفعيل المصادقة الثنائية')
    } finally {
      setBusy(false)
    }
  }

  const onVerifyEnroll = async () => {
    if (!enrollData || !enrollCode) return
    setBusy(true)
    setError(null)
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollData.id
      })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: challenge.id,
        code: enrollCode
      })

      if (verifyError) throw verifyError

      toast.success('تم تفعيل المصادقة الثنائية بنجاح')
      setShowMfaEnroll(false)
      setEnrollData(null)
      setEnrollCode('')
      await fetchMfaFactors()
    } catch (e: any) {
      setError(e.message || 'رمز التحقق غير صحيح')
    } finally {
      setBusy(false)
    }
  }

  const onUnenrollMfa = async (factorId: string) => {
    if (!confirm('هل أنت متأكد من تعطيل المصادقة الثنائية؟ هذا قد يقلل من أمان حسابك.')) return
    setBusy(true)
    setError(null)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error
      toast.success('تم تعطيل المصادقة الثنائية')
      await fetchMfaFactors()
    } catch (e: any) {
      setError(e.message || 'فشل تعطيل المصادقة الثنائية')
    } finally {
      setBusy(false)
    }
  }
  const { data: achievements, isLoading: loadingAchievements } = useRQ({
    queryKey: ['achievements', user?.id],
    queryFn: () => getUserAchievements(user!.id),
    enabled: !!user
  })

  const { data: watchlist } = useRQ({
    queryKey: ['watchlist', user?.id],
    queryFn: () => getWatchlist(user!.id),
    enabled: !!user
  })

  const { data: history } = useRQ({
    queryKey: ['history', user?.id],
    queryFn: () => getHistory(user!.id),
    enabled: !!user
  })

  const { data: recommendations } = useRQ({
    queryKey: ['recommendations', user?.id],
    queryFn: () => getRecommendations(user!.id),
    enabled: !!user
  })

  const { data: reviewStats } = useRQ({
    queryKey: ['reviewStats', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/user/${user!.id}/stats`)
      if (!response.ok) throw new Error('Failed to fetch review stats')
      return response.json()
    },
    enabled: !!user
  })

  // Force refresh profile on mount to ensure role is up to date
  // REMOVED: Managed by useInitAuth globally to prevent duplicate fetches

  useEffect(() => {
    if (authProfile) {
      setUsername(authProfile.username || '')
      setAvatar(authProfile.avatar_url || null)
      setRole(authProfile.role as Role)
      setBio(authProfile.bio || '')
      setWebsite(authProfile.website || '')
      setTwitter(authProfile.twitter || '')
      setInstagram(authProfile.instagram || '')
      setFacebook(authProfile.facebook || '')
      setIsPublic(authProfile.is_public ?? true)
      setError(null)
    }
  }, [authProfile])

  // REMOVED: Redundant fetch logic that causes loops and duplicate toasts

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
      <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full space-y-4 p-4 pt-24">
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

  const onSave = async () => {
    if (!user) return
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      await updateProfile(user.id, {
        username,
        bio,
        website,
        twitter,
        instagram,
        facebook,
        is_public: isPublic
      })
      setMsg(getArabicSuccessMessage('Profile updated'))
      toast.success(getArabicSuccessMessage('Profile updated'), { id: 'profile-update' })
      await refreshProfile()
    } catch (e: any) {
      const errorMsg = getArabicErrorMessage(e)
      setMsg(`فشل حفظ البيانات: ${errorMsg}`)
      setError(errorMsg)
      toast.error(`فشل حفظ البيانات: ${errorMsg}`, { id: 'profile-update-error' })
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
      toast.success(getArabicSuccessMessage('Avatar updated'), { id: 'avatar-update' })
      // Refresh profile to update avatar in auth context
      await refreshProfile()
    } catch (e: any) {
      const errorMsg = getArabicErrorMessage(e)
      setMsg(`فشل رفع الصورة: ${errorMsg}`)
      setError(errorMsg)
      toast.error(`فشل رفع الصورة: ${errorMsg}`, { id: 'avatar-update-error' })
    } finally {
      setBusy(false)
    }
  }

  const onSelectNeutralAvatar = async (url: string) => {
    if (!user) return
    setBusy(true)
    setMsg(null)
    setError(null)
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
      if (error) throw error
      setAvatar(url)
      setMsg(getArabicSuccessMessage('Avatar updated'))
      toast.success(getArabicSuccessMessage('Avatar updated'), { id: 'avatar-update' })
      await refreshProfile()
    } catch (e: any) {
      const errorMsg = getArabicErrorMessage(e)
      setMsg(`فشل تحديث الصورة: ${errorMsg}`)
      setError(errorMsg)
      toast.error(`فشل تحديث الصورة: ${errorMsg}`, { id: 'avatar-update-error' })
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
      <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full space-y-8 pt-24 pb-20">
        <Helmet>
          <title>الملف الشخصي - {username || 'مستخدم'}</title>
        </Helmet>

        {/* Profile Header */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-lumen-gold/5 blur-[100px] -mr-32 -mt-32 rounded-full" />

          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-lumen-gold/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-lumen-gold/50 via-white/10 to-transparent">
                <img
                  src={avatar || '/default-avatar.png'}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover border-4 border-[#0f0f0f]"
                  onError={(e) => { e.currentTarget.src = '/default-avatar.png' }}
                />
                {(role === 'admin' || role === 'supervisor') && (
                  <label className="absolute bottom-1 right-1 bg-lumen-gold text-black p-2 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                    <input type="file" accept="image/*" onChange={onUpload} className="hidden" disabled={busy} />
                    <Settings size={16} className={clsx("animate-spin-slow", busy && "opacity-50")} />
                  </label>
                )}
              </div>
            </div>

            <div className="flex-1 text-center md:text-right">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                <div className="flex flex-col gap-2">
                  <h2 className="text-4xl font-black text-white tracking-tighter">{username || 'مستخدم'}</h2>

                  {/* Neutral Avatars Selection */}
                  <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                    {NEUTRAL_AVATARS.map((navatar) => (
                      <button
                        key={navatar.id}
                        onClick={() => onSelectNeutralAvatar(navatar.url)}
                        disabled={busy}
                        className={clsx(
                          "relative w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-110 active:scale-95",
                          avatar === navatar.url ? "border-lumen-gold scale-110 shadow-[0_0_15px_rgba(255,191,0,0.3)]" : "border-white/10 grayscale hover:grayscale-0"
                        )}
                        title={navatar.label}
                      >
                        <img src={navatar.url} alt={navatar.label} className="w-full h-full object-cover" loading="lazy" />
                        {avatar === navatar.url && (
                          <div className="absolute inset-0 bg-lumen-gold/20 flex items-center justify-center">
                            <CheckCircle2 size={12} className="text-lumen-gold" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <span className={clsx(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  role === 'admin' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                    role === 'supervisor' ? "bg-lumen-gold/10 text-lumen-gold border-lumen-gold/20" :
                      "bg-white/5 text-zinc-400 border-white/10"
                )}>
                  {role === 'admin' ? 'Administrator' : role === 'supervisor' ? 'Supervisor' : 'Member'}
                </span>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-6 text-zinc-400">
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-2xl font-black text-white">{followers?.length || 0}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">متابع</span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-2xl font-black text-white">{following?.length || 0}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">يتابع</span>
                </div>
                <div className="flex flex-col items-center md:items-start">
                  <span className="text-2xl font-black text-white">{achievements?.length || 0}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">إنجاز</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 border border-white/10 hover:border-red-500/20 transition-all font-bold text-sm"
              >
                <LogOut size={18} />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1.5 rounded-[2rem] bg-white/[0.03] border border-white/5 backdrop-blur-md sticky top-24 z-30 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'الرئيسية', icon: Activity },
            { id: 'social', label: 'التواصل', icon: Users },
            { id: 'leaderboard', label: 'المتصدرين', icon: Trophy },
            { id: 'security', label: 'الأمان', icon: Shield },
            ...(canAccessDashboard ? [{ id: 'admin', label: 'الإدارة', icon: Zap }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-sm font-black transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-lumen-gold text-black shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                  : "text-zinc-500 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "circOut" }}
            className="space-y-8"
          >
            {activeTab === 'dashboard' && (
              <>
                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6">
                  <div className="md:col-span-2 lg:col-span-4 grid grid-cols-2 gap-4">
                    <StatCard
                      icon={Film}
                      label="تمت مشاهدته"
                      value={history?.length || 0}
                      unit="عنصر"
                      color="text-blue-400"
                    />
                    <StatCard
                      icon={Clock}
                      label="وقت المشاهدة"
                      value={Math.floor((history?.length || 0) * 1.5)}
                      unit="ساعة"
                      color="text-purple-400"
                    />
                    <StatCard
                      icon={Trophy}
                      label="نقاط الخبرة"
                      value={achievements?.reduce((acc: number, ua: any) => acc + (ua.achievement?.points || 0), 0) || 0}
                      unit="نقطة"
                      color="text-lumen-gold"
                    />
                    <StatCard
                      icon={Heart}
                      label="في القائمة"
                      value={watchlist?.length || 0}
                      unit="عنصر"
                      color="text-red-400"
                    />
                    <StatCard
                      icon={Star}
                      label="المراجعات"
                      value={reviewStats?.total_reviews || 0}
                      unit="مراجعة"
                      color="text-yellow-400"
                    />
                    <StatCard
                      icon={Sparkles}
                      label="تصويتات مفيدة"
                      value={reviewStats?.total_helpful_votes || 0}
                      unit="تصويت"
                      color="text-green-400"
                    />
                    <StatCard
                      icon={Star}
                      label="متوسط التقييم"
                      value={reviewStats?.average_rating || 0}
                      unit="/10"
                      color="text-orange-400"
                    />
                  </div>
                  <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md lg:col-span-2">
                    <NotificationCenter />
                  </div>
                </div>

                {/* AI Recommendations */}
                <div className="rounded-[2.5rem] border border-lumen-gold/20 bg-lumen-gold/[0.02] p-8 backdrop-blur-md relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-lumen-gold/10 blur-3xl -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700" />
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-lumen-gold text-black shadow-lg shadow-lumen-gold/20">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white tracking-tighter uppercase">توصيات الذكاء الاصطناعي</h3>
                        <p className="text-[10px] text-lumen-gold/60 font-black uppercase tracking-[0.2em]">AI-Powered Intelligence</p>
                      </div>
                    </div>
                  </div>
                  <RecommendationsRow recommendations={recommendations} />
                </div>

                {/* Social Feed & Lists */}
                <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-8">
                  <div className="md:col-span-2 lg:col-span-4 space-y-8">
                    {/* Activity Feed */}
                    <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-8 backdrop-blur-md">
                      <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 tracking-tighter uppercase">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                          <Activity size={20} />
                        </div>
                        شريط النشاطات
                      </h3>

                      <div className="space-y-6">
                        {activityFeed && activityFeed.length > 0 ? (
                          <>
                            {activityFeed.map((activity) => (
                              <ActivityItem
                                key={activity.id}
                                activity={activity}
                                currentUserId={user?.id}
                              />
                            ))}
                            {hasMoreActivity && (
                              <button
                                onClick={() => fetchNextActivity()}
                                disabled={isFetchingMoreActivity}
                                className="w-full py-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-lumen-gold disabled:opacity-50 mt-4"
                              >
                                {isFetchingMoreActivity ? (
                                  <div className="w-4 h-4 border-2 border-lumen-gold border-t-transparent rounded-full animate-spin mx-auto" />
                                ) : (
                                  'تحميل المزيد من النشاطات'
                                )}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-20 rounded-[2.5rem] border-2 border-dashed border-white/5">
                            <Activity size={48} className="mx-auto text-zinc-800 mb-4" />
                            <p className="text-zinc-500 text-sm font-bold">لا توجد نشاطات لعرضها حالياً</p>
                            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">Your recent activity will appear here</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    {/* Followers List */}
                    <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-6 backdrop-blur-md">
                      <h3 className="text-sm font-black text-white mb-6 flex items-center gap-3 tracking-widest uppercase">
                        <Users size={16} className="text-lumen-gold" />
                        المتابعون ({followers?.length || 0})
                      </h3>

                      <div className="space-y-4">
                        {followers && followers.length > 0 ? (
                          followers.slice(0, 5).map((follower: ProfileType) => (
                            <Link
                              key={follower.id}
                              to={`/user/${follower.username}`}
                              className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-colors group"
                            >
                              <img
                                src={follower.avatar_url || '/default-avatar.png'}
                                alt={follower.username}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white/10 group-hover:border-lumen-gold/50 transition-colors"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{follower.username}</p>
                                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">Member</p>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <p className="text-center py-8 text-zinc-600 text-[10px] font-black uppercase tracking-widest">لا يوجد متابعون</p>
                        )}
                        {followers && followers.length > 5 && (
                          <button
                            onClick={() => {
                              setActiveTab('social')
                              setSocialSubTab('followers')
                            }}
                            className="w-full py-3 rounded-xl border border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:bg-white/5 transition-all"
                          >
                            عرض الكل
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Following List */}
                    <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-6 backdrop-blur-md">
                      <h3 className="text-sm font-black text-white mb-6 flex items-center gap-3 tracking-widest uppercase">
                        <Heart size={16} className="text-red-500" />
                        يتابع ({following?.length || 0})
                      </h3>

                      <div className="space-y-4">
                        {following && following.length > 0 ? (
                          following.slice(0, 5).map((followed: ProfileType) => (
                            <Link
                              key={followed.id}
                              to={`/user/${followed.username}`}
                              className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-colors group"
                            >
                              <img
                                src={followed.avatar_url || '/default-avatar.png'}
                                alt={followed.username}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white/10 group-hover:border-red-500/50 transition-colors"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{followed.username}</p>
                                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">Member</p>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <p className="text-center py-8 text-zinc-600 text-[10px] font-black uppercase tracking-widest">لا تتابع أحداً</p>
                        )}
                        {following && following.length > 5 && (
                          <button
                            onClick={() => {
                              setActiveTab('social')
                              setSocialSubTab('following')
                            }}
                            className="w-full py-3 rounded-xl border border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:bg-white/5 transition-all"
                          >
                            عرض الكل
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Edit Form */}
                <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-8 backdrop-blur-md">
                  <h3 className="text-xl font-black text-white mb-6">تعديل الملف الشخصي</h3>
                  {/* Playlist feature removed - focusing on core movie/TV content */}
                </div>

                {/* Content Sections */}
                <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6">
                  <div className="lg:col-span-3">
                    <WatchlistSection />
                  </div>
                  <div className="lg:col-span-3">
                    <ContinueWatchingSection />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-6">
                  <div className="lg:col-span-3">
                    <HistorySection />
                  </div>
                  <div className="lg:col-span-3">
                    <AchievementsSection achievements={achievements} loading={loadingAchievements} />
                  </div>
                </div>

                {/* User Reviews Section */}
                <UserReviewsSection userId={user!.id} />
              </>
            )}

            {activeTab === 'social' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-8">
                {/* Profile Edit & Social Lists */}
                <div className="md:col-span-2 lg:col-span-4 space-y-8">
                  {/* Social Sub-Tabs */}
                  <div className="flex p-1 rounded-2xl bg-white/[0.03] border border-white/5 w-fit">
                    {[
                      { id: 'edit', label: 'تعديل الحساب', icon: UserIcon },
                      { id: 'followers', label: 'المتابعون', icon: Users },
                      { id: 'following', label: 'يتابع', icon: Heart },
                      { id: 'lists', label: 'قوائمي', icon: Film },
                      { id: 'challenges', label: 'التحديات', icon: Zap }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSocialSubTab(tab.id as any)}
                        className={clsx(
                          "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all",
                          socialSubTab === tab.id
                            ? "bg-white/10 text-white shadow-lg"
                            : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        <tab.icon size={14} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {socialSubTab === 'edit' && (
                      <motion.div
                        key="edit-form"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl space-y-8"
                      >
                        <div className="flex items-center gap-4 mb-2">
                          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            <UserIcon size={20} />
                          </div>
                          <h3 className="text-2xl font-black text-white tracking-tighter">تعديل الملف الشخصي</h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">اسم المستخدم</label>
                            <input
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-lumen-gold focus:ring-1 focus:ring-lumen-gold/20 transition-all font-bold"
                              placeholder="Username"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">الموقع الإلكتروني</label>
                            <div className="relative">
                              <Globe size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500" />
                              <input
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="w-full h-14 pr-14 pl-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-lumen-gold transition-all font-bold"
                                placeholder="https://example.com"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">السيرة الذاتية (Bio)</label>
                          <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full min-h-[120px] p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-lumen-gold transition-all font-medium resize-none"
                            placeholder="اخبرنا عن نفسك..."
                          />
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">اختر صورة رمزية محايدة</label>
                          <div className="grid grid-cols-5 gap-4">
                            {NEUTRAL_AVATARS.map((nav) => (
                              <button
                                key={nav.id}
                                onClick={() => onSelectNeutralAvatar(nav.url)}
                                className={clsx(
                                  "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 group",
                                  avatar === nav.url ? "border-lumen-gold shadow-[0_0_20px_rgba(245,197,24,0.3)]" : "border-white/5 grayscale hover:grayscale-0 hover:border-white/20"
                                )}
                                title={nav.label}
                              >
                                <img src={nav.url} alt={nav.label} className="w-full h-full object-cover" loading="lazy" />
                                {avatar === nav.url && (
                                  <div className="absolute inset-0 bg-lumen-gold/20 flex items-center justify-center">
                                    <CheckCircle2 size={24} className="text-lumen-gold" />
                                  </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[8px] text-white text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  {nav.label}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-6">
                          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1 border-b border-white/5 pb-4">حسابات التواصل</h4>
                          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="relative lg:col-span-2">
                              <Twitter size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#1DA1F2]" />
                              <input
                                value={twitter}
                                onChange={(e) => setTwitter(e.target.value)}
                                className="w-full h-14 pr-14 pl-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-lumen-gold transition-all font-bold text-sm"
                                placeholder="Twitter"
                              />
                            </div>
                            <div className="relative lg:col-span-2">
                              <Instagram size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#E4405F]" />
                              <input
                                value={instagram}
                                onChange={(e) => setInstagram(e.target.value)}
                                className="w-full h-14 pr-14 pl-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-lumen-gold transition-all font-bold text-sm"
                                placeholder="Instagram"
                              />
                            </div>
                            <div className="relative lg:col-span-2">
                              <Facebook size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#1877F2]" />
                              <input
                                value={facebook}
                                onChange={(e) => setFacebook(e.target.value)}
                                className="w-full h-14 pr-14 pl-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-lumen-gold transition-all font-bold text-sm"
                                placeholder="Facebook"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                              <Globe size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-white">ملف شخصي عام</p>
                              <p className="text-[10px] text-zinc-500 uppercase font-black">Visibility Status</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsPublic(!isPublic)}
                            className={clsx(
                              "w-14 h-8 rounded-full relative transition-all duration-500",
                              isPublic ? "bg-lumen-gold" : "bg-zinc-800"
                            )}
                          >
                            <div className={clsx(
                              "absolute top-1 w-6 h-6 rounded-full bg-black transition-all duration-500",
                              isPublic ? "right-7" : "right-1"
                            )} />
                          </button>
                        </div>

                        <div className="flex gap-4 pt-4">
                          <button
                            onClick={onSave}
                            disabled={busy}
                            className="flex-1 h-14 rounded-2xl bg-lumen-gold text-black font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all shadow-[0_0_30px_rgba(212,175,55,0.2)]"
                          >
                            {busy ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {(socialSubTab === 'followers' || socialSubTab === 'following') && (
                      <motion.div
                        key={socialSubTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl"
                      >
                        <div className="flex items-center gap-4 mb-8">
                          <div className={clsx(
                            "p-3 rounded-2xl border",
                            socialSubTab === 'followers' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                          )}>
                            {socialSubTab === 'followers' ? <Users size={20} /> : <Heart size={20} />}
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-white tracking-tighter">
                              {socialSubTab === 'followers' ? 'المتابعون' : 'قائمة المتابعة'}
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                              {socialSubTab === 'followers' ? `لديك ${followers?.length || 0} متابع` : `تتابع ${following?.length || 0} مستخدم`}
                            </p>
                          </div>
                        </div>

                        <FollowList
                          users={socialSubTab === 'followers' ? followers : following}
                          type={socialSubTab === 'followers' ? 'followers' : 'following'}
                          isLoading={socialSubTab === 'followers' ? loadingFollowers : loadingFollowing}
                          onAction={handleFollowAction}
                          onRemove={handleRemoveFollower}
                          currentUserId={user?.id}
                          followingIds={following?.map(f => f.id) || []}
                          hasMore={socialSubTab === 'followers' ? hasMoreFollowers : hasMoreFollowing}
                          onLoadMore={socialSubTab === 'followers' ? fetchNextFollowers : fetchNextFollowing}
                        />
                      </motion.div>
                    )}

                    {socialSubTab === 'lists' && (
                      <motion.div
                        key="user-lists"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl"
                      >
                        <UserListsTab userId={user!.id} />
                      </motion.div>
                    )}

                    {socialSubTab === 'challenges' && (
                      <motion.div
                        key="challenges-sub-tab"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl"
                      >
                        <Challenges userId={user!.id} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sidebar Social Info */}
                <div className="space-y-6 lg:col-span-2">
                  <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Users size={14} className="text-lumen-gold" />
                      المجتمع
                    </h4>

                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
                        <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">المتابعين</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-white group-hover:text-lumen-gold transition-colors">{followers?.length || 0}</span>
                          <Users size={20} className="text-zinc-700 group-hover:text-lumen-gold/30 transition-all" />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all group">
                        <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">يتابع</p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-white group-hover:text-lumen-gold transition-colors">{following?.length || 0}</span>
                          <Users size={20} className="text-zinc-700 group-hover:text-lumen-gold/30 transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                      <Activity size={14} className="text-lumen-gold" />
                      النشاط الأخير
                    </h4>
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                      <Clock size={32} className="text-zinc-700 mb-2" />
                      <p className="text-[10px] font-bold uppercase text-zinc-500">لا توجد بيانات حالياً</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <motion.div
                key="leaderboard-tab"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-[2400px] mx-auto px-4 md:px-12 w-full"
              >
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-4 rounded-3xl bg-lumen-gold text-black shadow-xl shadow-lumen-gold/20">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase">قائمة المتصدرين العالمية</h3>
                    <p className="text-[10px] text-lumen-gold font-black uppercase tracking-[0.3em]">Global Hall of Fame</p>
                  </div>
                </div>
                <Leaderboard limit={50} />
              </motion.div>
            )}

            {activeTab === 'security' && (
              <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full space-y-8">
                <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-2xl bg-lumen-gold/10 text-lumen-gold border border-lumen-gold/20">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tighter">الأمان والحماية</h3>
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Security & Authentication</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-lumen-gold/10">
                          <Smartphone className="text-lumen-gold w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-white font-black mb-1">المصادقة الثنائية (2FA)</h4>
                          <p className="text-zinc-400 text-sm font-medium">أضف طبقة أمان إضافية لحسابك باستخدام تطبيق التحقق.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {mfaFactors.length > 0 ? (
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-widest border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                              <CheckCircle2 size={12} />
                              مفعلة
                            </span>
                            <button
                              onClick={() => onUnenrollMfa(mfaFactors[0].id)}
                              disabled={busy}
                              className="text-red-400 hover:text-red-300 text-sm font-bold transition-colors flex items-center gap-1.5 px-4 py-2 hover:bg-red-500/10 rounded-xl"
                            >
                              <Trash2 size={16} />
                              تعطيل
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={onEnrollMfa}
                            disabled={busy}
                            className="px-8 py-3 rounded-2xl bg-lumen-gold text-black font-black uppercase tracking-widest hover:scale-[1.05] transition-all"
                          >
                            تفعيل الآن
                          </button>
                        )}
                      </div>
                    </div>

                    {/* MFA Enrollment Flow */}
                    <AnimatePresence>
                      {showMfaEnroll && enrollData && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-8 rounded-[2rem] bg-lumen-gold/[0.03] border border-lumen-gold/20 space-y-8">
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                              <div className="space-y-6">
                                <div className="p-6 bg-white rounded-3xl inline-block shadow-2xl shadow-lumen-gold/20">
                                  <QRCodeSVG value={enrollData.totp.qr_code} size={200} />
                                </div>
                                <div className="space-y-3">
                                  <p className="text-[10px] text-lumen-gold/60 uppercase tracking-widest font-black">أو أدخل الرمز يدوياً:</p>
                                  <code className="block p-4 rounded-xl bg-black/40 border border-white/5 text-lumen-gold text-sm font-mono break-all text-center">
                                    {enrollData.totp.secret}
                                  </code>
                                </div>
                              </div>

                              <div className="space-y-6">
                                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-blue-400 text-xs font-medium leading-relaxed">
                                  <AlertCircle size={18} className="inline ml-2 -mt-1" />
                                  قم بمسح رمز الاستجابة السريعة باستخدام تطبيق المصادقة، ثم أدخل الرمز المكون من 6 أرقام للتأكيد.
                                </div>

                                <div className="space-y-3">
                                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">رمز التحقق</label>
                                  <input
                                    type="text"
                                    value={enrollCode}
                                    onChange={(e) => setEnrollCode(e.target.value)}
                                    placeholder="000000"
                                    maxLength={6}
                                    className="w-full h-16 rounded-2xl bg-black/40 border border-white/10 px-4 text-center text-3xl font-black tracking-[0.5em] text-lumen-gold focus:outline-none focus:border-lumen-gold transition-all"
                                  />
                                </div>

                                <div className="flex gap-4">
                                  <button
                                    onClick={onVerifyEnroll}
                                    disabled={busy || enrollCode.length !== 6}
                                    className="flex-1 h-14 rounded-2xl bg-lumen-gold text-black font-black uppercase tracking-widest hover:scale-[1.02] disabled:opacity-50 transition-all"
                                  >
                                    {busy ? 'جاري التحقق...' : 'تأكيد التفعيل'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowMfaEnroll(false)
                                      setEnrollData(null)
                                      setEnrollCode('')
                                    }}
                                    className="flex-1 h-14 rounded-2xl bg-white/5 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admin' && isAdmin && (
              <div className="max-w-[2400px] mx-auto px-4 md:px-12 w-full space-y-8">
                <div className="rounded-[2.5rem] border border-red-500/20 bg-red-500/[0.02] p-8 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />

                  <div className="relative flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/20">
                      <Zap size={20} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tighter uppercase">لوحة التحكم الإدارية</h3>
                      <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">Administrative Control Center</p>
                    </div>
                  </div>

                  <div className="relative space-y-8">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">معرف المستخدم (UUID)</label>
                        <input
                          value={targetId}
                          onChange={(e) => setTargetId(e.target.value)}
                          placeholder="User UUID"
                          className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-red-500 transition-all font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">أو اسم المستخدم</label>
                        <input
                          value={targetUsername}
                          onChange={(e) => setTargetUsername(e.target.value)}
                          placeholder="Username"
                          className="w-full h-14 px-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-red-500 transition-all font-bold"
                        />
                      </div>
                    </div>

                    {adminMsg && (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-zinc-400 text-xs font-medium">
                        {adminMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setRoleForTarget('admin')}
                        className="h-14 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-red-500/20"
                      >
                        تعيين كمدير
                      </button>
                      <button
                        onClick={() => setRoleForTarget('supervisor')}
                        className="h-14 rounded-2xl bg-lumen-gold text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-lumen-gold/20"
                      >
                        تعيين كمشرف
                      </button>
                      <button
                        onClick={() => setRoleForTarget('user')}
                        className="h-14 rounded-2xl bg-white/10 text-white font-black uppercase tracking-widest text-xs hover:bg-white/20 transition-all"
                      >
                        تعيين كمستخدم
                      </button>
                    </div>

                    <div className="pt-8 border-t border-white/5">
                      <Link
                        to="/admin/dashboard"
                        className="flex items-center justify-center gap-3 w-full h-16 rounded-[2rem] bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 text-white font-black uppercase tracking-[0.2em] hover:scale-[1.01] transition-all shadow-2xl group"
                      >
                        <Zap size={20} className="group-hover:animate-pulse" />
                        دخول لوحة الإدارة الكاملة
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ProfileErrorBoundary>
  )
}

// Achievements Section Component
const AchievementsSection = ({ achievements, loading }: { achievements: UserAchievement[] | undefined, loading: boolean }) => {
  return (
    <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-8 backdrop-blur-md">
      <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 tracking-tighter uppercase">
        <div className="p-3 rounded-2xl bg-lumen-gold/10 text-lumen-gold">
          <Award size={20} />
        </div>
        الإنجازات والأوسمة
      </h3>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumen-gold"></div>
        </div>
      ) : achievements && achievements.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {achievements.map((ua) => {
            const achievement = ua.achievement!
            const Icon = ICON_MAP[achievement.icon] || Award
            return (
              <motion.div
                key={achievement.id}
                whileHover={{ scale: 1.02, y: -5 }}
                className="group relative flex flex-col items-center text-center p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-lumen-gold/30 transition-all"
              >
                <div className="mb-4 p-4 rounded-2xl bg-lumen-gold/10 text-lumen-gold group-hover:bg-lumen-gold group-hover:text-black transition-all duration-500 shadow-xl shadow-lumen-gold/5">
                  <Icon size={24} />
                </div>
                <h4 className="text-sm font-black text-white mb-2 tracking-tight">{achievement.title}</h4>
                <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed font-medium uppercase tracking-tighter">{achievement.description}</p>

                <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-lumen-gold/10 text-lumen-gold text-[8px] font-black tracking-widest uppercase">
                  +{achievement.points}
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-20 rounded-[2.5rem] border-2 border-dashed border-white/5">
          <Trophy size={48} className="mx-auto text-zinc-800 mb-4" />
          <p className="text-zinc-500 text-sm font-bold">لم تحصل على أي إنجازات بعد</p>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">Start watching to unlock trophies</p>
        </div>
      )}
    </div>
  )
}

// Recommendations Row Component
const RecommendationsRow = ({ recommendations }: { recommendations: RecommendationItem[] | undefined }) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Sparkles size={32} className="text-zinc-700 mb-3" />
        <p className="text-sm text-zinc-500 italic">ابدأ بمشاهدة بعض المحتوى لنقوم باقتراح أعمال تناسب ذوقك...</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
      {recommendations.slice(0, 8).map((item) => (
        <Link
          key={item.id}
          to={`/watch/${(item as any).media_type || 'movie'}/${item.id}`}
          className="relative min-w-[140px] group"
        >
          <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/5 bg-white/5 mb-2 group-hover:border-primary/50 transition-all">
            <img
              src={item.poster_path || '/default-poster.jpg'}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
              <div className="flex items-center gap-1">
                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-bold text-white">{item.vote_average?.toFixed(1)}</span>
              </div>
            </div>
          </div>
          <h4 className="text-[11px] font-bold text-white truncate group-hover:text-primary transition-colors">
            {item.title || item.name}
          </h4>
        </Link>
      ))}
    </div>
  )
}

// Watchlist Section Component
const WatchlistSection = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Fetch watchlist entries from Supabase (returns external_ids)
  const { data: watchlistEntries, isLoading: loadingEntries, error: entriesError } = useRQ({
    queryKey: ['watchlist', user?.id],
    queryFn: () => getWatchlist(user!.id),
    enabled: !!user
  })

  // Fetch full content details from CockroachDB using batch API
  const { data: contentDetails, isLoading: loadingContent } = useRQ({
    queryKey: ['watchlist-content', watchlistEntries],
    queryFn: async () => {
      if (!watchlistEntries || watchlistEntries.length === 0) return []

      // Map entries to batch API format (using id instead of external_id)
      const items = watchlistEntries.map(entry => ({
        id: entry.external_id,
        content_type: entry.content_type as 'movie' | 'tv'
      }))

      // Call batch API
      return await fetchBatchContent(items)
    },
    enabled: !!watchlistEntries && watchlistEntries.length > 0
  })

  // Combine entries with content details
  const enrichedWatchlist = watchlistEntries?.map((entry, index) => ({
    ...entry,
    content: contentDetails?.[index] || null
  })) || []

  const isLoading = loadingEntries || loadingContent
  const error = entriesError

  const handleRemove = async (external_id: string, content_type: 'movie' | 'tv') => {
    if (!user) return

    try {
      await removeFromWatchlist(user.id, external_id, content_type)
      toast.success('تمت الإزالة من قائمة المتابعة')
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['watchlist', user.id] })
    } catch (err: any) {
      toast.error(getArabicErrorMessage(err as string | Error | null))
    }
  }

  if (isLoading) return (
    <div className="rounded-[2rem] border border-white/5 p-6 bg-white/[0.02] backdrop-blur-md">
      <div className="h-6 w-32 bg-zinc-800 rounded mb-4"></div>
      <SkeletonGrid count={3} />
    </div>
  )

  if (error) return (
    <div className="rounded-[2rem] border border-red-800 bg-red-900/20 p-6">
      <h3 className="text-lg font-bold text-red-400 mb-2">قائمة المتابعة</h3>
      <p className="text-red-300 text-sm">{getArabicErrorMessage(error)}</p>
    </div>
  )

  return (
    <div className="rounded-[2rem] border border-white/5 p-6 bg-white/[0.02] backdrop-blur-md">
      <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 tracking-tighter uppercase">
        <div className="p-2 rounded-xl bg-lumen-gold/10 text-lumen-gold">
          <Heart size={18} />
        </div>
        قائمة المتابعة
        <span className="text-[10px] text-zinc-500 font-medium">({enrichedWatchlist.length})</span>
      </h3>
      {enrichedWatchlist.length > 0 ? (
        <div className="space-y-2">
          {enrichedWatchlist.slice(0, 5).map((item) => (
            <WatchlistCard
              key={`${item.external_id}-${item.content_type}`}
              external_id={item.external_id}
              content_type={item.content_type as 'movie' | 'tv'}
              content={item.content}
              onRemove={() => handleRemove(item.external_id, item.content_type as 'movie' | 'tv')}
              created_at={item.created_at}
            />
          ))}
          {enrichedWatchlist.length > 5 && (
            <Link
              to="/watchlist"
              className="block text-center py-3 rounded-xl border border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:bg-white/5 hover:text-lumen-gold transition-all mt-4"
            >
              عرض الكل ({enrichedWatchlist.length})
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
          <Heart size={48} className="text-zinc-800 mb-4" />
          <p className="text-zinc-500 text-sm font-bold">لا توجد عناصر في قائمة المتابعة</p>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">Your watchlist is empty</p>
        </div>
      )}
    </div>
  )
}

// Continue Watching Section Component
const ContinueWatchingSection = () => {
  const { user } = useAuth()

  // Fetch continue watching entries from Supabase (returns external_ids)
  const { data: continueWatchingEntries, isLoading: loadingEntries, error: entriesError } = useRQ({
    queryKey: ['continue-watching', user?.id],
    queryFn: () => getContinueWatching(user!.id),
    enabled: !!user
  })

  // Fetch full content details from CockroachDB using batch API
  const { data: contentDetails, isLoading: loadingContent } = useRQ({
    queryKey: ['continue-watching-content', continueWatchingEntries],
    queryFn: async () => {
      if (!continueWatchingEntries || continueWatchingEntries.length === 0) return []

      // Map entries to batch API format (using id instead of external_id)
      const items = continueWatchingEntries.map(entry => ({
        id: entry.external_id,
        content_type: entry.content_type as 'movie' | 'tv'
      }))

      // Call batch API
      return await fetchBatchContent(items)
    },
    enabled: !!continueWatchingEntries && continueWatchingEntries.length > 0
  })

  // Combine entries with content details
  const enrichedContinueWatching = continueWatchingEntries?.map((entry, index) => ({
    ...entry,
    content: contentDetails?.[index] || null
  })) || []

  const isLoading = loadingEntries || loadingContent
  const error = entriesError

  if (isLoading) return (
    <div className="rounded-[2rem] border border-white/5 p-6 bg-white/[0.02] backdrop-blur-md">
      <div className="h-6 w-40 bg-zinc-800 rounded mb-4"></div>
      <SkeletonGrid count={3} />
    </div>
  )

  if (error) return (
    <div className="rounded-[2rem] border border-red-800 bg-red-900/20 p-6">
      <h3 className="text-lg font-bold text-red-400 mb-2">متابعة المشاهدة</h3>
      <p className="text-red-300 text-sm">{getArabicErrorMessage(error)}</p>
    </div>
  )

  return (
    <div className="rounded-[2rem] border border-white/5 p-6 bg-white/[0.02] backdrop-blur-md">
      <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 tracking-tighter uppercase">
        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
          <PlayCircle size={18} />
        </div>
        متابعة المشاهدة
        <span className="text-[10px] text-zinc-500 font-medium">({enrichedContinueWatching.length})</span>
      </h3>
      {enrichedContinueWatching.length > 0 ? (
        <div className="space-y-2">
          {enrichedContinueWatching.slice(0, 5).map((item) => {
            const content = item.content
            const title = content?.title || content?.name || 'المحتوى غير متوفر'
            const posterUrl = content?.poster_url || '/default-poster.jpg'
            const slug = content?.slug
            const progressPercent = item.duration_seconds > 0
              ? (item.progress_seconds / item.duration_seconds) * 100
              : 0

            return (
              <div key={`${item.external_id}-${item.content_type}`} className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-all group">
                {content && slug ? (
                  <Link to={`/${item.content_type}/${slug}`} className="flex-shrink-0">
                    <img
                      src={posterUrl}
                      alt={title}
                      className="w-12 h-16 object-cover rounded border border-white/5 group-hover:border-blue-500/30 transition-all"
                      onError={(e) => e.currentTarget.src = '/default-poster.jpg'}
                      loading="lazy"
                      decoding="async"
                    />
                  </Link>
                ) : (
                  <div className="w-12 h-16 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={20} className="text-red-500/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {content && slug ? (
                    <Link to={`/${item.content_type}/${slug}`}>
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                        {title}
                      </h4>
                    </Link>
                  ) : (
                    <h4 className="text-sm font-bold text-red-400 truncate">{title}</h4>
                  )}
                  <div className="w-full bg-zinc-700 rounded-full h-1 mt-1.5">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                    {Math.floor(item.progress_seconds / 60)}:{(item.progress_seconds % 60).toString().padStart(2, '0')} /
                    {Math.floor(item.duration_seconds / 60)}:{(item.duration_seconds % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                {content && slug && (
                  <Link
                    to={`/watch/${item.content_type}/${slug}`}
                    className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[10px] font-black uppercase tracking-wider transition-all opacity-0 group-hover:opacity-100"
                  >
                    استئناف
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
          <PlayCircle size={48} className="text-zinc-800 mb-4" />
          <p className="text-zinc-500 text-sm font-bold">لا توجد عناصر لمتابعة المشاهدة</p>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">No content in progress</p>
        </div>
      )}
    </div>
  )
}

// History Section Component
const HistorySection = () => {
  const { user } = useAuth()

  // Fetch history entries from Supabase (returns external_ids)
  const { data: historyEntries, isLoading: loadingEntries, error: entriesError } = useRQ({
    queryKey: ['history', user?.id],
    queryFn: () => getHistory(user!.id),
    enabled: !!user
  })

  // Fetch full content details from CockroachDB using batch API
  const { data: contentDetails, isLoading: loadingContent } = useRQ({
    queryKey: ['history-content', historyEntries],
    queryFn: async () => {
      if (!historyEntries || historyEntries.length === 0) return []

      // Map entries to batch API format (using id instead of external_id)
      const items = historyEntries.map(entry => ({
        id: entry.external_id,
        content_type: entry.content_type as 'movie' | 'tv'
      }))

      // Call batch API
      return await fetchBatchContent(items)
    },
    enabled: !!historyEntries && historyEntries.length > 0
  })

  // Combine entries with content details
  const enrichedHistory = historyEntries?.map((entry, index) => ({
    ...entry,
    content: contentDetails?.[index] || null
  })) || []

  const isLoading = loadingEntries || loadingContent
  const error = entriesError

  if (isLoading) return (
    <div className="rounded-[2rem] border border-white/5 p-6 bg-white/[0.02] backdrop-blur-md">
      <div className="h-6 w-28 bg-zinc-800 rounded mb-4"></div>
      <SkeletonGrid count={3} />
    </div>
  )

  if (error) return (
    <div className="rounded-[2rem] border border-red-800 bg-red-900/20 p-6">
      <h3 className="text-lg font-bold text-red-400 mb-2">سجل المشاهدة</h3>
      <p className="text-red-300 text-sm">{getArabicErrorMessage(error)}</p>
    </div>
  )

  return (
    <div className="rounded-[2rem] border border-white/5 p-6 bg-white/[0.02] backdrop-blur-md">
      <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3 tracking-tighter uppercase">
        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
          <Clock size={18} />
        </div>
        سجل المشاهدة
        <span className="text-[10px] text-zinc-500 font-medium">({enrichedHistory.length})</span>
      </h3>
      {enrichedHistory.length > 0 ? (
        <div className="space-y-2">
          {enrichedHistory.slice(0, 5).map((item, idx) => {
            const content = item.content
            const title = content?.title || content?.name || 'المحتوى غير متوفر'
            const posterUrl = content?.poster_url || '/default-poster.jpg'
            const slug = content?.slug
            const watchedDate = new Date(item.watched_at).toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })

            return (
              <div key={`${item.external_id}-${item.content_type}-${idx}`} className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-all group">
                {content && slug ? (
                  <Link to={`/${item.content_type}/${slug}`} className="flex-shrink-0">
                    <img
                      src={posterUrl}
                      alt={title}
                      className="w-12 h-16 object-cover rounded border border-white/5 group-hover:border-purple-500/30 transition-all"
                      onError={(e) => e.currentTarget.src = '/default-poster.jpg'}
                      loading="lazy"
                      decoding="async"
                    />
                  </Link>
                ) : (
                  <div className="w-12 h-16 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={20} className="text-red-500/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {content && slug ? (
                    <Link to={`/${item.content_type}/${slug}`}>
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-purple-400 transition-colors">
                        {title}
                      </h4>
                    </Link>
                  ) : (
                    <h4 className="text-sm font-bold text-red-400 truncate">{title}</h4>
                  )}
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">
                    تمت المشاهدة في {watchedDate}
                  </p>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider">
                    {item.content_type === 'movie' ? 'فيلم' : 'مسلسل'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
          <Clock size={48} className="text-zinc-800 mb-4" />
          <p className="text-zinc-500 text-sm font-bold">لا يوجد سجل مشاهدة</p>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">No viewing history</p>
        </div>
      )}
    </div>
  )
}


// User Reviews Section Component
const UserReviewsSection = ({ userId }: { userId: string }) => {
  const [reviews, setReviews] = useState<any[]>([])
  const [contentMap, setContentMap] = useState<Map<string, any>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const limit = 10

  useEffect(() => {
    fetchUserReviews()
  }, [userId, page])

  const fetchUserReviews = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch user's reviews from backend
      const response = await fetch(`/api/reviews?user_id=${userId}&limit=${limit}&offset=${page * limit}&sort=newest`)
      if (!response.ok) throw new Error('Failed to fetch reviews')

      const data = await response.json()
      setReviews(data.reviews || [])
      setHasMore(data.pagination?.hasMore || false)

      // Extract unique external_ids for batch content lookup
      const uniqueItems = new Map<string, { id: string; content_type: 'movie' | 'tv' }>()
      data.reviews?.forEach((review: any) => {
        const key = `${review.external_id}-${review.content_type}`
        if (!uniqueItems.has(key) && (review.content_type === 'movie' || review.content_type === 'tv')) {
          uniqueItems.set(key, {
            id: review.external_id,
            content_type: review.content_type as 'movie' | 'tv'
          })
        }
      })

      // Fetch content details from CockroachDB batch API
      if (uniqueItems.size > 0) {
        const items = Array.from(uniqueItems.values())
        const contentDetails = await fetchBatchContent(items)

        // Build content map
        const newContentMap = new Map()
        items.forEach((item, index) => {
          const key = `${item.id}-${item.content_type}`
          newContentMap.set(key, contentDetails[index])
        })
        setContentMap(newContentMap)
      }

      setLoading(false)
    } catch (err: any) {
      console.error('Error fetching user reviews:', err)
      setError(err.message || 'Failed to load reviews')
      setLoading(false)
    }
  }

  if (loading && page === 0) {
    return (
      <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-8 backdrop-blur-md">
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumen-gold"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-[2.5rem] border border-red-800 bg-red-900/20 p-6">
        <h3 className="text-lg font-bold text-red-400 mb-2">مراجعاتي</h3>
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-8 backdrop-blur-md">
      <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 tracking-tighter uppercase">
        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
          <Star size={20} />
        </div>
        مراجعاتي
        <span className="text-[10px] text-zinc-500 font-medium">({reviews.length})</span>
      </h3>

      {reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => {
            const contentKey = `${review.external_id}-${review.content_type}`
            const content = contentMap.get(contentKey)

            return (
              <div
                key={review.id}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all"
              >
                {/* Content Info */}
                <div className="flex items-start gap-4 mb-4">
                  <Link
                    to={content?.slug ? `/watch/${content.slug}` : '#'}
                    className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border border-white/10 hover:border-lumen-gold transition-colors"
                  >
                    <img
                      src={content?.poster_url || '/default-poster.jpg'}
                      alt={content?.title || content?.name || 'Content Unavailable'}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.src = '/default-poster.jpg' }}
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      to={content?.slug ? `/watch/${content.slug}` : '#'}
                      className="text-lg font-bold text-white hover:text-lumen-gold transition-colors line-clamp-1"
                    >
                      {content?.title || content?.name || 'Content Unavailable'}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                      <span>{review.content_type === 'movie' ? 'فيلم' : review.content_type === 'tv' ? 'مسلسل' : review.content_type}</span>
                      <span>•</span>
                      <span>{new Date(review.created_at).toLocaleDateString('ar-SA')}</span>
                      {review.edit_count > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-600">(معدّلة)</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating */}
                {review.rating && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      {[...Array(10)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < review.rating ? 'text-lumen-gold fill-lumen-gold' : 'text-zinc-700'}
                        />
                      ))}
                      <span className="text-sm font-bold text-lumen-gold">{review.rating}/10</span>
                    </div>
                  </div>
                )}

                {/* Title */}
                {review.title && (
                  <h4 className="text-base font-bold text-white mb-2" dir={review.language === 'ar' ? 'rtl' : 'ltr'}>
                    {review.title}
                  </h4>
                )}

                {/* Review Text */}
                <p
                  className="text-zinc-300 text-sm leading-relaxed line-clamp-3"
                  dir={review.language === 'ar' ? 'rtl' : 'ltr'}
                >
                  {review.review_text}
                </p>

                {/* Footer */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <ThumbsUp size={14} />
                    <span>{review.helpful_count || 0} مفيدة</span>
                  </div>

                  {review.language && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <span>{review.language === 'ar' ? '🇸🇦 عربي' : '🇬🇧 English'}</span>
                    </div>
                  )}

                  {review.contains_spoilers && (
                    <div className="flex items-center gap-1.5 text-xs text-yellow-500">
                      <Eye size={14} />
                      <span>تحتوي على حرق</span>
                    </div>
                  )}

                  {review.is_verified && (
                    <div className="flex items-center gap-1.5 text-xs text-green-500">
                      <CheckCircle size={14} />
                      <span>Verified</span>
                    </div>
                  )}

                  <Link
                    to={`/reviews/${review.id}`}
                    className="mr-auto text-xs font-bold text-lumen-gold hover:text-lumen-gold/80 transition-colors"
                  >
                    عرض المراجعة الكاملة ←
                  </Link>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          {(hasMore || page > 0) && (
            <div className="flex items-center justify-center gap-4 pt-4">
              {page > 0 && (
                <button
                  onClick={() => setPage(page - 1)}
                  className="px-6 py-3 rounded-xl bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-all"
                >
                  السابق
                </button>
              )}
              {hasMore && (
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-lumen-gold text-black font-bold text-sm hover:scale-105 disabled:opacity-50 transition-all"
                >
                  {loading ? 'جاري التحميل...' : 'التالي'}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 rounded-[2.5rem] border-2 border-dashed border-white/5">
          <Star size={48} className="mx-auto text-zinc-800 mb-4" />
          <p className="text-zinc-500 text-sm font-bold">لم تكتب أي مراجعات بعد</p>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">Start reviewing content you've watched</p>
        </div>
      )}
    </div>
  )
}
