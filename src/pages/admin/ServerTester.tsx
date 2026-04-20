import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { Play, ExternalLink, Monitor, Trash2, Copy } from 'lucide-react'
import { toast } from '../../lib/toast-manager'
import { logger } from '../../lib/logger'
import { tmdb } from '../../lib/tmdb'
import { supabase } from '../../lib/supabase'
import { SERVER_PROVIDERS, buildDlVidsrcUrl, generateServerUrl } from '../../lib/serverCatalog'

type ServerStatus = 'unknown' | 'clean' | 'broken' | 'ads_1' | 'ads_2' | 'ads_3' | 'ads_4' | 'ads_5' | 'ads_6' | 'ads_7' | 'ads_8' | 'ads_9'

interface ServerResult {
  id: string
  name: string
  url: string
  status: ServerStatus
  note?: string
}

type TranslationMarks = Record<string, boolean>
type ServerPattern = {
  id: string
  name: string
  base: string
  movie_template: string
  tv_template: string
  is_active: boolean
  supports_movie: boolean
  supports_tv: boolean
  is_download: boolean
  priority: number
  locked_subtitle_lang?: string | null
  subtitle_format?: string | null
  format_locked?: boolean
}

const serverFamily = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes('vidsrc')) return 'VidSrc'
  if (n.includes('2embed')) return '2Embed'
  if (n.includes('autoembed')) return 'AutoEmbed'
  if (n.includes('smashy')) return 'Smashy'
  if (n.includes('moviebox')) return 'MovieBox'
  if (n.includes('streamwish')) return 'StreamWish'
  if (n.includes('vidlink')) return 'VidLink'
  if (n.includes('multiembed')) return 'MultiEmbed'
  if (n.includes('gdrive')) return 'GDrive'
  if (n.includes('cloud')) return 'Cloud'
  return 'Other'
}

