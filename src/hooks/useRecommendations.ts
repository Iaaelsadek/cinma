import { useQuery } from '@tanstack/react-query'
import { supabase, getUserPreferences } from '../lib/supabase'
import { useAuth } from './useAuth'
import { tmdb } from '../lib/tmdb'

type ContentItem = {
  id: number
  title?: string
  name?: string
  media_type: 'movie' | 'tv'
  genre_ids?: number[]
  poster_path?: string
  vote_average?: number
  release_date?: string
  first_air_date?: string
  overview?: string
}

// Helper to fetch details for history/watchlist items to get genres
async function fetchContentDetails(items: { content_id: number; content_type: string }[]) {
  // We'll just take the last 5 distinct items to form a preference profile
  // Using TMDB to get details including genres and cast if possible
  const distinctItems = Array.from(new Set(items.map(i => `${i.content_type}:${i.content_id}`)))
    .slice(0, 5)
    .map(s => {
      const [type, id] = s.split(':')
      return { type: type as 'movie' | 'tv', id: Number(id) }
    })

  const details = await Promise.all(
    distinctItems.map(async (item) => {
      try {
        const { data } = await tmdb.get(`/${item.type}/${item.id}`, {
          params: { append_to_response: 'credits' }
        })
        return {
          ...data,
          media_type: item.type
        }
      } catch (e) {
        return null
      }
    })
  )

  return details.filter(Boolean)
}

export function useRecommendations() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn: async () => {
      if (!user) return []

      // 1. Data Collector
      const prefs = await getUserPreferences(user.id)
      const allItems = [...prefs.history, ...prefs.watchlist]

      if (allItems.length === 0) return []

      // 2. Build Preference Profile (Genres & Cast)
      const details = await fetchContentDetails(allItems)
      
      const genreCounts: Record<number, number> = {}
      const castCounts: Record<number, number> = {}

      details.forEach((item: any) => {
        // Count Genres
        item.genres?.forEach((g: any) => {
          genreCounts[g.id] = (genreCounts[g.id] || 0) + 1
        })
        
        // Count Cast (top 3 billed actors)
        if (item.credits && item.credits.cast) {
          item.credits.cast.slice(0, 3).forEach((actor: any) => {
            castCounts[actor.id] = (castCounts[actor.id] || 0) + 1
          })
        }
      })

      // Sort genres by frequency
      const topGenres = Object.entries(genreCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([id]) => id)
        
      // Sort cast by frequency
      const topCast = Object.entries(castCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([id]) => id)

      if (topGenres.length === 0 && topCast.length === 0) return []

      // 3. Similarity Algorithm: Fetch recommendations based on top genres & cast
      // We'll use TMDB discover for this to get high quality recommendations
      const recommendations: ContentItem[] = []
      
      // Strategy: 
      // 1. Fetch by Genre (broad match)
      // 2. Fetch by Cast (if available, for variety)
      
      // Fetch for top genre (Movie)
      try {
        const { data: movies } = await tmdb.get('/discover/movie', {
          params: {
            with_genres: topGenres.join('|'), // OR logic for broader results
            with_people: topCast.length > 0 ? topCast.join('|') : undefined, // Include favorite actors
            sort_by: 'popularity.desc',
            'vote_count.gte': 100,
            page: 1,
            include_adult: false
          }
        })
        // Add media_type
        const movieResults = movies.results?.map((m: any) => ({ ...m, media_type: 'movie' })) || []
        recommendations.push(...movieResults)
        
        // If we have cast but few results from mixed query, try cast-only query
        if (topCast.length > 0 && recommendations.length < 5) {
             const { data: castMovies } = await tmdb.get('/discover/movie', {
              params: {
                with_people: topCast.join('|'),
                sort_by: 'popularity.desc',
                page: 1,
                include_adult: false
              }
            })
            recommendations.push(...(castMovies.results?.map((m: any) => ({ ...m, media_type: 'movie' })) || []))
        }
      } catch (e) {
        // console.error('Error fetching movie recommendations', e)
      }

      // Fetch for top genre (TV)
      try {
        const { data: tv } = await tmdb.get('/discover/tv', {
          params: {
            with_genres: topGenres.join('|'),
            sort_by: 'popularity.desc',
            'vote_count.gte': 100,
            page: 1,
            include_adult: false
          }
        })
        const tvResults = tv.results?.map((t: any) => ({ ...t, media_type: 'tv' })) || []
        recommendations.push(...tvResults)
      } catch (e) {
        // console.error('Error fetching tv recommendations', e)
      }

      // 4. Filter out watched/watchlist items
      // Create a set of "type:id" strings for quick lookup
      const watchedSet = new Set(allItems.map(i => `${i.content_type}:${i.content_id}`))
      
      const filtered = recommendations.filter(item => 
        !watchedSet.has(`${item.media_type}:${item.id}`)
      )

      // Shuffle and slice
      // Simple shuffle
      const shuffled = filtered.sort(() => Math.random() - 0.5)
      
      return shuffled.slice(0, 12)
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
