import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { MovieCard } from '../../components/features/media/MovieCard'
import { useLang } from '../../state/useLang'
import { Helmet } from 'react-helmet-async'
import { PageLoader } from '../../components/common/PageLoader'
import { tmdb } from '../../lib/tmdb'
import { useCategoryVideos } from '../../hooks/useFetchContent'
import { logger } from '../../lib/logger'

// Specific queries to ensure accurate categorization
const ADEL_IMAM_QUERY = 'مدرسة المشاغبين|الواد سيد الشغال|الزعيم|شاهد ماشفش حاجة|بودي جارد'
const CLASSICS_QUERY = 'المتزوجون|ريا وسكينة|سك على بناتك|العيال كبرت|انها حقا عائلة محترمة|الهمجي|تخاريف|وجهة نظر|لعبة الست|ماما امريكا|أخويا هايص وأنا لايص|فارس بني خيبان|أهلا يا دكتور'
const GULF_QUERY = 'باي باي لندن|حامي الديار|سيف العرب|فرسان المناخ|على هامان يا فرعون|مراهق في الخمسين|انتخبوا ام علي|الكرة مدورة|لولاكي'

// Fetch from TMDB (Search Movies)
const fetchPlays = async (query: string, allowedCountries?: string[]) => {
  const queries = query.split('|')
  let allResults: any[] = []
  
  for (const q of queries) {
      try {
        const { data } = await tmdb.get('/search/movie', {
          params: { query: q.trim(), language: 'ar-SA', page: 1 }
        })
        if (data.results) {
            // Filter out items with generic titles like "Play" or "Masrahiyat"
            const validResults = data.results.filter((item: any) => {
                const title = item.title || ''
                return title !== 'مسرحية' && title !== 'Masrahiyat' && !title.includes('مسرحية مصرية')
            })
            allResults = [...allResults, ...validResults]
        }
      } catch (e) {
        logger.error(e)
      }
  }
  
  // Deduplicate by ID
  let unique = Array.from(new Map(allResults.map(item => [item.id, item])).values())

  // Strict Country Filtering
  if (allowedCountries && allowedCountries.length > 0) {
      const verified: any[] = []
      await Promise.all(unique.map(async (item: any) => {
          try {
              const { data } = await tmdb.get(`/movie/${item.id}`)
              const countries = (data.production_countries || []).map((c: any) => c.iso_3166_1)
              
              if (countries.length > 0) {
                  if (countries.some((c: string) => allowedCountries.includes(c))) {
                      verified.push(item)
                  }
              }
          } catch (e) {
              // If details fail, exclude it to be safe
          }
      }))
      unique = verified
  }
  
  return unique.map((item: any) => ({ ...item, media_type: 'movie', is_play: true }))
}

export const PlaysPage = () => {
  const { lang } = useLang()
  const { genre, year, rating } = useParams()

  // Use TMDB for categories (They have posters and work with servers)
  const adelImam = useQuery({ queryKey: ['plays-adel-imam'], queryFn: () => fetchPlays(ADEL_IMAM_QUERY) })
  const classics = useQuery({ queryKey: ['plays-classic'], queryFn: () => fetchPlays(CLASSICS_QUERY) })
  const gulf = useQuery({ queryKey: ['plays-gulf'], queryFn: () => fetchPlays(GULF_QUERY, ['KW', 'SA', 'QA', 'BH', 'AE', 'OM']) })
  
  // Masrah Masr from Database (YouTube)
  const masrahMasr = useCategoryVideos('plays-masrah-masr', { limit: 20 })
  
  const isLoading = adelImam.isLoading || classics.isLoading || gulf.isLoading || masrahMasr.isLoading

  if (isLoading) return <PageLoader />

  // Filter logic
  let displayFiltered: any[] = []
  if (genre) {
      if (genre === 'adel-imam') displayFiltered = adelImam.data || []
      else if (genre === 'classic' || genre === 'classics') displayFiltered = classics.data || []
      else if (genre === 'gulf') displayFiltered = gulf.data || []
      else if (genre === 'masrah-masr') displayFiltered = masrahMasr.data || []
      else displayFiltered = []
  }

  const isFiltered = !!genre
  const heroItems = [...(adelImam.data || []), ...(classics.data || []), ...(gulf.data || [])].slice(0, 10)

  return (
    <div className="min-h-screen text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <Helmet>
        <title>{lang === 'ar' ? 'المسرحيات - سينما أونلاين' : 'Plays - Cinema Online'}</title>
      </Helmet>

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
        
        {isFiltered ? (
           <div>
              <h2 className="text-xl font-bold mb-4 capitalize">{genre?.replace('-', ' ')}</h2>
              {displayFiltered.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                    {displayFiltered.map((item: any, idx: number) => (
                    <MovieCard key={item.id} movie={item} index={idx} />
                    ))}
                </div>
              ) : (
                <div className="text-center text-zinc-500 py-12">
                  {lang === 'ar' ? 'لا توجد مسرحيات في هذا القسم حالياً' : 'No plays found in this section'}
                </div>
              )}
           </div>
        ) : (
          <>
            <QuantumTrain 
              items={masrahMasr.data || []} 
              title={lang === 'ar' ? 'مسرح مصر' : 'Masrah Masr'} 
              link="/plays/masrah-masr"
              type="video"
            />

            <QuantumTrain 
              items={adelImam.data || []} 
              title={lang === 'ar' ? 'مسرحيات عادل إمام' : 'Adel Imam Plays'} 
              link="/plays/adel-imam"
            />

            <QuantumTrain 
              items={classics.data || []} 
              title={lang === 'ar' ? 'مسرحيات كلاسيكية' : 'Classic Plays'} 
              link="/plays/classics"
            />

            <QuantumTrain 
              items={gulf.data || []} 
              title={lang === 'ar' ? 'مسرحيات خليجية' : 'Gulf Plays'} 
              link="/plays/gulf"
            />
          </>
        )}
      </div>
    </div>
  )
}
