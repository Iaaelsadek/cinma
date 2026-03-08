import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { Play, ExternalLink, Monitor, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '../../lib/logger'
import { tmdb } from '../../lib/tmdb'
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

const DEFAULT_SERVER_PATTERNS = SERVER_PROVIDERS

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
  const [serverPatterns, setServerPatterns] = useState(DEFAULT_SERVER_PATTERNS)
  const [translationMarks, setTranslationMarks] = useState<TranslationMarks>({})

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
      const savedOrder = localStorage.getItem('server-tester-pattern-order')
      if (savedOrder) {
        const names = JSON.parse(savedOrder) as string[]
        const byName = new Map(DEFAULT_SERVER_PATTERNS.map((p) => [p.name, p]))
        const ordered = names.map((name) => byName.get(name)).filter((p): p is typeof DEFAULT_SERVER_PATTERNS[number] => Boolean(p))
        const leftovers = DEFAULT_SERVER_PATTERNS.filter((p) => !names.includes(p.name))
        setServerPatterns([...ordered, ...leftovers])
      }
    } catch (e) {
      logger.error('Failed to load saved results', e)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('server-tester-pattern-order', JSON.stringify(serverPatterns.map((p) => p.name)))
  }, [serverPatterns])

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
    const nameCount = new Map<string, number>()

    const s = Math.max(1, Number(season) || 1)
    const e = Math.max(1, Number(episode) || 1)
    const list = serverPatterns.map((p, idx) => {
      const seen = nameCount.get(p.name) || 0
      nameCount.set(p.name, seen + 1)
      const mappedName = p.name === 'VidSrc.net' && seen > 0 ? 'VidSrc.net (Alt)' : p.name
      const safeTmdbId = Number(tmdbId) || 0
      return {
        id: `server-${idx}`,
        name: mappedName,
        url: generateServerUrl(p, type, safeTmdbId, s, e, imdbId),
        status: savedMap[mappedName] || 'unknown'
      }
    })
    setResults(list)
    setActiveServerId(null)
  }, [tmdbId, type, imdbId, season, episode, serverPatterns])

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

  const updateStatus = (id: string, status: ServerStatus) => {
    setResults(prev => {
        const next = prev.map(r => r.id === id ? { ...r, status } : r)
        
        // Save to localStorage
        const mapToSave: Record<string, ServerStatus> = {}
        next.forEach(r => {
            if (r.status !== 'unknown') {
                mapToSave[r.name] = r.status
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
  const externalLinks = useMemo(() => sortedVisibleResults.slice(0, 12), [sortedVisibleResults])
  const contentScopeKey = useMemo(() => {
    const s = Math.max(1, Number(season) || 1)
    const e = Math.max(1, Number(episode) || 1)
    return type === 'tv' ? `tv_${tmdbId}_${s}_${e}` : `movie_${tmdbId}`
  }, [tmdbId, type, season, episode])
  const getTranslationMarkKey = (serverName: string) => `${contentScopeKey}__${serverName}`
  const isTranslated = (serverName: string) => Boolean(translationMarks[getTranslationMarkKey(serverName)])
  const toggleTranslated = (serverName: string, checked: boolean) => {
    setTranslationMarks(prev => {
      const key = getTranslationMarkKey(serverName)
      const next: TranslationMarks = { ...prev, [key]: checked }
      localStorage.setItem('server-tester-translation-marks', JSON.stringify(next))
      return next
    })
  }
  const moveServerToPosition = (serverName: string, targetPosition: number) => {
    setServerPatterns((prev) => {
      const from = prev.findIndex((p) => p.name === serverName)
      const to = Math.max(0, Math.min(prev.length - 1, targetPosition - 1))
      if (from < 0 || from === to) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
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

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-6 bg-zinc-900/50 p-6 rounded-3xl border border-white/10">
          <div className="flex justify-between items-center">
             <div className="text-right">
                <h1 className="text-2xl font-black text-primary flex items-center gap-3">
                    SERVER TESTER PRO
                    <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full border border-emerald-500/20">Auto-Save Active</span>
                </h1>
                <p className="text-zinc-500 text-sm">اختبار {visibleResults.length} سيرفر ظاهر (بدون BROKEN) | ينتموا إلى {familyStats.length} عائلة</p>
             </div>
             
             <div className="flex gap-2 items-center">
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_760px] gap-8 h-[800px]">
          
          {/* List Sidebar */}
          <div className="flex flex-col gap-4 bg-zinc-900/30 rounded-3xl border border-white/5 overflow-hidden h-full order-last lg:order-first">
            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-2 content-start">
              {sortedVisibleResults.map((server, index) => (
                <div 
                  key={server.id}
                  onClick={() => {
                    setActiveServerId(server.id)
                    setActiveUrl(server.url)
                  }}
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
                          moveServerToPosition(server.name, Number(e.target.value))
                        }}
                        className="text-[10px] h-6 w-12 rounded-md bg-primary/20 text-primary font-black border border-primary/40 px-1"
                      >
                        {sortedVisibleResults.map((_, i) => (
                          <option key={`${server.id}-pos-${i + 1}`} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
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
                            checked={isTranslated(server.name)}
                            onChange={(e) => toggleTranslated(server.name, e.target.checked)}
                            className="accent-emerald-500"
                          />
                          مترجم
                        </label>
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

          {/* Preview Area - Fixed Width */}
          <div className="flex flex-col gap-4 h-full">
            <div className="bg-black rounded-3xl border border-white/10 overflow-hidden relative h-[460px] sticky top-6 shadow-2xl shadow-black/50 grid grid-cols-[220px_1fr]" dir="ltr">
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
                      onChange={(e) => setEditableUrl(e.target.value)}
                      className="font-mono text-xs text-zinc-300 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 w-full"
                      dir="ltr"
                      placeholder="Select a server"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setActiveServerId(null)
                        setActiveUrl(editableUrl || null)
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-black text-xs font-bold hover:opacity-90"
                    >
                      تطبيق
                    </button>
                    {editableUrl && (
                      <a href={editableUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex-1 bg-zinc-950 relative">
                  {activeUrl ? (
                      <iframe 
                      src={activeUrl}
                      className="w-full h-full border-0"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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

            <div className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5 flex-1">
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
                    {server.name}
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
