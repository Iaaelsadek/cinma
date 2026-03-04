import { useQuery } from '@tanstack/react-query'
import { tmdb } from '../../lib/tmdb'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { useHiddenMedia } from '../../hooks/useHiddenMedia'
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
  const { filterMedia } = useHiddenMedia()

  const trending = useQuery({ queryKey: ['movies-trending'], queryFn: async () => filterMedia(await fetchTrending('movie')) })
  const nowPlaying = useQuery({ queryKey: ['movies-now-playing'], queryFn: async () => filterMedia(await fetchNowPlaying()) })
  const upcoming = useQuery({ queryKey: ['movies-upcoming'], queryFn: async () => filterMedia(await fetchUpcoming()) })
  const arabic = useQuery({ queryKey: ['movies-arabic'], queryFn: async () => filterMedia(await fetchArabicMovies()) })
  const topRated = useQuery({ queryKey: ['movies-top-rated'], queryFn: async () => filterMedia(await fetchTopRated('movie')) })
  const popular = useQuery({ queryKey: ['movies-popular'], queryFn: async () => filterMedia(await fetchPopular('movie')) })
  
  const classics = useQuery({ queryKey: ['movies-classics'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { 
        'primary_release_date.lte': '1980-01-01',
        sort_by: 'popularity.desc',
        'vote_count.gte': 100
      }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const nineties = useQuery({ queryKey: ['movies-90s'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { 
        'primary_release_date.gte': '1990-01-01',
        'primary_release_date.lte': '1999-12-31',
        sort_by: 'popularity.desc',
        'vote_count.gte': 100
      }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const action = useQuery({ queryKey: ['movies-action'], queryFn: async () => filterMedia(await fetchByGenre(28, 'movie')) })
  const adventure = useQuery({ queryKey: ['movies-adventure'], queryFn: async () => filterMedia(await fetchByGenre(12, 'movie')) })
  const sciFi = useQuery({ queryKey: ['movies-scifi'], queryFn: async () => filterMedia(await fetchByGenre(878, 'movie')) })
  const animation = useQuery({ queryKey: ['movies-animation'], queryFn: async () => filterMedia(await fetchByGenre(16, 'movie')) })
  const comedy = useQuery({ queryKey: ['movies-comedy'], queryFn: async () => filterMedia(await fetchByGenre(35, 'movie')) })
  const horror = useQuery({ queryKey: ['movies-horror'], queryFn: async () => filterMedia(await fetchByGenre(27, 'movie')) })
  const drama = useQuery({ queryKey: ['movies-drama'], queryFn: async () => filterMedia(await fetchByGenre(18, 'movie')) })
  const crime = useQuery({ queryKey: ['movies-crime'], queryFn: async () => filterMedia(await fetchByGenre(80, 'movie')) })
  const romance = useQuery({ queryKey: ['movies-romance'], queryFn: async () => filterMedia(await fetchByGenre(10749, 'movie')) })
  const thriller = useQuery({ queryKey: ['movies-thriller'], queryFn: async () => filterMedia(await fetchByGenre(53, 'movie')) })
  const family = useQuery({ queryKey: ['movies-family'], queryFn: async () => filterMedia(await fetchByGenre(10751, 'movie')) })
  const documentary = useQuery({ queryKey: ['movies-documentary'], queryFn: async () => filterMedia(await fetchByGenre(99, 'movie')) })
  const history = useQuery({ queryKey: ['movies-history'], queryFn: async () => filterMedia(await fetchByGenre(36, 'movie')) })
  const war = useQuery({ queryKey: ['movies-war'], queryFn: async () => filterMedia(await fetchByGenre(10752, 'movie')) })
  const western = useQuery({ queryKey: ['movies-western'], queryFn: async () => filterMedia(await fetchByGenre(37, 'movie')) })
  const music = useQuery({ queryKey: ['movies-music'], queryFn: async () => filterMedia(await fetchByGenre(10402, 'movie')) })
  const mystery = useQuery({ queryKey: ['movies-mystery'], queryFn: async () => filterMedia(await fetchByGenre(9648, 'movie')) })
  const fantasy = useQuery({ queryKey: ['movies-fantasy'], queryFn: async () => filterMedia(await fetchByGenre(14, 'movie')) })
  
  const anime = useQuery({ queryKey: ['movies-anime'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const bollywood = useQuery({ queryKey: ['movies-bollywood'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_original_language: 'hi', sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const marvel = useQuery({ queryKey: ['movies-marvel'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 420, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const dc = useQuery({ queryKey: ['movies-dc'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 9993, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const pixar = useQuery({ queryKey: ['movies-pixar'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 3, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const disney = useQuery({ queryKey: ['movies-disney'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 2, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const warner = useQuery({ queryKey: ['movies-warner'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 174, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const universal = useQuery({ queryKey: ['movies-universal'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 33, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const sony = useQuery({ queryKey: ['movies-sony'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 5, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const ghibli = useQuery({ queryKey: ['movies-ghibli'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 10342, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const paramount = useQuery({ queryKey: ['movies-paramount'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 4, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const lionsgate = useQuery({ queryKey: ['movies-lionsgate'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 35, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const twentiethCentury = useQuery({ queryKey: ['movies-20th'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: 25, sort_by: 'popularity.desc' }
    })
    return filterMedia(data.results.map((item: any) => ({ ...item, media_type: 'movie' })))
  }})

  const dreamworks = useQuery({ queryKey: ['movies-dreamworks'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 521, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const illumination = useQuery({ queryKey: ['movies-illumination'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 6704, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const a24 = useQuery({ queryKey: ['movies-a24'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 41077, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const mgm = useQuery({ queryKey: ['movies-mgm'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 8411, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const lucasfilm = useQuery({ queryKey: ['movies-lucasfilm'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 1, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const blumhouse = useQuery({ queryKey: ['movies-blumhouse'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 3172, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const newLine = useQuery({ queryKey: ['movies-newline'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 12, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const columbia = useQuery({ queryKey: ['movies-columbia'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 5, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })
  const legendary = useQuery({ queryKey: ['movies-legendary'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 923, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const focus = useQuery({ queryKey: ['movies-focus'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 10146, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const summit = useQuery({ queryKey: ['movies-summit'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 491, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const toho = useQuery({ queryKey: ['movies-toho'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 882, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const netflixMovies = useQuery({ queryKey: ['movies-netflix'], queryFn: async () => filterMedia((await tmdb.get('/discover/movie', {
    params: { with_companies: 20580, sort_by: 'popularity.desc' }
  })).data.results.map((item: any) => ({ ...item, media_type: 'movie' }))) })

  const heroItems = filterMedia(trending.data?.slice(0, 10)) || []

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'الأفلام - سينما أونلاين' : 'Movies - Cinema Online'}</title>
      </Helmet>

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
        <QuantumTrain 
          items={filterMedia(nowPlaying.data)} 
          title={lang === 'ar' ? 'يعرض الآن في السينما' : 'Now Playing in Theaters'} 
          link="/search?types=movie&sort=release_date.desc"
        />

        <QuantumTrain 
          items={filterMedia(upcoming.data)} 
          title={lang === 'ar' ? 'قريباً في السينما' : 'Coming Soon'} 
          link="/search?types=movie&year=2026"
        />

        <QuantumTrain 
          items={filterMedia(arabic.data)} 
          title={lang === 'ar' ? 'أفلام عربية' : 'Arabic Movies'} 
          link="/search?types=movie&lang=ar"
        />

        <QuantumTrain 
          items={filterMedia(trending.data)} 
          title={lang === 'ar' ? 'الرائج هذا الأسبوع' : 'Trending This Week'} 
          link="/search?types=movie&sort=popularity.desc"
        />
        
        <QuantumTrain 
          items={filterMedia(topRated.data)} 
          title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'} 
          link="/search?types=movie&sort=vote_average.desc"
        />

        <QuantumTrain 
          items={filterMedia(popular.data)} 
          title={lang === 'ar' ? 'الأكثر مشاهدة' : 'Most Watched'} 
          link="/search?types=movie&sort=vote_count.desc"
        />

        <QuantumTrain 
          items={filterMedia(classics.data)} 
          title={lang === 'ar' ? 'كلاسيكيات السينما' : 'Cinema Classics'} 
          link="/search?types=movie&year=1970"
          color="gold"
        />

        <QuantumTrain 
          items={filterMedia(nineties.data)} 
          title={lang === 'ar' ? 'أفلام التسعينات' : '90s Nostalgia'} 
          link="/search?types=movie&year=1995"
          color="purple"
        />

        <QuantumTrain 
          items={filterMedia(action.data)} 
          title={lang === 'ar' ? 'أكشن' : 'Action'} 
          link="/movies/genre/28"
        />

        <QuantumTrain 
          items={filterMedia(adventure.data)} 
          title={lang === 'ar' ? 'مغامرة' : 'Adventure'} 
          link="/movies/genre/12"
        />

        <QuantumTrain 
          items={filterMedia(sciFi.data)} 
          title={lang === 'ar' ? 'خيال علمي' : 'Sci-Fi'} 
          link="/movies/genre/878"
        />

        <QuantumTrain 
          items={filterMedia(fantasy.data)} 
          title={lang === 'ar' ? 'فانتازيا' : 'Fantasy'} 
          link="/movies/genre/14"
        />

        <QuantumTrain 
          items={filterMedia(mystery.data)} 
          title={lang === 'ar' ? 'غموض' : 'Mystery'} 
          link="/movies/genre/9648"
        />

        <QuantumTrain 
          items={filterMedia(western.data)} 
          title={lang === 'ar' ? 'ويسترن' : 'Western'} 
          link="/movies/genre/37"
        />

        <QuantumTrain 
          items={filterMedia(music.data)} 
          title={lang === 'ar' ? 'موسيقي' : 'Music'} 
          link="/movies/genre/10402"
        />

        <QuantumTrain 
          items={filterMedia(marvel.data)} 
          title={lang === 'ar' ? 'عالم مارفل السينمائي' : 'Marvel Cinematic Universe'} 
          link="/search?types=movie&keywords=marvel"
        />

        <QuantumTrain 
          items={filterMedia(dc.data)} 
          title={lang === 'ar' ? 'عالم دي سي' : 'DC Universe'} 
          link="/search?types=movie&keywords=dc"
        />

        <QuantumTrain 
          items={filterMedia(disney.data)} 
          title={lang === 'ar' ? 'ديزني' : 'Disney'} 
          link="/search?types=movie&keywords=disney"
          color="blue"
        />

        <QuantumTrain 
          items={filterMedia(pixar.data)} 
          title={lang === 'ar' ? 'بيكسار' : 'Pixar'} 
          link="/search?types=movie&keywords=pixar"
          color="cyan"
        />

        <QuantumTrain 
          items={filterMedia(warner.data)} 
          title={lang === 'ar' ? 'وارنر بروس' : 'Warner Bros'} 
          link="/search?types=movie&keywords=warner"
          color="gold"
        />

        <QuantumTrain 
          items={filterMedia(universal.data)} 
          title={lang === 'ar' ? 'يونيفرسال' : 'Universal Pictures'} 
          link="/search?types=movie&keywords=universal"
          color="indigo"
        />

        <QuantumTrain 
          items={filterMedia(sony.data)} 
          title={lang === 'ar' ? 'سوني بيكتشرز' : 'Sony Pictures'} 
          link="/search?types=movie&keywords=sony"
          color="red"
        />

        <QuantumTrain 
          items={filterMedia(ghibli.data)} 
          title={lang === 'ar' ? 'استوديو غيبلي' : 'Studio Ghibli'} 
          link="/search?types=movie&keywords=ghibli"
          color="green"
        />

        <QuantumTrain 
          items={filterMedia(paramount.data)} 
          title={lang === 'ar' ? 'باراماونت' : 'Paramount Pictures'} 
          link="/search?types=movie&keywords=paramount"
          color="blue"
        />

        <QuantumTrain 
          items={filterMedia(lionsgate.data)} 
          title={lang === 'ar' ? 'ليونزغيت' : 'Lionsgate'} 
          link="/search?types=movie&keywords=lionsgate"
          color="gold"
        />

        <QuantumTrain 
          items={filterMedia(twentiethCentury.data)} 
          title={lang === 'ar' ? 'استوديوهات القرن العشرين' : '20th Century Studios'} 
          link="/search?types=movie&keywords=20th"
          color="red"
        />

        <QuantumTrain 
          items={filterMedia(dreamworks.data)} 
          title={lang === 'ar' ? 'دريم ووركس أنيميشن' : 'DreamWorks Animation'} 
          link="/search?types=movie&keywords=dreamworks"
          color="blue"
        />

        <QuantumTrain 
          items={filterMedia(illumination.data)} 
          title={lang === 'ar' ? 'إليمونيشن' : 'Illumination'} 
          link="/search?types=movie&keywords=illumination"
          color="gold"
        />

        <QuantumTrain 
          items={filterMedia(a24.data)} 
          title={lang === 'ar' ? 'أفلام A24' : 'A24 Movies'} 
          link="/search?types=movie&keywords=a24"
          color="cyan"
        />

        <QuantumTrain 
          items={filterMedia(mgm.data)} 
          title={lang === 'ar' ? 'مترو غولدوين ماير' : 'Metro-Goldwyn-Mayer'} 
          link="/search?types=movie&keywords=mgm"
          color="gold"
        />

        <QuantumTrain 
          items={filterMedia(lucasfilm.data)} 
          title={lang === 'ar' ? 'لوكاس فيلم' : 'Lucasfilm'} 
          link="/search?types=movie&keywords=lucasfilm"
          color="green"
        />

        <QuantumTrain 
          items={filterMedia(blumhouse.data)} 
          title={lang === 'ar' ? 'بلامهاوس (رعب)' : 'Blumhouse (Horror)'} 
          link="/search?types=movie&keywords=blumhouse"
          color="red"
        />

        <QuantumTrain 
          items={filterMedia(newLine.data)} 
          title={lang === 'ar' ? 'نيو لاين سينما' : 'New Line Cinema'} 
          link="/search?types=movie&keywords=newline"
          color="blue"
        />

        <QuantumTrain 
          items={filterMedia(columbia.data)} 
          title={lang === 'ar' ? 'كولومبيا بيكتشرز' : 'Columbia Pictures'} 
          link="/search?types=movie&keywords=columbia"
          color="gold"
        />

        <QuantumTrain 
          items={filterMedia(legendary.data)} 
          title={lang === 'ar' ? 'ليجنداري بيكتشرز' : 'Legendary Pictures'} 
          link="/search?types=movie&keywords=legendary"
          color="red"
        />

        <QuantumTrain 
          items={filterMedia(focus.data)} 
          title={lang === 'ar' ? 'فوكس فيتشرز' : 'Focus Features'} 
          link="/search?types=movie&keywords=focus"
          color="blue"
        />

        <QuantumTrain 
          items={filterMedia(summit.data)} 
          title={lang === 'ar' ? 'سميت إنترتينمنت' : 'Summit Entertainment'} 
          link="/search?types=movie&keywords=summit"
          color="gold"
        />

        <QuantumTrain 
          items={filterMedia(toho.data)} 
          title={lang === 'ar' ? 'توهو (اليابان)' : 'Toho'}
          link="/search?types=movie&keywords=toho"
          color="red"
        />

        <QuantumTrain 
          items={filterMedia(netflixMovies.data)} 
          title={lang === 'ar' ? 'أفلام نتفليكس' : 'Netflix Movies'} 
          link="/search?types=movie&keywords=netflix"
          color="red"
        />

        <QuantumTrain 
          items={filterMedia(anime.data)} 
          title={lang === 'ar' ? 'أفلام أنمي' : 'Anime Movies'} 
          link="/search?types=movie&genres=16"
          color="purple"
        />

        <QuantumTrain 
          items={filterMedia(bollywood.data)} 
          title={lang === 'ar' ? 'أفلام بوليوود' : 'Bollywood Movies'} 
          link="/search?types=movie&lang=hi"
          color="gold"
        />
      </div>
    </div>
  )
}
