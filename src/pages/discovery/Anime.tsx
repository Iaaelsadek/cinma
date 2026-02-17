import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { tmdb, fetchGenres } from '../../lib/tmdb'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { getGenreSlug, slugify } from '../../lib/utils'

type AnimeItem = {
  id: number
  title: string
  category: string
  image_url: string
  rating?: number
  year?: number
  created_at?: string
}

export const AnimePage = () => {
  const { lang } = useLang()
  const { genre: paramGenre, year: paramYear, rating: paramRating } = useParams()

  const { data: animeList, isLoading } = useQuery({
    queryKey: ['anime-all', paramGenre, paramYear, paramRating],
    queryFn: async () => {
      // 1. Try Supabase first
      let query = supabase
        .from('anime')
        .select('*')
        .order('created_at', { ascending: false })
      
      const { data } = await query.limit(200)
      
      let dbItems = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        poster_path: item.image_url,
        vote_average: item.rating || 9.0, 
        release_date: item.created_at?.split('T')[0] || '2024',
        media_type: 'anime',
        original_language: 'ja',
        category: item.category
      }))

      // Client-side filtering for Supabase data to handle slugs
      if (paramGenre) {
        dbItems = dbItems.filter((item: any) => slugify(item.category) === paramGenre)
      }
      if (paramYear) {
        dbItems = dbItems.filter((item: any) => item.release_date?.startsWith(paramYear))
      }
      if (paramRating) {
        dbItems = dbItems.filter((item: any) => item.vote_average >= Number(paramRating))
      }

      if (dbItems.length > 0) return dbItems

      // 2. Fetch from TMDB if Supabase is empty or no matches
      try {
        const params: any = {
          with_genres: 16, // Animation
          with_origin_country: 'JP',
          sort_by: 'popularity.desc',
          'vote_count.gte': 100
        }

        if (paramYear) {
          params.first_air_date_year = paramYear
        }
        
        if (paramRating) {
          params['vote_average.gte'] = Number(paramRating)
        }

        // If genre param exists, try to map it to TMDB genre ID
        if (paramGenre) {
            const genres = await fetchGenres('tv')
            const genre = genres.find((g: any) => slugify(g.name) === paramGenre || g.id.toString() === paramGenre)
            if (genre) {
                params.with_genres = `16,${genre.id}`
            }
        }

        const tmdbRes = await tmdb.get('/discover/tv', { params })
        
        const tmdbItems = tmdbRes.data.results.map((item: any) => ({
            id: item.id,
            title: item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            release_date: item.first_air_date,
            media_type: 'tv',
            original_language: 'ja',
            category: 'Anime',
            genre_ids: item.genre_ids
        }))
        
        return tmdbItems
      } catch (e) {
        console.error('TMDB fetch failed', e)
        // Fallback Mock Data
        return [
          { id: 101, title: 'One Piece', poster_path: 'https://media.themoviedb.org/t/p/w220_and_h330_face/cMD9Ygz11zjJzAovURpO75Pg738.jpg', vote_average: 8.9, media_type: 'tv', category: 'Action' },
          { id: 102, title: 'Attack on Titan', poster_path: 'https://media.themoviedb.org/t/p/w220_and_h330_face/hTP1DtLGFamjfu8WqjnuQdPuy61.jpg', vote_average: 9.1, media_type: 'tv', category: 'Action' },
          { id: 103, title: 'Demon Slayer', poster_path: 'https://media.themoviedb.org/t/p/w220_and_h330_face/xUfRZu2mi8bZJKSe15TLkQymxCot.jpg', vote_average: 8.8, media_type: 'tv', category: 'Action' },
          { id: 104, title: 'Naruto', poster_path: 'https://media.themoviedb.org/t/p/w220_and_h330_face/vauCEnR7CjyqePGUkyKAoExO75C.jpg', vote_average: 8.5, media_type: 'tv', category: 'Action' },
          { id: 105, title: 'Death Note', poster_path: 'https://media.themoviedb.org/t/p/w220_and_h330_face/tCzeDfOdqB8m0J82s27HCV84xM9.jpg', vote_average: 9.0, media_type: 'tv', category: 'Thriller' }
        ]
      }
    }
  })

  // Group by category
  const categories = [...new Set(animeList?.map((a: any) => a.category).filter(Boolean))]
  const byCategory = (cat: string) => animeList?.filter((a: any) => a.category === cat) || []
  
  // If filtered, show all as one list. If not, show sections.
  const isFiltered = !!paramGenre || !!paramYear
  const displayItems = animeList || []

  // Hero Items
  const heroItems = displayItems.slice(0, 10)

  return (
    <div className="min-h-screen text-white pb-24 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'أنمي - سينما أونلاين' : 'Anime - Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems} />

      <div className="space-y-8 relative z-10 -mt-20 px-4 md:px-0">
        {isFiltered ? (
           <div className="px-4 md:px-12">
              <h2 className="text-3xl font-bold mb-8 capitalize">{paramGenre || 'Anime'} {paramYear}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {/* We need a grid component or reuse QuantumTrain in a grid mode? 
                    Actually, let's just use QuantumTrain for the single filtered row if items are few, 
                    or map MovieCard directly.
                */}
                {/* For simplicity, let's use a wrapped list since we don't have a grid component handy 
                    that matches QuantumTrain style perfectly without copy-paste. 
                    Let's use a single QuantumTrain for now or create a grid.
                */}
                 <QuantumTrain 
                    items={displayItems} 
                    title={paramGenre || (lang === 'ar' ? 'نتائج البحث' : 'Search Results')}
                  />
              </div>
           </div>
        ) : (
          <>
            <QuantumTrain 
              items={displayItems.slice(0, 15)} 
              title={lang === 'ar' ? 'أحدث الأنمي' : 'Latest Anime'} 
              link="/search?types=anime&sort=latest"
            />
            
            <QuantumTrain 
              items={[...displayItems].sort((a: any, b: any) => b.vote_average - a.vote_average).slice(0, 15)} 
              title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} 
              link="/search?types=anime&sort=top_rated"
            />

            {categories.map((cat: any) => (
              <QuantumTrain 
                key={cat as string}
                items={byCategory(cat as string)} 
                title={cat as string} 
                link={`/anime/${slugify(cat as string)}`}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
