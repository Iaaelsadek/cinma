import { useQuery } from '@tanstack/react-query'
import { isCJK } from '../lib/utils'

export type DailyMotionVideo = {
  id: string
  title: string
  thumbnail_720_url: string
  url: string
  duration: number
  views_total: number
  created_time: number
  owner: string
  owner_url: string
}

export const useDailyMotion = () => {
  return useQuery({
    queryKey: ['dailymotion-trending'],
    queryFn: async () => {
      try {
        // Fetch trending videos from DailyMotion
        // fields: id,title,thumbnail_720_url,url,duration,views_total,created_time,owner.username,owner.url
        const res = await fetch(
          'https://api.dailymotion.com/videos?fields=id,title,thumbnail_720_url,url,duration,views_total,created_time,owner.username,owner.url&sort=trending&limit=12&flags=no_live'
        )
        
        if (!res.ok) throw new Error('Failed to fetch DailyMotion')
        
        const data = await res.json()
        
        return (data.list || []) as DailyMotionVideo[]
      } catch (e) {
        // Silently fail if DM API is down
        return []
      }
    },
    staleTime: 1000 * 60 * 15 // 15 minutes
  })
}
