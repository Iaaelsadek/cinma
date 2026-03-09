import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

type PartyRow = {
  id: string
  room_name: string
  content_id: string
  content_type: string
  is_private?: boolean | null
}

const JOIN_RATE_WINDOW_MS = 15000
const JOIN_MAX_ATTEMPTS = 5
const JOIN_MIN_RETRY_MS = 1200

export const PartyJoin = () => {
  const { partyId = '' } = useParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [party, setParty] = useState<PartyRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [nickname, setNickname] = useState('')
  const [joining, setJoining] = useState(false)
  const [nextAllowedAt, setNextAllowedAt] = useState(0)

  const watchUrl = useMemo(() => {
    if (!party) return ''
    const type = party.content_type || 'movie'
    const contentId = party.content_id || ''
    const isSeries = type === 'tv' || type === 'series' || type === 'anime'
    return isSeries
      ? `/watch/tv/${contentId}/s1/ep1?partyId=${party.id}`
      : `/watch/movie/${contentId}?partyId=${party.id}`
  }, [party])

  useEffect(() => {
    if (!partyId) return
    let active = true
    const load = async () => {
      setIsLoading(true)
      const { data } = await supabase
        .from('watch_parties')
        .select('id, room_name, content_id, content_type, is_private')
        .eq('id', partyId)
        .maybeSingle()
      if (!active) return
      setParty((data as PartyRow) || null)
      setIsLoading(false)
    }
    load()
    return () => { active = false }
  }, [partyId, user?.id])

  useEffect(() => {
    if (loading || !party) return
    if (!party.is_private && user) {
      navigate(watchUrl, { replace: true })
    }
  }, [loading, user, party, watchUrl, navigate])

  const joinWithNickname = async (desiredNickname: string) => {
    if (!partyId) return
    const normalizedNickname = desiredNickname.trim()
    if (!normalizedNickname) return
    const now = Date.now()
    if (now < nextAllowedAt) {
      toast.error('يرجى الانتظار قليلاً قبل إعادة المحاولة')
      return
    }
    try {
      const key = `party_join_attempts:${partyId}`
      const raw = localStorage.getItem(key)
      const parsed = raw ? (JSON.parse(raw) as number[]) : []
      const attempts = parsed.filter((time) => now - Number(time) <= JOIN_RATE_WINDOW_MS)
      if (attempts.length >= JOIN_MAX_ATTEMPTS) {
        toast.error('تم تجاوز الحد المسموح من محاولات الانضمام. حاول بعد قليل.')
        return
      }
      attempts.push(now)
      localStorage.setItem(key, JSON.stringify(attempts))
      setNextAllowedAt(now + JOIN_MIN_RETRY_MS)
    } catch {
      setNextAllowedAt(now + JOIN_MIN_RETRY_MS)
    }
    setJoining(true)
    try {
      if (!user) {
        const result = await (supabase.auth as any).signInAnonymously({
          options: { data: { username: normalizedNickname } }
        })
        if (result?.error) throw result.error
      }
      const { data: sessionData } = await supabase.auth.getSession()
      const anonUserId = sessionData?.session?.user?.id
      if (anonUserId) {
        await supabase
          .from('profiles')
          .upsert({ id: anonUserId, username: normalizedNickname, role: 'user' }, { onConflict: 'id' })
      }
      const { data } = await supabase
        .from('watch_parties')
        .select('id, room_name, content_id, content_type, is_private')
        .eq('id', partyId)
        .maybeSingle()
      const resolvedParty = (data as PartyRow) || party
      if (!resolvedParty) {
        toast.error('الغرفة غير متاحة')
        return
      }
      const resolvedType = resolvedParty.content_type || 'movie'
      const resolvedContentId = resolvedParty.content_id || ''
      const isSeries = resolvedType === 'tv' || resolvedType === 'series' || resolvedType === 'anime'
      const target = isSeries
        ? `/watch/tv/${resolvedContentId}/s1/ep1?partyId=${resolvedParty.id}`
        : `/watch/movie/${resolvedContentId}?partyId=${resolvedParty.id}`
      navigate(target, { replace: true })
    } catch (err: any) {
      toast.error(err?.message || 'تعذر الانضمام إلى الغرفة')
      navigate(`/login?next=${encodeURIComponent(`/party/${partyId}`)}`, { replace: true })
    } finally {
      setJoining(false)
    }
  }

  const handleJoin = async () => {
    if (!nickname.trim()) {
      toast.error('يرجى إدخال اسم مستعار')
      return
    }
    await joinWithNickname(nickname)
  }

  useEffect(() => {
    if (loading || isLoading || !party || user || party.is_private || joining) return
    const autoNickname = `Guest-${party.id.slice(0, 5)}`
    setNickname(autoNickname)
    joinWithNickname(autoNickname)
  }, [loading, isLoading, party, user, joining])

  if (isLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-300">
        <div className="h-8 w-8 rounded-full border-2 border-zinc-700 border-t-primary animate-spin" />
      </div>
    )
  }

  if (!party) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-center px-4">
        <h1 className="text-xl font-black text-white">الغرفة غير موجودة</h1>
        <p className="text-sm text-zinc-400">تحقق من رابط الدعوة ثم حاول مرة أخرى.</p>
      </div>
    )
  }

  if (!party.is_private && user) return null

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/90 p-6">
        <h1 className="text-xl font-black text-white mb-2">الانضمام إلى غرفة المشاهدة</h1>
        <p className="text-sm text-zinc-400 mb-5">{party.room_name}</p>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="اسم مستعار"
          className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-primary/50"
        />
        <button
          onClick={handleJoin}
          disabled={joining}
          className="mt-4 w-full h-12 rounded-2xl bg-primary text-black font-black disabled:opacity-60"
        >
          {joining ? 'جاري الانضمام...' : 'دخول الغرفة الآن'}
        </button>
      </div>
    </div>
  )
}
