import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { MovieCard } from '../../components/features/media/MovieCard'
import { useLang } from '../../state/useLang'
import { SeoHead } from '../../components/common/SeoHead'
import { SkeletonHero, SkeletonGrid } from '../../components/common/Skeletons'
import { ErrorMessage } from '../../components/common/ErrorMessage'
import { getPlays } from '../../services/contentQueries'
import type { Movie } from '../../types/database'

export const PlaysPage = ({ category }: { category?: string } = {}) => {
  const { lang } = useLang()
  const { genre, year, rating } = useParams()
  
  // Use category prop if provided, otherwise use genre from URL params
  const activeCategory = category || genre

  // CRITICAL: Fetch plays from CockroachDB using contentQueries service
  const { data: allPlays, isLoading, error, refetch } = useQuery({
    queryKey: ['plays', activeCategory],
    queryFn: async () => {
      const result = await getPlays(activeCategory as any, { page: 1, limit: 100 })
      return result.data
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  // SEO metadata
  const getCategoryTitle = (cat?: string) => {
    if (!cat) return ''
    const titles: Record<string, string> = {
      'adel-imam': 'مسرحيات عادل إمام',
      'classic': 'مسرحيات كلاسيكية',
      'classics': 'مسرحيات كلاسيكية',
      'gulf': 'مسرحيات خليجية',
      'masrah-masr': 'مسرح مصر'
    }
    return titles[cat] || cat
  }

  const seoTitle = activeCategory 
    ? `${getCategoryTitle(activeCategory)} - المسرحيات | سينما أونلاين`
    : "المسرحيات - سينما أونلاين"
  
  const seoDescription = activeCategory
    ? `شاهد أفضل ${getCategoryTitle(activeCategory)} بجودة عالية وبدون إعلانات مزعجة.`
    : "استمتع بمشاهدة أفضل المسرحيات العربية والخليجية بجودة عالية. مسرح مصر، عادل إمام، والمزيد."

  // Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        <SeoHead title={seoTitle} description={seoDescription} />
        <SkeletonHero />
        <div className="space-y-2 pt-4">
          <SkeletonGrid count={12} variant="video" />
        </div>
      </div>
    )
  }

  // Error state with ErrorMessage
  if (error) {
    // Determine error type based on error object
    const errorType = error instanceof TypeError && error.message.includes('fetch') 
      ? 'network' 
      : 'server'
    
    return (
      <div className="min-h-screen bg-black text-white">
        <SeoHead title={seoTitle} description={seoDescription} noIndex />
        <ErrorMessage
          type={errorType}
          title="خطأ في تحميل المسرحيات"
          message="تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى."
          error={error}
          onRetry={() => refetch()}
          showHomeButton
          showBackButton
        />
      </div>
    )
  }

  const plays = allPlays || []

  // Client-side filtering for subcategories
  let displayFiltered: Movie[] = []
  if (activeCategory) {
    if (activeCategory === 'adel-imam') {
      // Filter by keywords or cast containing Adel Imam
      displayFiltered = plays.filter((play: Movie) => {
        const keywords = Array.isArray(play.keywords) ? play.keywords : []
        return play.title?.includes('عادل إمام') || 
          play.overview?.includes('عادل إمام') ||
          keywords.some((k: any) => String(k).includes('عادل إمام'))
      })
    } else if (activeCategory === 'classic' || activeCategory === 'classics') {
      // Classic plays (before 1999)
      displayFiltered = plays.filter((play: Movie) => {
        const year = play.release_date ? new Date(play.release_date).getFullYear() : 0
        return year < 1999
      })
    } else if (activeCategory === 'gulf') {
      // Gulf plays (by production countries)
      displayFiltered = plays.filter((play: Movie) => {
        const countries = Array.isArray(play.production_countries) ? play.production_countries : []
        const gulfCountries = ['KW', 'SA', 'QA', 'BH', 'AE', 'OM']
        return countries.some((c: any) => gulfCountries.includes(c.iso_3166_1 || c))
      })
    } else if (activeCategory === 'masrah-masr') {
      // Masrah Masr (by keywords)
      displayFiltered = plays.filter((play: Movie) => {
        const keywords = Array.isArray(play.keywords) ? play.keywords : []
        return play.title?.includes('مسرح مصر') || 
          keywords.some((k: any) => String(k).includes('مسرح مصر'))
      })
    } else {
      displayFiltered = []
    }
  }

  const isFiltered = !!activeCategory
  const heroItems = plays.slice(0, 10)

  // Split plays into categories for display
  const adelImamPlays = plays.filter((play: Movie) => {
    const keywords = Array.isArray(play.keywords) ? play.keywords : []
    return play.title?.includes('عادل إمام') || keywords.some((k: any) => String(k).includes('عادل إمام'))
  }).slice(0, 20)

  const classicPlays = plays.filter((play: Movie) => {
    const year = play.release_date ? new Date(play.release_date).getFullYear() : 0
    return year < 1999
  }).slice(0, 20)

  const gulfPlays = plays.filter((play: Movie) => {
    const countries = Array.isArray(play.production_countries) ? play.production_countries : []
    const gulfCountries = ['KW', 'SA', 'QA', 'BH', 'AE', 'OM']
    return countries.some((c: any) => gulfCountries.includes(c.iso_3166_1 || c))
  }).slice(0, 20)

  const masrahMasrPlays = plays.filter((play: Movie) => {
    const keywords = Array.isArray(play.keywords) ? play.keywords : []
    return play.title?.includes('مسرح مصر') || keywords.some((k: any) => String(k).includes('مسرح مصر'))
  }).slice(0, 20)

  return (
    <div className="min-h-screen bg-black text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <SeoHead 
        title={seoTitle}
        description={seoDescription}
        type="website"
        image="https://cinma.online/og-plays.jpg"
      />

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
        
        {isFiltered ? (
           <div>
              <h2 className="text-xl font-bold mb-4 capitalize">{activeCategory?.replace('-', ' ')}</h2>
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
            {masrahMasrPlays.length > 0 && (
              <QuantumTrain 
                items={masrahMasrPlays} 
                title={lang === 'ar' ? 'مسرح مصر' : 'Masrah Masr'} 
                link="/plays/masrah-masr"
              />
            )}

            {adelImamPlays.length > 0 && (
              <QuantumTrain 
                items={adelImamPlays} 
                title={lang === 'ar' ? 'مسرحيات عادل إمام' : 'Adel Imam Plays'} 
                link="/plays/adel-imam"
              />
            )}

            {classicPlays.length > 0 && (
              <QuantumTrain 
                items={classicPlays} 
                title={lang === 'ar' ? 'مسرحيات كلاسيكية' : 'Classic Plays'} 
                link="/plays/classics"
              />
            )}

            {gulfPlays.length > 0 && (
              <QuantumTrain 
                items={gulfPlays} 
                title={lang === 'ar' ? 'مسرحيات خليجية' : 'Gulf Plays'} 
                link="/plays/gulf"
              />
            )}

            {plays.length === 0 && (
              <div className="text-center text-zinc-500 py-12">
                {lang === 'ar' ? 'لا توجد مسرحيات متاحة حالياً' : 'No plays available'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