const getFamilyColor = (family: string) => {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    'VidSrc': { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
    '2Embed': { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
    'AutoEmbed': { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
    'Smashy': { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
    'MovieBox': { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30' },
    'StreamWish': { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
    'VidLink': { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30' },
    'MultiEmbed': { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/30' },
    'GDrive': { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
    'Cloud': { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-500/30' },
    'Other': { bg: 'bg-zinc-500/20', text: 'text-zinc-300', border: 'border-zinc-500/30' }
  }
  return colors[family] || colors['Other']
}

const DEFAULT_SERVER_PATTERNS: ServerPattern[] = SERVER_PROVIDERS.map((provider, index) => ({
  id: provider.id,
  name: provider.name,
  base: provider.base,
  movie_template: provider.movie_template || '',
  tv_template: provider.tv_template || '',
  is_active: true,
  supports_movie: true,
  supports_tv: true,
  is_download: provider.is_download === true,
  priority: index + 1,
  locked_subtitle_lang: null,
  subtitle_format: null,
  format_locked: false
}))

const TEMPLATE_TOKENS = ['{tmdbId}', '{imdbId}', '{season}', '{episode}', '{type}', '{lang}'] as const
const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || ''
const TEMPLATE_TOKEN_LABELS: Record<(typeof TEMPLATE_TOKENS)[number], string> = {
  '{tmdbId}': 'TMDB',
  '{imdbId}': 'IMDB',
  '{season}': 'Season',
  '{episode}': 'Episode',
  '{type}': 'Type',
  '{lang}': 'Lang'
}

// Subtitle format options
const SUBTITLE_FORMATS = [
  { value: 'sub_lang=ar', label: 'sub_lang=ar' },
  { value: 'lang=ar', label: 'lang=ar' },
  { value: 'subtitle=ar', label: 'subtitle=ar' },
  { value: 'subs_lang=ar', label: 'subs_lang=ar' },
  { value: 'default_sub=ar', label: 'default_sub=ar' },
  { value: 'cc_lang_pref=ar', label: 'cc_lang_pref=ar' },
  { value: 'cc_lang_pref=ar&hl=ar&cc_load_policy=1', label: 'cc_lang_pref + hl + cc_load' },
  { value: 'hl=ar', label: 'hl=ar' },
  { value: 'sub=ar', label: 'sub=ar' },
  { value: 'locale=ar', label: 'locale=ar' },
  { value: 'dubbing=ar', label: 'dubbing=ar' },
  { value: 'audio=ar', label: 'audio=ar' },
]
const SUGGESTED_TEMPLATES: Record<string, { movie: string; tv: string }> = {
  autoembed_co: {
    movie: 'https://autoembed.co/movie/tmdb/{tmdbId}',
    tv: 'https://autoembed.co/tv/tmdb/{tmdbId}-{season}-{episode}'
  },
  vidsrc_net: {
    movie: 'https://vidsrc.net/embed/movie/{tmdbId}',
    tv: 'https://vidsrc.net/embed/tv/{tmdbId}/{season}/{episode}'
  },
  vidsrc_io: {
    movie: 'https://vidsrc.io/embed/movie/{tmdbId}',
    tv: 'https://vidsrc.io/embed/tv/{tmdbId}/{season}/{episode}'
  },
  vidsrc_cc: {
    movie: 'https://vidsrc.cc/v2/embed/movie/{tmdbId}',
    tv: 'https://vidsrc.cc/v2/embed/tv/{tmdbId}?autoPlay=false&s={season}&e={episode}'
  },
  vidsrc_xyz: {
    movie: 'https://vidsrc.xyz/embed/movie/{tmdbId}',
    tv: 'https://vidsrc.xyz/embed/tv/{tmdbId}/{season}/{episode}'
  },
  vidsrc_me: {
    movie: 'https://vidsrc.me/embed/movie/{tmdbId}',
    tv: 'https://vidsrc.me/embed/tv/{tmdbId}/{season}/{episode}'
  },
  vidsrc_vip: {
    movie: 'https://vidrock.net/embed/movie/{tmdbId}',
    tv: 'https://vidrock.net/embed/tv/{tmdbId}/{season}/{episode}'
  },
  '2embed_cc': {
    movie: 'https://www.2embed.cc/embed/{tmdbId}',
    tv: 'https://www.2embed.cc/embed/{tmdbId}/{season}/{episode}'
  },
  '2embed_skin': {
    movie: 'https://www.2embed.skin/embed/{tmdbId}',
    tv: 'https://www.2embed.skin/embed/{tmdbId}/{season}/{episode}'
  },
  smashystream: {
    movie: 'https://player.smashy.stream/movie/{tmdbId}',
    tv: 'https://smashy.stream/tv/{tmdbId}/{season}/{episode}/player'
  },
  '111movies': {
    movie: 'https://111movies.com/movie/{tmdbId}',
    tv: 'https://111movies.net/tv/{tmdbId}/{season}/{episode}'
  }
}

export const ServerTester = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tmdbId, setTmdbId] = useState(searchParams.get('id') || '550')
  const [type, setType] = useState<'movie' | 'tv'>('movie')
  const [season, setSeason] = useState('1')
  const [episode, setEpisode] = useState('1')
  const [imdbId, setImdbId] = useState('')
  const [activeServerId, setActiveServerId] = useState<string | null>(() => {
    // Initialize from localStorage to persist across refreshes
    return localStorage.getItem('server-tester-active-server-id') || null
  })
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [editableUrl, setEditableUrl] = useState('')
  const [results, setResults] = useState<ServerResult[]>([])
  const [serverPatterns, setServerPatterns] = useState<ServerPattern[]>(DEFAULT_SERVER_PATTERNS)
  const [savedServerPatterns, setSavedServerPatterns] = useState<ServerPattern[]>(DEFAULT_SERVER_PATTERNS)
  const [defaultServerPatterns, setDefaultServerPatterns] = useState<ServerPattern[]>(DEFAULT_SERVER_PATTERNS)
  const [removedServerIds, setRemovedServerIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [translationMarks, setTranslationMarks] = useState<TranslationMarks>({})
  const [configSource, setConfigSource] = useState<'database' | 'local'>('local')
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true)
  const [subtitleLang, setSubtitleLang] = useState('ar')
  const [quickPicks, setQuickPicks] = useState([
    { id: '424', name: 'Schindlers List', type: 'movie' as const },
    { id: '238', name: 'The Godfather', type: 'movie' as const },
    { id: '597', name: 'Titanic', type: 'movie' as const },
    { id: '27205', name: 'Inception', type: 'movie' as const },
    { id: '872585', name: 'Oppenheimer', type: 'movie' as const },
    { id: '1668', name: 'Friends', type: 'tv' as const },
    { id: '1418', name: 'The Big Bang Theory', type: 'tv' as const },
    { id: '1396', name: 'Breaking Bad', type: 'tv' as const },
    { id: '1399', name: 'Game of Thrones', type: 'tv' as const },
    { id: '93405', name: 'Squid Game', type: 'tv' as const },
  ])
  const [editingPickId, setEditingPickId] = useState<string | null>(null)
  const [editingPickTmdbId, setEditingPickTmdbId] = useState('')

  // Block popup ads globally on this page
  useEffect(() => {
    const originalOpen = window.open
    let isBlocking = false

    const blockPopups = (...args: any[]) => {
      if (isBlocking) {
        logger.info('🚫 Blocked popup ad attempt')
        return null
      }
      return originalOpen.apply(window, args as any)
    }

    window.open = blockPopups

    // Block popups during user interactions with server buttons
    const handleUserInteraction = () => {
      isBlocking = true
      setTimeout(() => {
        isBlocking = false
      }, 500)
    }

    document.addEventListener('click', handleUserInteraction)
    document.addEventListener('touchstart', handleUserInteraction)

    return () => {
      window.open = originalOpen
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }
  }, [])

  // Load saved data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('server-tester-results')
      if (saved) {
        // Just verify access
      }
      const savedMarks = localStorage.getItem('server-tester-translation-marks')
      if (savedMarks) {
        setTranslationMarks(JSON.parse(savedMarks))
      }
      // Load default settings
      const savedDefaults = localStorage.getItem('server-tester-default-config')
      if (savedDefaults) {
        setDefaultServerPatterns(JSON.parse(savedDefaults))
      }
      // Load quick picks
      const savedPicks = localStorage.getItem('server-tester-quick-picks')
      if (savedPicks) {
        setQuickPicks(JSON.parse(savedPicks))
      }
    } catch (e: any) {
      logger.error('Failed to load saved results', e)
    }
  }, [])

  useEffect(() => {
    const loadServerConfigs = async () => {
      setIsLoadingConfigs(true)
      try {
        const response = await fetch(`${API_BASE}/api/server-configs`)

        if (!response.ok) {
          setConfigSource('local')
          setIsLoadingConfigs(false)
          return
        }

        const data = await response.json()

        if (!data || data.length === 0) {
          setConfigSource('local')
          setIsLoadingConfigs(false)
          return
        }

        const mapped: ServerPattern[] = data.map((row: any, index: number) => ({
          id: row.id,
          name: row.name,
          base: row.base || '',
          movie_template: row.movie_template || '',
          tv_template: row.tv_template || '',
          is_active: row.is_active !== false,
          supports_movie: row.supports_movie !== false,
          supports_tv: row.supports_tv !== false,
          is_download: row.is_download === true,
          priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : index + 1,
          locked_subtitle_lang: row.locked_subtitle_lang || null,
          subtitle_format: row.subtitle_format || null,
          format_locked: row.format_locked === true
        }))

        setServerPatterns(mapped)
        setSavedServerPatterns(mapped)
        setRemovedServerIds([])
        setConfigSource('database')
      } catch (error: any) {
        console.error('Failed to load server configs from CockroachDB:', error)
        setConfigSource('local')
      } finally {
        setIsLoadingConfigs(false)
      }
    }
    loadServerConfigs()
  }, [])

  // Initialize list with saved data
  useEffect(() => {
    const loadImdb = async () => {
      try {
        if (!tmdbId || !/^\d+$/.test(tmdbId)) {
          setImdbId('')
          return
        }
        const path = type === 'movie' ? `/movie/${tmdbId}/external_ids` : `/tv/${tmdbId}/external_ids`
        const { data } = await tmdb.get(path)
        setImdbId(data?.imdb_id || '')
      } catch {
        setImdbId('')
      }
    }
    loadImdb()
  }, [tmdbId, type])

  useEffect(() => {
    const saved = localStorage.getItem('server-tester-results')
    const savedMap: Record<string, ServerStatus> = saved ? JSON.parse(saved) : {}

    const s = Math.max(1, Number(season) || 1)
    const e = Math.max(1, Number(episode) || 1)
    const list = serverPatterns.map((p, idx) => {
      const safeTmdbId = Number(tmdbId) || 0
      // Use locked language if available, otherwise use global subtitleLang
      const effectiveLang = p.locked_subtitle_lang || subtitleLang
      let url = generateServerUrl(p, type, safeTmdbId, s, e, imdbId, {
        language: effectiveLang,
        disableFallback: true
      })

      // Apply subtitle format if selected
      if (p.subtitle_format && url) {
        const separator = url.includes('?') ? '&' : '?'
        url = `${url}${separator}${p.subtitle_format}`
      }

      return {
        id: p.id || `server-${idx}`,
        name: p.name,
        url,
        status: savedMap[p.id] || savedMap[p.name] || 'unknown'
      }
    })
    setResults(list)

    // Only set activeServerId if we don't have one yet OR if configs just finished loading
    if (!activeServerId || !isLoadingConfigs) {
      // Restore activeServerId from localStorage or default to first server
      const savedActiveServerId = localStorage.getItem('server-tester-active-server-id')
      setActiveServerId((prev) => {
        // Priority 1: Keep current selection if still valid
        if (prev && list.some((item) => item.id === prev)) return prev
        // Priority 2: Restore from localStorage if valid
        if (savedActiveServerId && list.some((item) => item.id === savedActiveServerId)) return savedActiveServerId
        // Priority 3: Default to first server
        return list[0]?.id || null
      })
    }
  }, [tmdbId, type, imdbId, season, episode, serverPatterns, subtitleLang, isLoadingConfigs, activeServerId])

  useEffect(() => {
    if (!activeServerId) {
      setActiveUrl(null)
      return
    }
    const current = results.find((item) => item.id === activeServerId)
    setActiveUrl(current?.url || null)

    // Save activeServerId to localStorage for persistence across refreshes
    localStorage.setItem('server-tester-active-server-id', activeServerId)
  }, [activeServerId, results])

  useEffect(() => {
    setEditableUrl(activeUrl || '')
  }, [activeUrl])

  const startEditingPick = (pick: typeof quickPicks[0]) => {
    setEditingPickId(pick.id)
    setEditingPickTmdbId(pick.id)
  }

  const savePickEdit = async () => {
    if (!editingPickId || !editingPickTmdbId) return

    // Fetch movie/series name from TMDB
    try {
      const path = quickPicks.find(p => p.id === editingPickId)?.type === 'movie'
        ? `/movie/${editingPickTmdbId}`
        : `/tv/${editingPickTmdbId}`
      const { data } = await tmdb.get(path)
      const name = data?.title || data?.name || 'Unknown'

      const updated = quickPicks.map(p =>
        p.id === editingPickId
          ? { ...p, id: editingPickTmdbId, name }
          : p
      )
      setQuickPicks(updated)
      localStorage.setItem('server-tester-quick-picks', JSON.stringify(updated))
      setEditingPickId(null)
      toast.success('✅ تم الحفظ')
    } catch (error: any) {
      toast.error('❌ فشل جلب البيانات')
    }
  }

  const cancelPickEdit = () => {
    setEditingPickId(null)
    setEditingPickTmdbId('')
  }

  // Close edit mode when clicking outside
  useEffect(() => {
    if (!editingPickId) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if click is outside the editing area
      if (!target.closest('.quick-pick-edit')) {
        cancelPickEdit()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingPickId])

  const updateStatus = (serverId: string, status: ServerStatus) => {
    setResults(prev => {
      const next = prev.map(r => r.id === serverId ? { ...r, status } : r)

      const mapToSave: Record<string, ServerStatus> = {}
      next.forEach(r => {
        if (r.status !== 'unknown') {
          mapToSave[r.id] = r.status
        }
      })
      localStorage.setItem('server-tester-results', JSON.stringify(mapToSave))

      return next
    })
  }

  const clearData = () => {
    if (confirm('هل أنت متأكد من حذف جميع النتائج المحفوظة؟')) {
      localStorage.removeItem('server-tester-results')
      localStorage.removeItem('server-tester-translation-marks')
      setResults(prev => prev.map(r => ({ ...r, status: 'unknown' })))
      setTranslationMarks({})
      toast.success('🗑️ تم الحذف')
    }
  }

  const saveAsDefault = () => {
    if (confirm('هل تريد حفظ الإعدادات الحالية كإعدادات افتراضية؟')) {
      localStorage.setItem('server-tester-default-config', JSON.stringify(serverPatterns))
      setDefaultServerPatterns(serverPatterns)
      toast.success('💾 تم الحفظ كافتراضي')
    }
  }

  const restoreDefaults = () => {
    if (confirm('هل تريد استعادة الإعدادات الافتراضية؟ سيتم فقد جميع التعديلات الحالية.')) {
      setServerPatterns(defaultServerPatterns)
      toast.success('🔄 تم الاستعادة')
    }
  }

  const copyWorking = () => {
    const working = results
      .filter(r => r.status === 'clean' || r.status.startsWith('ads'))
      .sort((a, b) => {
        const getScore = (s: ServerStatus) => {
          if (s === 'clean') return 0
          if (s.startsWith('ads_')) return parseInt(s.split('_')[1])
          return 100
        }
        return getScore(a.status) - getScore(b.status)
      })
      .map(r => `${r.name}: ${r.status}`)
      .join('\n')

    if (!working) {
      toast.error('❌ لا توجد سيرفرات تعمل')
      return
    }
    navigator.clipboard.writeText(working)
    const count = results.filter(r => r.status !== 'unknown' && r.status !== 'broken').length
    toast.success(`📋 تم نسخ ${count} سيرفر`)
  }

  const statusScore = (s: ServerStatus) => {
    if (s === 'clean') return 0
    if (s.startsWith('ads_')) return parseInt(s.split('_')[1])
    if (s === 'unknown') return 10
    if (s === 'broken') return 20
    return 100
  }

  const visibleResults = results
  const familyStats = useMemo(() => {
    const map = new Map<string, number>()
    visibleResults.forEach((server) => {
      const fam = serverFamily(server.name)
      map.set(fam, (map.get(fam) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [visibleResults])
  const sortedVisibleResults = visibleResults
  const serverCodeById = useMemo(() => {
    const map: Record<string, string> = {}
    sortedVisibleResults.forEach((item, index) => {
      map[item.id] = `V${index + 1}`
    })
    return map
  }, [sortedVisibleResults])
  const externalLinks = useMemo(() => sortedVisibleResults.slice(0, 12), [sortedVisibleResults])
  const contentScopeKey = useMemo(() => {
    const s = Math.max(1, Number(season) || 1)
    const e = Math.max(1, Number(episode) || 1)
    return type === 'tv' ? `tv_${tmdbId}_${s}_${e}` : `movie_${tmdbId}`
  }, [tmdbId, type, season, episode])
  const getTranslationMarkKey = (serverId: string) => `${contentScopeKey}__${serverId}`
  const isTranslated = (serverId: string) => Boolean(translationMarks[getTranslationMarkKey(serverId)])
  const toggleTranslated = (serverId: string, checked: boolean) => {
    setTranslationMarks(prev => {
      const key = getTranslationMarkKey(serverId)
      const next: TranslationMarks = { ...prev, [key]: checked }
      localStorage.setItem('server-tester-translation-marks', JSON.stringify(next))
      return next
    })

    // Lock/unlock subtitle language AND format for this server
    if (checked) {
      // Lock to current subtitle language AND lock the format
      setServerPatterns(prev => prev.map(p =>
        p.id === serverId ? {
          ...p,
          locked_subtitle_lang: subtitleLang,
          format_locked: true  // قفل الصيغة تلقائياً
        } : p
      ))
      // إشعار واحد فقط
      toast.success('✅ تم تفعيل الترجمة وقفل الصيغة')
    } else {
      // Unlock (remove lock)
      setServerPatterns(prev => prev.map(p =>
        p.id === serverId ? {
          ...p,
          locked_subtitle_lang: null,
          format_locked: false  // فتح القفل
        } : p
      ))
      // إشعار واحد فقط
      toast.info('ℹ️ تم إلغاء الترجمة وفتح القفل')
    }
  }
  const moveServerToPosition = (serverId: string, targetPosition: number) => {
    setServerPatterns((prev) => {
      const from = prev.findIndex((p) => p.id === serverId)
      const to = Math.max(0, Math.min(prev.length - 1, targetPosition - 1))
      if (from < 0 || from === to) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((item, index) => ({ ...item, priority: index + 1 }))
    })
  }
  const downloadLinks = useMemo(() => {
    const s = Math.max(1, Number(season) || 1)
    const e = Math.max(1, Number(episode) || 1)
    const safeTmdbId = Number(tmdbId) || 0
    return [{
      name: 'VidSrc DL',
      url: buildDlVidsrcUrl(type, safeTmdbId, s, e)
    }]
  }, [tmdbId, type, season, episode])

  const hasPendingChanges = useMemo(
    () => JSON.stringify(serverPatterns) !== JSON.stringify(savedServerPatterns) || removedServerIds.length > 0,
    [serverPatterns, savedServerPatterns, removedServerIds]
  )
  const selectedPattern = useMemo(
    () => serverPatterns.find((item) => item.id === activeServerId) || null,
    [serverPatterns, activeServerId]
  )
  const previewUrl = useMemo(() => {
    if (!activeUrl) return null

    // 🛡️ VidSrc.cc only goes through protected proxy
    // Other servers load directly (faster, no protection overhead)
    const needsProtection = activeUrl.includes('vidsrc.cc')

    if (needsProtection) {
      const base = API_BASE ? API_BASE.replace(/\/$/, '') : ''
      return `${base}/api/embed-proxy?url=${encodeURIComponent(activeUrl)}`
    }

    // Direct URL for other servers (no proxy = faster)
    return activeUrl
  }, [activeUrl])
  const addServer = () => {
    const id = `custom_${Date.now()}`
    setServerPatterns((prev) => [
      ...prev,
      {
        id,
        name: `Custom ${prev.length + 1}`,
        base: '',
        movie_template: '',
        tv_template: '',
        is_active: true,
        supports_movie: true,
        supports_tv: true,
        is_download: false,
        priority: prev.length + 1,
        locked_subtitle_lang: null,
        subtitle_format: null,
        format_locked: false
      }
    ])
  }

  const updateServerPattern = (serverId: string, patch: Partial<ServerPattern>) => {
    setServerPatterns((prev) => prev.map((item) => (item.id === serverId ? { ...item, ...patch } : item)))
  }

  const removeServer = (serverId: string) => {
    setServerPatterns((prev) => prev.filter((item) => item.id !== serverId).map((item, index) => ({ ...item, priority: index + 1 })))
    const wasSaved = savedServerPatterns.some((item) => item.id === serverId)
    if (wasSaved) {
      setRemovedServerIds((prev) => (prev.includes(serverId) ? prev : [...prev, serverId]))
    }
    if (activeServerId === serverId) {
      setActiveServerId(null)
      setActiveUrl(null)
    }
  }

  const getAdminRequestHeaders = async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    return headers
  }

  const applyChanges = async () => {
    if (isSaving) return
    if (!hasPendingChanges) {
      toast.message('ℹ️ لا توجد تعديلات جديدة')
      return
    }
    setIsSaving(true)
    try {
      const payload = serverPatterns.map((item, index) => ({
        id: item.id.trim(),
        name: item.name.trim() || item.id.trim(),
        base: item.base.trim(),
        movie_template: item.movie_template.trim() || null,
        tv_template: item.tv_template.trim() || null,
        is_active: item.is_active,
        supports_movie: item.supports_movie,
        supports_tv: item.supports_tv,
        is_download: item.is_download,
        priority: index + 1,
        locked_subtitle_lang: item.locked_subtitle_lang || null,
        subtitle_format: item.subtitle_format || null,
        format_locked: item.format_locked === true
      }))
      const validPayload = payload.filter((item) => item.id.length > 0)
      if (validPayload.length === 0) {
        toast.error('❌ لا توجد سيرفرات صالحة')
        return
      }

      logger.info('📤 Sending bulk upsert request', { payload: validPayload })

      // Use CockroachDB API
      const response = await fetch(`${API_BASE}/api/server-configs/bulk-upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: validPayload })
      })

      logger.info('📥 Response status', { status: response.status })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.details || errorData.error || 'Failed to save server configurations')
      }

      const result = await response.json()
      logger.info('✅ Success', { result })

      // Delete removed servers
      for (const id of removedServerIds) {
        logger.info('🗑️ Deleting server', { id })
        await fetch(`${API_BASE}/api/server-configs/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        })
      }

      setSavedServerPatterns(serverPatterns)
      setRemovedServerIds([])
      setConfigSource('database')
      toast.success('✅ تم اعتماد التعديلات بنجاح')
    } catch (error: any) {
      console.error('❌ Failed to apply changes:', error)
      logger.error('Failed to apply server config changes', error)
      toast.error('❌ فشل الاعتماد - تأكد من تشغيل API')
    } finally {
      setIsSaving(false)
    }
  }

  const getTemplateValue = (mode: 'movie' | 'tv') => {
    if (!selectedPattern) return ''
    return mode === 'movie' ? selectedPattern.movie_template : selectedPattern.tv_template
  }

  const setTemplateValue = (mode: 'movie' | 'tv', value: string) => {
    if (!selectedPattern) return
    if (mode === 'movie') {
      updateServerPattern(selectedPattern.id, { movie_template: value })
      return
    }
    updateServerPattern(selectedPattern.id, { tv_template: value })
  }

  const appendTemplateToken = (mode: 'movie' | 'tv', token: (typeof TEMPLATE_TOKENS)[number]) => {
    const current = getTemplateValue(mode).trim()
    const separator = current.length === 0 || current.endsWith('/') || current.endsWith('=') ? '' : '/'
    setTemplateValue(mode, `${current}${separator}${token}`)
  }

  const applySuggestedTemplate = (mode: 'movie' | 'tv') => {
    if (!selectedPattern) return
    const suggested = SUGGESTED_TEMPLATES[selectedPattern.id]?.[mode]
    if (!suggested) {
      toast.error('❌ لا يوجد قالب مقترح')
      return
    }
    setTemplateValue(mode, suggested)
    toast.success(`✅ تم تطبيق القالب`)
  }

  const getTemplatePreview = (mode: 'movie' | 'tv') => {
    if (!selectedPattern) return ''
    const s = Math.max(1, Number(season) || 1)
    const e = Math.max(1, Number(episode) || 1)
    const safeTmdbId = Number(tmdbId) || 550
    const providerForPreview = {
      ...selectedPattern,
      movie_template: mode === 'movie' ? getTemplateValue('movie') : selectedPattern.movie_template,
      tv_template: mode === 'tv' ? getTemplateValue('tv') : selectedPattern.tv_template
    }
    return generateServerUrl(providerForPreview, mode, safeTmdbId, s, e, imdbId, {
      language: subtitleLang,
      disableFallback: true
    })
  }

  const renderTemplateBuilder = (mode: 'movie' | 'tv', label: string) => {
    if (!selectedPattern) return null
    const templateValue = getTemplateValue(mode)

    return (
      <div className="bg-black/30 border border-white/10 rounded-lg p-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-300 font-bold">{label}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => applySuggestedTemplate(mode)}
              className="px-2 py-1 rounded-md text-[11px] font-bold border bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
            >
              قالب مقترح
            </button>
            <button
              onClick={() => setTemplateValue(mode, '')}
              className="px-2 py-1 rounded-md text-[11px] font-bold border bg-red-500/10 text-red-300 border-red-500/30"
            >
              مسح
            </button>
          </div>
        </div>
        <input
          value={templateValue}
          onChange={(e) => setTemplateValue(mode, e.target.value)}
          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs w-full font-mono"
          dir="ltr"
          placeholder={mode === 'movie' ? 'https://.../{tmdbId}' : 'https://.../{tmdbId}/{season}/{episode}'}
        />
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_TOKENS.map((token) => (
            <button
              key={`${mode}-${token}`}
              onClick={() => appendTemplateToken(mode, token)}
              className="px-2 py-1 rounded-md text-[10px] font-bold border bg-zinc-800/80 border-zinc-700 text-zinc-200 hover:border-primary/40"
            >
              + {TEMPLATE_TOKEN_LABELS[token]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-2 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-2">

        {/* Header */}
        <div className="bg-zinc-900/50 p-2 rounded-xl border border-white/10">
          <div className="flex gap-1 items-center flex-wrap">
            <span className={clsx("text-[10px] px-1.5 rounded-full border h-8 flex items-center justify-center", hasPendingChanges ? "bg-amber-500/10 text-amber-400 border-amber-400/30" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20")}>
              {hasPendingChanges ? 'غير معتمد' : '✓'}
            </span>
            <button
              onClick={addServer}
              className="px-2 h-8 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-md text-[10px] font-bold transition-colors border border-cyan-500/20 flex items-center justify-center"
            >
              إضافة
            </button>
            <button
              onClick={applyChanges}
              className={clsx(
                "px-2 h-8 rounded-md text-[10px] font-bold transition-colors border flex items-center justify-center",
                isSaving
                  ? "bg-zinc-800/60 text-zinc-500 border-zinc-700 cursor-not-allowed"
                  : "bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
              )}
            >
              {isSaving ? 'جاري...' : 'اعتماد'}
            </button>
            <button
              onClick={saveAsDefault}
              className="px-2 h-8 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 rounded-md text-[10px] font-bold transition-colors border border-violet-500/20 flex items-center justify-center"
            >
              حفظ افتراضي
            </button>
            <button
              onClick={restoreDefaults}
              className="px-2 h-8 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-md text-[10px] font-bold transition-colors border border-indigo-500/20 flex items-center justify-center"
            >
              استعادة
            </button>
            <button
              onClick={copyWorking}
              className="px-2 h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-md text-[10px] font-bold transition-colors flex items-center justify-center gap-1 border border-emerald-500/20"
            >
              <Copy size={12} />
              نسخ
            </button>
            <button
              onClick={clearData}
              className="px-2 h-8 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md text-[10px] font-bold transition-colors flex items-center justify-center gap-1 border border-red-500/20"
            >
              <Trash2 size={12} />
              حذف
            </button>
            <a href="/" className="px-2 h-8 bg-white/10 hover:bg-white/20 text-white rounded-md text-[10px] font-bold transition-colors flex items-center justify-center gap-1">
              <ExternalLink size={12} className="rotate-180" />
              رئيسية
            </a>

            <input
              value={tmdbId}
              onChange={(e) => setTmdbId(e.target.value)}
              className="w-16 bg-black border border-zinc-700 rounded-lg px-2 text-sm font-mono focus:border-primary outline-none text-left h-8"
              placeholder="550"
              dir="ltr"
            />

            <button
              onClick={() => setType('movie')}
              className={clsx("px-2 rounded-md text-[10px] font-bold transition-all h-8 flex items-center justify-center", type === 'movie' ? "bg-primary text-black" : "bg-zinc-800 text-zinc-400")}
            >
              أفلام
            </button>
            <button
              onClick={() => setType('tv')}
              className={clsx("px-2 rounded-md text-[10px] font-bold transition-all h-8 flex items-center justify-center", type === 'tv' ? "bg-primary text-black" : "bg-zinc-800 text-zinc-400")}
            >
              مسلسلات
            </button>

            <input
              value={subtitleLang}
              onChange={(e) => setSubtitleLang(e.target.value.trim())}
              className="w-14 bg-black border border-zinc-700 rounded-md px-1.5 text-[10px] font-mono focus:border-primary outline-none text-left h-8"
              dir="ltr"
              placeholder="ar"
            />

            {type === 'tv' && (
              <>
                <input
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-12 bg-black border border-zinc-700 rounded-md px-1.5 text-[10px] font-mono focus:border-primary outline-none text-left h-8"
                  dir="ltr"
                  placeholder="S"
                />
                <input
                  value={episode}
                  onChange={(e) => setEpisode(e.target.value)}
                  className="w-12 bg-black border border-zinc-700 rounded-md px-1.5 text-[10px] font-mono focus:border-primary outline-none text-left h-8"
                  dir="ltr"
                  placeholder="E"
                />
              </>
            )}

            {familyStats.map(([family, count]) => {
              const colors = getFamilyColor(family)
              return (
                <span key={family} className={`px-1.5 rounded-md ${colors.bg} border ${colors.border} text-[9px] ${colors.text} h-8 flex items-center font-bold`}>
                  {family}: {count}
                </span>
              )
            })}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[154px_1fr] gap-2">

          {/* List Sidebar */}
          <div className="flex flex-col gap-2 bg-zinc-900/30 rounded-xl border border-white/5 overflow-hidden h-[680px] order-last lg:order-first">
            <div className="overflow-y-auto p-1 grid grid-cols-1 gap-1 content-start h-full">
              {sortedVisibleResults.map((server, index) => (
                <div
                  key={server.id}
                  onClick={(e) => {
                    // Block popup ads on server button clicks
                    e.preventDefault()
                    e.stopPropagation()

                    // Prevent window.open() calls during this click
                    const originalOpen = window.open
                    window.open = () => null

                    setTimeout(() => {
                      window.open = originalOpen
                    }, 100)

                    setActiveServerId(server.id)
                    setActiveUrl(server.url)
                  }}
                  className={clsx(
                    "p-1.5 rounded-lg border cursor-pointer transition-all group relative",
                    activeServerId === server.id
                      ? "bg-primary/10 border-primary"
                      : "bg-black/40 border-white/5 hover:bg-white/5"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={index + 1}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation()
                            moveServerToPosition(server.id, Number(e.target.value))
                          }}
                          className="text-[10px] h-6 w-11 rounded-md bg-[#1C1B1F] text-white font-black border border-zinc-500 px-1 hover:bg-[#0F0F14] transition-colors"
                        >
                          {sortedVisibleResults.map((_, i) => (
                            <option key={`${server.id}-pos-${i + 1}`} value={i + 1} className="bg-[#1C1B1F] text-white font-black">{i + 1}</option>
                          ))}
                        </select>
                        {(() => {
                          const family = serverFamily(server.name)
                          const colors = getFamilyColor(family)
                          return (
                            <span className={clsx("font-bold text-xs", activeServerId === server.id ? "text-primary" : colors.text)}>{server.name}</span>
                          )
                        })()}
                      </div>
                    </div>

                    <div className="flex gap-1 justify-start">
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-300 px-1.5 py-1 rounded font-bold border border-emerald-500/30"
                        title="تفعيل قفل الترجمة"
                      >
                        <input
                          type="checkbox"
                          checked={isTranslated(server.id)}
                          onChange={(e) => toggleTranslated(server.id, e.target.checked)}
                          className="accent-emerald-500"
                        />
                        <span>مترجم</span>
                      </label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const pattern = serverPatterns.find(p => p.id === server.id)
                          const newActiveState = !pattern?.is_active
                          updateServerPattern(server.id, { is_active: newActiveState })
                          toast.success(newActiveState ? '👁️ السيرفر ظاهر في الموقع' : '🙈 السيرفر مخفي من الموقع')
                        }}
                        className={clsx(
                          "text-[10px] px-1.5 py-1 rounded font-bold border transition-colors",
                          (() => {
                            const pattern = serverPatterns.find(p => p.id === server.id)
                            return pattern?.is_active === false
                              ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/25"
                              : "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25"
                          })()
                        )}
                        title={(() => {
                          const pattern = serverPatterns.find(p => p.id === server.id)
                          return pattern?.is_active === false ? "السيرفر مخفي - اضغط للإظهار" : "إخفاء من الموقع"
                        })()}
                      >
                        {(() => {
                          const pattern = serverPatterns.find(p => p.id === server.id)
                          return pattern?.is_active === false ? '🙈' : '👁️'
                        })()}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeServer(server.id)
                        }}
                        className="text-[10px] bg-red-500/15 text-red-300 px-1.5 py-1 rounded font-bold border border-red-500/30 hover:bg-red-500/25"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex flex-col gap-4 h-full">
            <div className="bg-black rounded-3xl border border-white/10 overflow-hidden relative h-[680px] sticky top-6 shadow-2xl shadow-black/50 grid grid-cols-[140px_1fr] scale-[0.99] origin-top" dir="ltr">
              <div className="border-r border-white/10 bg-zinc-950/80 p-1.5 overflow-y-auto space-y-1.5">
                <div className="text-[8px] font-bold text-zinc-500 px-1 mb-0.5">أفلام</div>
                {quickPicks.filter(p => p.type === 'movie').map((pick) => (
                  editingPickId === pick.id ? (
                    <div key={pick.id} className="space-y-1 quick-pick-edit">
                      <input
                        value={editingPickTmdbId}
                        onChange={(e) => setEditingPickTmdbId(e.target.value)}
                        className="w-full px-1.5 py-1 rounded text-[9px] bg-zinc-800 border border-zinc-600 text-white font-mono"
                        placeholder="TMDB ID"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={savePickEdit}
                          className="flex-1 px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={cancelPickEdit}
                          className="flex-1 px-1.5 py-0.5 rounded text-[8px] bg-red-500/20 text-red-400 border border-red-500/30"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={pick.id}
                      onClick={() => { setTmdbId(pick.id); setType(pick.type) }}
                      onDoubleClick={() => startEditingPick(pick)}
                      className={clsx(
                        "w-full text-left px-1.5 py-1 rounded border text-[9px] font-bold transition-colors",
                        tmdbId === pick.id && type === pick.type
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-black/40 border-white/10 text-zinc-300 hover:bg-white/5"
                      )}
                    >
                      {pick.name}
                    </button>
                  )
                ))}

                <div className="text-[8px] font-bold text-zinc-500 px-1 mb-0.5 mt-2">مسلسلات</div>
                {quickPicks.filter(p => p.type === 'tv').map((pick) => (
                  editingPickId === pick.id ? (
                    <div key={pick.id} className="space-y-1 quick-pick-edit">
                      <input
                        value={editingPickTmdbId}
                        onChange={(e) => setEditingPickTmdbId(e.target.value)}
                        className="w-full px-1.5 py-1 rounded text-[9px] bg-zinc-800 border border-zinc-600 text-white font-mono"
                        placeholder="TMDB ID"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={savePickEdit}
                          className="flex-1 px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        >
                          حفظ
                        </button>
                        <button
                          onClick={cancelPickEdit}
                          className="flex-1 px-1.5 py-0.5 rounded text-[8px] bg-red-500/20 text-red-400 border border-red-500/30"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={pick.id}
                      onClick={() => { setTmdbId(pick.id); setType(pick.type) }}
                      onDoubleClick={() => startEditingPick(pick)}
                      className={clsx(
                        "w-full text-left px-1.5 py-1 rounded border text-[9px] font-bold transition-colors",
                        tmdbId === pick.id && type === pick.type
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-black/40 border-white/10 text-zinc-300 hover:bg-white/5"
                      )}
                    >
                      {pick.name}
                    </button>
                  )
                ))}
              </div>
              <div className="flex flex-col">
                <div className="p-2 border-b border-white/10 bg-zinc-900 flex items-center justify-between gap-2" dir="rtl">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Monitor className="text-primary flex-shrink-0" size={16} />
                    <input
                      value={editableUrl}
                      onChange={(e) => {
                        setEditableUrl(e.target.value)
                        setActiveServerId(null)
                        setActiveUrl(e.target.value || null)
                      }}
                      className="font-mono text-[10px] text-zinc-300 bg-black/40 border border-white/10 rounded-lg px-2 py-1 flex-1 min-w-0"
                      dir="ltr"
                      placeholder="Select a server"
                    />
                    {editableUrl && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(editableUrl)
                          toast.success('تم نسخ الرابط')
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-colors flex-shrink-0"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {selectedPattern && (
                      <div className="flex items-center gap-1">
                        <select
                          value={selectedPattern.subtitle_format || ''}
                          onChange={(e) => {
                            const newFormat = e.target.value || null

                            // تحقق من القفل
                            if (selectedPattern.format_locked) {
                              toast.error('🔒 الصيغة مقفولة! افتح القفل أولاً من مربع "مترجم"')
                              return
                            }

                            updateServerPattern(selectedPattern.id, { subtitle_format: newFormat })

                            // Immediately update the active URL with the new format
                            const s = Math.max(1, Number(season) || 1)
                            const ep = Math.max(1, Number(episode) || 1)
                            const safeTmdbId = Number(tmdbId) || 0
                            const effectiveLang = selectedPattern.locked_subtitle_lang || subtitleLang

                            let newUrl = generateServerUrl(
                              selectedPattern,
                              type,
                              safeTmdbId,
                              s,
                              ep,
                              imdbId,
                              {
                                language: effectiveLang,
                                disableFallback: true
                              }
                            )

                            // Apply the new subtitle format
                            if (newFormat && newUrl) {
                              const separator = newUrl.includes('?') ? '&' : '?'
                              newUrl = `${newUrl}${separator}${newFormat}`
                            }

                            setActiveUrl(newUrl)
                            setEditableUrl(newUrl)
                          }}
                          className={clsx(
                            "text-[10px] font-bold border px-2 py-1 rounded-lg transition-colors",
                            selectedPattern.format_locked
                              ? "bg-zinc-800/50 text-zinc-500 border-zinc-700 cursor-not-allowed"
                              : "bg-violet-500/15 text-violet-300 border-violet-500/30 hover:bg-violet-500/25"
                          )}
                          title={selectedPattern.format_locked ? "🔒 مقفول - افتح القفل من مربع مترجم" : "صيغة الترجمة"}
                          disabled={selectedPattern.format_locked}
                        >
                          <option value="">صيغة ترجمة</option>
                          {SUBTITLE_FORMATS.map((format) => (
                            <option key={format.value} value={format.value}>
                              {format.label}
                            </option>
                          ))}
                        </select>

                        {/* أيقونة القفل */}
                        {selectedPattern.format_locked && (
                          <span
                            className="text-[10px] text-amber-400"
                            title="الصيغة مقفولة - افتح القفل من مربع مترجم"
                          >
                            🔒
                          </span>
                        )}

                        {/* زر الحفظ السريع */}
                        {selectedPattern.subtitle_format && !selectedPattern.format_locked && (
                          <button
                            onClick={async () => {
                              try {
                                const payload = {
                                  id: selectedPattern.id.trim(),
                                  name: selectedPattern.name.trim(),
                                  base: selectedPattern.base.trim(),
                                  movie_template: selectedPattern.movie_template.trim() || null,
                                  tv_template: selectedPattern.tv_template.trim() || null,
                                  is_active: selectedPattern.is_active,
                                  supports_movie: selectedPattern.supports_movie,
                                  supports_tv: selectedPattern.supports_tv,
                                  is_download: selectedPattern.is_download,
                                  priority: selectedPattern.priority,
                                  locked_subtitle_lang: selectedPattern.locked_subtitle_lang || null,
                                  subtitle_format: selectedPattern.subtitle_format || null,
                                  format_locked: selectedPattern.format_locked === true
                                }

                                const response = await fetch(`${API_BASE}/api/server-configs/bulk-upsert`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ configs: [payload] })
                                })

                                if (!response.ok) throw new Error('Failed to save')

                                // Update saved patterns
                                setSavedServerPatterns(prev =>
                                  prev.map(p => p.id === selectedPattern.id ? selectedPattern : p)
                                )

                                toast.success('💾 تم الحفظ')
                              } catch (error) {
                                toast.error('❌ فشل الحفظ')
                              }
                            }}
                            className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg hover:bg-emerald-500/25 transition-colors flex items-center gap-1"
                            title="حفظ الصيغة للسيرفر فوراً"
                          >
                            💾
                          </button>
                        )}
                      </div>
                    )}
                    {activeServerId && (
                      <span className="text-[10px] text-zinc-300 font-black px-1.5 py-0.5 rounded border border-white/10">{serverCodeById[activeServerId] || ''}</span>
                    )}
                    {editableUrl && (
                      <a href={editableUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-colors">
                        <ExternalLink size={12} />
                        خارجي
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex-1 bg-zinc-950 relative">
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full border-0"
                      scrolling="no"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-4">
                      <Play size={48} className="opacity-20" />
                      <p className="text-sm">اختر سيرفر</p>
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-white/10 bg-zinc-900" dir="rtl">
                  {selectedPattern && (
                    <div className="grid grid-cols-1 gap-2">
                      <div className="bg-black/30 border border-white/10 rounded-lg p-2">
                        <label className="text-[11px] text-zinc-300 font-bold block mb-1">دومين السيرفر</label>
                        <input
                          value={selectedPattern.base}
                          onChange={(e) => updateServerPattern(selectedPattern.id, { base: e.target.value })}
                          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs w-full font-mono"
                          dir="ltr"
                          placeholder="https://vidsrc.vip/"
                        />
                      </div>
                      {type === 'movie' ? (
                        <div className="md:col-span-2">{renderTemplateBuilder('movie', 'منطق رابط الفيلم')}</div>
                      ) : (
                        <div className="md:col-span-2">{renderTemplateBuilder('tv', 'منطق رابط المسلسل')}</div>
                      )}
                      <label className="flex items-center gap-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                        <input type="checkbox" checked={selectedPattern.is_active} onChange={(e) => updateServerPattern(selectedPattern.id, { is_active: e.target.checked })} />
                        مفعل
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                تعليمات اختبار الترجمة
              </h3>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-xs font-bold">مترجم</span>
                  علّم المربع عند ظهور ترجمة عربية صحيحة لنفس المحتوى.
                </li>
                <li className="flex items-center gap-2">
                  كل سيرفر له مربع مستقل، وكل فيلم أو مسلسل له حفظ مستقل.
                </li>
              </ul>
            </div>
            <div className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5">
              <h3 className="text-lg font-bold text-white mb-3">روابط خارجية سريعة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {externalLinks.map((server) => (
                  <a
                    key={`external-${server.id}`}
                    href={server.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 hover:border-primary/40 text-xs font-bold text-zinc-300 hover:text-white transition-colors truncate"
                  >
                    {(serverCodeById[server.id] || 'V?')} — {server.name}
                  </a>
                ))}
              </div>
            </div>
            <div className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5">
              <h3 className="text-lg font-bold text-white mb-3">روابط التحميل</h3>
              <div className="space-y-2">
                {downloadLinks.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 hover:border-primary/40 text-xs font-bold text-zinc-300 hover:text-white transition-colors truncate"
                    >
                      {item.name}
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(item.url)
                        toast.success('تم نسخ رابط التحميل')
                      }}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold"
                    >
                      نسخ
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
