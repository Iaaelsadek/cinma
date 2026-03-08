import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  supabase, 
  WatchParty as WatchPartyType, 
  updateWatchParty, 
  getParticipants, 
  joinWatchParty, 
  leaveWatchParty,
  sendPartyMessage,
  getPartyMessages,
  type PartyChatMessage,
  getProfile
} from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { 
  Users, Play, Pause, MessageCircle, X, Crown, LogOut, 
  Send, Smile, RefreshCw, Zap, Flame, Heart, Star, Laugh, Copy, Link2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import clsx from 'clsx'

interface WatchPartyProps {
  partyId: string
  onSync: (currentTime: number, isPlaying: boolean) => void
  onClose: () => void
  currentVideoTime: number
  isVideoPlaying: boolean
  lang?: 'ar' | 'en'
}

interface ParticipantWithProfile {
  user_id: string
  username: string
  avatar_url: string | null
  joined_at: string
}

const REACTIONS = [
  { emoji: '🔥', icon: Flame, color: 'text-orange-500' },
  { emoji: '❤️', icon: Heart, color: 'text-red-500' },
  { emoji: '⭐', icon: Star, color: 'text-yellow-500' },
  { emoji: '😂', icon: Laugh, color: 'text-blue-500' },
  { emoji: '⚡', icon: Zap, color: 'text-lumen-gold' }
]

export const WatchParty = ({ partyId, onSync, onClose, currentVideoTime, isVideoPlaying, lang = 'ar' }: WatchPartyProps) => {
  const { user } = useAuth()
  const [party, setParty] = useState<WatchPartyType | null>(null)
  const [participants, setParticipants] = useState<ParticipantWithProfile[]>([])
  const [messages, setMessages] = useState<PartyChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'people'>('chat')
  const [isOpen, setIsOpen] = useState(true)
  const [isCreator, setIsCreator] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [reactions, setReactions] = useState<{ id: string, emoji: string, x: number }[]>([])
  
  const lastUpdateRef = useRef<number>(0)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined') return `https://cinma.online./party/${partyId}`
    return `${window.location.origin}/party/${partyId}`
  }, [partyId])

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en)

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'chat' && scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      // Always scroll if it's the first load or user is near bottom
      if (isNearBottom || messages.length <= 1) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages, activeTab])

  useEffect(() => {
    if (!user || !partyId) return

    const setupParty = async () => {
      setIsLoading(true)
      try {
        await joinWatchParty(partyId, user.id)
        
        const { data: partyData } = await supabase.from('watch_parties').select('*').eq('id', partyId).single()
        if (!partyData) throw new Error('Party not found')
        
        setParty(partyData as WatchPartyType)
        setIsCreator(partyData.creator_id === user.id)
        
        // Fetch participants with profiles directly
        const participantsData = await getParticipants(partyId)
        setParticipants(participantsData as ParticipantWithProfile[])

        // Fetch initial messages
        const initialMessages = await getPartyMessages(partyId)
        setMessages(initialMessages)
        setIsLoading(false)

        // Subscribe to changes
        const channel = supabase.channel(`watch_party:${partyId}`)
        channelRef.current = channel

        channel
          .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'watch_parties',
            filter: `id=eq.${partyId}`
          }, (payload) => {
            const newParty = payload.new as WatchPartyType
            setParty(newParty)
            
            if (newParty.creator_id !== user.id) {
              if (Math.abs(newParty.current_time - currentVideoTime) > 3 || newParty.is_playing !== isVideoPlaying) {
                onSync(newParty.current_time, newParty.is_playing)
              }
            }
          })
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'watch_party_messages',
            filter: `party_id=eq.${partyId}`
          }, (payload) => {
            const newMsg = payload.new as PartyChatMessage
            // Only add if not already in list (prevents double messages due to optimistic UI)
            setMessages(prev => {
              if (prev.find(m => m.id === newMsg.id || (m.text === newMsg.text && m.user_id === newMsg.user_id && Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000))) {
                return prev
              }
              return [...prev, newMsg]
            })
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'watch_party_participants',
            filter: `party_id=eq.${partyId}`
          }, async () => {
            // Refresh participants list on any change
            const updated = await getParticipants(partyId)
            setParticipants(updated as ParticipantWithProfile[])
          })
          .on('broadcast', { event: 'reaction' }, ({ payload }) => {
            const id = Math.random().toString(36).substring(7)
            setReactions(prev => [...prev, { id, emoji: payload.emoji, x: payload.x }])
            setTimeout(() => {
              setReactions(prev => prev.filter(r => r.id !== id))
            }, 3000)
          })
          .subscribe()
      } catch (err) {
        toast.error(t('فشل الاتصال بغرفة المشاهدة الجماعية', 'Failed to connect to group watch party'))
        onClose()
      }
    }

    setupParty()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      leaveWatchParty(partyId, user.id)
    }
  }, [partyId, user?.id, onSync, onClose])

  // Sync Logic
  useEffect(() => {
    if (!isCreator || !party) return
    const now = Date.now()
    // Sync every 5 seconds OR immediately if pause/play state changes
    if (now - lastUpdateRef.current > 5000 || isVideoPlaying !== party.is_playing) {
      updateWatchParty(partyId, {
        current_time: currentVideoTime,
        is_playing: isVideoPlaying
      })
      lastUpdateRef.current = now
    }
  }, [currentVideoTime, isVideoPlaying, isCreator, partyId, party])

  // Participant sync logic (auto-sync if close enough)
  useEffect(() => {
    if (isCreator || !party) return
    
    // Auto-sync if time difference is small (e.g., < 2s) to keep everyone in line
    // but only if playing. If paused, we follow creator exactly.
    const diff = Math.abs(party.current_time - currentVideoTime)
    if (party.is_playing && diff > 1 && diff < 5) {
      onSync(party.current_time, party.is_playing)
    }
  }, [party?.current_time, party?.is_playing, isCreator])

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newMessage.trim() || !user || !party) return

    const messageText = newMessage.trim()
    const tempId = Math.random().toString(36).substring(7)
    
    // Optimistic update for better UX
    const optimisticMessage: PartyChatMessage = {
      id: tempId,
      party_id: partyId,
      user_id: user.id,
      username: user.user_metadata?.username || 'User',
      avatar_url: user.user_metadata?.avatar_url || null,
      text: messageText,
      created_at: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')

    try {
      await sendPartyMessage(
        partyId, 
        user.id, 
        optimisticMessage.username, 
        optimisticMessage.avatar_url, 
        messageText
      )
    } catch (err) {
      // Revert optimistic update on failure
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(messageText) // Restore text so user can retry
      toast.error(t('فشل إرسال الرسالة', 'Failed to send message'))
    }
  }

  const sendReaction = (emoji: string) => {
    if (!channelRef.current) return
    
    const x = Math.random() * 100
    channelRef.current.send({
      type: 'broadcast',
      event: 'reaction',
      payload: { emoji, x }
    })
    
    // Local animation
    const id = Math.random().toString(36).substring(7)
    setReactions(prev => [...prev, { id, emoji, x }])
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id))
    }, 3000)
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast.success(t('تم نسخ رابط الدعوة', 'Invite link copied'))
    } catch {
      toast.error(t('فشل نسخ الرابط', 'Failed to copy link'))
    }
  }

  if (!party) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Reactions Overlay */}
      <div className="absolute bottom-20 right-0 w-full h-96 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {reactions.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -400, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: 'easeOut' }}
              className="absolute bottom-0 text-3xl"
              style={{ left: `${r.x}%` }}
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-96 h-[550px] flex flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0f0f0f]/95 shadow-2xl backdrop-blur-2xl pointer-events-auto"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-lumen-gold/10 text-lumen-gold">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white truncate max-w-[180px] tracking-tight uppercase">
                    {party.room_name}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                    {participants.length} {t('مشاركين', 'Participants')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-3 rounded-2xl bg-white/5 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-3 border-b border-white/5 bg-white/[0.01]">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <Link2 size={12} />
                  <span>{t('رابط الدعوة', 'Invite Link')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-[11px] text-zinc-200 outline-none"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="h-10 shrink-0 rounded-xl border border-primary/30 bg-primary/15 px-3 text-primary hover:bg-primary/25 transition-colors"
                    aria-label={t('نسخ الرابط', 'Copy link')}
                  >
                    <Copy size={14} />
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(inviteLink)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 text-emerald-400 hover:bg-emerald-500/25 transition-colors flex items-center justify-center"
                    aria-label={t('مشاركة واتساب', 'Share to WhatsApp')}
                  >
                    <MessageCircle size={14} />
                  </a>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-6 py-2 gap-2 bg-white/[0.01]">
              <button
                onClick={() => setActiveTab('chat')}
                className={clsx(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'chat' ? "bg-white/5 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {t('الدردشة', 'Chat')}
              </button>
              <button
                onClick={() => setActiveTab('people')}
                className={clsx(
                  "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'people' ? "bg-white/5 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {t('الموجودين', 'People')}
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw className="animate-spin text-lumen-gold" size={24} />
                </div>
              ) : activeTab === 'chat' ? (
                <div className="h-full flex flex-col p-6">
                  <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2"
                  >
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={clsx(
                          "flex items-start gap-3",
                          msg.user_id === user?.id && "flex-row-reverse"
                        )}
                      >
                        <img 
                          src={msg.avatar_url || '/default-avatar.png'} 
                          className="w-8 h-8 rounded-xl border border-white/10 flex-shrink-0"
                        />
                        <div className={clsx(
                          "max-w-[70%] p-3 rounded-2xl text-xs relative group",
                          msg.user_id === user?.id 
                            ? "bg-lumen-gold text-black font-bold rounded-tr-none" 
                            : "bg-white/5 text-zinc-300 rounded-tl-none"
                        )}>
                          {msg.user_id !== user?.id && (
                            <p className="text-[9px] font-black uppercase mb-1 opacity-50">{msg.username}</p>
                          )}
                          <p className="leading-relaxed break-words">{msg.text}</p>
                          
                          {/* Timestamp on hover */}
                          <div className={clsx(
                            "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-black whitespace-nowrap",
                            msg.user_id === user?.id ? "right-full mr-2 text-zinc-500" : "left-full ml-2 text-zinc-500"
                          )}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input */}
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-center gap-4 py-2 border-t border-white/5">
                      {REACTIONS.map((r) => (
                        <button
                          key={r.emoji}
                          onClick={() => sendReaction(r.emoji)}
                          className="text-xl hover:scale-125 transition-transform active:scale-95"
                        >
                          {r.emoji}
                        </button>
                      ))}
                    </div>
                    <form onSubmit={handleSendMessage} className="relative group">
                      <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t('اكتب رسالة...', 'Type a message...')}
                        className="w-full h-12 pr-6 pl-12 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-lumen-gold transition-all"
                      />
                      <button
                        type="submit"
                        className="absolute left-2 top-2 bottom-2 w-8 flex items-center justify-center text-lumen-gold hover:scale-110 active:scale-95 transition-all"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto p-6 space-y-3 no-scrollbar">
                  {participants.map((p) => (
                    <motion.div 
                      key={p.user_id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5"
                    >
                      <div className="relative">
                        <img 
                          src={p.avatar_url || '/default-avatar.png'} 
                          className="w-10 h-10 rounded-xl border border-white/10"
                        />
                        {p.user_id === party.creator_id && (
                          <div className="absolute -top-1 -right-1 p-1 bg-lumen-gold text-black rounded-lg shadow-lg">
                            <Crown size={10} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{p.username}</p>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                          {p.user_id === user?.id ? t('أنت', 'You') : t('مشارك', 'Participant')}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Sync Bar */}
            <div className="p-6 bg-white/[0.03] border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2 rounded-xl",
                    party.is_playing ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {party.is_playing ? <Play size={14} /> : <Pause size={14} />}
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                      {party.is_playing ? t('مشاهدة مستمرة', 'Streaming Now') : t('متوقف مؤقتاً', 'Paused')}
                    </p>
                  </div>
                </div>
                {!isCreator && (
                  <button
                    onClick={() => onSync(party.current_time, party.is_playing)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lumen-gold/10 text-lumen-gold border border-lumen-gold/20 hover:bg-lumen-gold hover:text-black transition-all group"
                  >
                    <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('مزامنة', 'Sync')}</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  leaveWatchParty(partyId, user!.id)
                  onClose()
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/5 text-red-500 border border-red-500/10 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <LogOut size={14} />
                {t('مغادرة الغرفة', 'Leave Room')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group pointer-events-auto"
        >
          <div className="absolute inset-0 bg-lumen-gold blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-lumen-gold text-black shadow-2xl hover:scale-110 active:scale-95 transition-all">
            <Users size={24} />
            {participants.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-xl bg-black text-[10px] font-black text-lumen-gold border-2 border-lumen-gold">
                {participants.length}
              </span>
            )}
          </div>
        </button>
      )}
    </div>
  )
}
