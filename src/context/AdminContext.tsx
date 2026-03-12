import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { errorLogger } from '../services/errorLogging'

// --- Types ---
export type AdminMovie = {
  id: number
  title: string
  arabic_title?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number | null
  views: number
  category: string
  genres?: string[] | null
  trailer_url?: string | null
  video_url?: string | null
  status?: 'active' | 'inactive'
}

export type AdminSeason = {
  id: number
  series_id: number
  name: string
  season_number: number
  episode_count: number
  poster_path: string | null
  air_date: string
  overview: string
  episodes?: AdminEpisode[]
}

export type AdminEpisode = {
  id: number
  season_id: number
  name: string
  episode_number: number
  overview: string
  still_path: string | null
  air_date: string
  vote_average: number
  runtime: number
  video_url?: string
  intro_start?: number | null
  intro_end?: number | null
  subtitles_url?: any
  download_urls?: any
}

export type AdminSeries = {
  id: number
  name: string
  arabic_name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  views: number
  seasons_count: number
  genres?: string[] | null
  seasons?: AdminSeason[]
}

export type AdminUser = {
  id: string
  email: string
  role: 'admin' | 'supervisor' | 'user'
  created_at: string
  last_active: string
  status: 'active' | 'banned'
}

export type AdminStats = {
  totalMovies: number
  totalSeries: number
  totalUsers: number
  totalViews: number
  trafficByDay: { date: string; views: number }[]
  userGrowthByDay: { date: string; users: number }[]
  contentByGenre: { name: string; value: number }[]
  topWatched: { id: number; title: string; content_type: 'movie' | 'tv'; views: number; vote_average: number }[]
  previousPeriodViews: number
  previousPeriodUsers: number
}

export type ActivityLog = {
  id: number
  user: string
  action: string
  target: string
  time: string
  type: 'info' | 'warning' | 'success' | 'error'
}

interface AdminContextType {
  movies: AdminMovie[]
  series: AdminSeries[]
  users: AdminUser[]
  stats: AdminStats
  recentActivity: ActivityLog[]
  loading: boolean
  
  // Actions
  addMovie: (movie: Omit<AdminMovie, 'id' | 'views'>) => Promise<void>
  deleteMovie: (id: number) => Promise<void>
  updateMovie: (id: number, data: Partial<AdminMovie>) => Promise<void>
  
  addSeries: (series: Omit<AdminSeries, 'id' | 'views'>) => Promise<void>
  deleteSeries: (id: number) => Promise<void>
  getSeriesById: (id: number) => AdminSeries | undefined
  
  addSeason: (seriesId: number, season: Omit<AdminSeason, 'id'>) => Promise<void>
  deleteSeason: (seriesId: number, seasonId: number) => Promise<void>

  addEpisode: (seriesId: number, seasonId: number, episode: Omit<AdminEpisode, 'id'>) => Promise<void>
  deleteEpisode: (seriesId: number, seasonId: number, episodeId: number) => Promise<void>
  updateEpisode: (seriesId: number, seasonId: number, episodeId: number, data: Partial<AdminEpisode>) => Promise<void>

  refreshStats: () => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

const normalizeStats = (input?: Partial<AdminStats>): AdminStats => ({
  totalMovies: Number(input?.totalMovies || 0),
  totalSeries: Number(input?.totalSeries || 0),
  totalUsers: Number(input?.totalUsers || 0),
  totalViews: Number(input?.totalViews || 0),
  trafficByDay: Array.isArray(input?.trafficByDay) ? input!.trafficByDay : [],
  userGrowthByDay: Array.isArray(input?.userGrowthByDay) ? input!.userGrowthByDay : [],
  contentByGenre: Array.isArray(input?.contentByGenre) ? input!.contentByGenre : [],
  topWatched: Array.isArray(input?.topWatched) ? input!.topWatched : [],
  previousPeriodViews: Number(input?.previousPeriodViews || 0),
  previousPeriodUsers: Number(input?.previousPeriodUsers || 0)
})

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [movies, setMovies] = useState<AdminMovie[]>([])
  const [series, setSeries] = useState<AdminSeries[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>(normalizeStats())
  
  // Cache state
  const [statsCache, setStatsCache] = useState<{ data: AdminStats; timestamp: number } | null>(null)
  const statsCacheRef = useRef<{ data: AdminStats; timestamp: number } | null>(null)
  const cacheTimeout = 5 * 60 * 1000
  
  const isCacheValid = useCallback((timestamp: number) => {
    return Date.now() - timestamp < cacheTimeout
  }, [cacheTimeout])

  useEffect(() => {
    statsCacheRef.current = statsCache
  }, [statsCache])

  const toDateKey = (value?: string | null) => {
    if (!value) return null
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  }

  const buildLastDaysRange = (days: number) => {
    const out: string[] = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      out.push(d.toISOString().slice(0, 10))
    }
    return out
  }

