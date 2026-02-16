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
import { SkeletonGrid } from '../../components/common/Skeletons'

type Role = 'user' | 'admin'

export const Profile = () => {
  const { user, loading } = useAuth()
  const [username, setUsername] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('user')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const [targetId, setTargetId] = useState('')
  const [targetUsername, setTargetUsername] = useState('')
  const [adminMsg, setAdminMsg] = useState<string | null>(null)
  const isAdmin = role === 'admin'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user) return
      const p = await getProfile(user.id)
      if (cancelled) return
      setUsername(p?.username || '')
      setAvatar(p?.avatar_url || null)
      setRole((p?.role as Role) || 'user')
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  if (!loading && !user) return <Navigate to="/login" replace />
  if (loading) return null

  const onSave = async () => {
    if (!user) return
    setBusy(true)
    setMsg(null)
    try {
      await updateUsername(user.id, username)
      setMsg('تم حفظ الاسم بنجاح')
    } catch (e: any) {
      setMsg(e?.message || 'فشل حفظ الاسم')
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
    try {
      const url = await uploadAvatar(f, user.id)
      setAvatar(url)
      setMsg('تم تحديث الصورة')
    } catch (e: any) {
      setMsg(e?.message || 'فشل رفع الصورة')
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
    try {
      const id = await findTargetId()
      if (!id) {
        setAdminMsg('أدخل معرف المستخدم أو اسم المستخدم')
        return
      }
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id)
      if (error) throw error
      setAdminMsg(`تم تحديث دور المستخدم (${id}) إلى ${newRole}`)
    } catch (e: any) {
      setAdminMsg(e?.message || 'فشل تحديث الدور')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Helmet>
        <title>حسابي | cinma.online</title>
        <meta name="description" content="إدارة الحساب، المفضلة، متابعة المشاهدة، والسجل." />
      </Helmet>
      <h1 className="text-2xl font-bold">الملف الشخصي</h1>
      <div className="rounded-lg border border-zinc-800 p-4">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-zinc-800">
            {avatar ? <img src={avatar} alt="avatar" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={onUpload}
              className="text-sm"
            />
            <div className="text-xs text-zinc-400">ارفع صورة مربعة لضمان أفضل عرض</div>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <label className="text-sm text-zinc-300">اسم المستخدم</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 outline-none"
          />
        </div>
        <div className="mt-3">
          <button
            onClick={onSave}
            disabled={busy}
            className="rounded-md bg-primary px-4 h-11 text-white disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
        {msg && <div className="mt-2 text-sm text-zinc-300">{msg}</div>}
      </div>

      {!!user && (
        <>
          <RecommendedSection userId={user.id} />
          <WatchlistSection userId={user.id} />
          <ContinueWatchingSection userId={user.id} />
          <HistorySection userId={user.id} />
        </>
      )}
      {isAdmin && (
        <div className="rounded-lg border border-zinc-800 p-4">
          <h2 className="mb-3 text-lg font-semibold">أدوات الإدارة</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-zinc-300">معرف المستخدم (UUID)</label>
              <input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="أولوية أعلى من اسم المستخدم"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-zinc-300">اسم المستخدم</label>
              <input
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setRoleForTarget('admin')}
              className="rounded-md bg-primary px-4 py-2 text-white"
            >
              ترقية إلى مدير
            </button>
            <button
              onClick={() => setRoleForTarget('user')}
              className="rounded-md border border-zinc-700 px-4 py-2"
            >
              تحويل إلى مستخدم
            </button>
          </div>
          {adminMsg && <div className="mt-2 text-sm text-zinc-300">{adminMsg}</div>}
        </div>
      )}
    </div>
  )
}

const RecommendedSection = ({ userId }: { userId: string }) => {
  const q = useRQ<RecommendationItem[]>({ queryKey: ['recs', userId], queryFn: () => getRecommendations(userId) })
  if (q.isPending) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">موصى به لك</h2>
        <SkeletonGrid count={10} variant="poster" />
      </section>
    )
  }
  if (!q.data || q.data.length === 0) return null
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">موصى به لك</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {q.data.map((m) => (
          <Link key={`${m.media_type}-${m.id}`} to={m.media_type === 'movie' ? `/movie/${m.id}` : `/series/${m.id}`} className="rounded-lg border border-zinc-800 p-3">
            <div className="text-sm">{m.title || m.name}</div>
          </Link>
        ))}
      </div>
    </section>
  )
}

const WatchlistSection = ({ userId }: { userId: string }) => {
  const q = useQuery({ queryKey: ['watchlist', userId], queryFn: () => getWatchlist(userId) })
  const onRemove = async (cid: number, ctype: 'movie' | 'tv') => {
    await removeFromWatchlist(userId, cid, ctype)
    toast.success('تمت الإزالة من المفضلة')
    q.refetch()
  }
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">المفضلة</h2>
      {q.isPending ? (
        <SkeletonGrid count={10} variant="poster" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {(q.data || []).map((w) => (
            <div key={`${w.content_type}-${w.content_id}`} className="group rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <div className="aspect-[2/3] w-full overflow-hidden rounded-md bg-zinc-800" />
              <div className="mt-2 flex items-center justify-between text-sm">
                <Link
                  to={w.content_type === 'movie' ? `/movie/${w.content_id}` : `/series/${w.content_id}`}
                  className="text-primary"
                >
                  عرض
                </Link>
                <button onClick={() => onRemove(w.content_id, w.content_type)} className="px-3 h-10 rounded text-xs text-red-400 hover:bg-red-900/20">
                  إزالة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

const ContinueWatchingSection = ({ userId }: { userId: string }) => {
  const q = useQuery({ queryKey: ['continue', userId], queryFn: () => getContinueWatching(userId) })
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">متابعة المشاهدة</h2>
      {q.isPending ? (
        <SkeletonGrid count={8} variant="video" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {(q.data || []).map((r) => {
            const minutes = Math.floor((r.progress_seconds || 0) / 60)
            const href = r.content_type === 'movie'
              ? `/watch/${r.content_id}`
              : `/watch/${r.content_id}?type=tv&season=${r.season_number || 1}&episode=${r.episode_number || 1}`
            return (
              <Link key={`${r.content_type}-${r.content_id}`} to={href} className="rounded-lg border border-zinc-800 p-3">
                <div className="text-sm">{r.content_type === 'movie' ? 'فيلم' : 'مسلسل'} #{r.content_id}</div>
                <div className="mt-1 text-xs text-zinc-400">تقدم: {minutes} دقيقة</div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded bg-zinc-800">
                  <div className="h-2 bg-primary" style={{ width: '30%' }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

const HistorySection = ({ userId }: { userId: string }) => {
  const q = useQuery({ queryKey: ['history', userId], queryFn: () => getHistory(userId) })
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">سجل المشاهدة</h2>
      {q.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="h-7 w-16 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {(q.data || []).map((h) => {
            const href = h.content_type === 'movie'
              ? `/movie/${h.content_id}`
              : `/series/${h.content_id}`
            const when = new Date(h.watched_at).toLocaleString()
            return (
              <div key={`${h.content_type}-${h.content_id}-${h.watched_at}`} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
                <div className="text-sm">{h.content_type === 'movie' ? 'فيلم' : 'مسلسل'} #{h.content_id}</div>
                <div className="text-xs text-zinc-400">{when}</div>
                <Link to={href} className="text-sm text-primary">فتح</Link>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
