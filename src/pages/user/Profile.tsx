import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { updateProfile, uploadAvatar, supabase, getWatchlist, getContinueWatching, getHistory, removeFromWatchlist, getUserAchievements, type UserAchievement, getFollowers, getFollowing, type Profile as ProfileType, followUser, unfollowUser, getActivityFeed, removeFollower } from '../../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useQuery as useRQ, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { getRecommendations, RecommendationItem } from '../../services/recommendations'
import { Helmet } from 'react-helmet-async'
import { SkeletonGrid, SkeletonProfile } from '../../components/common/Skeletons'
import { getArabicErrorMessage, getArabicSuccessMessage } from '../../lib/arabic-messages'
import { errorLogger } from '../../services/errorLogging'
import { motion, AnimatePresence } from 'framer-motion'

import { QRCodeSVG } from 'qrcode.react'
import { Shield, Smartphone, Key, AlertCircle, CheckCircle2, Trash2, Award, Star, Zap, Film, Share2, Moon, Trophy, Activity, Clock, Heart, PlayCircle, Twitter, Instagram, Facebook, Globe, Users, Settings, User as UserIcon, LogOut, Sparkles, UserPlus, UserMinus, ExternalLink } from 'lucide-react'
import { PlaylistManager } from '../../components/features/social/PlaylistManager'
import { FollowList } from '../../components/features/social/FollowList'
import { UserListsTab } from '../../components/features/social/UserListsTab'
import { Challenges } from '../../components/features/social/Challenges'
import { Leaderboard } from '../../components/features/social/Leaderboard'
import { ActivityItem } from '../../components/features/social/ActivityItem'
import { NotificationCenter } from '../../components/features/user/NotificationCenter'
import { getProfile } from '../../lib/supabase'
import clsx from 'clsx'

const ICON_MAP: Record<string, any> = {
  Award, Star, Zap, Film, Share2, Moon, Trophy, Users: Shield, Activity, Clock, Heart, PlayCircle
}

// StatCard Component for Dashboard
const StatCard = ({ icon: Icon, label, value, unit, color }: any) => (
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
      <div className="mx-auto max-w-5xl space-y-4 p-4">
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
  const navigate = useNavigate()
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
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { 
    data: followersData, 
    isLoading: loadingFollowers, 
    refetch: refetchFollowers,
    fetchNextPage: fetchNextFollowers,
    hasNextPage: hasMoreFollowers,
    isFetchingNextPage: isFetchingMoreFollowers
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
    hasNextPage: hasMoreFollowing,
    isFetchingNextPage: isFetchingMoreFollowing
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
    isLoading: loadingActivity,
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
  const [enrollChallenge, setEnrollChallenge] = useState<any>(null)

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

  const { data: continueWatching } = useRQ({
    queryKey: ['continue-watching', user?.id],
    queryFn: () => getContinueWatching(user!.id),
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
      toast.success(getArabicSuccessMessage('Profile updated'))
      await refreshProfile()
    } catch (e: any) {
      const errorMsg = getArabicErrorMessage(e)
      setMsg(`فشل حفظ البيانات: ${errorMsg}`)
      setError(errorMsg)
      toast.error(`فشل حفظ البيانات: ${errorMsg}`)
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
      <div className="mx-auto max-w-5xl space-y-8 p-4 pt-24 pb-20">
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
                <label className="absolute bottom-1 right-1 bg-lumen-gold text-black p-2 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl">
                  <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
                  <Settings size={16} className="animate-spin-slow" />
                </label>
              </div>
            </div>

            <div className="flex-1 text-center md:text-right">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                <h2 className="text-4xl font-black text-white tracking-tighter">{username || 'مستخدم'}</h2>
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
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
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
                      value={achievements?.reduce((acc, ua) => acc + (ua.achievement?.points || 0), 0) || 0} 
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
                  </div>
                  <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-md">
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
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
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
                  <PlaylistManager />
                </div>

                {/* Content Sections */}
                <div className="grid md:grid-cols-2 gap-6">
                  <WatchlistSection />
                  <ContinueWatchingSection />
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <HistorySection />
                  <AchievementsSection achievements={achievements} loading={loadingAchievements} />
                </div>
              </>
            )}

            {activeTab === 'social' && (
              <div className="grid md:grid-cols-3 gap-8">
                {/* Profile Edit & Social Lists */}
                <div className="md:col-span-2 space-y-8">
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

                        <div className="space-y-6">
                          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1 border-b border-white/5 pb-4">حسابات التواصل</h4>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="relative">
                              <Twitter size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#1DA1F2]" />
                              <input
                                value={twitter}
                                onChange={(e) => setTwitter(e.target.value)}
                                className="w-full h-14 pr-14 pl-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-lumen-gold transition-all font-bold text-sm"
                                placeholder="Twitter"
                              />
                            </div>
                            <div className="relative">
                              <Instagram size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#E4405F]" />
                              <input
                                value={instagram}
                                onChange={(e) => setInstagram(e.target.value)}
                                className="w-full h-14 pr-14 pl-6 rounded-2xl bg-white/[0.03] border border-white/10 text-white focus:outline-none focus:border-lumen-gold transition-all font-bold text-sm"
                                placeholder="Instagram"
                              />
                            </div>
                            <div className="relative">
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
                <div className="space-y-6">
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
                      <p className="text-[10px] font-bold uppercase text-zinc-500">قريباً...</p>
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
                className="max-w-4xl mx-auto"
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
              <div className="max-w-3xl mx-auto space-y-8">
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
              <div className="max-w-4xl mx-auto space-y-8">
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
                loading="lazy"
                decoding="async"
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
                loading="lazy"
                decoding="async"
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
                loading="lazy"
                decoding="async"
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
                loading="lazy"
                decoding="async"
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