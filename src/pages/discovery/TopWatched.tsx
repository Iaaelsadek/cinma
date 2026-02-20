import { useQuery } from '@tanstack/react-query'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { fetchTrending } from '../../lib/tmdb'
import { supabase } from '../../lib/supabase'
import { QuantumHero } from '../../components/features/hero/QuantumHero'

export const TopWatched = () => {
  const { lang } = useLang()

  const { data: trendingMovies } = useQuery({
    queryKey: ['trending-movies-page'],
    queryFn: () => fetchTrending('movie')
  })

  const { data: trendingSeries } = useQuery({
    queryKey: ['trending-series-page'],
    queryFn: () => fetchTrending('tv')
  })

  const { data: topRatedMovies } = useQuery({
    queryKey: ['top-rated-movies-page'],
    queryFn: async () => {
        const { data } = await supabase
            .from('movies')
            .select('*')
            .order('vote_average', { ascending: false })
            .limit(20)
        return data?.map((item: any) => ({ ...item, media_type: 'movie' })) || []
    }
  })

  const heroItems = (trendingMovies?.results || []).slice(0, 5).map((item: any) => ({ ...item, media_type: 'movie' }))

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'الأكثر مشاهدة - سينما أونلاين' : 'Top Watched - Cinema Online'}</title>
      </Helmet>

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
        <div className="mb-6">
             <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
                {lang === 'ar' ? 'الأكثر مشاهدة' : 'Top Watched'}
             </h1>
             <p className="text-zinc-400 text-sm md:text-base">
                {lang === 'ar' ? 'أقوى الأفلام والمسلسلات الرائجة هذا الأسبوع' : 'The most popular movies and series this week'}
             </p>
        </div>

        <QuantumTrain 
          items={trendingMovies?.results || []} 
          title={lang === 'ar' ? 'أفلام رائجة' : 'Trending Movies'} 
          link="/search?types=movie&sort=trending"
        />
        
        <QuantumTrain 
          items={trendingSeries?.results || []} 
          title={lang === 'ar' ? 'مسلسلات رائجة' : 'Trending Series'} 
          link="/search?types=tv&sort=trending"
        />

        <QuantumTrain 
            items={topRatedMovies || []}
            title={lang === 'ar' ? 'الأعلى تقييماً' : 'Top Rated'}
            link="/search?types=movie&sort=top_rated"
        />
      </div>
    </div>
  )
}
