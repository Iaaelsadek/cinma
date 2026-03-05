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

  const trending = useQuery({ queryKey: ['series-trending'], queryFn: async () => await fetchTrending('tv') })
  const onTheAir = useQuery({ queryKey: ['series-on-the-air'], queryFn: async () => await fetchOnTheAir() })
  const turkish = useQuery({ queryKey: ['series-turkish'], queryFn: async () => await fetchTurkish() })
  const arabic = useQuery({ queryKey: ['series-arabic'], queryFn: async () => await fetchArabic() })
  const korean = useQuery({ queryKey: ['series-korean'], queryFn: async () => await fetchKorean() })
  const topRated = useQuery({ queryKey: ['series-top-rated'], queryFn: async () => await fetchTopRated('tv') })
  const popular = useQuery({ queryKey: ['series-popular'], queryFn: async () => await fetchPopular('tv') })
  
  const classicTv = useQuery({ queryKey: ['series-classic'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { 
        'first_air_date.lte': '1990-01-01',
        sort_by: 'popularity.desc',
        'vote_count.gte': 50
      }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const ninetiesTv = useQuery({ queryKey: ['series-90s'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { 
        'first_air_date.gte': '1990-01-01',
        'first_air_date.lte': '1999-12-31',
        sort_by: 'popularity.desc',
        'vote_count.gte': 50
      }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const actionAdventure = useQuery({ queryKey: ['series-action-adventure'], queryFn: async () => await fetchByGenre(10759, 'tv') })
  const sciFiFantasy = useQuery({ queryKey: ['series-scifi-fantasy'], queryFn: async () => await fetchByGenre(10765, 'tv') })
  const animation = useQuery({ queryKey: ['series-animation'], queryFn: async () => await fetchByGenre(16, 'tv') })
  const comedy = useQuery({ queryKey: ['series-comedy'], queryFn: async () => await fetchByGenre(35, 'tv') })
  const drama = useQuery({ queryKey: ['series-drama'], queryFn: async () => await fetchByGenre(18, 'tv') })
  const mystery = useQuery({ queryKey: ['series-mystery'], queryFn: async () => await fetchByGenre(9648, 'tv') })
  const crime = useQuery({ queryKey: ['series-crime'], queryFn: async () => await fetchByGenre(80, 'tv') })
  const kids = useQuery({ queryKey: ['series-kids'], queryFn: async () => await fetchByGenre(10762, 'tv') })
  const documentary = useQuery({ queryKey: ['series-documentary'], queryFn: async () => await fetchByGenre(99, 'tv') })
  const reality = useQuery({ queryKey: ['series-reality'], queryFn: async () => await fetchByGenre(10764, 'tv') })
  const soap = useQuery({ queryKey: ['series-soap'], queryFn: async () => await fetchByGenre(10766, 'tv') })
  const western = useQuery({ queryKey: ['series-western'], queryFn: async () => await fetchByGenre(37, 'tv') })
  const warPolitics = useQuery({ queryKey: ['series-war-politics'], queryFn: async () => await fetchByGenre(10768, 'tv') })
  const talk = useQuery({ queryKey: ['series-talk'], queryFn: async () => await fetchByGenre(10767, 'tv') })
  const family = useQuery({ queryKey: ['series-family'], queryFn: async () => await fetchByGenre(10751, 'tv') })
  
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

  const disneyPlus = useQuery({ queryKey: ['series-disney'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 2739, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const hulu = useQuery({ queryKey: ['series-hulu'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 453, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const peacock = useQuery({ queryKey: ['series-peacock'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 3353, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const amc = useQuery({ queryKey: ['series-amc'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 174, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const showtime = useQuery({ queryKey: ['series-showtime'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 67, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const fx = useQuery({ queryKey: ['series-fx'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 88, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const bbc = useQuery({ queryKey: ['series-bbc'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 4, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const cw = useQuery({ queryKey: ['series-cw'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 71, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const starz = useQuery({ queryKey: ['series-starz'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 318, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const syfy = useQuery({ queryKey: ['series-syfy'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 77, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const comedyCentral = useQuery({ queryKey: ['series-comedy-central'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 45, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const nickelodeon = useQuery({ queryKey: ['series-nickelodeon'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 13, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const cartoonNetwork = useQuery({ queryKey: ['series-cartoon-network'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 56, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const mtv = useQuery({ queryKey: ['series-mtv'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 33, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const natGeo = useQuery({ queryKey: ['series-natgeo'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 43, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const discovery = useQuery({ queryKey: ['series-discovery'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 64, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const history = useQuery({ queryKey: ['series-history'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 65, sort_by: 'popularity.desc' }
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

  const adultSwim = useQuery({ queryKey: ['series-adult-swim'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 80, sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }})

  const paramountPlus = useQuery({ queryKey: ['series-paramount-plus'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: 4330, sort_by: 'popularity.desc' }
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
          items={classicTv.data || []} 
          title={lang === 'ar' ? 'مسلسلات كلاسيكية' : 'Classic TV'} 
          link="/search?types=tv&year=1980"
          color="gold"
        />

        <QuantumTrain 
          items={ninetiesTv.data || []} 
          title={lang === 'ar' ? 'مسلسلات التسعينات' : '90s TV Shows'} 
          link="/search?types=tv&year=1995"
          color="purple"
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
          items={disneyPlus.data || []} 
          title={lang === 'ar' ? 'ديزني بلس' : 'Disney+'} 
          link="/search?types=tv&keywords=disney"
          color="blue"
        />

        <QuantumTrain 
          items={hulu.data || []} 
          title={lang === 'ar' ? 'هولو' : 'Hulu'} 
          link="/search?types=tv&keywords=hulu"
          color="green"
        />

        <QuantumTrain 
          items={peacock.data || []} 
          title={lang === 'ar' ? 'بيكوك' : 'Peacock'} 
          link="/search?types=tv&keywords=peacock"
          color="purple"
        />

        <QuantumTrain 
          items={amc.data || []} 
          title={lang === 'ar' ? 'أي إم سي (AMC)' : 'AMC'} 
          link="/search?types=tv&keywords=amc"
          color="gold"
        />

        <QuantumTrain 
          items={showtime.data || []} 
          title={lang === 'ar' ? 'شوتايم' : 'Showtime'} 
          link="/search?types=tv&keywords=showtime"
          color="red"
        />

        <QuantumTrain 
          items={fx.data || []} 
          title={lang === 'ar' ? 'إف إكس' : 'FX'} 
          link="/search?types=tv&keywords=fx"
          color="cyan"
        />

        <QuantumTrain 
          items={bbc.data || []} 
          title={lang === 'ar' ? 'بي بي سي' : 'BBC'} 
          link="/search?types=tv&keywords=bbc"
          color="gold"
        />

        <QuantumTrain 
          items={cw.data || []} 
          title={lang === 'ar' ? 'سي دبليو' : 'The CW'} 
          link="/search?types=tv&keywords=cw"
          color="green"
        />

        <QuantumTrain 
          items={starz.data || []} 
          title={lang === 'ar' ? 'ستارز' : 'Starz'} 
          link="/search?types=tv&keywords=starz"
          color="cyan"
        />

        <QuantumTrain 
          items={syfy.data || []} 
          title={lang === 'ar' ? 'ساي فاي' : 'Syfy'} 
          link="/search?types=tv&keywords=syfy"
          color="purple"
        />

        <QuantumTrain 
          items={comedyCentral.data || []} 
          title={lang === 'ar' ? 'كوميدي سنترال' : 'Comedy Central'} 
          link="/search?types=tv&keywords=comedy"
          color="gold"
        />

        <QuantumTrain 
          items={nickelodeon.data || []} 
          title={lang === 'ar' ? 'نيكلوديون' : 'Nickelodeon'} 
          link="/search?types=tv&keywords=nickelodeon"
          color="orange"
        />

        <QuantumTrain 
          items={cartoonNetwork.data || []} 
          title={lang === 'ar' ? 'كرتون نتورك' : 'Cartoon Network'} 
          link="/search?types=tv&keywords=cartoon"
          color="cyan"
        />

        <QuantumTrain 
          items={mtv.data || []} 
          title={lang === 'ar' ? 'إم تي في' : 'MTV'} 
          link="/search?types=tv&keywords=mtv"
          color="cyan"
        />

        <QuantumTrain 
          items={natGeo.data || []} 
          title={lang === 'ar' ? 'ناشيونال جيوغرافيك' : 'National Geographic'} 
          link="/search?types=tv&keywords=national"
          color="gold"
        />

        <QuantumTrain 
          items={discovery.data || []} 
          title={lang === 'ar' ? 'ديسكفري' : 'Discovery Channel'} 
          link="/search?types=tv&keywords=discovery"
          color="blue"
        />

        <QuantumTrain 
          items={history.data || []} 
          title={lang === 'ar' ? 'قناة التاريخ' : 'History Channel'} 
          link="/search?types=tv&keywords=history"
          color="gold"
        />

        <QuantumTrain 
          items={anime.data || []} 
          title={lang === 'ar' ? 'أنمي' : 'Anime'} 
          link="/anime"
          color="purple"
        />

        <QuantumTrain 
          items={bollywood.data || []} 
          title={lang === 'ar' ? 'بوليوود' : 'Bollywood'} 
          link="/search?types=tv&lang=hi"
          color="orange"
        />

        <QuantumTrain 
          items={adultSwim.data || []} 
          title={lang === 'ar' ? 'أدولت سويم' : 'Adult Swim'} 
          link="/search?types=tv&keywords=adult"
          color="purple"
        />

        <QuantumTrain 
          items={paramountPlus.data || []} 
          title={lang === 'ar' ? 'باراماونت بلس' : 'Paramount+'} 
          link="/search?types=tv&keywords=paramount"
          color="blue"
        />

        <QuantumTrain 
          items={actionAdventure.data || []} 
          title={lang === 'ar' ? 'أكشن ومغامرة' : 'Action & Adventure'} 
          link="/search?types=tv&genres=10759"
        />

        <QuantumTrain 
          items={sciFiFantasy.data} 
          title={lang === 'ar' ? 'خيال علمي وفانتازيا' : 'Sci-Fi & Fantasy'} 
          link="/search?types=tv&genres=10765"
        />

        <QuantumTrain 
          items={animation.data} 
          title={lang === 'ar' ? 'رسوم متحركة' : 'Animation'} 
          link="/search?types=tv&genres=16"
        />

        <QuantumTrain 
          items={comedy.data} 
          title={lang === 'ar' ? 'كوميديا' : 'Comedy'} 
          link="/search?types=tv&genres=35"
        />

        <QuantumTrain 
          items={drama.data} 
          title={lang === 'ar' ? 'دراما' : 'Drama'} 
          link="/search?types=tv&genres=18"
        />

        <QuantumTrain 
          items={mystery.data} 
          title={lang === 'ar' ? 'غموض' : 'Mystery'} 
          link="/search?types=tv&genres=9648"
        />

        <QuantumTrain 
          items={crime.data} 
          title={lang === 'ar' ? 'جريمة' : 'Crime'} 
          link="/search?types=tv&genres=80"
        />

        <QuantumTrain 
          items={kids.data} 
          title={lang === 'ar' ? 'للأطفال' : 'Kids'} 
          link="/search?types=tv&genres=10762"
        />

        <QuantumTrain 
          items={documentary.data} 
          title={lang === 'ar' ? 'وثائقي' : 'Documentary'} 
          link="/search?types=tv&genres=99"
        />

        <QuantumTrain 
          items={reality.data} 
          title={lang === 'ar' ? 'تلفزيون الواقع' : 'Reality'} 
          link="/search?types=tv&genres=10764"
        />

        <QuantumTrain 
          items={soap.data} 
          title={lang === 'ar' ? 'مسلسلات طويلة (Soap)' : 'Soap'} 
          link="/search?types=tv&genres=10766"
        />

        <QuantumTrain 
          items={western.data} 
          title={lang === 'ar' ? 'ويسترن' : 'Western'} 
          link="/search?types=tv&genres=37"
        />

        <QuantumTrain 
          items={warPolitics.data} 
          title={lang === 'ar' ? 'حرب وسياسة' : 'War & Politics'} 
          link="/search?types=tv&genres=10768"
        />

        <QuantumTrain 
          items={talk.data} 
          title={lang === 'ar' ? 'برامج حوارية' : 'Talk Shows'} 
          link="/search?types=tv&genres=10767"
        />

        <QuantumTrain 
          items={family.data} 
          title={lang === 'ar' ? 'عائلي' : 'Family'} 
          link="/search?types=tv&genres=10751"
        />
      </div>
    </div>
  )
}
