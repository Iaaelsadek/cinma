import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type VideoItem = {
  id: string
  title: string
  url: string
  thumbnail?: string | null
  description?: string | null
  views?: number | null
  duration?: number | null
  category?: string | null
  created_at?: string | null
  year?: number | null
  quality?: string | null
}

type UseCategoryOptions = {
  limit?: number
  orderBy?: 'created_at' | 'views' | 'year'
  ascending?: boolean
  enabled?: boolean
  year?: number
}

export function useCategoryVideos(category: string, options: UseCategoryOptions = {}) {
  const { limit = 20, orderBy = 'created_at', ascending = false, enabled = true, year } = options
  return useQuery({
    queryKey: ['videos', category, limit, orderBy, ascending, year],
    queryFn: async () => {
      let query = supabase
        .from('videos')
        .select('*')
        .eq('category', category)
      
      if (year) {
        query = query.eq('year', year)
      }

      const { data } = await query
        .order(orderBy, { ascending })
        .limit(limit)
      return (data || []) as VideoItem[]
    },
    enabled
  })
}

export function useClassicVideos(options: UseCategoryOptions = {}) {
  const { limit = 20, orderBy = 'created_at', ascending = false, enabled = true } = options
  return useQuery({
    queryKey: ['videos', 'classics', limit, orderBy, ascending],
    queryFn: async () => {
      const { data } = await supabase
        .from('videos')
        .select('*')
        .or('category.eq.play,year.lt.2000')
        .order(orderBy, { ascending })
        .limit(limit)
      return (data || []) as VideoItem[]
    },
    enabled
  })
}
