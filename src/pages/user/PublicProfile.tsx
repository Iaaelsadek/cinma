import { useParams, Navigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProfileByUsername, getFollowers, getFollowing, getUserAchievements, getActivityFeed, followUser, unfollowUser, isFollowing } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { SkeletonProfile } from '../../components/common/Skeletons'
import { Users, Heart, Award, Activity, Star, PlayCircle, Globe, Twitter, Instagram, Facebook, UserPlus, UserMinus, Shield } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'
import { toast } from 'sonner'

const ICON_MAP: Record<string, any> = {
  Award, Star, Activity, PlayCircle, Heart, Users
}

export const PublicProfile = () => {
  const { username } = useParams<{ username: string }>()
  const { user: currentUser } = useAuth()
  const [busy, setBusy] = useState(false)

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => getProfileByUsername(username!),
    enabled: !!username
  })

  const { data: followers, refetch: refetchFollowers } = useQuery({
    queryKey: ['followers', profile?.id],
    queryFn: () => getFollowers(profile!.id),
    enabled: !!profile
  })

  const { data: following } = useQuery({
    queryKey: ['following', profile?.id],
    queryFn: () => getFollowing(profile!.id),
    enabled: !!profile
  })

  const { data: achievements } = useQuery({
    queryKey: ['achievements', profile?.id],
    queryFn: () => getUserAchievements(profile!.id),
    enabled: !!profile
  })

  const { data: activityFeed } = useQuery({
    queryKey: ['activity-feed', profile?.id],
    queryFn: () => getActivityFeed(profile!.id),
    enabled: !!profile && profile.is_public
  })

  const { data: followingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['following-status', currentUser?.id, profile?.id],
    queryFn: () => isFollowing(currentUser!.id, profile!.id),
    enabled: !!currentUser && !!profile && currentUser.id !== profile.id
  })

  const handleFollow = async () => {
    if (!currentUser || !profile) return
    setBusy(true)
    try {
      if (followingStatus) {
        await unfollowUser(currentUser.id, profile.id)
        toast.success(`تم إلغاء متابعة ${profile.username}`)
      } else {
        await followUser(currentUser.id, profile.id)
        toast.success(`أنت الآن تتابع ${profile.username}`)
      }
      refetchStatus()
      refetchFollowers()
    } catch (e: any) {
      toast.error('حدث خطأ أثناء تنفيذ العملية')
    } finally {
      setBusy(false)
    }
  }

  if (loadingProfile) return <div className="pt-24 px-4"><SkeletonProfile /></div>
  if (!profile) return <Navigate to="/" replace />

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 pt-24 pb-20">
      <Helmet>
        <title>{profile.username} (@{profile.username}) - Cinema Online</title>
      </Helmet>

      {/* Profile Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lumen-gold/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-lumen-gold/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-lumen-gold/50 via-white/10 to-transparent">
              <img
                src={profile.avatar_url || '/default-avatar.png'}
                alt={profile.username}
                className="w-full h-full rounded-full object-cover border-4 border-[#0f0f0f]"
                onError={(e) => { e.currentTarget.src = '/default-avatar.png' }}
              />
            </div>
          </div>

          <div className="flex-1 text-center md:text-right">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <h2 className="text-4xl font-black text-white tracking-tighter">{profile.username}</h2>
              <span className={clsx(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                profile.role === 'admin' ? "bg-red-500/10 text-red-500 border-red-500/20" : 
                profile.role === 'supervisor' ? "bg-lumen-gold/10 text-lumen-gold border-lumen-gold/20" : 
                "bg-white/5 text-zinc-400 border-white/10"
              )}>
                {profile.role === 'admin' ? 'Administrator' : profile.role === 'supervisor' ? 'Supervisor' : 'Member'}
              </span>
            </div>
            
            {profile.bio && (
              <p className="text-zinc-400 text-sm font-medium mb-6 max-w-lg mx-auto md:mx-0 leading-relaxed">
                {profile.bio}
              </p>
            )}

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

            {/* Social Links */}
            <div className="flex items-center justify-center md:justify-start gap-4 mt-6">
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-colors">
                  <Globe size={18} />
                </a>
              )}
              {profile.twitter && (
                <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-colors">
                  <Twitter size={18} />
                </a>
              )}
              {profile.instagram && (
                <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-colors">
                  <Instagram size={18} />
                </a>
              )}
              {profile.facebook && (
                <a href={`https://facebook.com/${profile.facebook}`} target="_blank" rel="noreferrer" className="p-2 rounded-xl bg-white/5 text-zinc-400 hover:text-white transition-colors">
                  <Facebook size={18} />
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {currentUser && !isOwnProfile && (
              <button 
                onClick={handleFollow}
                disabled={busy}
                className={clsx(
                  "flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl",
                  followingStatus 
                    ? "bg-white/5 text-zinc-400 border border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20" 
                    : "bg-lumen-gold text-black shadow-lumen-gold/20 hover:scale-105 active:scale-95"
                )}
              >
                {busy ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : followingStatus ? (
                  <>
                    <UserMinus size={18} />
                    إلغاء المتابعة
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    متابعة
                  </>
                )}
              </button>
            )}
            {isOwnProfile && (
              <Link 
                to="/profile"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 transition-all font-black text-sm"
              >
                تعديل الملف الشخصي
              </Link>
            )}
          </div>
        </div>
      </div>

      {!profile.is_public && !isOwnProfile ? (
        <div className="text-center py-32 rounded-[2.5rem] border border-white/5 bg-white/[0.01] backdrop-blur-md">
          <Shield size={64} className="mx-auto text-zinc-800 mb-6" />
          <h3 className="text-xl font-black text-white mb-2">هذا الحساب خاص</h3>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">This account is private</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Activity Feed */}
            <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-8 backdrop-blur-md">
              <h3 className="text-xl font-black text-white mb-8 flex items-center gap-4 tracking-tighter uppercase">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                  <Activity size={20} />
                </div>
                آخر النشاطات
              </h3>
              
              <div className="space-y-6">
                {activityFeed && activityFeed.length > 0 ? (
                  activityFeed.map((activity) => (
                    <div key={activity.id} className="flex gap-4 p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                      <div className={clsx(
                        "p-3 h-fit rounded-2xl",
                        activity.type === 'watch' ? "bg-blue-500/10 text-blue-500" :
                        activity.type === 'review' ? "bg-lumen-gold/10 text-lumen-gold" :
                        activity.type === 'achievement' ? "bg-purple-500/10 text-purple-500" :
                        "bg-zinc-500/10 text-zinc-500"
                      )}>
                        {activity.type === 'watch' ? <PlayCircle size={18} /> :
                         activity.type === 'review' ? <Star size={18} /> :
                         activity.type === 'achievement' ? <Award size={18} /> :
                         <Activity size={18} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white leading-relaxed">
                          {activity.type === 'watch' && `شاهد ${activity.content_type === 'movie' ? 'فيلم' : 'مسلسل'} جديد`}
                          {activity.type === 'review' && `أضاف مراجعة جديدة`}
                          {activity.type === 'achievement' && `حصل على إنجاز جديد: ${activity.metadata?.achievement_title || 'إنجاز'}`}
                          {activity.type === 'follow' && `بدأ بمتابعة مستخدم جديد`}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter mt-1">
                          {new Date(activity.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 rounded-[2.5rem] border-2 border-dashed border-white/5">
                    <Activity size={48} className="mx-auto text-zinc-800 mb-4" />
                    <p className="text-zinc-500 text-sm font-bold">لا توجد نشاطات لعرضها حالياً</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Achievements */}
            <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-6 backdrop-blur-md">
              <h3 className="text-sm font-black text-white mb-6 flex items-center gap-3 tracking-widest uppercase">
                <Award size={16} className="text-lumen-gold" />
                الإنجازات ({achievements?.length || 0})
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {achievements && achievements.length > 0 ? (
                  achievements.slice(0, 4).map((ua) => {
                    const achievement = ua.achievement!
                    const Icon = ICON_MAP[achievement.icon] || Award
                    return (
                      <div key={achievement.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col items-center text-center">
                        <div className="mb-2 p-2 rounded-xl bg-lumen-gold/10 text-lumen-gold">
                          <Icon size={16} />
                        </div>
                        <p className="text-[8px] font-black text-white uppercase tracking-tighter">{achievement.title}</p>
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-2 text-center py-8 text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                    لا توجد إنجازات
                  </div>
                )}
              </div>
            </div>

            {/* Followers Preview */}
            <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] p-6 backdrop-blur-md">
              <h3 className="text-sm font-black text-white mb-6 flex items-center gap-3 tracking-widest uppercase">
                <Users size={16} className="text-blue-400" />
                المتابعون ({followers?.length || 0})
              </h3>
              <div className="flex flex-wrap gap-2">
                {followers && followers.length > 0 ? (
                  followers.slice(0, 6).map((follower) => (
                    <Link key={follower.id} to={`/user/${follower.username}`}>
                      <img 
                        src={follower.avatar_url || '/default-avatar.png'} 
                        alt={follower.username}
                        className="w-10 h-10 rounded-full border-2 border-white/10 hover:border-lumen-gold transition-colors"
                      />
                    </Link>
                  ))
                ) : (
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">لا يوجد متابعون</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
