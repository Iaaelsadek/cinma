import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { Play, ExternalLink, Monitor, Trash2, Copy, Pencil, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
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
}

type TemplateEditorState = {
  domain: string
  segments: string[]
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
  priority: index + 1
}))

const TEMPLATE_TOKENS = ['{tmdbId}', '{imdbId}', '{season}', '{episode}', '{type}', '{lang}'] as const
const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || ''
const parseTemplateEditorState = (template: string): TemplateEditorState => {
  const cleaned = template.trim().replace(/^https?:\/\//i, '')
  const chunks = cleaned.split('/').filter(Boolean)
  const domain = chunks[0] || ''
  const segments = chunks.slice(1)
  return {
    domain,
    segments: segments.length > 0 ? segments : ['{tmdbId}']
  }
}

const composeTemplateFromState = (state: TemplateEditorState) => {
  const domain = state.domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, 'www.')
  const segments = state.segments.map((s) => s.trim()).filter(Boolean)
  if (!domain) return ''
  return `https://${domain}${segments.length ? `/${segments.join('/')}` : ''}`
}

export const ServerTester = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tmdbId, setTmdbId] = useState(searchParams.get('id') || '550')
  const [type, setType] = useState<'movie' | 'tv'>('movie')
  const [season, setSeason] = useState('1')
  const [episode, setEpisode] = useState('1')
  const [imdbId, setImdbId] = useState('')
  const [activeServerId, setActiveServerId] = useState<string | null>(null)
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [editableUrl, setEditableUrl] = useState('')
  const [results, setResults] = useState<ServerResult[]>([])
  const [serverPatterns, setServerPatterns] = useState<ServerPattern[]>(DEFAULT_SERVER_PATTERNS)
  const [savedServerPatterns, setSavedServerPatterns] = useState<ServerPattern[]>(DEFAULT_SERVER_PATTERNS)
  const [removedServerIds, setRemovedServerIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [translationMarks, setTranslationMarks] = useState<TranslationMarks>({})
  const [configSource, setConfigSource] = useState<'database' | 'local'>('local')
  const [subtitleLang, setSubtitleLang] = useState('ar')
  const [editingTemplate, setEditingTemplate] = useState<'movie' | 'tv' | null>(null)

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
    } catch (e) {
      logger.error('Failed to load saved results', e)
    }
  }, [])

  useEffect(() => {
    const loadServerConfigs = async () => {
      const { data, error } = await supabase
        .from('server_provider_configs')
        .select('*')
        .order('priority', { ascending: true })

      if (error || !data || data.length === 0) {
        setConfigSource('local')
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
        priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : index + 1
      }))

      setServerPatterns(mapped)
      setSavedServerPatterns(mapped)
      setRemovedServerIds([])
      setConfigSource('database')
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
      return {
        id: p.id || `server-${idx}`,
        name: p.name,
        url: generateServerUrl(p, type, safeTmdbId, s, e, imdbId, {
          language: subtitleLang,
          disableFallback: true
        }),
        status: savedMap[p.id] || savedMap[p.name] || 'unknown'
      }
    })
    setResults(list)
    setActiveServerId((prev) => {
      if (prev && list.some((item) => item.id === prev)) return prev
      return list[0]?.id || null
    })
  }, [tmdbId, type, imdbId, season, episode, serverPatterns, subtitleLang])

  useEffect(() => {
    if (!activeServerId) {
      setActiveUrl(null)
      return
    }
    const current = results.find((item) => item.id === activeServerId)
    setActiveUrl(current?.url || null)
  }, [activeServerId, results])

  useEffect(() => {
    setEditableUrl(activeUrl || '')
  }, [activeUrl])

  const QUICK_PICKS = [
    { id: '424', name: 'Schindlers List', type: 'movie' },
    { id: '238', name: 'The Godfather', type: 'movie' },
    { id: '597', name: 'Titanic', type: 'movie' },
    { id: '27205', name: 'Inception', type: 'movie' },
    { id: '872585', name: 'Oppenheimer', type: 'movie' },
    { id: '1668', name: 'Friends (TV)', type: 'tv' },
    { id: '1418', name: 'The Big Bang Theory (TV)', type: 'tv' },
    { id: '1396', name: 'Breaking Bad (TV)', type: 'tv' },
    { id: '1399', name: 'Game of Thrones (TV)', type: 'tv' },
    { id: '93405', name: 'Squid Game (TV)', type: 'tv' },
  ] as const

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
        toast.success('تم حذف البيانات المحفوظة')
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
        toast.error('لا توجد سيرفرات تعمل حالياً لنسخها')
        return
    }
    navigator.clipboard.writeText(working)
    toast.success(`تم نسخ ${results.filter(r => r.status !== 'unknown' && r.status !== 'broken').length} سيرفر للحافظة`)
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
    const base = API_BASE ? API_BASE.replace(/\/$/, '') : ''
    return `${base}/api/embed-proxy?url=${encodeURIComponent(activeUrl)}`
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
        priority: prev.length + 1
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

  const saveConfigsThroughProxy = async (
    payload: Array<{
      id: string
      name: string
      base: string
      movie_template: string | null
      tv_template: string | null
      is_active: boolean
      supports_movie: boolean
      supports_tv: boolean
      is_download: boolean
      priority: number
    }>,
    deletedIds: string[]
  ) => {
    const headers = await getAdminRequestHeaders()
    for (const row of payload) {
      const updateBody = {
        name: row.name,
        base: row.base,
        movie_template: row.movie_template,
        tv_template: row.tv_template,
        is_active: row.is_active,
        supports_movie: row.supports_movie,
        supports_tv: row.supports_tv,
        is_download: row.is_download,
        priority: row.priority
      }
      const updateRes = await fetch(`${API_BASE}/api/admin/proxy/server_provider_configs/${encodeURIComponent(row.id)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateBody)
      })
      if (!updateRes.ok) {
        const createRes = await fetch(`${API_BASE}/api/admin/proxy/server_provider_configs`, {
          method: 'POST',
          headers,
          body: JSON.stringify(row)
        })
        if (!createRes.ok) {
          throw new Error('فشل الحفظ عبر قناة الأدمن')
        }
      }
    }
    for (const id of deletedIds) {
      const deleteRes = await fetch(`${API_BASE}/api/admin/proxy/server_provider_configs/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers
      })
      if (!deleteRes.ok) {
        throw new Error('فشل حذف سيرفر عبر قناة الأدمن')
      }
    }
  }

  const applyChanges = async () => {
    if (isSaving) return
    if (!hasPendingChanges) {
      toast.message('لا توجد تعديلات جديدة لاعتمادها')
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
        priority: index + 1
      }))
      const validPayload = payload.filter((item) => item.id.length > 0)
      if (validPayload.length === 0) {
        toast.error('لا توجد سيرفرات صالحة للحفظ')
        return
      }
      let usedProxy = false
      const { error: upsertError } = await supabase
        .from('server_provider_configs')
        .upsert(validPayload, { onConflict: 'id' })
      if (upsertError) {
        usedProxy = true
        await saveConfigsThroughProxy(validPayload, removedServerIds)
      } else if (removedServerIds.length > 0) {
        const { error: deleteError } = await supabase.from('server_provider_configs').delete().in('id', removedServerIds)
        if (deleteError) {
          usedProxy = true
          await saveConfigsThroughProxy(validPayload, removedServerIds)
        }
      }

      setSavedServerPatterns(serverPatterns)
      setRemovedServerIds([])
      setConfigSource('database')
      toast.success(usedProxy ? 'تم اعتماد التعديلات عبر قناة الأدمن' : 'تم اعتماد تعديلات السيرفرات على الموقع بالكامل')
    } catch (error: any) {
      logger.error('Failed to apply server config changes', error)
      toast.error(error?.message || 'فشل اعتماد التعديلات. تأكد من صلاحية الأدمن وتشغيل API')
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

  const updateTemplateDomain = (mode: 'movie' | 'tv', domain: string) => {
    const state = parseTemplateEditorState(getTemplateValue(mode))
    const next = composeTemplateFromState({ ...state, domain })
    setTemplateValue(mode, next)
  }

  const updateTemplateSegment = (mode: 'movie' | 'tv', index: number, value: string) => {
    const state = parseTemplateEditorState(getTemplateValue(mode))
    const nextSegments = [...state.segments]
    nextSegments[index] = value
    const next = composeTemplateFromState({ ...state, segments: nextSegments })
    setTemplateValue(mode, next)
  }

  const addTemplateSegment = (mode: 'movie' | 'tv') => {
    const state = parseTemplateEditorState(getTemplateValue(mode))
    const next = composeTemplateFromState({ ...state, segments: [...state.segments, '{tmdbId}'] })
    setTemplateValue(mode, next)
  }

  const removeTemplateSegment = (mode: 'movie' | 'tv', index: number) => {
    const state = parseTemplateEditorState(getTemplateValue(mode))
    const nextSegments = state.segments.filter((_, i) => i !== index)
    const next = composeTemplateFromState({
      ...state,
      segments: nextSegments.length ? nextSegments : ['{tmdbId}']
    })
    setTemplateValue(mode, next)
  }

  const renderTemplateBuilder = (mode: 'movie' | 'tv', label: string) => {
    if (!selectedPattern) return null
    const templateValue = getTemplateValue(mode)
    const parsed = parseTemplateEditorState(templateValue)
    const isEditing = editingTemplate === mode

    return (
      <div className="bg-black/30 border border-white/10 rounded-lg p-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-300 font-bold">{label}</span>
          <button
            onClick={() => setEditingTemplate((prev) => (prev === mode ? null : mode))}
            className={clsx(
              "px-2 py-1 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1",
              isEditing
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-zinc-800 text-zinc-300 border-zinc-700"
            )}
          >
            <Pencil size={12} />
            {isEditing ? 'إغلاق Edit' : 'Edit'}
          </button>
        </div>

        {!isEditing ? (
          <input
            value={templateValue}
            onChange={(e) => setTemplateValue(mode, e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs w-full font-mono"
            dir="ltr"
            placeholder={mode === 'movie' ? 'https://.../{tmdbId}' : 'https://.../{tmdbId}/{season}/{episode}'}
          />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <input
                value={parsed.domain}
                onChange={(e) => updateTemplateDomain(mode, e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono"
                dir="ltr"
                placeholder="example.com"
              />
              <span className="text-[11px] text-zinc-500">https://</span>
            </div>
            <div className="space-y-1">
              {parsed.segments.map((segment, index) => (
                <div key={`${mode}-segment-${index}`} className="grid grid-cols-[18px_170px_1fr_34px] gap-2 items-center">
                  <span className="text-zinc-600 text-center">/</span>
                  <select
                    value={TEMPLATE_TOKENS.includes(segment as any) ? segment : '__TEXT__'}
                    onChange={(e) => {
                      const next = e.target.value === '__TEXT__' ? '' : e.target.value
                      updateTemplateSegment(mode, index, next)
                    }}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[11px]"
                  >
                    <option value="__TEXT__">نص ثابت</option>
                    <option value="{tmdbId}">TMDB ID</option>
                    <option value="{imdbId}">IMDB ID</option>
                    <option value="{season}">Season</option>
                    <option value="{episode}">Episode</option>
                    <option value="{type}">Type</option>
                    <option value="{lang}">Lang</option>
                  </select>
                  <input
                    value={segment}
                    onChange={(e) => updateTemplateSegment(mode, index, e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono"
                    dir="ltr"
                    placeholder="movie أو {tmdbId}"
                  />
                  <button
                    onClick={() => removeTemplateSegment(mode, index)}
                    className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 flex items-center justify-center"
                    title="حذف الجزء"
                  >
                    <Minus size={12} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addTemplateSegment(mode)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold flex items-center gap-1"
            >
              <Plus size={12} />
              إضافة جزء للرابط
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-6 bg-zinc-900/50 p-6 rounded-3xl border border-white/10">
          <div className="flex justify-between items-center">
             <div className="text-right">
                <h1 className="text-2xl font-black text-primary flex items-center gap-3">
                    SERVER TESTER PRO
                    <span className={clsx("text-xs px-2 py-1 rounded-full border", hasPendingChanges ? "bg-amber-500/10 text-amber-400 border-amber-400/30" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20")}>
                      {hasPendingChanges ? 'تعديلات غير معتمدة' : 'مُعتمد'}
                    </span>
                </h1>
                <p className="text-zinc-500 text-sm">اختبار {visibleResults.length} سيرفر ظاهر (بدون BROKEN) | ينتموا إلى {familyStats.length} عائلة</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  مصدر الإعدادات: {configSource === 'database' ? 'قاعدة البيانات' : 'الإعدادات المحلية'} | افتح أي سيرفر من القائمة لتعديل منطق الرابط
                </p>
             </div>
             
             <div className="flex gap-2 items-center">
                <button
                    onClick={addServer}
                    className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold transition-colors border border-cyan-500/20"
                >
                    إضافة سيرفر
                </button>
                <button
                    onClick={applyChanges}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-colors border",
                      isSaving
                        ? "bg-zinc-800/60 text-zinc-500 border-zinc-700 cursor-not-allowed"
                        : "bg-primary/20 hover:bg-primary/30 text-primary border-primary/30"
                    )}
                >
                    {isSaving ? 'جاري الاعتماد...' : 'اعتماد التعديلات للموقع'}
                </button>
                <button 
                    onClick={copyWorking}
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-emerald-500/20"
                >
                    <Copy size={14} />
                    نسخ السيرفرات العاملة
                </button>
                <button 
                    onClick={clearData}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-red-500/20"
                >
                    <Trash2 size={14} />
                    حذف النتائج
                </button>
                <a href="/" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2">
                    <ExternalLink size={14} className="rotate-180" />
                    عودة للرئيسية
                </a>
             </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2 w-full">
                <label className="text-sm font-bold text-zinc-400">TMDB ID</label>
                <input 
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-lg font-mono focus:border-primary outline-none text-left"
                placeholder="e.g. 550"
                dir="ltr"
                />
            </div>
            
            <div className="flex gap-2">
                <button 
                onClick={() => setType('movie')}
                className={clsx("px-6 py-3 rounded-xl font-bold transition-all", type === 'movie' ? "bg-primary text-black" : "bg-zinc-800 text-zinc-400")}
                >
                أفلام
                </button>
                <button 
                onClick={() => setType('tv')}
                className={clsx("px-6 py-3 rounded-xl font-bold transition-all", type === 'tv' ? "bg-primary text-black" : "bg-zinc-800 text-zinc-400")}
                >
                مسلسلات
                </button>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-500 font-bold">لغة الترجمة</label>
              <input
                value={subtitleLang}
                onChange={(e) => setSubtitleLang(e.target.value.trim())}
                className="w-24 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono focus:border-primary outline-none text-left"
                dir="ltr"
                placeholder="ar"
              />
            </div>
            {type === 'tv' && (
              <div className="flex gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold">Season</label>
                  <input
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-24 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono focus:border-primary outline-none text-left"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-500 font-bold">Episode</label>
                  <input
                    value={episode}
                    onChange={(e) => setEpisode(e.target.value)}
                    className="w-24 bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm font-mono focus:border-primary outline-none text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {familyStats.map(([family, count]) => (
              <span key={family} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-zinc-300">
                {family}: {count}
              </span>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
          
          {/* List Sidebar */}
          <div className="flex flex-col gap-4 bg-zinc-900/30 rounded-3xl border border-white/5 overflow-hidden max-h-[920px] order-last lg:order-first">
            <div className="overflow-y-auto p-2 grid grid-cols-1 gap-2 content-start">
              {sortedVisibleResults.map((server, index) => (
                <div 
                  key={server.id}
                  onClick={() => {
                    window.setTimeout(() => {
                      setActiveServerId(server.id)
                      setActiveUrl(server.url)
                    }, 0)
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  className={clsx(
                    "p-2.5 rounded-xl border cursor-pointer transition-all group relative",
                    activeServerId === server.id
                      ? "bg-primary/10 border-primary" 
                      : "bg-black/40 border-white/5 hover:bg-white/5"
                  )}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={index + 1}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation()
                          moveServerToPosition(server.id, Number(e.target.value))
                        }}
                        className="text-[10px] h-6 w-12 rounded-md bg-primary/20 text-primary font-black border border-primary/40 px-1"
                      >
                        {sortedVisibleResults.map((_, i) => (
                          <option key={`${server.id}-pos-${i + 1}`} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                      <span className={clsx("font-black text-[10px] px-1.5 py-0.5 rounded border", activeServerId === server.id ? "text-primary border-primary/40 bg-primary/10" : "text-zinc-300 border-white/10")}>
                        {serverCodeById[server.id] || `V${index + 1}`}
                      </span>
                      <span className={clsx("font-bold text-xs", activeServerId === server.id ? "text-primary" : "text-zinc-300")}>{server.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 rounded font-bold">{serverFamily(server.name)}</span>
                        <label
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-1 rounded font-bold border border-emerald-500/30"
                        >
                          <input
                            type="checkbox"
                            checked={isTranslated(server.id)}
                            onChange={(e) => toggleTranslated(server.id, e.target.checked)}
                            className="accent-emerald-500"
                          />
                          مترجم
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeServer(server.id)
                          }}
                          className="text-[10px] bg-red-500/15 text-red-300 px-2 py-1 rounded font-bold border border-red-500/30 hover:bg-red-500/25"
                        >
                          حذف
                        </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 justify-end flex-wrap">
                     <button
                       onClick={(e) => {
                         e.stopPropagation()
                         window.open(server.url, '_blank', 'noopener,noreferrer')
                       }}
                       className="p-1 px-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-[11px] font-bold flex items-center gap-1"
                       title="مشاهدة خارجية"
                     >
                       <ExternalLink size={13} />
                       خارجي
                     </button>
                     <button
                       onClick={(e) => {
                         e.stopPropagation()
                         const s = Math.max(1, Number(season) || 1)
                         const ep = Math.max(1, Number(episode) || 1)
                         const safeTmdbId = Number(tmdbId) || 0
                         window.open(buildDlVidsrcUrl(type, safeTmdbId, s, ep), '_blank', 'noopener,noreferrer')
                       }}
                       className="p-1 px-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-[11px] font-bold"
                       title="تحميل"
                     >
                       تحميل
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Area */}
          <div className="flex flex-col gap-4 h-full">
            <div className="bg-black rounded-3xl border border-white/10 overflow-hidden relative h-[760px] sticky top-6 shadow-2xl shadow-black/50 grid grid-cols-[210px_1fr]" dir="ltr">
              <div className="border-r border-white/10 bg-zinc-950/80 p-3 overflow-y-auto space-y-2">
                {QUICK_PICKS.map((pick) => (
                  <button
                    key={pick.id}
                    onClick={() => { setTmdbId(pick.id); setType(pick.type as 'movie' | 'tv') }}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-lg border text-xs font-bold transition-colors",
                      tmdbId === pick.id && type === pick.type
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-black/40 border-white/10 text-zinc-300 hover:bg-white/5"
                    )}
                  >
                    {pick.name}
                  </button>
                ))}
              </div>
              <div className="flex flex-col">
                <div className="p-4 border-b border-white/10 bg-zinc-900 flex flex-col gap-2" dir="rtl">
                  <div className="flex items-center gap-2">
                    <Monitor className="text-primary" size={20} />
                    <input
                      value={editableUrl}
                      onChange={(e) => {
                        setEditableUrl(e.target.value)
                        setActiveServerId(null)
                        setActiveUrl(e.target.value || null)
                      }}
                      className="font-mono text-xs text-zinc-300 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 w-full"
                      dir="ltr"
                      placeholder="Select a server"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">المعاينة تعمل بالمشغل الأصلي المباشر بدون بروكسي</span>
                    {activeServerId && <span className="text-zinc-300 font-black">{serverCodeById[activeServerId] || ''}</span>}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {editableUrl && (
                      <a href={editableUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                        فتح خارجي
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                  {selectedPattern && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <input
                        value={selectedPattern.name}
                        onChange={(e) => updateServerPattern(selectedPattern.id, { name: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs"
                        placeholder="اسم السيرفر"
                      />
                      <input
                        value={selectedPattern.id}
                        readOnly
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-zinc-500"
                        placeholder="server_id"
                        dir="ltr"
                      />
                      <input
                        value={selectedPattern.base}
                        onChange={(e) => updateServerPattern(selectedPattern.id, { base: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs md:col-span-2 font-mono"
                        placeholder="Base URL"
                        dir="ltr"
                      />
                      <div className="md:col-span-2">{renderTemplateBuilder('movie', 'منطق رابط الفيلم')}</div>
                      <div className="md:col-span-2">{renderTemplateBuilder('tv', 'منطق رابط المسلسل')}</div>
                      <label className="flex items-center gap-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                        <input type="checkbox" checked={selectedPattern.is_active} onChange={(e) => updateServerPattern(selectedPattern.id, { is_active: e.target.checked })} />
                        مفعل
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                        <input type="checkbox" checked={selectedPattern.is_download} onChange={(e) => updateServerPattern(selectedPattern.id, { is_download: e.target.checked })} />
                        تحميل
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                        <input type="checkbox" checked={selectedPattern.supports_movie} onChange={(e) => updateServerPattern(selectedPattern.id, { supports_movie: e.target.checked })} />
                        أفلام
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                        <input type="checkbox" checked={selectedPattern.supports_tv} onChange={(e) => updateServerPattern(selectedPattern.id, { supports_tv: e.target.checked })} />
                        مسلسلات
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-zinc-950 relative">
                  {previewUrl ? (
                      <iframe 
                      src={previewUrl}
                      className="w-full h-full border-0"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      />
                  ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-4">
                          <Play size={48} className="opacity-20" />
                          <p className="text-sm">اختر سيرفر</p>
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
