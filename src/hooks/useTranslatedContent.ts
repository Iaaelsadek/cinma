import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../lib/tmdb'
import { isCJK } from '../lib/utils'

export const useTranslatedContent = (items: any[] | undefined) => {
  return useQuery({
    queryKey: ['translated-content', items?.map(i => i.id).join(',')],
    queryFn: async () => {
      if (!items || !items.length) return []
      // Simplified: return items as is to avoid massive network overhead
      // useDualTitles will handle individual translation caching if needed
      return items
    },
    enabled: !!items && items.length > 0,
    staleTime: 1000 * 60 * 60 // 1 hour
  })
}
