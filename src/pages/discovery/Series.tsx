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

// --- Database Fetchers (Preferred) ---

const fetchTrendingDB = async () => {
  const { data, error } = await supabase
    .from('tv_series')
    .select('id, name, poster_path, backdrop_path, vote_average, first_air_date, genre_ids, overview')
    .order('popularity', { ascending: false })
    .limit(20)
    
  if (error || !data || data.length === 0) return fetchTrendingTMDB()
  return data.map((item: any) => ({ ...item, media_type: 'tv', title: item.name }))
}

const fetchTopRatedDB = async () => {
  const { data, error } = await supabase
    .from('tv_series')
    .select('id, name, poster_path, backdrop_path, vote_average, first_air_date, genre_ids, overview')
    .gte('vote_average', 8)
    .order('vote_average', { ascending: false })
    .limit(20)

  if (error || !data || data.length === 0) return fetchTopRatedTMDB()
  return data.map((item: any) => ({ ...item, media_type: 'tv', title: item.name }))
}

const fetchArabicDB = async () => {
  const { data, error } = await supabase
    .from('tv_series')
    .select('id, name, poster_path, backdrop_path, vote_average, first_air_date, genre_ids, overview')
    .eq('original_language', 'ar')
    .order('first_air_date', { ascending: false })
    .limit(20)

  if (error || !data || data.length === 0) return fetchArabicTMDB()
  return data.map((item: any) => ({ ...item, media_type: 'tv', title: item.name }))
}

const fetchLatestDB = async () => {
  const { data, error } = await supabase
    .from('tv_series')
    .select('id, name, poster_path, backdrop_path, vote_average, first_air_date, genre_ids, overview')
    .order('first_air_date', { ascending: false })
    .limit(20)
    
  if (error || !data || data.length === 0) return fetchOnTheAirTMDB()
  return data.map((item: any) => ({ ...item, media_type: 'tv', title: item.name }))
}

const fetchTurkishDB = async () => {
  const { data, error } = await supabase
    .from('tv_series')
    .select('id, name, poster_path, backdrop_path, vote_average, first_air_date, genre_ids, overview')
    .eq('original_language', 'tr')
    .order('popularity', { ascending: false })
    .limit(20)

  if (error || !data || data.length === 0) return fetchTurkishTMDB()
  return data.map((item: any) => ({ ...item, media_type: 'tv', title: item.name }))
}

const fetchKoreanDB = async () => {
  const { data, error } = await supabase
    .from('tv_series')
    .select('id, name, poster_path, backdrop_path, vote_average, first_air_date, genre_ids, overview')
    .eq('original_language', 'ko')
    .order('popularity', { ascending: false })
    .limit(20)

  if (error || !data || data.length === 0) return fetchKoreanTMDB()
  return data.map((item: any) => ({ ...item, media_type: 'tv', title: item.name }))
}

