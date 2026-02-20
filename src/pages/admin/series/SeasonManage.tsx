import { useEffect, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdmin, AdminEpisode } from '../../../context/AdminContext'
import { errorLogger } from '../../../services/errorLogging'
import { ArrowRight, Trash2, Save, Play, Plus } from 'lucide-react'

type EpisodeForm = {
  episode_number: number
  name?: string
  overview?: string
  air_date?: string
  intro_start?: number | null
  intro_end?: number | null
  subtitles_url?: string // JSON string
  download_urls?: string // JSON string
}

const SeasonManage = () => {
  const { id, seasonId } = useParams()
  const sId = Number(seasonId)
  const seriesId = Number(id)
  
  const { getSeriesById, addEpisode, deleteEpisode, updateEpisode } = useAdmin()
  const [drafts, setDrafts] = useState<Record<number, { intro_start?: string; intro_end?: string; subtitles_url?: string; download_urls?: string }>>({})

  // Get current series and season from context
  const currentSeries = getSeriesById(seriesId)
  const currentSeason = currentSeries?.seasons?.find(s => s.id === sId)
  const episodes = currentSeason?.episodes || []
  
  // Sort episodes by number
  const sortedEpisodes = useMemo(() => {
    return [...episodes].sort((a, b) => a.episode_number - b.episode_number)
  }, [episodes])

  const getDraft = (e: AdminEpisode) => {
    const d = drafts[e.id] || {}
    return {
      intro_start: d.intro_start ?? (e.intro_start != null ? String(e.intro_start) : ''),
      intro_end: d.intro_end ?? (e.intro_end != null ? String(e.intro_end) : ''),
      subtitles_url: d.subtitles_url ?? (e.subtitles_url ? JSON.stringify(e.subtitles_url) : ''),
      download_urls: d.download_urls ?? (e.download_urls ? JSON.stringify(e.download_urls) : '')
    }
  }

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<EpisodeForm>({ 
    defaultValues: { episode_number: (episodes.length || 0) + 1 } 
  })

  useEffect(() => { 
    reset({ 
      episode_number: (episodes.length || 0) + 1, 
      name: '', 
      overview: '', 
      air_date: '', 
      intro_start: null, 
      intro_end: null, 
      subtitles_url: '', 
      download_urls: '' 
    }) 
  }, [sId, reset, episodes.length])

  const handleAddEpisode = async (values: EpisodeForm) => {
    try {
      let subs: any = null
      let dls: any = null
      try { subs = values.subtitles_url ? JSON.parse(values.subtitles_url) : null } catch {}
      try { dls = values.download_urls ? JSON.parse(values.download_urls) : null } catch {}

      addEpisode(seriesId, sId, {
        season_id: sId,
        episode_number: Number(values.episode_number) || 0,
        name: values.name || `Episode ${values.episode_number}`,
        overview: values.overview || 'No overview available.',
        air_date: values.air_date || new Date().toISOString().split('T')[0],
        still_path: null,
        vote_average: 0,
        runtime: 45,
        intro_start: values.intro_start ?? null,
        intro_end: values.intro_end ?? null,
        subtitles_url: subs,
        download_urls: dls
      })
      
      reset({ 
        episode_number: (episodes.length || 0) + 2, 
        name: '', 
        overview: '', 
        air_date: '', 
        intro_start: null, 
        intro_end: null, 
        subtitles_url: '', 
        download_urls: '' 
      })
    } catch (error) {
      errorLogger.logError({
        message: 'Failed to add episode',
        severity: 'high',
        category: 'database',
        context: { error, seriesId, seasonId }
      })
      toast.error('Failed to add episode')
    }
  }

  const handleUpdateEpisode = (e: AdminEpisode) => {
    try {
      const d = getDraft(e)
      let subs = null, dls = null
      
      try {
        if (d.subtitles_url.trim()) subs = JSON.parse(d.subtitles_url)
      } catch (err) {
        toast.error('Invalid JSON in subtitles')
        return
      }
      
      try {
        if (d.download_urls.trim()) dls = JSON.parse(d.download_urls)
      } catch (err) {
        toast.error('Invalid JSON in download URLs')
        return
      }

      updateEpisode(seriesId, sId, e.id, {
        intro_start: d.intro_start ? Number(d.intro_start) : null,
        intro_end: d.intro_end ? Number(d.intro_end) : null,
        subtitles_url: subs,
        download_urls: dls
      })
      
      // Clear draft for this episode
      const newDrafts = { ...drafts }
      delete newDrafts[e.id]
      setDrafts(newDrafts)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update')
    }
  }

  if (!currentSeries || !currentSeason) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
        <p>Series or Season not found</p>
        <Link to="/admin/series" className="text-primary hover:underline mt-2">Back to Series List</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/admin/series/${id}`} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowRight size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{currentSeason.name}</h1>
            <p className="text-zinc-400 text-sm">Manage episodes for {currentSeries.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/series/${id}`} className="text-sm text-primary hover:underline">Back to Series</Link>
        </div>
      </div>

      {/* Add Episode Form */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus size={18} className="text-primary" /> Add New Episode
        </h2>
        <form onSubmit={handleSubmit(handleAddEpisode)} className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Episode Number</label>
            <input 
              type="number" 
              min={1} 
              {...register('episode_number', { valueAsNumber: true })} 
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Title</label>
            <input 
              {...register('name')} 
              placeholder="Episode Title"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Air Date</label>
            <input 
              type="date" 
              {...register('air_date')} 
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
            />
          </div>
          
          <div className="md:col-span-4">
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Overview</label>
            <textarea 
              rows={2} 
              {...register('overview')} 
              placeholder="Brief description of the episode..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none" 
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Intro Start (sec)</label>
            <input 
              type="number" 
              step="0.1" 
              {...register('intro_start')} 
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">Intro End (sec)</label>
            <input 
              type="number" 
              step="0.1" 
              {...register('intro_end')} 
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
            />
          </div>
          
          <div className="md:col-span-2">
             <label className="mb-1.5 block text-xs font-medium text-zinc-400">Subtitles (JSON)</label>
             <textarea 
               rows={2} 
               {...register('subtitles_url')} 
               placeholder='[{"lang":"en", "url":"..."}]'
               className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2 font-mono text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none" 
             />
          </div>
          <div className="md:col-span-2">
             <label className="mb-1.5 block text-xs font-medium text-zinc-400">Download URLs (JSON)</label>
             <textarea 
               rows={2} 
               {...register('download_urls')} 
               placeholder='[{"quality":"1080p", "url":"..."}]'
               className="w-full rounded-lg border border-zinc-700 bg-zinc-900/50 p-2 font-mono text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none" 
             />
          </div>

          <div className="md:col-span-4 flex justify-end mt-2">
             <button 
               disabled={isSubmitting} 
               className="px-6 py-2 rounded-lg bg-primary text-sm font-bold text-white disabled:opacity-50 hover:bg-primary/90 transition-all flex items-center gap-2"
             >
                {isSubmitting ? 'Adding...' : <><Plus size={16} /> Add Episode</>}
              </button>
          </div>
        </form>
      </div>

      {/* Episodes List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedEpisodes.map((e) => (
          <div key={e.id} className="group rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/50">
            <div className="flex justify-between items-start mb-3">
               <div className="flex items-center gap-2">
                 <span className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-xs font-bold text-zinc-300">
                   {e.episode_number}
                 </span>
                 <h3 className="text-sm font-semibold text-zinc-200 truncate max-w-[150px]" title={e.name}>{e.name || 'Untitled'}</h3>
               </div>
               <span className="text-[10px] text-zinc-500 bg-zinc-950/50 px-2 py-0.5 rounded-full border border-zinc-800">
                 {e.air_date || 'No Date'}
               </span>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-zinc-500">Intro Start (s)</label>
                  <input
                    value={getDraft(e).intro_start}
                    onChange={(ev) => setDrafts(s => ({ ...s, [e.id]: { ...getDraft(e), intro_start: ev.target.value } }))}
                    type="number"
                    min={0}
                    className="w-full rounded border border-zinc-700 bg-zinc-950/50 p-1.5 text-xs text-zinc-300 focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-zinc-500">Intro End (s)</label>
                  <input
                    value={getDraft(e).intro_end}
                    onChange={(ev) => setDrafts(s => ({ ...s, [e.id]: { ...getDraft(e), intro_end: ev.target.value } }))}
                    type="number"
                    min={0}
                    className="w-full rounded border border-zinc-700 bg-zinc-950/50 p-1.5 text-xs text-zinc-300 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-medium text-zinc-500">Subtitles (JSON)</label>
                <textarea
                  rows={1}
                  value={getDraft(e).subtitles_url}
                  onChange={(ev) => setDrafts(s => ({ ...s, [e.id]: { ...getDraft(e), subtitles_url: ev.target.value } }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-950/50 p-1.5 font-mono text-[10px] text-zinc-400 focus:border-primary outline-none resize-none"
                />
              </div>
              
              <div>
                <label className="mb-1 block text-[10px] font-medium text-zinc-500">Downloads (JSON)</label>
                <textarea
                  rows={1}
                  value={getDraft(e).download_urls}
                  onChange={(ev) => setDrafts(s => ({ ...s, [e.id]: { ...getDraft(e), download_urls: ev.target.value } }))}
                  className="w-full rounded border border-zinc-700 bg-zinc-950/50 p-1.5 font-mono text-[10px] text-zinc-400 focus:border-primary outline-none resize-none"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2 pt-3 border-t border-zinc-800/50">
              <Link 
                to={`/watch/${id}?type=tv&season=${currentSeason.season_number}&episode=${e.episode_number}`} 
                className="flex-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 flex items-center justify-center gap-1.5 transition-colors py-1.5"
              >
                <Play size={12} /> Watch
              </Link>
              
              <button
                onClick={() => handleUpdateEpisode(e)}
                className="flex-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs flex items-center justify-center gap-1.5 transition-colors py-1.5"
              >
                <Save size={12} /> Save
              </button>
              
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this episode?')) {
                    deleteEpisode(seriesId, sId, e.id)
                  }
                }} 
                className="flex-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs flex items-center justify-center gap-1.5 transition-colors py-1.5"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))}
        
        {sortedEpisodes.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-8 text-zinc-500 border border-zinc-800 rounded-xl bg-zinc-900/20 border-dashed">
            <p className="text-sm">No episodes added yet.</p>
            <p className="text-xs mt-1">Use the form above to add episodes to this season.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default SeasonManage