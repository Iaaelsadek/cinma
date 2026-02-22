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

const fetchTurkish = async () => {
  const { data } = await tmdb.get('/discover/tv', {
    params: {
      with_original_language: 'tr',
      sort_by: 'popularity.desc',
      'vote_count.gte': 50
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

const fetchArabic = async () => {
  const { data } = await tmdb.get('/discover/tv', {
    params: {
      with_original_language: 'ar',
      sort_by: 'popularity.desc'
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

const fetchOnTheAir = async () => {
  const { data } = await tmdb.get('/tv/on_the_air')
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

const fetchKorean = async () => {
  const { data } = await tmdb.get('/discover/tv', {
    params: {
      with_original_language: 'ko',
      sort_by: 'popularity.desc',
      'vote_count.gte': 50
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

export const SeriesPage = () => {
  const { lang } = useLang()

  const trending = useQuery({ queryKey: ['series-trending'], queryFn: () => fetchTrending('tv') })
  const onTheAir = useQuery({ queryKey: ['series-on-the-air'], queryFn: fetchOnTheAir })
  const turkish = useQuery({ queryKey: ['series-turkish'], queryFn: fetchTurkish })
  const arabic = useQuery({ queryKey: ['series-arabic'], queryFn: fetchArabic })
  const korean = useQuery({ queryKey: ['series-korean'], queryFn: fetchKorean })
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
  const documentary = useQuery({ queryKey: ['series-documentary'], queryFn: () => fetchByGenre(99, 'tv') })
  const reality = useQuery({ queryKey: ['series-reality'], queryFn: () => fetchByGenre(10764, 'tv') })
  const soap = useQuery({ queryKey: ['series-soap'], queryFn: () => fetchByGenre(10766, 'tv') })
  
  const netflix = useQuery({ queryKey: ['series-netflix'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 213, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const hbo = useQuery({ queryKey: ['series-hbo'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 49, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const apple = useQuery({ queryKey: ['series-apple'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 2552, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const amazon = useQuery({ queryKey: ['series-amazon'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 1024, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const anime = useQuery({ queryKey: ['series-anime'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const bollywood = useQuery({ queryKey: ['series-bollywood'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_original_language: 'hi', sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const heroItems = trending.data?.slice(0, 10) || []

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'المسلسلات - سينما أونلاين' : 'Series - Cinema Online'}</title>
      </Helmet>

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
        <QuantumTrain 
          items={onTheAir.data || []} 
          title={lang === 'ar' ? 'يعرض الآن' : 'On The Air'} 
          link="/search?types=tv&sort=first_air_date.desc"
        />

        <QuantumTrain 
          items={trending.data || []} 
          title={lang === 'ar' ? 'الرائج هذا الأسبوع' : 'Trending This Week'} 
          link="/search?types=tv&sort=popularity.desc"
        />

        <QuantumTrain 
          items={arabic.data || []} 
          title={lang === 'ar' ? 'مسلسلات عربية ورمضانية' : 'Arabic & Ramadan Series'} 
          link="/ramadan"
        />

        <QuantumTrain 
          items={turkish.data || []} 
          title={lang === 'ar' ? 'الدراما التركية' : 'Turkish Drama'} 
          link="/search?types=tv&lang=tr"
        />

        <QuantumTrain 
          items={korean.data || []} 
          title={lang === 'ar' ? 'الدراما الكورية' : 'K-Drama'} 
          link="/search?types=tv&lang=ko"
        />

        <QuantumTrain 
          items={topRated.data || []} 
          title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} 
          link="/search?types=tv&sort=vote_average.desc"
        />

        <QuantumTrain 
          items={popular.data || []} 
          title={lang === 'ar' ? 'الأكثر مشاهدة' : 'Most Watched'} 
          link="/search?types=tv&sort=vote_count.desc"
        />

        <QuantumTrain 
          items={netflix.data || []} 
          title={lang === 'ar' ? 'أعمال نتفليكس الأصلية' : 'Netflix Originals'} 
          link="/search?types=tv&keywords=netflix"
        />

        <QuantumTrain 
          items={hbo.data || []} 
          title={lang === 'ar' ? 'إنتاجات HBO' : 'HBO Productions'} 
          link="/search?types=tv&keywords=hbo"
        />

        <QuantumTrain 
          items={apple.data || []} 
          title={lang === 'ar' ? 'أبل تي في بلس' : 'Apple TV+'} 
          link="/search?types=tv&keywords=apple"
        />

        <QuantumTrain 
          items={amazon.data || []} 
          title={lang === 'ar' ? 'أمازون برايم' : 'Amazon Prime'} 
          link="/search?types=tv&keywords=amazon"
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

        <QuantumTrain 
          items={documentary.data || []} 
          title={lang === 'ar' ? 'وثائقي' : 'Documentary'} 
          link="/series/genre/99"
        />

        <QuantumTrain 
          items={reality.data || []} 
          title={lang === 'ar' ? 'برامج واقعية' : 'Reality TV'} 
          link="/series/genre/10764"
        />

        <QuantumTrain 
          items={soap.data || []} 
          title={lang === 'ar' ? 'مسلسلات طويلة' : 'Soap Operas'} 
          link="/series/genre/10766"
        />

        <QuantumTrain 
          items={anime.data || []} 
          title={lang === 'ar' ? 'أنمي ياباني' : 'Anime'} 
          link="/search?types=tv&lang=ja&genres=16"
        />

        <QuantumTrain 
          items={bollywood.data || []} 
          title={lang === 'ar' ? 'مسلسلات هندية' : 'Bollywood Series'} 
          link="/search?types=tv&lang=hi"
        />
      </div>
    </div>
  )
}