  const parseGenres = (value: any): string[] => {
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
    if (typeof value === 'string') {
      const t = value.trim()
      if (!t) return []
      try {
        const parsed = JSON.parse(t)
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean)
      } catch {}
      return t.split(',').map((v) => v.trim()).filter(Boolean)
    }
    return []
  }

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    try {
      const activeStatsCache = statsCacheRef.current
      const skipStatsCache = forceRefresh || !activeStatsCache || !isCacheValid(activeStatsCache.timestamp)
      if (!skipStatsCache && activeStatsCache) {
        setStats(normalizeStats(activeStatsCache.data))
      }

      // Movies
      const { data: moviesDataRaw, error: moviesError } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (moviesError) {
        errorLogger.logError({
          message: 'Error fetching movies for admin stats',
          severity: 'medium',
          category: 'database',
          context: { error: moviesError }
        })
      }
      const moviesData = moviesDataRaw || []

      const mappedMovies: AdminMovie[] = (moviesData || []).map(m => ({
        id: m.id,
        title: m.title,
        overview: m.overview || '',
        poster_path: m.poster_path, // Fixed column name
        backdrop_path: m.backdrop_path, // Fixed column name
        release_date: m.release_date,
        vote_average: m.vote_average ?? null, // Fixed column name
        views: Number((m as any).views ?? (m as any).view_count ?? (m as any).watch_count ?? 0),
        category: m.category || '',
        genres: parseGenres((m as any).genres),
        trailer_url: (m as any).trailer_url || null,
        video_url: (m as any).video_url || null,
        status: (m as any).is_active === false ? 'inactive' : 'active'
      }))
      setMovies(mappedMovies)

      // Series (using tv_series table)
      const { data: seriesDataRaw, error: seriesError } = await supabase
        .from('tv_series') // Use existing table
        .select('*, seasons(*)')
        .order('created_at', { ascending: false })

      if (seriesError) {
        errorLogger.logError({
          message: 'Error fetching series for admin stats',
          severity: 'medium',
          category: 'database',
          context: { error: seriesError }
        })
      }
      const seriesData = seriesDataRaw || []

      const mappedSeries: AdminSeries[] = seriesData.map(s => ({
        id: s.id,
        name: s.name || s.title, // tv_series has 'name'
        overview: s.overview || '',
        poster_path: s.poster_path,
        backdrop_path: s.backdrop_path,
        first_air_date: s.first_air_date,
        vote_average: s.vote_average || 0,
        views: Number((s as any).views ?? (s as any).view_count ?? (s as any).watch_count ?? 0),
        seasons_count: s.seasons?.length || 0, // Calculate from relation if count not reliable
        genres: Array.isArray(s.genres) ? s.genres : [],
        seasons: s.seasons?.map((sn: any) => ({
          id: sn.id,
          series_id: sn.series_id,
          name: sn.name,
          season_number: sn.season_number,
          episode_count: sn.episode_count || 0,
          poster_path: sn.poster_path,
          air_date: sn.air_date,
          overview: sn.overview
        }))
      }))
      setSeries(mappedSeries)

      // Users/Profiles
      const { data: profilesDataRaw, error: profilesError } = await supabase
        .from('profiles')
        .select('id,username,role,banned,created_at,updated_at')
      
      if (profilesError) errorLogger.logError({
        message: 'Error fetching profiles',
        severity: 'medium',
        category: 'database',
        context: { error: profilesError }
      })
      
      const profilesData = profilesDataRaw || []
      const mappedUsers: AdminUser[] = profilesData.map(p => ({
        id: p.id,
        email: String(p.username || p.id),
        role: p.role || 'user',
        created_at: p.created_at,
        last_active: p.updated_at || p.created_at,
        status: p.banned ? 'banned' : 'active'
      }))
      setUsers(mappedUsers)

      // Calculate Stats (only if cache is invalid or missing)
      if (skipStatsCache) {
        const totalMovies = moviesData.length
        const totalSeries = seriesData.length
        const totalUsers = profilesData.length
        const totalViews = moviesData.reduce((acc, m) => acc + Number((m as any).views ?? (m as any).view_count ?? (m as any).watch_count ?? 0), 0) + 
                           seriesData.reduce((acc, s) => acc + Number((s as any).views ?? (s as any).view_count ?? (s as any).watch_count ?? 0), 0)

        const today = new Date()
        const periodStart = new Date(today)
        periodStart.setDate(periodStart.getDate() - 30)
        const previousPeriodStart = new Date(periodStart)
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 30)

        const inPreviousWindow = (createdAt?: string) => {
          if (!createdAt) return false
          const d = new Date(createdAt)
          return d >= previousPeriodStart && d < periodStart
        }

        const dateKeys = buildLastDaysRange(30)
        const trafficMap = new Map<string, number>()
        dateKeys.forEach((k) => trafficMap.set(k, 0))
        moviesData.forEach((m) => {
          const key = toDateKey(m.created_at)
          if (key && trafficMap.has(key)) {
            trafficMap.set(key, (trafficMap.get(key) || 0) + Number((m as any).views ?? (m as any).view_count ?? (m as any).watch_count ?? 0))
          }
        })
        seriesData.forEach((s) => {
          const key = toDateKey(s.created_at)
          if (key && trafficMap.has(key)) {
            trafficMap.set(key, (trafficMap.get(key) || 0) + Number((s as any).views ?? (s as any).view_count ?? (s as any).watch_count ?? 0))
          }
        })
        const trafficByDay = dateKeys.map((k) => ({ date: k.slice(5), views: trafficMap.get(k) || 0 }))

        const usersMap = new Map<string, number>()
        dateKeys.forEach((k) => usersMap.set(k, 0))
        profilesData.forEach((p) => {
          const key = toDateKey(p.created_at)
          if (key && usersMap.has(key)) {
            usersMap.set(key, (usersMap.get(key) || 0) + 1)
          }
        })
        const userGrowthByDay = dateKeys.map((k) => ({ date: k.slice(5), users: usersMap.get(k) || 0 }))

        const genreMap = new Map<string, number>()
        moviesData.forEach((m) => {
          const genres = parseGenres((m as any).genres)
          if (genres.length === 0 && m.category) genres.push(String(m.category))
          if (genres.length === 0) genres.push('Unknown')
          genres.forEach((g) => genreMap.set(g, (genreMap.get(g) || 0) + 1))
        })
        seriesData.forEach((s) => {
          const genres = parseGenres((s as any).genres)
          if (genres.length === 0) genres.push('Unknown')
          genres.forEach((g) => genreMap.set(g, (genreMap.get(g) || 0) + 1))
        })
        const contentByGenre = Array.from(genreMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8)

        const topWatched = [
          ...moviesData.map((m) => ({
            id: Number(m.id),
            title: String(m.title || `Movie #${m.id}`),
            content_type: 'movie' as const,
            views: Number((m as any).views ?? (m as any).view_count ?? (m as any).watch_count ?? 0),
            vote_average: Number(m.vote_average || 0)
          })),
          ...seriesData.map((s) => ({
            id: Number(s.id),
            title: String((s as any).name || (s as any).title || `Series #${s.id}`),
            content_type: 'tv' as const,
            views: Number((s as any).views ?? (s as any).view_count ?? (s as any).watch_count ?? 0),
            vote_average: Number(s.vote_average || 0)
          }))
        ]
          .sort((a, b) => b.views - a.views)
          .slice(0, 10)

        const previousPeriodViews =
          moviesData.filter((m) => inPreviousWindow(m.created_at)).reduce((acc, m) => acc + Number((m as any).views ?? (m as any).view_count ?? (m as any).watch_count ?? 0), 0) +
          seriesData.filter((s) => inPreviousWindow(s.created_at)).reduce((acc, s) => acc + Number((s as any).views ?? (s as any).view_count ?? (s as any).watch_count ?? 0), 0)

        const previousPeriodUsers = profilesData.filter((p) => inPreviousWindow(p.created_at)).length

        const newStats = normalizeStats({
          totalMovies,
          totalSeries,
          totalUsers,
          totalViews,
          trafficByDay,
          userGrowthByDay,
          contentByGenre,
          topWatched,
          previousPeriodViews,
          previousPeriodUsers
        })
        
        setStats(newStats)
        setStatsCache({ data: newStats, timestamp: Date.now() })
      }

    } catch (error: any) {
      errorLogger.logError({
        message: 'Error fetching admin data',
        severity: 'high',
        category: 'database',
        context: { error }
      })
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }, [isCacheValid])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addMovie = useCallback(async (movieData: Omit<AdminMovie, 'id' | 'views'>) => {
    try {
      const { data, error } = await supabase
        .from('movies')
        .insert({
          title: movieData.title,
          overview: movieData.overview, // Changed from description
          poster_path: movieData.poster_path, // Changed from poster_url
          backdrop_path: movieData.backdrop_path, // Changed from banner_url
          release_date: movieData.release_date,
          vote_average: movieData.vote_average, // Changed from rating
          category: movieData.category,
          genres: Array.isArray(movieData.genres) ? movieData.genres : [],
          trailer_url: movieData.trailer_url || null,
          video_url: movieData.video_url || null,
          is_active: movieData.status !== 'inactive',
          views: 0
        })
        .select()
        .single()

      if (error) throw error

      const newMovie: AdminMovie = {
        id: data.id,
        title: data.title,
        overview: data.overview || '',
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        release_date: data.release_date,
        vote_average: data.vote_average,
        views: data.views,
        category: data.category || '',
        genres: parseGenres((data as any).genres),
        trailer_url: (data as any).trailer_url || null,
        video_url: (data as any).video_url || null,
        status: (data as any).is_active === false ? 'inactive' : 'active'
      }

      setMovies(prev => [newMovie, ...prev])
      setRecentActivity(prev => [{
        id: Date.now(),
        user: 'You',
        action: 'Added Movie',
        target: movieData.title,
        time: 'Just now',
        type: 'success'
      }, ...prev])
      
      toast.success(`Movie "${movieData.title}" added to Supabase`)
      refreshStats()
    } catch (error: any) {
      errorLogger.logError({
        message: 'Error adding movie',
        severity: 'medium',
        category: 'user_action',
        context: { error, movieData }
      })
      toast.error('Failed to add movie: ' + error.message)
    }
  }, [])

  const deleteMovie = useCallback(async (id: number) => {
    try {
      const { error } = await supabase
        .from('movies')
        .delete()
        .eq('id', id)
      
      if (error) throw error

      setMovies(prev => prev.filter(m => m.id !== id))
      toast.success('Movie deleted from Supabase')
      refreshStats()
    } catch (error: any) {
      errorLogger.logError({
        message: 'Error deleting movie',
        severity: 'medium',
        category: 'user_action',
        context: { error, movieId: id }
      })
      toast.error('Failed to delete movie: ' + error.message)
    }
  }, [])

  const updateMovie = useCallback(async (id: number, data: Partial<AdminMovie>) => {
    try {
      const payload: any = {}
      if (data.title !== undefined) payload.title = data.title
      if (data.overview !== undefined) payload.overview = data.overview
      if (data.release_date !== undefined) payload.release_date = data.release_date
      if (data.vote_average !== undefined) payload.vote_average = data.vote_average
      if (data.poster_path !== undefined) payload.poster_path = data.poster_path
      if (data.backdrop_path !== undefined) payload.backdrop_path = data.backdrop_path
      if (data.category !== undefined) payload.category = data.category
      if (data.genres !== undefined) payload.genres = data.genres
      if (data.trailer_url !== undefined) payload.trailer_url = data.trailer_url
      if (data.video_url !== undefined) payload.video_url = data.video_url
      if (data.status !== undefined) payload.is_active = data.status !== 'inactive'

      const { data: updated, error } = await supabase
        .from('movies')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setMovies(prev => prev.map(m => m.id === id ? {
        ...m,
        title: updated.title ?? m.title,
        overview: updated.overview ?? m.overview,
        release_date: updated.release_date ?? m.release_date,
        vote_average: updated.vote_average ?? m.vote_average,
        poster_path: updated.poster_path ?? m.poster_path,
        backdrop_path: updated.backdrop_path ?? m.backdrop_path,
        category: updated.category ?? m.category,
        genres: parseGenres((updated as any).genres),
        trailer_url: (updated as any).trailer_url ?? m.trailer_url ?? null,
        video_url: (updated as any).video_url ?? m.video_url ?? null,
        status: (updated as any).is_active === false ? 'inactive' : 'active'
      } : m))
      toast.success('تم تحديث الفيلم')
    } catch (error: any) {
      toast.error(error.message || 'فشل تحديث الفيلم')
    }
  }, [])

  const addSeries = useCallback(async (seriesData: Omit<AdminSeries, 'id' | 'views'>) => {
     try {
      const { data, error } = await supabase
        .from('tv_series') // Changed to tv_series
        .insert({
          name: seriesData.name, // Changed from title
          overview: seriesData.overview, // Changed from description
          poster_path: seriesData.poster_path, // Changed from poster_url
          backdrop_path: seriesData.backdrop_path, // Changed from banner_url
          first_air_date: seriesData.first_air_date,
          vote_average: seriesData.vote_average, // Changed from rating
          // seasons_count: 0, // Might be computed or not present in insert if default
          views: 0
        })
        .select()
        .single()

      if (error) throw error
      
      const newSeries: AdminSeries = {
          id: data.id,
          name: data.name,
          overview: data.overview,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          first_air_date: data.first_air_date,
          vote_average: data.vote_average,
          views: data.views,
          seasons_count: 0,
          seasons: []
      }
      setSeries(prev => [newSeries, ...prev])
      toast.success(`Series "${seriesData.name}" added`)
     } catch (error: any) {
         toast.error(error.message)
     }
  }, [])

  const deleteSeries = useCallback(async (id: number) => {
    try {
        const { error } = await supabase.from('tv_series').delete().eq('id', id) // Changed to tv_series
        if (error) throw error
        setSeries(prev => prev.filter(s => s.id !== id))
        toast.success('Series deleted')
    } catch (error: any) {
        toast.error(error.message)
    }
  }, [])

  const getSeriesById = useCallback((id: number) => {
    return series.find(s => s.id === id)
  }, [series])

  const addSeason = useCallback(async (seriesId: number, seasonData: Omit<AdminSeason, 'id'>) => {
    try {
      const payload = {
        series_id: seriesId,
        season_number: seasonData.season_number,
        name: seasonData.name || `Season ${seasonData.season_number}`,
        overview: seasonData.overview || '',
        air_date: seasonData.air_date || null,
        poster_path: seasonData.poster_path || null,
        episode_count: Number(seasonData.episode_count || 0)
      }
      const { data, error } = await supabase.from('seasons').insert(payload as any).select().single()
      if (error) throw error

      const newSeason: AdminSeason = {
        id: data.id,
        series_id: data.series_id,
        name: data.name,
        season_number: Number(data.season_number || seasonData.season_number || 1),
        episode_count: Number(data.episode_count || 0),
        poster_path: data.poster_path || null,
        air_date: data.air_date || '',
        overview: data.overview || '',
        episodes: []
      }
      setSeries(prev => prev.map(s => {
        if (s.id !== seriesId) return s
        const nextSeasons = [...(s.seasons || []), newSeason].sort((a, b) => Number(a.season_number || 0) - Number(b.season_number || 0))
        return { ...s, seasons: nextSeasons, seasons_count: nextSeasons.length }
      }))
      toast.success('Season added')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add season')
    }
  }, [])

  const deleteSeason = useCallback(async (seriesId: number, seasonId: number) => {
    try {
      const { error } = await supabase
        .from('seasons')
        .delete()
        .eq('id', seasonId)

      if (error) throw error

      setSeries(prev => prev.map(s => {
        if (s.id !== seriesId) return s
        const nextSeasons = s.seasons ? s.seasons.filter(sn => sn.id !== seasonId) : s.seasons
        const nextCount = s.seasons ? (nextSeasons?.length || 0) : Math.max(0, s.seasons_count - 1)
        return {
          ...s,
          seasons: nextSeasons,
          seasons_count: nextCount
        }
      }))
      toast.success('Season deleted')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete season')
    }
  }, [])

  const addEpisode = useCallback(async (seriesId: number, seasonId: number, episodeData: Omit<AdminEpisode, 'id'>) => {
    try {
      const basePayload: any = {
        season_id: seasonId,
        episode_number: Number(episodeData.episode_number || 1),
        name: episodeData.name || `Episode ${episodeData.episode_number}`,
        overview: episodeData.overview || '',
        still_path: episodeData.still_path || null,
        air_date: episodeData.air_date || null,
        vote_average: Number(episodeData.vote_average || 0),
        runtime: Number(episodeData.runtime || 0),
        video_url: episodeData.video_url || null,
        intro_start: episodeData.intro_start ?? null,
        intro_end: episodeData.intro_end ?? null,
        subtitles_url: episodeData.subtitles_url ?? null,
        download_urls: episodeData.download_urls ?? null
      }

      let insertRes = await supabase.from('episodes').insert(basePayload).select().single()
      if (insertRes.error && /column .* does not exist|schema cache/i.test(String(insertRes.error.message || ''))) {
        const { video_url, intro_start, intro_end, subtitles_url, download_urls, ...fallbackPayload } = basePayload
        insertRes = await supabase.from('episodes').insert(fallbackPayload).select().single()
      }
      if (insertRes.error) throw insertRes.error

      const row: any = insertRes.data || {}
      const newEpisode: AdminEpisode = {
        id: row.id,
        season_id: row.season_id,
        episode_number: Number(row.episode_number || episodeData.episode_number || 1),
        name: row.name || episodeData.name || 'Episode',
        overview: row.overview || '',
        still_path: row.still_path || null,
        air_date: row.air_date || '',
        vote_average: Number(row.vote_average || 0),
        runtime: Number(row.runtime || 0),
        video_url: row.video_url || null,
        intro_start: row.intro_start ?? episodeData.intro_start ?? null,
        intro_end: row.intro_end ?? episodeData.intro_end ?? null,
        subtitles_url: row.subtitles_url ?? episodeData.subtitles_url ?? null,
        download_urls: row.download_urls ?? episodeData.download_urls ?? null
      }

      setSeries(prev => prev.map(s => {
        if (s.id !== seriesId) return s
        const nextSeasons = (s.seasons || []).map(sn => {
          if (sn.id !== seasonId) return sn
          const nextEpisodes = [...(sn.episodes || []), newEpisode]
            .sort((a, b) => Number(a.episode_number || 0) - Number(b.episode_number || 0))
          return { ...sn, episodes: nextEpisodes, episode_count: nextEpisodes.length }
        })
        return { ...s, seasons: nextSeasons }
      }))
      toast.success('Episode added')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add episode')
    }
  }, [])

  const deleteEpisode = useCallback(async (seriesId: number, seasonId: number, episodeId: number) => {
    try {
      const { error } = await supabase.from('episodes').delete().eq('id', episodeId)
      if (error) throw error
      setSeries(prev => prev.map(s => {
        if (s.id !== seriesId) return s
        const nextSeasons = (s.seasons || []).map(sn => {
          if (sn.id !== seasonId) return sn
          const nextEpisodes = (sn.episodes || []).filter(ep => ep.id !== episodeId)
          return { ...sn, episodes: nextEpisodes, episode_count: nextEpisodes.length }
        })
        return { ...s, seasons: nextSeasons }
      }))
      toast.success('Episode deleted')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete episode')
    }
  }, [])

  const updateEpisode = useCallback(async (seriesId: number, seasonId: number, episodeId: number, data: Partial<AdminEpisode>) => {
    try {
      const payload: any = {}
      if (data.episode_number !== undefined) payload.episode_number = data.episode_number
      if (data.name !== undefined) payload.name = data.name
      if (data.overview !== undefined) payload.overview = data.overview
      if (data.still_path !== undefined) payload.still_path = data.still_path
      if (data.air_date !== undefined) payload.air_date = data.air_date
      if (data.vote_average !== undefined) payload.vote_average = data.vote_average
      if (data.runtime !== undefined) payload.runtime = data.runtime
      if (data.video_url !== undefined) payload.video_url = data.video_url
      if (data.intro_start !== undefined) payload.intro_start = data.intro_start
      if (data.intro_end !== undefined) payload.intro_end = data.intro_end
      if (data.subtitles_url !== undefined) payload.subtitles_url = data.subtitles_url
      if (data.download_urls !== undefined) payload.download_urls = data.download_urls

      let updateRes = await supabase.from('episodes').update(payload).eq('id', episodeId).select().single()
      if (updateRes.error && /column .* does not exist|schema cache/i.test(String(updateRes.error.message || ''))) {
        const { video_url, intro_start, intro_end, subtitles_url, download_urls, ...fallbackPayload } = payload
        updateRes = await supabase.from('episodes').update(fallbackPayload).eq('id', episodeId).select().single()
      }
      if (updateRes.error) throw updateRes.error
      const updated: any = updateRes.data || {}

      setSeries(prev => prev.map(s => {
        if (s.id !== seriesId) return s
        const nextSeasons = (s.seasons || []).map(sn => {
          if (sn.id !== seasonId) return sn
          const nextEpisodes = (sn.episodes || []).map(ep => {
            if (ep.id !== episodeId) return ep
            return {
              ...ep,
              episode_number: updated.episode_number ?? ep.episode_number,
              name: updated.name ?? ep.name,
              overview: updated.overview ?? ep.overview,
              still_path: updated.still_path ?? ep.still_path,
              air_date: updated.air_date ?? ep.air_date,
              vote_average: updated.vote_average ?? ep.vote_average,
              runtime: updated.runtime ?? ep.runtime,
              video_url: updated.video_url ?? ep.video_url,
              intro_start: updated.intro_start ?? ep.intro_start ?? null,
              intro_end: updated.intro_end ?? ep.intro_end ?? null,
              subtitles_url: updated.subtitles_url ?? ep.subtitles_url ?? null,
              download_urls: updated.download_urls ?? ep.download_urls ?? null
            }
          })
          return { ...sn, episodes: nextEpisodes }
        })
        return { ...s, seasons: nextSeasons }
      }))
      toast.success('Episode updated')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update episode')
    }
  }, [])

  const refreshStats = useCallback(() => {
    setStatsCache(null)
    fetchData(true)
  }, [fetchData])

  const value = useMemo(() => ({
      movies,
      series,
      users,
      stats,
      recentActivity,
      loading,
      addMovie,
      deleteMovie,
      updateMovie,
      addSeries,
      deleteSeries,
      getSeriesById,
      addSeason,
      deleteSeason,
    addEpisode,
    deleteEpisode,
    updateEpisode,
    refreshStats
  }), [
    movies, series, users, stats, recentActivity, loading,
    addMovie, deleteMovie, updateMovie, addSeries, deleteSeries, getSeriesById,
    addSeason, deleteSeason, addEpisode, deleteEpisode, updateEpisode, refreshStats
  ])

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
