import { useQuery } from '@tanstack/react-query'
import { isCJK } from '../lib/utils'

export type DailyMotionVideo = {
  id: string
  title: string
  thumbnail_720_url?: string
  thumbnail_480_url?: string
  thumbnail_360_url?: string
  thumbnail_240_url?: string
  thumbnail_180_url?: string
  thumbnail_120_url?: string
  thumbnail_60_url?: string
  thumbnail_url?: string
  url: string
  duration: number
  views_total: number
  created_time: number
  owner: string
  owner_url: string
}

export const useDailyMotion = (enabled = true) => {
  return useQuery({
    queryKey: ['dailymotion-trending'],
    queryFn: async () => {
      try {
        // Fetch trending videos from DailyMotion
        // fields: id,title,thumbnail_720_url,thumbnail_480_url,thumbnail_url,url,duration,views_total,created_time,owner.username,owner.url
        // We removed 'thumbnail_url' which might be small, and rely on explicit sizes.
        // Actually, let's just ask for 'thumbnail_720_url' and 'thumbnail_480_url' and 'thumbnail_360_url'
        const res = await fetch(
          'https://api.dailymotion.com/videos?fields=id,title,thumbnail_720_url,thumbnail_480_url,thumbnail_360_url,thumbnail_240_url,url,duration,views_total,created_time,owner.username,owner.url&sort=trending&limit=12&flags=no_live'
        )
        
        if (!res.ok) throw new Error('Failed to fetch DailyMotion')
        
        const data = await res.json()
        
        return (data.list || []) as DailyMotionVideo[]
      } catch (e) {
        // Silently fail if DM API is down
        return []
      }
    },
    staleTime: 1000 * 60 * 15,
    enabled
  })
}
