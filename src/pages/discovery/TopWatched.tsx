import { useQuery } from '@tanstack/react-query'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { filterValidSlugs } from '../../lib/dataHelpers'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import axios from 'axios'
import { errorLogger } from '../../services/errorLogging'

export const TopWatched = () => {
  const { lang } = useLang()

  const { data: trendingMovies } = useQuery({
    queryKey: ['trending-movies-page'],
    queryFn: async () => {
      try {
        const { data } = await axios.get('/api/trending', {
          params: { type: 'movie', limit: 20 }
        })
        const results = filterValidSlugs(data.data || [])
        return { results: results.map((item: any) => ({ ...item, media_type: 'movie' })) }
      } catch (error: any) {
        errorLogger.logError({
          message: 'Failed to fetch trending movies',
          severity: 'medium',
          category: 'network',
          context: { error }
        })
        return { results: [] }
      }
    }
  })

  const { data: trendingSeries } = useQuery({
    queryKey: ['trending-series-page'],
    queryFn: async () => {
      try {
        const { data } = await axios.get('/api/trending', {
          params: { type: 'tv', limit: 20 }
        })
        const results = filterValidSlugs(data.data || [])
        return { results: results.map((item: any) => ({ ...item, media_type: 'tv' })) }
      } catch (error: any) {
        errorLogger.logError({
          message: 'Failed to fetch trending series',
          severity: 'medium',
          category: 'network',
          context: { error }
        })
        return { results: [] }
      }
    }
  })

  const { data: topRatedMovies } = useQuery({
    queryKey: ['top-rated-movies-page'],
    queryFn: async () => {
      try {
        // CRITICAL: Use CockroachDB API instead of Supabase
        const { data } = await axios.get('/api/movies', {
          params: { sort: 'vote_average', ratingFrom: 7, limit: 20 }
        })
        const results = filterValidSlugs(data.results || [])
        return results.map((item: any) => ({ ...item, media_type: 'movie' }))
      } catch (error: any) {
        errorLogger.logError({
          message: 'Failed to fetch top rated movies',
          severity: 'medium',
          category: 'network',
          context: { error }
        })
        return []
      }
    }
  })

  const heroItems = (trendingMovies?.results || []).slice(0, 10).map((item: any) => ({ ...item, media_type: 'movie' }))

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'الأكثر مشاهدة - فور سيما' : 'Top Watched - 4Cima'}</title>
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
