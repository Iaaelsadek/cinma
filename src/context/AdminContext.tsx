import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { errorLogger } from '../services/errorLogging'

// --- Types ---
export type AdminMovie = {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  views: number
  category: string
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
  viewsPerDay: { date: string; views: number }[]
  categoryDistribution: { name: string; value: number }[]
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

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [movies, setMovies] = useState<AdminMovie[]>([])
  const [series, setSeries] = useState<AdminSeries[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats>({
    totalMovies: 0,
    totalSeries: 0,
    totalUsers: 0,
    totalViews: 0,
    viewsPerDay: [],
    categoryDistribution: []
  })
  
  // Cache state
  const [statsCache, setStatsCache] = useState<{ data: AdminStats; timestamp: number } | null>(null)
  const [cacheTimeout] = useState(5 * 60 * 1000) // 5 minutes cache
  
  // Check if cache is valid
  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < cacheTimeout
  }

  // Fetch Data with caching
  const fetchData = async () => {
    setLoading(true)
    try {
      // Check if we have valid cached stats
      if (statsCache && isCacheValid(statsCache.timestamp)) {
        setStats(statsCache.data)
        // Still fetch fresh data for movies, series, users
      }
      
      // Movies
      const { data: moviesData, error: moviesError } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (moviesError) throw moviesError

      const mappedMovies: AdminMovie[] = (moviesData || []).map(m => ({
        id: m.id,
        title: m.title,
        overview: m.overview || '',
        poster_path: m.poster_path, // Fixed column name
        backdrop_path: m.backdrop_path, // Fixed column name
        release_date: m.release_date,
        vote_average: m.vote_average || 0, // Fixed column name
        views: m.views || 0,
        category: m.category || 'Unknown'
      }))
      setMovies(mappedMovies)

      // Series (using tv_series table)
      const { data: seriesData, error: seriesError } = await supabase
        .from('tv_series') // Use existing table
        .select('*, seasons(*)')
        .order('created_at', { ascending: false })

      if (seriesError) throw seriesError

      const mappedSeries: AdminSeries[] = (seriesData || []).map(s => ({
        id: s.id,
        name: s.name || s.title, // tv_series has 'name'
        overview: s.overview || '',
        poster_path: s.poster_path,
        backdrop_path: s.backdrop_path,
        first_air_date: s.first_air_date,
        vote_average: s.vote_average || 0,
        views: s.views || 0,
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
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
      
      if (profilesError) errorLogger.logError({
        message: 'Error fetching profiles',
        severity: 'medium',
        category: 'database',
        context: { error: profilesError }
      })
      
      // Since profiles table might not store email (it's in auth.users), we might need to mock email or join if possible.
      // But for now, let's map what we have.
      const mappedUsers: AdminUser[] = (profilesData || []).map(p => ({
        id: p.id,
        email: p.username || 'user@example.com', // Placeholder if email not available in public profile
        role: p.role || 'user',
        created_at: p.created_at,
        last_active: 'Recently',
        status: p.banned ? 'banned' : 'active'
      }))
      setUsers(mappedUsers)

      // Calculate Stats (only if cache is invalid or missing)
      if (!statsCache || !isCacheValid(statsCache.timestamp)) {
        const totalMovies = moviesData?.length || 0
        const totalSeries = seriesData?.length || 0
        const totalUsers = profilesData?.length || 0
        const totalViews = (moviesData?.reduce((acc, m) => acc + (m.views || 0), 0) || 0) + 
                           (seriesData?.reduce((acc, s) => acc + (s.views || 0), 0) || 0)

        const newStats = {
          totalMovies,
          totalSeries,
          totalUsers,
          totalViews,
          viewsPerDay: [
              { date: 'Mon', views: 120 },
              { date: 'Tue', views: 150 },
              { date: 'Wed', views: 180 },
              { date: 'Thu', views: 140 },
              { date: 'Fri', views: 200 },
              { date: 'Sat', views: 250 },
              { date: 'Sun', views: 300 },
          ],
          categoryDistribution: [
              { name: 'Sci-Fi', value: 30 },
              { name: 'Action', value: 25 },
              { name: 'Drama', value: 20 },
              { name: 'Animation', value: 15 },
              { name: 'Horror', value: 10 },
          ]
        }
        
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
  }

  useEffect(() => {
    fetchData()
  }, [])

  const addMovie = async (movieData: Omit<AdminMovie, 'id' | 'views'>) => {
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
        category: data.category
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
  }

  const deleteMovie = async (id: number) => {
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
  }

  const updateMovie = async (id: number, data: Partial<AdminMovie>) => {
    try {
      const payload: any = {}
      if (data.title !== undefined) payload.title = data.title
      if (data.overview !== undefined) payload.overview = data.overview
      if (data.release_date !== undefined) payload.release_date = data.release_date
      if (data.vote_average !== undefined) payload.vote_average = data.vote_average

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
        vote_average: updated.vote_average ?? m.vote_average
      } : m))
      toast.success('تم تحديث الفيلم')
    } catch (error: any) {
      toast.error(error.message || 'فشل تحديث الفيلم')
    }
  }

  const addSeries = async (seriesData: Omit<AdminSeries, 'id' | 'views'>) => {
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
  }

  const deleteSeries = async (id: number) => {
    try {
        const { error } = await supabase.from('tv_series').delete().eq('id', id) // Changed to tv_series
        if (error) throw error
        setSeries(prev => prev.filter(s => s.id !== id))
        toast.success('Series deleted')
    } catch (error: any) {
        toast.error(error.message)
    }
  }

  const getSeriesById = (id: number) => {
    return series.find(s => s.id === id)
  }

  const addSeason = async (_seriesId: number, _seasonData: Omit<AdminSeason, 'id'>) => {
    // Implementation for seasons
    toast.info('Add season not fully implemented')
  }

  const deleteSeason = async (seriesId: number, seasonId: number) => {
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
  }

  const addEpisode = async (_seriesId: number, _seasonId: number, _episodeData: Omit<AdminEpisode, 'id'>) => {
    toast.info('Add episode not fully implemented')
  }

  const deleteEpisode = async (_seriesId: number, _seasonId: number, _episodeId: number) => {
    toast.info('Delete episode not fully implemented')
  }

  const updateEpisode = async (_seriesId: number, _seasonId: number, _episodeId: number, _data: Partial<AdminEpisode>) => {
    toast.info('Update episode not fully implemented')
  }

  const refreshStats = () => {
    // Clear cache and re-fetch data
    setStatsCache(null)
    fetchData()
  }

  return (
    <AdminContext.Provider value={{
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
    }}>
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
