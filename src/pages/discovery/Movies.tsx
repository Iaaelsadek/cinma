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

const fetchNowPlaying = async () => {
  const { data } = await tmdb.get('/movie/now_playing')
  return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
}

const fetchUpcoming = async () => {
  const { data } = await tmdb.get('/movie/upcoming')
  return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
}

const fetchArabicMovies = async () => {
  const { data } = await tmdb.get('/discover/movie', {
    params: {
      with_original_language: 'ar',
      sort_by: 'popularity.desc'
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
}

export const MoviesPage = () => {
  const { lang } = useLang()

  const trending = useQuery({ queryKey: ['movies-trending'], queryFn: () => fetchTrending('movie') })
  const nowPlaying = useQuery({ queryKey: ['movies-now-playing'], queryFn: fetchNowPlaying })
  const upcoming = useQuery({ queryKey: ['movies-upcoming'], queryFn: fetchUpcoming })
  const arabic = useQuery({ queryKey: ['movies-arabic'], queryFn: fetchArabicMovies })
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
  const family = useQuery({ queryKey: ['movies-family'], queryFn: () => fetchByGenre(10751, 'movie') })
  const documentary = useQuery({ queryKey: ['movies-documentary'], queryFn: () => fetchByGenre(99, 'movie') })
  const history = useQuery({ queryKey: ['movies-history'], queryFn: () => fetchByGenre(36, 'movie') })
  const war = useQuery({ queryKey: ['movies-war'], queryFn: () => fetchByGenre(10752, 'movie') })
  
  const anime = useQuery({ queryKey: ['movies-anime'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const bollywood = useQuery({ queryKey: ['movies-bollywood'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_original_language: 'hi', sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const marvel = useQuery({ queryKey: ['movies-marvel'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 420, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const dc = useQuery({ queryKey: ['movies-dc'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 9993, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const pixar = useQuery({ queryKey: ['movies-pixar'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 3, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const disney = useQuery({ queryKey: ['movies-disney'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 2, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const warner = useQuery({ queryKey: ['movies-warner'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 174, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const universal = useQuery({ queryKey: ['movies-universal'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 33, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const sony = useQuery({ queryKey: ['movies-sony'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 5, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const ghibli = useQuery({ queryKey: ['movies-ghibli'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 10342, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const paramount = useQuery({ queryKey: ['movies-paramount'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 4, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const lionsgate = useQuery({ queryKey: ['movies-lionsgate'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 35, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const twentiethCentury = useQuery({ queryKey: ['movies-20th'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 25, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const dreamworks = useQuery({ queryKey: ['movies-dreamworks'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 521, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }})

  const heroItems = trending.data?.slice(0, 10) || []

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'الأفلام - سينما أونلاين' : 'Movies - Cinema Online'}</title>
      </Helmet>

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
        <QuantumTrain 
          items={nowPlaying.data || []} 
          title={lang === 'ar' ? 'يعرض الآن في السينما' : 'Now Playing in Theaters'} 
          link="/search?types=movie&sort=release_date.desc"
        />

        <QuantumTrain 
          items={upcoming.data || []} 
          title={lang === 'ar' ? 'قريباً في السينما' : 'Coming Soon'} 
          link="/search?types=movie&year=2026"
        />

        <QuantumTrain 
          items={arabic.data || []} 
          title={lang === 'ar' ? 'أفلام عربية' : 'Arabic Movies'} 
          link="/search?types=movie&lang=ar"
        />

        <QuantumTrain 
          items={trending.data || []} 
          title={lang === 'ar' ? 'الرائج هذا الأسبوع' : 'Trending This Week'} 
          link="/search?types=movie&sort=popularity.desc"
        />
        
        <QuantumTrain 
          items={topRated.data || []} 
          title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} 
          link="/search?types=movie&sort=vote_average.desc"
        />

        <QuantumTrain 
          items={popular.data || []} 
          title={lang === 'ar' ? 'الأكثر مشاهدة' : 'Most Watched'} 
          link="/search?types=movie&sort=vote_count.desc"
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
          items={marvel.data || []} 
          title={lang === 'ar' ? 'عالم مارفل السينمائي' : 'Marvel Cinematic Universe'} 
          link="/search?types=movie&keywords=marvel"
        />

        <QuantumTrain 
          items={dc.data || []} 
          title={lang === 'ar' ? 'عالم دي سي' : 'DC Universe'} 
          link="/search?types=movie&keywords=dc"
        />

        <QuantumTrain 
          items={disney.data || []} 
          title={lang === 'ar' ? 'ديزني' : 'Disney'} 
          link="/search?types=movie&keywords=disney"
          color="blue"
        />

        <QuantumTrain 
          items={pixar.data || []} 
          title={lang === 'ar' ? 'بيكسار' : 'Pixar'} 
          link="/search?types=movie&keywords=pixar"
          color="cyan"
        />

        <QuantumTrain 
          items={warner.data || []} 
          title={lang === 'ar' ? 'وارنر بروس' : 'Warner Bros'} 
          link="/search?types=movie&keywords=warner"
          color="gold"
        />

        <QuantumTrain 
          items={universal.data || []} 
          title={lang === 'ar' ? 'يونيفرسال' : 'Universal Pictures'} 
          link="/search?types=movie&keywords=universal"
          color="indigo"
        />

        <QuantumTrain 
          items={sony.data || []} 
          title={lang === 'ar' ? 'سوني بيكتشرز' : 'Sony Pictures'} 
          link="/search?types=movie&keywords=sony"
          color="red"
        />

        <QuantumTrain 
          items={ghibli.data || []} 
          title={lang === 'ar' ? 'استوديو غيبلي' : 'Studio Ghibli'} 
          link="/search?types=movie&keywords=ghibli"
          color="green"
        />

        <QuantumTrain 
          items={paramount.data || []} 
          title={lang === 'ar' ? 'باراماونت' : 'Paramount Pictures'} 
          link="/search?types=movie&keywords=paramount"
          color="blue"
        />

        <QuantumTrain 
          items={lionsgate.data || []} 
          title={lang === 'ar' ? 'ليونزغيت' : 'Lionsgate'} 
          link="/search?types=movie&keywords=lionsgate"
          color="gold"
        />

        <QuantumTrain 
          items={twentiethCentury.data || []} 
          title={lang === 'ar' ? 'استوديوهات القرن العشرين' : '20th Century Studios'} 
          link="/search?types=movie&keywords=20th"
          color="red"
        />

        <QuantumTrain 
          items={dreamworks.data || []} 
          title={lang === 'ar' ? 'دريم ووركس أنيميشن' : 'DreamWorks Animation'} 
          link="/search?types=movie&keywords=dreamworks"
          color="blue"
        />

        <QuantumTrain 
          items={anime.data || []} 
          title={lang === 'ar' ? 'أفلام أنمي' : 'Anime Movies'} 
          link="/search?types=movie&genres=16"
          color="purple"
        />

        <QuantumTrain 
          items={bollywood.data || []} 
          title={lang === 'ar' ? 'أفلام بوليوود' : 'Bollywood Movies'} 
          link="/search?types=movie&lang=hi"
          color="gold"
        />
      </div>
    </div>
  )
}
