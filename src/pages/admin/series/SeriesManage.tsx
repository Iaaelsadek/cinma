import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { toast } from 'sonner'
import { ChevronRight, Tv, Calendar, Plus, Layers, Trash2, Pencil, Save, X, Film } from 'lucide-react'

type SeriesRecord = {
  id: number
  name: string
  overview: string
  first_air_date: string | null
  poster_path: string | null
  backdrop_path: string | null
  trailer_url: string | null
  is_active: boolean | null
}

type SeasonRecord = {
  id: number
  series_id: number
  season_number: number
  name: string
  overview: string | null
  air_date: string | null
  poster_path: string | null
}

type EpisodeRecord = {
  id: number
  season_id: number
  episode_number: number
  name: string
  overview: string | null
  air_date: string | null
  still_path: string | null
  embed_links: Record<string, string> | null
  duration?: number | null
  video_url?: string | null
}

type SeasonFormState = {
  id: number | null
  season_number: number
  name: string
  overview: string
  air_date: string
  poster_path: string
}

type EpisodeFormState = {
  id: number | null
  episode_number: number
  name: string
  overview: string
  air_date: string
  still_path: string
  duration: number
  video_url: string
}

const toText = (value: unknown) => {
  if (typeof value === 'string') return value.trim()
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const localeSafeCompare = (a: unknown, b: unknown) => {
  const av = toText(a)
  const bv = toText(b)
  return av.localeCompare(bv, 'en', { numeric: true, sensitivity: 'base' })
}

const initialSeasonForm: SeasonFormState = {
  id: null,
  season_number: 1,
  name: '',
  overview: '',
  air_date: '',
  poster_path: ''
}

const initialEpisodeForm: EpisodeFormState = {
  id: null,
  episode_number: 1,
  name: '',
  overview: '',
  air_date: '',
  still_path: '',
  duration: 0,
  video_url: ''
}

const SeriesManage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const tvId = Number(id)
  const [loading, setLoading] = useState(true)
  const [savingSeries, setSavingSeries] = useState(false)
  const [series, setSeries] = useState<SeriesRecord | null>(null)
  const [seriesForm, setSeriesForm] = useState({
    name: '',
    overview: '',
    first_air_date: '',
    poster_path: '',
    backdrop_path: '',
    trailer_url: '',
    status: 'active'
  })

  const [seasons, setSeasons] = useState<SeasonRecord[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null)
  const [seasonEditorOpen, setSeasonEditorOpen] = useState(false)
  const [seasonForm, setSeasonForm] = useState<SeasonFormState>(initialSeasonForm)
  const [savingSeason, setSavingSeason] = useState(false)

  const [episodes, setEpisodes] = useState<EpisodeRecord[]>([])
  const [episodeEditorOpen, setEpisodeEditorOpen] = useState(false)
  const [episodeForm, setEpisodeForm] = useState<EpisodeFormState>(initialEpisodeForm)
  const [savingEpisode, setSavingEpisode] = useState(false)

  const selectedSeason = useMemo(
    () => seasons.find((season) => season.id === selectedSeasonId) || null,
    [seasons, selectedSeasonId]
  )

  const loadSeries = async () => {
    if (!Number.isFinite(tvId) || tvId <= 0) return
    setLoading(true)
    const [{ data: seriesRow, error: seriesError }, { data: seasonsRows, error: seasonsError }] = await Promise.all([
      supabase.from('tv_series').select('id,name,overview,first_air_date,poster_path,backdrop_path,trailer_url,is_active').eq('id', tvId).maybeSingle(),
      supabase.from('seasons').select('id,series_id,season_number,name,overview,air_date,poster_path').eq('series_id', tvId)
    ])

    if (seriesError) {
      toast.error('فشل تحميل بيانات المسلسل')
      setLoading(false)
      return
    }
    if (!seriesRow) {
      setSeries(null)
      setLoading(false)
      return
    }

    const parsedSeries: SeriesRecord = {
      id: Number(seriesRow.id),
      name: toText(seriesRow.name),
      overview: toText(seriesRow.overview),
      first_air_date: seriesRow.first_air_date || null,
      poster_path: seriesRow.poster_path || null,
      backdrop_path: seriesRow.backdrop_path || null,
      trailer_url: seriesRow.trailer_url || null,
      is_active: seriesRow.is_active ?? true
    }
    setSeries(parsedSeries)
    setSeriesForm({
      name: parsedSeries.name,
      overview: parsedSeries.overview,
      first_air_date: parsedSeries.first_air_date || '',
      poster_path: parsedSeries.poster_path || '',
      backdrop_path: parsedSeries.backdrop_path || '',
      trailer_url: parsedSeries.trailer_url || '',
      status: parsedSeries.is_active === false ? 'inactive' : 'active'
    })

    const normalizedSeasons = (seasonsRows || [])
      .map((row) => ({
        id: Number(row.id),
        series_id: Number(row.series_id),
        season_number: Number(row.season_number || 0),
        name: toText(row.name),
        overview: row.overview || null,
        air_date: row.air_date || null,
        poster_path: row.poster_path || null
      }))
      .sort((a, b) => (a.season_number - b.season_number) || localeSafeCompare(a.name, b.name))

    if (seasonsError) {
      toast.error('فشل تحميل المواسم')
    }
    setSeasons(normalizedSeasons)
    const newSelected = normalizedSeasons.find((s) => s.id === selectedSeasonId)?.id || normalizedSeasons[0]?.id || null
    setSelectedSeasonId(newSelected)
    setLoading(false)
  }

  const loadEpisodes = async (seasonId: number | null) => {
    if (!seasonId) {
      setEpisodes([])
      return
    }
    const { data, error } = await supabase
      .from('episodes')
      .select('id,season_id,episode_number,name,overview,air_date,still_path,embed_links,duration,video_url')
      .eq('season_id', seasonId)

    if (error) {
      toast.error('فشل تحميل الحلقات')
      return
    }

    const normalized = (data || [])
      .map((row) => ({
        id: Number(row.id),
        season_id: Number(row.season_id),
        episode_number: Number(row.episode_number || 0),
        name: toText(row.name),
        overview: row.overview || null,
        air_date: row.air_date || null,
        still_path: row.still_path || null,
        embed_links: (row.embed_links as Record<string, string> | null) || null,
        duration: typeof (row as any).duration === 'number' ? Number((row as any).duration) : null,
        video_url: typeof (row as any).video_url === 'string' ? String((row as any).video_url) : null
      }))
      .sort((a, b) => (a.episode_number - b.episode_number) || localeSafeCompare(a.name, b.name))
    setEpisodes(normalized)
  }

  useEffect(() => {
    loadSeries()
  }, [tvId])

  useEffect(() => {
    loadEpisodes(selectedSeasonId)
  }, [selectedSeasonId])

  const openNewSeasonEditor = () => {
    const nextNumber = seasons.length > 0 ? Math.max(...seasons.map((s) => s.season_number || 0)) + 1 : 1
    setSeasonForm({ ...initialSeasonForm, season_number: nextNumber, name: `Season ${nextNumber}` })
    setSeasonEditorOpen(true)
  }

  const openEditSeasonEditor = (season: SeasonRecord) => {
    setSeasonForm({
      id: season.id,
      season_number: season.season_number || 1,
      name: season.name || `Season ${season.season_number || 1}`,
      overview: season.overview || '',
      air_date: season.air_date || '',
      poster_path: season.poster_path || ''
    })
    setSeasonEditorOpen(true)
  }

  const saveSeries = async () => {
    if (!series) return
    if (!toText(seriesForm.name)) {
      toast.error('اسم المسلسل مطلوب')
      return
    }
    setSavingSeries(true)
    const payload = {
      name: toText(seriesForm.name),
      overview: toText(seriesForm.overview),
      first_air_date: seriesForm.first_air_date || null,
      poster_path: toText(seriesForm.poster_path) || null,
      backdrop_path: toText(seriesForm.backdrop_path) || null,
      trailer_url: toText(seriesForm.trailer_url) || null,
      is_active: seriesForm.status === 'active'
    }
    const { error } = await supabase.from('tv_series').update(payload).eq('id', series.id)
    setSavingSeries(false)
    if (error) {
      toast.error('فشل حفظ بيانات المسلسل')
      return
    }
    toast.success('تم تحديث بيانات المسلسل')
    await loadSeries()
  }

  const deleteSeries = async () => {
    if (!series) return
    if (!confirm('هل أنت متأكد من حذف المسلسل بالكامل بجميع المواسم والحلقات؟')) return
    const { error } = await supabase.from('tv_series').delete().eq('id', series.id)
    if (error) {
      toast.error('فشل حذف المسلسل')
      return
    }
    toast.success('تم حذف المسلسل')
    navigate('/admin/series')
  }

  const saveSeason = async () => {
    if (!series) return
    if (!Number.isFinite(seasonForm.season_number) || seasonForm.season_number <= 0) {
      toast.error('رقم الموسم غير صالح')
      return
    }
    const payload = {
      series_id: series.id,
      season_number: Number(seasonForm.season_number),
      name: toText(seasonForm.name) || `Season ${seasonForm.season_number}`,
      overview: toText(seasonForm.overview) || null,
      air_date: seasonForm.air_date || null,
      poster_path: toText(seasonForm.poster_path) || null
    }
    setSavingSeason(true)
    if (seasonForm.id) {
      const { error } = await supabase.from('seasons').update(payload).eq('id', seasonForm.id)
      if (error) {
        setSavingSeason(false)
        toast.error('فشل تحديث الموسم')
        return
      }
      toast.success('تم تحديث الموسم')
    } else {
      const { error } = await supabase.from('seasons').insert(payload)
      if (error) {
        setSavingSeason(false)
        toast.error('فشل إضافة الموسم')
        return
      }
      toast.success('تمت إضافة الموسم')
    }
    setSavingSeason(false)
    setSeasonEditorOpen(false)
    setSeasonForm(initialSeasonForm)
    await loadSeries()
  }

  const removeSeason = async (season: SeasonRecord) => {
    if (!confirm(`هل أنت متأكد من حذف ${season.name || `Season ${season.season_number}`}؟`)) return
    const { error } = await supabase.from('seasons').delete().eq('id', season.id)
    if (error) {
      toast.error('فشل حذف الموسم')
      return
    }
    toast.success('تم حذف الموسم')
    await loadSeries()
  }

  const openNewEpisodeEditor = () => {
    if (!selectedSeason) return
    const nextEpisode = episodes.length > 0 ? Math.max(...episodes.map((e) => e.episode_number || 0)) + 1 : 1
    setEpisodeForm({
      ...initialEpisodeForm,
      episode_number: nextEpisode,
      name: `Episode ${nextEpisode}`
    })
    setEpisodeEditorOpen(true)
  }

  const openEditEpisodeEditor = (episode: EpisodeRecord) => {
    setEpisodeForm({
      id: episode.id,
      episode_number: episode.episode_number || 1,
      name: episode.name || `Episode ${episode.episode_number || 1}`,
      overview: episode.overview || '',
      air_date: episode.air_date || '',
      still_path: episode.still_path || '',
      duration: Number(episode.duration || 0),
      video_url: toText(episode.video_url) || toText(episode.embed_links?.direct)
    })
    setEpisodeEditorOpen(true)
  }

  const persistEpisodePayload = async (mode: 'insert' | 'update', payload: any, episodeId?: number) => {
    const withOptionalColumns = {
      ...payload,
      duration: Number(episodeForm.duration || 0),
      video_url: toText(episodeForm.video_url) || null
    }
    if (mode === 'insert') {
      const insertRes = await supabase.from('episodes').insert(withOptionalColumns)
      if (!insertRes.error) return insertRes
      if (!/column .* does not exist|schema cache/i.test(String(insertRes.error.message || ''))) return insertRes
      const { duration, video_url, ...fallbackPayload } = withOptionalColumns
      return supabase.from('episodes').insert(fallbackPayload)
    }

    const updateRes = await supabase.from('episodes').update(withOptionalColumns).eq('id', episodeId)
    if (!updateRes.error) return updateRes
    if (!/column .* does not exist|schema cache/i.test(String(updateRes.error.message || ''))) return updateRes
    const { duration, video_url, ...fallbackPayload } = withOptionalColumns
    return supabase.from('episodes').update(fallbackPayload).eq('id', episodeId)
  }

  const saveEpisode = async () => {
    if (!selectedSeason) return
    if (!Number.isFinite(episodeForm.episode_number) || episodeForm.episode_number <= 0) {
      toast.error('رقم الحلقة غير صالح')
      return
    }
    const directUrl = toText(episodeForm.video_url)
    const embedLinks: Record<string, string> = {}
    if (directUrl) embedLinks.direct = directUrl
    const payload = {
      season_id: selectedSeason.id,
      episode_number: Number(episodeForm.episode_number),
      name: toText(episodeForm.name) || `Episode ${episodeForm.episode_number}`,
      overview: toText(episodeForm.overview) || null,
      air_date: episodeForm.air_date || null,
      still_path: toText(episodeForm.still_path) || null,
      embed_links: Object.keys(embedLinks).length > 0 ? embedLinks : {}
    }
    setSavingEpisode(true)
    if (episodeForm.id) {
      const res = await persistEpisodePayload('update', payload, episodeForm.id)
      if (res.error) {
        setSavingEpisode(false)
        toast.error('فشل تحديث الحلقة')
        return
      }
      toast.success('تم تحديث الحلقة')
    } else {
      const res = await persistEpisodePayload('insert', payload)
      if (res.error) {
        setSavingEpisode(false)
        toast.error('فشل إضافة الحلقة')
        return
      }
      toast.success('تمت إضافة الحلقة')
    }
    setSavingEpisode(false)
    setEpisodeEditorOpen(false)
    setEpisodeForm(initialEpisodeForm)
    await loadEpisodes(selectedSeason.id)
  }

  const removeEpisode = async (episode: EpisodeRecord) => {
    if (!confirm(`هل أنت متأكد من حذف ${episode.name || `Episode ${episode.episode_number}`}؟`)) return
    const { error } = await supabase.from('episodes').delete().eq('id', episode.id)
    if (error) {
      toast.error('فشل حذف الحلقة')
      return
    }
    toast.success('تم حذف الحلقة')
    await loadEpisodes(selectedSeasonId)
  }

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">جارٍ تحميل بيانات المسلسل...</div>
  }

  if (!series) {
    return <div className="p-8 text-center text-zinc-500">المسلسل غير موجود</div>
  }

  return (
    <div className="space-y-6 p-2">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Link to="/admin/series" className="hover:text-white transition-colors">المسلسلات</Link>
        <ChevronRight size={14} />
        <span className="text-white font-medium truncate max-w-[200px]">{series.name}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-5 bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-xl backdrop-blur-sm">
        {seriesForm.poster_path ? (
          <img 
            src={seriesForm.poster_path.startsWith('http') ? seriesForm.poster_path : `https://image.tmdb.org/t/p/w300${seriesForm.poster_path}`} 
            alt={series.name} 
            className="w-full max-w-[260px] h-[380px] object-cover rounded-lg shadow-lg"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full max-w-[260px] h-[380px] bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-600">
            <Tv size={48} />
          </div>
        )}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={seriesForm.name}
              onChange={(e) => setSeriesForm((prev) => ({ ...prev, name: e.target.value }))}
              className="bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
              placeholder="اسم المسلسل"
            />
            <input
              type="date"
              value={seriesForm.first_air_date}
              onChange={(e) => setSeriesForm((prev) => ({ ...prev, first_air_date: e.target.value }))}
              className="bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
            />
            <input
              value={seriesForm.poster_path}
              onChange={(e) => setSeriesForm((prev) => ({ ...prev, poster_path: e.target.value }))}
              className="bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
              placeholder="poster_path / URL"
            />
            <input
              value={seriesForm.backdrop_path}
              onChange={(e) => setSeriesForm((prev) => ({ ...prev, backdrop_path: e.target.value }))}
              className="bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
              placeholder="backdrop_path / URL"
            />
            <input
              value={seriesForm.trailer_url}
              onChange={(e) => setSeriesForm((prev) => ({ ...prev, trailer_url: e.target.value }))}
              className="bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none md:col-span-2"
              placeholder="Trailer URL"
            />
          </div>
          <textarea
            rows={4}
            value={seriesForm.overview}
            onChange={(e) => setSeriesForm((prev) => ({ ...prev, overview: e.target.value }))}
            className="w-full bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none resize-none"
            placeholder="ملخص المسلسل"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={seriesForm.status}
              onChange={(e) => setSeriesForm((prev) => ({ ...prev, status: e.target.value }))}
              className="bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={saveSeries}
              disabled={savingSeries}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60"
            >
              <Save size={14} /> {savingSeries ? 'Saving...' : 'Save Series'}
            </button>
            <button
              onClick={deleteSeries}
              className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Trash2 size={14} /> Delete Series
            </button>
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Layers size={12} /> {seasons.length} Seasons
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
        <div className="space-y-4 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Layers className="text-primary" size={16} /> المواسم
            </h2>
            <button
              onClick={openNewSeasonEditor}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <Plus size={12} /> موسم
            </button>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-auto">
            {seasons.map((season) => (
              <button
                key={season.id}
                onClick={() => setSelectedSeasonId(season.id)}
                className={`w-full text-right p-3 rounded-lg border transition-colors ${
                  selectedSeasonId === season.id
                    ? 'bg-primary/10 border-primary/40'
                    : 'bg-black/20 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{season.name || `Season ${season.season_number}`}</div>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      <span>Season {season.season_number}</span>
                      <span>{toText(season.air_date).split('-').shift() || '-'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400">
                      {(episodes.filter((e) => e.season_id === season.id).length || (selectedSeasonId === season.id ? episodes.length : 0))} EP
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditSeasonEditor(season)
                      }}
                      className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeSeason(season)
                      }}
                      className="p-1.5 rounded bg-rose-600/15 hover:bg-rose-600 text-rose-300 hover:text-white"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </button>
            ))}
            {seasons.length === 0 && (
              <div className="text-center text-zinc-500 py-8 text-sm">لا توجد مواسم حتى الآن</div>
            )}
          </div>

          {seasonEditorOpen && (
            <div className="bg-black/20 border border-zinc-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold">{seasonForm.id ? 'تعديل الموسم' : 'إضافة موسم'}</h3>
                <button onClick={() => { setSeasonEditorOpen(false); setSeasonForm(initialSeasonForm) }} className="p-1 text-zinc-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <input
                type="number"
                min={1}
                value={seasonForm.season_number}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, season_number: Number(e.target.value || 1) }))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                placeholder="Season Number"
              />
              <input
                value={seasonForm.name}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                placeholder="Season Name"
              />
              <input
                type="date"
                value={seasonForm.air_date}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, air_date: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
              />
              <input
                value={seasonForm.poster_path}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, poster_path: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                placeholder="Season Poster URL / path"
              />
              <textarea
                rows={2}
                value={seasonForm.overview}
                onChange={(e) => setSeasonForm((prev) => ({ ...prev, overview: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm resize-none"
                placeholder="Season Overview"
              />
              <button
                onClick={saveSeason}
                disabled={savingSeason}
                className="w-full py-2 bg-primary hover:bg-primary/90 rounded text-sm font-medium disabled:opacity-60"
              >
                {savingSeason ? 'Saving...' : seasonForm.id ? 'Update Season' : 'Create Season'}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Film className="text-primary" size={16} />
              {selectedSeason ? `${selectedSeason.name || `Season ${selectedSeason.season_number}`} Episodes` : 'Episodes'}
            </h2>
            <button
              onClick={openNewEpisodeEditor}
              disabled={!selectedSeason}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
            >
              <Plus size={12} /> حلقة
            </button>
          </div>

          {selectedSeason ? (
            <>
              <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-900/70 text-zinc-400">
                    <tr>
                      <th className="text-right px-3 py-2">#</th>
                      <th className="text-right px-3 py-2">Name</th>
                      <th className="text-right px-3 py-2">Duration</th>
                      <th className="text-right px-3 py-2">Air Date</th>
                      <th className="text-right px-3 py-2">Video URL</th>
                      <th className="text-right px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {episodes.map((episode) => (
                      <tr key={episode.id} className="border-t border-zinc-800 hover:bg-zinc-900/30">
                        <td className="px-3 py-2 text-zinc-300">{episode.episode_number}</td>
                        <td className="px-3 py-2 font-medium">{episode.name}</td>
                        <td className="px-3 py-2 text-zinc-400">{Number(episode.duration || 0) > 0 ? `${episode.duration} min` : '-'}</td>
                        <td className="px-3 py-2 text-zinc-400">{episode.air_date || '-'}</td>
                        <td className="px-3 py-2 text-zinc-400 max-w-[220px] truncate">{toText(episode.video_url) || toText(episode.embed_links?.direct) || '-'}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditEpisodeEditor(episode)}
                              className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => removeEpisode(episode)}
                              className="p-1.5 rounded bg-rose-600/15 hover:bg-rose-600 text-rose-300 hover:text-white"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {episodes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">لا توجد حلقات في هذا الموسم</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {episodeEditorOpen && (
                <div className="bg-black/20 border border-zinc-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold">{episodeForm.id ? 'تعديل حلقة' : 'إضافة حلقة'}</h3>
                    <button onClick={() => { setEpisodeEditorOpen(false); setEpisodeForm(initialEpisodeForm) }} className="p-1 text-zinc-400 hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={1}
                      value={episodeForm.episode_number}
                      onChange={(e) => setEpisodeForm((prev) => ({ ...prev, episode_number: Number(e.target.value || 1) }))}
                      className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                      placeholder="Episode #"
                    />
                    <input
                      value={episodeForm.name}
                      onChange={(e) => setEpisodeForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                      placeholder="Episode Name"
                    />
                    <input
                      type="date"
                      value={episodeForm.air_date}
                      onChange={(e) => setEpisodeForm((prev) => ({ ...prev, air_date: e.target.value }))}
                      className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      value={episodeForm.duration}
                      onChange={(e) => setEpisodeForm((prev) => ({ ...prev, duration: Number(e.target.value || 0) }))}
                      className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                      placeholder="Duration (minutes)"
                    />
                    <input
                      value={episodeForm.still_path}
                      onChange={(e) => setEpisodeForm((prev) => ({ ...prev, still_path: e.target.value }))}
                      className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                      placeholder="Thumbnail URL / still_path"
                    />
                    <input
                      value={episodeForm.video_url}
                      onChange={(e) => setEpisodeForm((prev) => ({ ...prev, video_url: e.target.value }))}
                      className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
                      placeholder="Direct Video URL"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={episodeForm.overview}
                    onChange={(e) => setEpisodeForm((prev) => ({ ...prev, overview: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm resize-none"
                    placeholder="Episode Overview"
                  />
                  <button
                    onClick={saveEpisode}
                    disabled={savingEpisode}
                    className="w-full py-2 bg-primary hover:bg-primary/90 rounded text-sm font-medium disabled:opacity-60"
                  >
                    {savingEpisode ? 'Saving...' : episodeForm.id ? 'Update Episode' : 'Create Episode'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-zinc-500 py-10">اختر موسماً لعرض وإدارة الحلقات</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SeriesManage
