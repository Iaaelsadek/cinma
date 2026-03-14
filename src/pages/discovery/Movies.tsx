import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { tmdb, advancedSearch } from '../../lib/tmdb'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { MovieCard } from '../../components/features/media/MovieCard'
import { SkeletonGrid } from '../../components/common/Skeletons'
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

// --- Database Fetchers (Preferred) ---

const fetchTrendingDB = async () => {
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, poster_path, backdrop_path, vote_average, release_date, genre_ids, overview')
    .order('popularity', { ascending: false })
    .limit(20)
  
  if (error || !data || data.length === 0) return fetchTrendingTMDB()
  return data.map((item: any) => ({ ...item, media_type: 'movie' }))
}

const fetchTopRatedDB = async () => {
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, poster_path, backdrop_path, vote_average, release_date, genre_ids, overview')
    .gte('vote_average', 8)
    .order('vote_average', { ascending: false })
    .limit(20)

  if (error || !data || data.length === 0) return fetchTopRatedTMDB()
  return data.map((item: any) => ({ ...item, media_type: 'movie' }))
}

const fetchArabicMoviesDB = async () => {
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, poster_path, backdrop_path, vote_average, release_date, genre_ids, overview')
    .eq('original_language', 'ar')
    .order('release_date', { ascending: false })
    .limit(20)

  if (error || !data || data.length === 0) return fetchArabicMoviesTMDB()
  return data.map((item: any) => ({ ...item, media_type: 'movie' }))
}

const fetchLatestDB = async () => {
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, poster_path, backdrop_path, vote_average, release_date, genre_ids, overview')
    .order('release_date', { ascending: false })
    .limit(20)
    
  if (error || !data || data.length === 0) return fetchNowPlayingTMDB()
  return data.map((item: any) => ({ ...item, media_type: 'movie' }))
}

// --- TMDB Fallbacks ---
const fetchTrendingTMDB = async () => {
  const { data } = await tmdb.get(`/trending/movie/week`)
  return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
}

const fetchTopRatedTMDB = async () => {
  const { data } = await tmdb.get(`/movie/top_rated`)
  return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
}

const fetchNowPlayingTMDB = async () => {
  const { data } = await tmdb.get('/movie/now_playing')
  return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
}

