import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { errorLogger } from '../services/errorLogging'
import { FEATURED_RECITERS } from '../data/quran'
import type { QuranReciter } from '../components/features/quran/ReciterList'

export const useReciters = () => {
  return useQuery({
    queryKey: ['quran-reciters-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quran_reciters')
        .select('*')
        .eq('is_active', true)
      
      if (error) {
        errorLogger.logError({
          message: 'Error fetching Quran reciters',
          severity: 'medium',
          category: 'database',
          context: { error }
        })
        return []
      }
      
      const list = data as QuranReciter[]
      
      // Sort: Featured first, then Alphabetical
      return list.sort((a, b) => {
        // Find index in FEATURED_RECITERS (use -1 if not found)
        const aIndex = FEATURED_RECITERS.findIndex(f => a.name.includes(f))
        const bIndex = FEATURED_RECITERS.findIndex(f => b.name.includes(f))
        
        // Both are featured -> sort by order in FEATURED_RECITERS
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        
        // Only A is featured -> A comes first
        if (aIndex !== -1) return -1
        
        // Only B is featured -> B comes first
        if (bIndex !== -1) return 1
        
        // Neither is featured -> Alphabetical
        return a.name.localeCompare(b.name, 'ar')
      })
    },
    staleTime: 1000 * 60 * 60 // 1 hour
  })
}
