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

export type UseCategoryOptions = {
  limit?: number
  orderBy?: 'created_at' | 'views' | 'year'
  ascending?: boolean
  enabled?: boolean
  year?: number
  staleTime?: number
  gcTime?: number
}

export function useCategoryVideos(category: string, options: UseCategoryOptions = {}) {
  const { limit = 20, orderBy = 'created_at', ascending = false, enabled = true, year, staleTime = 300000, gcTime = 1000 * 60 * 30 } = options
  
  return useQuery({
    queryKey: ['videos', category, limit, orderBy, ascending, year],
    queryFn: async () => {
      // 1. Try Cache First for specific categories (plays, classics)
      // Only if we are asking for default limits (which matches cache)
      if (!year && limit <= 20) {
        try {
          const res = await fetch('/data/homepage_cache.json');
          if (res.ok) {
            const cache = await res.json();
            if (cache[category] && Array.isArray(cache[category]) && cache[category].length > 0) {
              return cache[category] as VideoItem[];
            }
          }
        } catch (e) {
        }
      }

      // 2. Fallback to Supabase
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
    enabled,
    staleTime,
    gcTime
  })
}

export function useClassicVideos(options: UseCategoryOptions = {}) {
  const { limit = 20, orderBy = 'created_at', ascending = false, enabled = true, staleTime = 300000, gcTime = 1000 * 60 * 30 } = options
  return useQuery({
    queryKey: ['videos', 'classics', limit, orderBy, ascending],
    queryFn: async () => {
      // 1. Try Cache
      if (limit <= 20) {
        try {
            const res = await fetch('/data/homepage_cache.json');
            if (res.ok) {
              const cache = await res.json();
              if (cache.classics && cache.classics.length > 0) {
                return cache.classics as VideoItem[];
              }
            }
        } catch (e) {}
      }

      const { data } = await supabase
        .from('videos')
        .select('*')
        .or('category.eq.plays,year.lt.2000')
        .order(orderBy, { ascending })
        .limit(limit)
      return (data || []) as VideoItem[]
    },
    enabled,
    staleTime,
    gcTime
  })
}

export function useCachedHomepage() {
  return useQuery({
    queryKey: ['homepage-cache'],
    queryFn: async () => {
      try {
        const res = await fetch('/data/homepage_cache.json');
        if (!res.ok) throw new Error('Cache missing');
        return await res.json();
      } catch (e) {
        return null;
      }
    },
    staleTime: 300000,
    gcTime: 1000 * 60 * 30
  })
}
