import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../../lib/tmdb'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'

const fetchByGenre = async (genreId: number, type: 'movie' | 'tv' = 'tv') => {
  const { data } = await tmdb.get(`/discover/${type}`, {
    params: {
      with_genres: genreId,
      sort_by: 'popularity.desc',
      'vote_count.gte': 100
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: type }))
}

const fetchTrending = async (type: 'movie' | 'tv' = 'tv') => {
  const { data } = await tmdb.get(`/trending/${type}/week`)
  return data.results.map((item: any) => ({ ...item, media_type: type }))
}

const fetchTopRated = async (type: 'movie' | 'tv' = 'tv') => {
  const { data } = await tmdb.get(`/${type}/top_rated`)
  return data.results.map((item: any) => ({ ...item, media_type: type }))
}

const fetchPopular = async (type: 'movie' | 'tv' = 'tv') => {
  const { data } = await tmdb.get(`/${type}/popular`)
  return data.results.map((item: any) => ({ ...item, media_type: type }))
}

export const SeriesPage = () => {
  const { lang } = useLang()

  const trending = useQuery({ queryKey: ['series-trending'], queryFn: () => fetchTrending('tv') })
  const topRated = useQuery({ queryKey: ['series-top-rated'], queryFn: () => fetchTopRated('tv') })
  const popular = useQuery({ queryKey: ['series-popular'], queryFn: () => fetchPopular('tv') })
  
  const actionAdventure = useQuery({ queryKey: ['series-action-adventure'], queryFn: () => fetchByGenre(10759, 'tv') })
  const sciFiFantasy = useQuery({ queryKey: ['series-scifi-fantasy'], queryFn: () => fetchByGenre(10765, 'tv') })
  const animation = useQuery({ queryKey: ['series-animation'], queryFn: () => fetchByGenre(16, 'tv') })
  const comedy = useQuery({ queryKey: ['series-comedy'], queryFn: () => fetchByGenre(35, 'tv') })
  const drama = useQuery({ queryKey: ['series-drama'], queryFn: () => fetchByGenre(18, 'tv') })
  const mystery = useQuery({ queryKey: ['series-mystery'], queryFn: () => fetchByGenre(9648, 'tv') })
  const crime = useQuery({ queryKey: ['series-crime'], queryFn: () => fetchByGenre(80, 'tv') })
  const kids = useQuery({ queryKey: ['series-kids'], queryFn: () => fetchByGenre(10762, 'tv') })

  const heroItems = trending.data?.slice(0, 10) || []

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Helmet>
        <title>{lang === 'ar' ? 'المسلسلات - سينما أونلاين' : 'Series - Cinema Online'}</title>
      </Helmet>

      {/* Hero Section */}
      <QuantumHero items={heroItems} />

      <div className="space-y-8 -mt-20 relative z-10">
        <QuantumTrain 
          items={trending.data || []} 
          title={lang === 'ar' ? 'الرائج هذا الأسبوع' : 'Trending This Week'} 
          link="/search?types=tv&sort=trending"
        />
        
        <QuantumTrain 
          items={topRated.data || []} 
          title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} 
          link="/search?types=tv&sort=top_rated"
        />

        <QuantumTrain 
          items={popular.data || []} 
          title={lang === 'ar' ? 'الأكثر شعبية' : 'Most Popular'} 
          link="/search?types=tv&sort=popular"
        />

        <QuantumTrain 
          items={actionAdventure.data || []} 
          title={lang === 'ar' ? 'أكشن ومغامرة' : 'Action & Adventure'} 
          link="/series/genre/10759"
        />

        <QuantumTrain 
          items={sciFiFantasy.data || []} 
          title={lang === 'ar' ? 'خيال علمي وفانتازيا' : 'Sci-Fi & Fantasy'} 
          link="/series/genre/10765"
        />

        <QuantumTrain 
          items={animation.data || []} 
          title={lang === 'ar' ? 'رسوم متحركة' : 'Animation'} 
          link="/series/genre/16"
        />

        <QuantumTrain 
          items={comedy.data || []} 
          title={lang === 'ar' ? 'كوميديا' : 'Comedy'} 
          link="/series/genre/35"
        />

        <QuantumTrain 
          items={drama.data || []} 
          title={lang === 'ar' ? 'دراما' : 'Drama'} 
          link="/series/genre/18"
        />

        <QuantumTrain 
          items={crime.data || []} 
          title={lang === 'ar' ? 'جريمة' : 'Crime'} 
          link="/series/genre/80"
        />

        <QuantumTrain 
          items={mystery.data || []} 
          title={lang === 'ar' ? 'غموض' : 'Mystery'} 
          link="/series/genre/9648"
        />

        <QuantumTrain 
          items={kids.data || []} 
          title={lang === 'ar' ? 'أطفال' : 'Kids'} 
          link="/series/genre/10762"
        />
      </div>
    </div>
  )
}