const fetchArabicMoviesTMDB = async () => {
  const { data } = await tmdb.get('/discover/movie', {
    params: {
      with_original_language: 'ar',
      sort_by: 'popularity.desc'
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
}

const fetchPopular = async (type: 'movie' | 'tv' = 'movie') => {
  const { data } = await tmdb.get(`/${type}/popular`)
  return data.results.map((item: any) => ({ ...item, media_type: type }))
}

export const MoviesPage = () => {
  const { lang } = useLang()
  const [sp] = useSearchParams()
  const cat = sp.get('cat')

  // --- Category Mode ---
  const categoryQuery = useQuery({
    queryKey: ['movies-category-full', cat],
    queryFn: async () => {
      if (!cat) return { results: [] }
      
      const genreMap: Record<string, number> = {
        'action': 28, 'adventure': 12, 'animation': 16, 'comedy': 35, 'crime': 80,
        'documentary': 99, 'drama': 18, 'family': 10751, 'fantasy': 14, 'history': 36,
        'horror': 27, 'music': 10402, 'mystery': 9648, 'romance': 10749, 'scifi': 878,
        'sci-fi': 878, 'science-fiction': 878, 'thriller': 53, 'war': 10752, 'western': 37
      }
      const lowerCat = cat.toLowerCase()
      const genreId = genreMap[lowerCat]

      // Try DB first for genre
      if (genreId) {
          const { data } = await supabase
            .from('movies')
            .select('id, title, poster_path, backdrop_path, vote_average, release_date, genre_ids, overview')
            .contains('genre_ids', [genreId])
            .order('popularity', { ascending: false })
            .limit(40)
            
          if (data && data.length > 0) {
              return { results: data.map(item => ({...item, media_type: 'movie'})) }
          }
      }
      
      // Fallback to TMDB
      if (genreId) {
         const res = await advancedSearch({ types: ['movie'], genres: [genreId], page: 1 })
         return res
      }
      
      // Check for Companies/Keywords if needed (e.g. marvel, dc)
      if (lowerCat === 'marvel') return (await tmdb.get('/discover/movie', { params: { with_companies: 420, sort_by: 'popularity.desc' } })).data
      if (lowerCat === 'dc') return (await tmdb.get('/discover/movie', { params: { with_companies: 9993, sort_by: 'popularity.desc' } })).data
      if (lowerCat === 'disney') return (await tmdb.get('/discover/movie', { params: { with_companies: 2, sort_by: 'popularity.desc' } })).data
      if (lowerCat === 'pixar') return (await tmdb.get('/discover/movie', { params: { with_companies: 3, sort_by: 'popularity.desc' } })).data
      if (lowerCat === 'netflix') return (await tmdb.get('/discover/movie', { params: { with_companies: 20580, sort_by: 'popularity.desc' } })).data

      return { results: [] }
    },
    enabled: !!cat
  })

  // --- Discovery Mode (Home) ---
  const enabled = !cat

  const trending = useQuery({ queryKey: ['movies-trending-db'], queryFn: fetchTrendingDB, enabled })
  const topRated = useQuery({ queryKey: ['movies-top-db'], queryFn: fetchTopRatedDB, enabled })
  const arabic = useQuery({ queryKey: ['movies-arabic-db'], queryFn: fetchArabicMoviesDB, enabled })
  const nowPlaying = useQuery({ queryKey: ['movies-latest-db'], queryFn: fetchLatestDB, enabled })
  
  const popular = useQuery({ queryKey: ['movies-popular'], queryFn: async () => await fetchPopular('movie'), enabled })
  
  const classics = useQuery({ queryKey: ['movies-classics'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { 
        'primary_release_date.lte': '1980-01-01',
        sort_by: 'popularity.desc',
        'vote_count.gte': 100
      }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }, enabled })

  const nineties = useQuery({ queryKey: ['movies-90s'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { 
        'primary_release_date.gte': '1990-01-01',
        'primary_release_date.lte': '1999-12-31',
        sort_by: 'popularity.desc',
        'vote_count.gte': 100
      }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }, enabled })

  // Re-add genre queries for Discovery Mode
  const action = useQuery({ queryKey: ['movies-action'], queryFn: async () => await fetchByGenre(28, 'movie'), enabled })
  const adventure = useQuery({ queryKey: ['movies-adventure'], queryFn: async () => await fetchByGenre(12, 'movie'), enabled })
  const sciFi = useQuery({ queryKey: ['movies-scifi'], queryFn: async () => await fetchByGenre(878, 'movie'), enabled })
  const animation = useQuery({ queryKey: ['movies-animation'], queryFn: async () => await fetchByGenre(16, 'movie'), enabled })
  const comedy = useQuery({ queryKey: ['movies-comedy'], queryFn: async () => await fetchByGenre(35, 'movie'), enabled })
  const horror = useQuery({ queryKey: ['movies-horror'], queryFn: async () => await fetchByGenre(27, 'movie'), enabled })
  
  const anime = useQuery({ queryKey: ['movies-anime'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }, enabled })

  const bollywood = useQuery({ queryKey: ['movies-bollywood'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_original_language: 'hi', sort_by: 'popularity.desc' }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }, enabled })

  const marvel = useQuery({ queryKey: ['movies-marvel'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', { params: { with_companies: 420, sort_by: 'popularity.desc' } })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }, enabled })

  const dc = useQuery({ queryKey: ['movies-dc'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/movie', { params: { with_companies: 9993, sort_by: 'popularity.desc' } })
    return data.results.map((item: any) => ({ ...item, media_type: 'movie' }))
  }, enabled })

  const heroItems = trending.data?.slice(0, 10) || []

  if (cat) {
    return (
      <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        <Helmet>
          <title>{`${cat} | ${lang === 'ar' ? 'الأفلام' : 'Movies'}`}</title>
        </Helmet>
        
        <div className="pt-24 relative z-10">
          <div className="mb-6">
            <h1 className="text-3xl font-black capitalize">{cat.replace('-', ' ')}</h1>
            <div className="mt-2 h-1 w-16 rounded-full bg-primary" />
          </div>

          {categoryQuery.isLoading ? (
            <SkeletonGrid count={20} variant="poster" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {(categoryQuery.data?.results || []).map((item: any, idx: number) => (
                <MovieCard 
                  key={item.id} 
                  movie={{ ...item, media_type: 'movie' }} 
                  index={idx} 
                />
              ))}
            </div>
          )}
          
          {categoryQuery.data?.results?.length === 0 && (
            <div className="text-center py-20 text-zinc-500">
              {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
            </div>
          )}
        </div>
      </div>
    )
  }

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
          items={classics.data || []} 
          title={lang === 'ar' ? 'كلاسيكيات السينما' : 'Cinema Classics'} 
          link="/search?types=movie&year=1970"
          color="gold"
        />

        <QuantumTrain 
          items={nineties.data || []} 
          title={lang === 'ar' ? 'أفلام التسعينات' : '90s Nostalgia'} 
          link="/search?types=movie&year=1995"
          color="purple"
        />

        <QuantumTrain 
          items={action.data || []} 
          title={lang === 'ar' ? 'أكشن' : 'Action'} 
          link="/movies?cat=action"
        />

        <QuantumTrain 
          items={adventure.data || []} 
          title={lang === 'ar' ? 'مغامرة' : 'Adventure'} 
          link="/movies?cat=adventure"
        />

        <QuantumTrain 
          items={sciFi.data || []} 
          title={lang === 'ar' ? 'خيال علمي' : 'Sci-Fi'} 
          link="/movies?cat=scifi"
        />

        <QuantumTrain 
          items={animation.data || []} 
          title={lang === 'ar' ? 'رسوم متحركة' : 'Animation'} 
          link="/movies?cat=animation"
        />

        <QuantumTrain 
          items={comedy.data || []} 
          title={lang === 'ar' ? 'كوميديا' : 'Comedy'} 
          link="/movies?cat=comedy"
        />

        <QuantumTrain 
          items={horror.data || []} 
          title={lang === 'ar' ? 'رعب' : 'Horror'} 
          link="/movies?cat=horror"
        />

        <QuantumTrain 
          items={marvel.data || []} 
          title={lang === 'ar' ? 'عالم مارفل السينمائي' : 'Marvel Cinematic Universe'} 
          link="/movies?cat=marvel"
        />

        <QuantumTrain 
          items={dc.data || []} 
          title={lang === 'ar' ? 'عالم دي سي' : 'DC Universe'} 
          link="/movies?cat=dc"
        />

        <QuantumTrain 
          items={anime.data || []} 
          title={lang === 'ar' ? 'أفلام أنمي' : 'Anime Movies'} 
          link="/anime"
          color="purple"
        />

        <QuantumTrain 
          items={bollywood.data || []} 
          title={lang === 'ar' ? 'أفلام هندية (بوليوود)' : 'Bollywood Movies'} 
          link="/search?types=movie&lang=hi"
          color="orange"
        />
      </div>
    </div>
  )
}