// --- TMDB Fallbacks ---
const fetchTrendingTMDB = async () => {
  const { data } = await tmdb.get(`/trending/tv/week`)
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

const fetchOnTheAirTMDB = async () => {
  const { data } = await tmdb.get('/tv/on_the_air')
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

const fetchTopRatedTMDB = async () => {
  const { data } = await tmdb.get(`/tv/top_rated`)
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

const fetchPopularTMDB = async () => {
  const { data } = await tmdb.get(`/tv/popular`)
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

const fetchTurkishTMDB = async () => {
  const { data } = await tmdb.get('/discover/tv', {
    params: { with_original_language: 'tr', sort_by: 'popularity.desc', 'vote_count.gte': 50 }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

const fetchArabicTMDB = async () => {
  const { data } = await tmdb.get('/discover/tv', {
    params: { with_original_language: 'ar', sort_by: 'popularity.desc' }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

const fetchKoreanTMDB = async () => {
  const { data } = await tmdb.get('/discover/tv', {
    params: { with_original_language: 'ko', sort_by: 'popularity.desc', 'vote_count.gte': 50 }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

// Fetch Arabic TV shows for a specific year (simulating Ramadan content)
const fetchRamadanSeries = async (year: number) => {
  const { data } = await tmdb.get('/discover/tv', {
    params: {
      with_original_language: 'ar',
      first_air_date_year: year,
      sort_by: 'popularity.desc',
      'vote_count.gte': 0
    }
  })
  return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
}

export const SeriesPage = () => {
  const { lang } = useLang()
  const [sp] = useSearchParams()
  const cat = sp.get('cat')

  // --- Category Mode ---
  const categoryQuery = useQuery({
    queryKey: ['series-category-full', cat],
    queryFn: async () => {
      if (!cat) return { results: [] }
      
      const genreMap: Record<string, number> = {
        'action': 10759, 'adventure': 10759, 'animation': 16, 'comedy': 35, 'crime': 80,
        'documentary': 99, 'drama': 18, 'family': 10751, 'kids': 10762, 'mystery': 9648,
        'news': 10763, 'reality': 10764, 'scifi': 10765, 'sci-fi': 10765, 'science-fiction': 10765,
        'soap': 10766, 'talk': 10767, 'war': 10768, 'politics': 10768, 'western': 37,
        'fantasy': 10765
      }

      const lowerCat = cat.toLowerCase()
      const genreId = genreMap[lowerCat]

      // Try DB first
      if (genreId) {
          const { data } = await supabase
            .from('tv_series')
            .select('id, name, poster_path, backdrop_path, vote_average, first_air_date, genre_ids, overview')
            .contains('genre_ids', [genreId])
            .order('popularity', { ascending: false })
            .limit(40)
            
          if (data && data.length > 0) {
              return { results: data.map(item => ({...item, media_type: 'tv', title: item.name})) }
          }
      }

      // Fallback
      if (genreId) {
         const res = await advancedSearch({ types: ['tv'], genres: [genreId], page: 1 })
         return res
      }

      // Check for Special Keywords/Networks
      if (lowerCat === 'netflix') return (await tmdb.get('/discover/tv', { params: { with_networks: 213, sort_by: 'popularity.desc' } })).data
      if (lowerCat === 'hbo') return (await tmdb.get('/discover/tv', { params: { with_networks: 49, sort_by: 'popularity.desc' } })).data
      if (lowerCat === 'apple') return (await tmdb.get('/discover/tv', { params: { with_networks: 2552, sort_by: 'popularity.desc' } })).data
      if (lowerCat === 'amazon') return (await tmdb.get('/discover/tv', { params: { with_networks: 1024, sort_by: 'popularity.desc' } })).data
      if (lowerCat === 'disney') return (await tmdb.get('/discover/tv', { params: { with_networks: 2739, sort_by: 'popularity.desc' } })).data
      if (lowerCat === 'hulu') return (await tmdb.get('/discover/tv', { params: { with_networks: 453, sort_by: 'popularity.desc' } })).data
      
      return { results: [] }
    },
    enabled: !!cat
  })

  // --- Discovery Mode (Home) ---
  const enabled = !cat
  const trending = useQuery({ queryKey: ['series-trending-db'], queryFn: fetchTrendingDB, enabled })
  const topRated = useQuery({ queryKey: ['series-top-db'], queryFn: fetchTopRatedDB, enabled })
  const arabic = useQuery({ queryKey: ['series-arabic-db'], queryFn: fetchArabicDB, enabled })
  const latest = useQuery({ queryKey: ['series-latest-db'], queryFn: fetchLatestDB, enabled })
  const turkish = useQuery({ queryKey: ['series-turkish-db'], queryFn: fetchTurkishDB, enabled })
  const korean = useQuery({ queryKey: ['series-korean-db'], queryFn: fetchKoreanDB, enabled })
  const popular = useQuery({ queryKey: ['series-popular'], queryFn: fetchPopularTMDB, enabled })
  
  // (Other queries can be added back if needed, but for brevity and performance we keep the main ones)
  // Re-adding the specialized ones as requested to not break "Discovery" mode
  const classicTv = useQuery({ queryKey: ['series-classic'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { 'first_air_date.lte': '1990-01-01', sort_by: 'popularity.desc', 'vote_count.gte': 50 }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }, enabled })

  const ninetiesTv = useQuery({ queryKey: ['series-90s'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { 'first_air_date.gte': '1990-01-01', 'first_air_date.lte': '1999-12-31', sort_by: 'popularity.desc', 'vote_count.gte': 50 }
    })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }, enabled })

  const netflix = useQuery({ queryKey: ['series-netflix'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', { params: { with_networks: 213, sort_by: 'popularity.desc' } })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }, enabled })

  const anime = useQuery({ queryKey: ['series-anime'], queryFn: async () => {
    const { data } = await tmdb.get('/discover/tv', { params: { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' } })
    return data.results.map((item: any) => ({ ...item, media_type: 'tv' }))
  }, enabled })

  const ramadan2026 = useQuery({ queryKey: ['ramadan-2026'], queryFn: async () => await fetchRamadanSeries(2026), enabled })
  const ramadan2025 = useQuery({ queryKey: ['ramadan-2025'], queryFn: async () => await fetchRamadanSeries(2025), enabled })
  const ramadan2024 = useQuery({ queryKey: ['ramadan-2024'], queryFn: async () => await fetchRamadanSeries(2024), enabled })
  const ramadan2023 = useQuery({ queryKey: ['ramadan-2023'], queryFn: async () => await fetchRamadanSeries(2023), enabled })

  // ... (rest of the trains can be conditionally rendered or just kept for discovery)

  const heroItems = trending.data?.slice(0, 10) || []

  if (cat) {
    return (
      <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        <Helmet>
          <title>{`${cat} | ${lang === 'ar' ? 'المسلسلات' : 'Series'}`}</title>
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
                  movie={{ ...item, media_type: 'tv' }} 
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
          title={lang === 'ar' ? 'مسلسلات عربية' : 'Arabic Series'} 
          link="/search?types=tv&lang=ar"
        />

        <QuantumTrain 
          items={ramadan2026.data || []} 
          title={lang === 'ar' ? 'مسلسلات رمضان 2026' : 'Ramadan 2026 Series'} 
          link="/search?types=tv&year=2026&lang=ar"
        />

        <QuantumTrain 
          items={ramadan2025.data || []} 
          title={lang === 'ar' ? 'مسلسلات رمضان 2025' : 'Ramadan 2025 Series'} 
          link="/search?types=tv&year=2025&lang=ar"
        />

        <QuantumTrain 
          items={ramadan2024.data || []} 
          title={lang === 'ar' ? 'مسلسلات رمضان 2024' : 'Ramadan 2024 Series'} 
          link="/search?types=tv&year=2024&lang=ar"
        />

        <QuantumTrain 
          items={ramadan2023.data || []} 
          title={lang === 'ar' ? 'مسلسلات رمضان 2023' : 'Ramadan 2023 Series'} 
          link="/search?types=tv&year=2023&lang=ar"
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
          link="/series?cat=netflix"
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
          items={anime.data || []} 
          title={lang === 'ar' ? 'أنمي' : 'Anime'} 
          link="/anime"
          color="purple"
        />
      </div>
    </div>
  )
}
