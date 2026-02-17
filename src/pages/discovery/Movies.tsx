import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../../lib/tmdb'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'

const fetchByGenre = async (genreId: number, type: 'movie' | 'tv' = 'movie') => {
  const { data } = await tmdb.get(`/discover/${type}`, {
    params: {
      with_genres: genreId,
      sort_by: 'popularity.desc',
      'vote_count.gte': 100
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: type }))
}

const fetchTrending = async (type: 'movie' | 'tv' = 'movie') => {
  const { data } = await tmdb.get(`/trending/${type}/week`)
  return data.results.map((item: any) => ({ ...item, media_type: type }))
}

const fetchTopRated = async (type: 'movie' | 'tv' = 'movie') => {
  const { data } = await tmdb.get(`/${type}/top_rated`)
  return data.results.map((item: any) => ({ ...item, media_type: type }))
}

const fetchPopular = async (type: 'movie' | 'tv' = 'movie') => {
  const { data } = await tmdb.get(`/${type}/popular`)
  return data.results.map((item: any) => ({ ...item, media_type: type }))
}

export const MoviesPage = () => {
  const { lang } = useLang()

  const trending = useQuery({ queryKey: ['movies-trending'], queryFn: () => fetchTrending('movie') })
  const topRated = useQuery({ queryKey: ['movies-top-rated'], queryFn: () => fetchTopRated('movie') })
  const popular = useQuery({ queryKey: ['movies-popular'], queryFn: () => fetchPopular('movie') })
  
  const action = useQuery({ queryKey: ['movies-action'], queryFn: () => fetchByGenre(28, 'movie') })
  const adventure = useQuery({ queryKey: ['movies-adventure'], queryFn: () => fetchByGenre(12, 'movie') })
  const sciFi = useQuery({ queryKey: ['movies-scifi'], queryFn: () => fetchByGenre(878, 'movie') })
  const animation = useQuery({ queryKey: ['movies-animation'], queryFn: () => fetchByGenre(16, 'movie') })
  const comedy = useQuery({ queryKey: ['movies-comedy'], queryFn: () => fetchByGenre(35, 'movie') })
  const horror = useQuery({ queryKey: ['movies-horror'], queryFn: () => fetchByGenre(27, 'movie') })
  const drama = useQuery({ queryKey: ['movies-drama'], queryFn: () => fetchByGenre(18, 'movie') })
  const crime = useQuery({ queryKey: ['movies-crime'], queryFn: () => fetchByGenre(80, 'movie') })
  const romance = useQuery({ queryKey: ['movies-romance'], queryFn: () => fetchByGenre(10749, 'movie') })
  const thriller = useQuery({ queryKey: ['movies-thriller'], queryFn: () => fetchByGenre(53, 'movie') })

  const heroItems = trending.data?.slice(0, 10) || []

  return (
    <div className="min-h-screen text-white pb-24 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'الأفلام - سينما أونلاين' : 'Movies - Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems} />

      <div className="space-y-8 -mt-20 relative z-10">
        <QuantumTrain 
          items={trending.data || []} 
          title={lang === 'ar' ? 'الرائج هذا الأسبوع' : 'Trending This Week'} 
          link="/search?types=movie&sort=trending"
        />
        
        <QuantumTrain 
          items={topRated.data || []} 
          title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} 
          link="/search?types=movie&sort=top_rated"
        />

        <QuantumTrain 
          items={popular.data || []} 
          title={lang === 'ar' ? 'الأكثر شعبية' : 'Most Popular'} 
          link="/search?types=movie&sort=popular"
        />

        <QuantumTrain 
          items={action.data || []} 
          title={lang === 'ar' ? 'أكشن' : 'Action'} 
          link="/movies/genre/28"
        />

        <QuantumTrain 
          items={adventure.data || []} 
          title={lang === 'ar' ? 'مغامرة' : 'Adventure'} 
          link="/movies/genre/12"
        />

        <QuantumTrain 
          items={sciFi.data || []} 
          title={lang === 'ar' ? 'خيال علمي' : 'Sci-Fi'} 
          link="/movies/genre/878"
        />

        <QuantumTrain 
          items={animation.data || []} 
          title={lang === 'ar' ? 'رسوم متحركة' : 'Animation'} 
          link="/movies/genre/16"
        />

        <QuantumTrain 
          items={comedy.data || []} 
          title={lang === 'ar' ? 'كوميديا' : 'Comedy'} 
          link="/movies/genre/35"
        />

        <QuantumTrain 
          items={horror.data || []} 
          title={lang === 'ar' ? 'رعب' : 'Horror'} 
          link="/movies/genre/27"
        />

        <QuantumTrain 
          items={thriller.data || []} 
          title={lang === 'ar' ? 'إثارة' : 'Thriller'} 
          link="/movies/genre/53"
        />

        <QuantumTrain 
          items={drama.data || []} 
          title={lang === 'ar' ? 'دراما' : 'Drama'} 
          link="/movies/genre/18"
        />

        <QuantumTrain 
          items={crime.data || []} 
          title={lang === 'ar' ? 'جريمة' : 'Crime'} 
          link="/movies/genre/80"
        />

        <QuantumTrain 
          items={romance.data || []} 
          title={lang === 'ar' ? 'رومانسي' : 'Romance'} 
          link="/movies/genre/10749"
        />
      </div>
    </div>
  )
}
