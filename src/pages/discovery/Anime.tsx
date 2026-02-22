import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { tmdb, fetchGenres } from '../../lib/tmdb'
import { errorLogger } from '../../services/errorLogging'
import { MovieCard } from '../../components/features/media/MovieCard'
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
        media_type: 'tv',
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
        errorLogger.logError({
          message: 'TMDB fetch failed',
          severity: 'low',
          category: 'network',
          context: { error: e, params: { genre: paramGenre, year: paramYear, rating: paramRating } }
        })
        return []
      }
    }
  })

  // Specific Anime Genre Queries
  const fetchAnimeByKeyword = async (keywordId: number) => {
    const { data } = await tmdb.get('/discover/tv', {
      params: {
        with_genres: 16,
        with_keywords: keywordId,
        with_origin_country: 'JP',
        sort_by: 'popularity.desc'
      }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }

  const shonen = useQuery({ queryKey: ['anime-shonen'], queryFn: () => fetchAnimeByKeyword(10472), enabled: !paramGenre })
  const seinen = useQuery({ queryKey: ['anime-seinen'], queryFn: () => fetchAnimeByKeyword(10474), enabled: !paramGenre })
  const shojo = useQuery({ queryKey: ['anime-shojo'], queryFn: () => fetchAnimeByKeyword(10473), enabled: !paramGenre })
  const isekai = useQuery({ queryKey: ['anime-isekai'], queryFn: () => fetchAnimeByKeyword(227280), enabled: !paramGenre })
  const sports = useQuery({ queryKey: ['anime-sports'], queryFn: () => fetchAnimeByKeyword(6075), enabled: !paramGenre })
  const mecha = useQuery({ queryKey: ['anime-mecha'], queryFn: () => fetchAnimeByKeyword(10632), enabled: !paramGenre })
  const sliceOfLife = useQuery({ queryKey: ['anime-slice-of-life'], queryFn: () => fetchAnimeByKeyword(9840), enabled: !paramGenre })
  const psychological = useQuery({ queryKey: ['anime-psychological'], queryFn: () => fetchAnimeByKeyword(9841), enabled: !paramGenre })
  
  const fantasy = useQuery({ queryKey: ['anime-fantasy'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_genres: '16,14', sort_by: 'popularity.desc', 'vote_count.gte': 50 }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }, enabled: !paramGenre })

  const horror = useQuery({ queryKey: ['anime-horror'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_genres: '16,27', sort_by: 'popularity.desc', 'vote_count.gte': 50 }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }, enabled: !paramGenre })

  // Group by category (for Supabase items or initial load)
  const categories = [...new Set(animeList?.map((a: any) => a.category).filter(Boolean))]
  const byCategory = (cat: string) => animeList?.filter((a: any) => a.category === cat) || []
  
  // If filtered, show all as one list. If not, show sections.
  const isFiltered = !!paramGenre || !!paramYear
  const displayItems = animeList || []

  // Hero Items
  const heroItems = displayItems.slice(0, 10)

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'أنمي - سينما أونلاين' : 'Anime - Cinema Online'}</title>
      </Helmet>

      <QuantumHero items={heroItems} />

      <div className="space-y-2 relative z-10 pt-4">
        {isFiltered ? (
           <div className="px-4 md:px-12">
              <h2 className="text-xl font-bold mb-4 capitalize">{paramGenre || 'Anime'} {paramYear}</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {displayItems.map((item: any, idx: number) => (
                  <MovieCard key={item.id} movie={item} index={idx} />
                ))}
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

            <QuantumTrain 
              items={shonen.data || []} 
              title={lang === 'ar' ? 'شونين (أكشن ومغامرات)' : 'Shonen (Action & Adventure)'} 
              link="/search?types=anime&keywords=10472"
            />

            <QuantumTrain 
              items={seinen.data || []} 
              title={lang === 'ar' ? 'سينين (للشباب)' : 'Seinen (Young Adult)'} 
              link="/search?types=anime&keywords=10474"
            />

            <QuantumTrain 
              items={isekai.data || []} 
              title={lang === 'ar' ? 'إيسيكاي (عوالم أخرى)' : 'Isekai (Other Worlds)'} 
              link="/search?types=anime&keywords=227280"
            />

            <QuantumTrain 
              items={shojo.data || []} 
              title={lang === 'ar' ? 'شوجو (رومانسي)' : 'Shojo (Romance)'} 
              link="/search?types=anime&keywords=10473"
            />

            <QuantumTrain 
              items={sports.data || []} 
              title={lang === 'ar' ? 'رياضي' : 'Sports'} 
              link="/search?types=anime&keywords=6075"
            />

            <QuantumTrain 
              items={mecha.data || []} 
              title={lang === 'ar' ? 'ميكا (آليين)' : 'Mecha (Robots)'} 
              link="/search?types=anime&keywords=10632"
            />

            <QuantumTrain 
              items={fantasy.data || []} 
              title={lang === 'ar' ? 'أنمي خيالي' : 'Fantasy Anime'} 
              link="/search?types=anime&genres=16,14"
              color="purple"
            />

            <QuantumTrain 
              items={sliceOfLife.data || []} 
              title={lang === 'ar' ? 'شريحة من الحياة' : 'Slice of Life'} 
              link="/search?types=anime&keywords=9840"
              color="green"
            />

            <QuantumTrain 
              items={psychological.data || []} 
              title={lang === 'ar' ? 'أنمي نفسي' : 'Psychological Anime'} 
              link="/search?types=anime&keywords=9841"
              color="indigo"
            />

            <QuantumTrain 
              items={horror.data || []} 
              title={lang === 'ar' ? 'رعب وغموض' : 'Horror & Mystery'} 
              link="/search?types=anime&genres=16,27"
              color="red"
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
