import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../lib/tmdb'
import { isCJK } from '../lib/utils'

export const useTranslatedContent = (items: any[] | undefined) => {
  return useQuery({
    queryKey: ['translated-content', items?.map(i => i.id).join(',')],
    queryFn: async () => {
      if (!items || !items.length) return []

      const enrichedItems = await Promise.all(
        items.map(async (item) => {
          // 1. Check if title is CJK
          const title = item.title || item.name || ''
          const needsTranslation = isCJK(title)

          if (!needsTranslation) return item

          try {
            // 2. Fetch English details as fallback
            const type = item.media_type || (item.first_air_date ? 'tv' : 'movie')
            const { data } = await tmdb.get(`/${type}/${item.id}`, {
              params: { language: 'en-US' }
            })

            // 3. Merge English data (prefer English title/overview if original is CJK)
            return {
              ...item,
              title: data.title || data.name || item.title || item.name,
              name: data.name || data.title || item.name || item.title,
              overview: data.overview || item.overview,
              // Keep original poster/backdrop if available, or fallback
              poster_path: item.poster_path || data.poster_path,
              backdrop_path: item.backdrop_path || data.backdrop_path
            }
          } catch (e) {
            // Silently fail translation and return original item
            return item
          }
        })
      )

      return enrichedItems
    },
    enabled: !!items && items.length > 0,
    staleTime: 1000 * 60 * 60 // 1 hour
  })
}
