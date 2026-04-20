import { useQuery } from '@tanstack/react-query'
import { QuantumHero } from '../../components/features/hero/QuantumHero'
import { QuantumTrain } from '../../components/features/media/QuantumTrain'
import { useLang } from '../../state/useLang'
import { SeoHead } from '../../components/common/SeoHead'
import { SkeletonHero, SkeletonGrid } from '../../components/common/Skeletons'
import { ErrorMessage } from '../../components/common/ErrorMessage'
import { getClassics } from '../../services/contentQueries'

export const ClassicsPage = () => {
  const { lang } = useLang()

  // CRITICAL: Fetch classics from CockroachDB using contentQueries service
  const { data: classicsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['classics'],
    queryFn: async () => {
      return await getClassics({ page: 1, limit: 100 })
    },
    staleTime: 1000 * 60 * 10 // 10 minutes
  })

  // SEO metadata
  const seoTitle = lang === 'ar' 
    ? 'كلاسيكيات السينما - أفلام خالدة | سينما أونلاين'
    : 'Cinema Classics - Timeless Movies | Cinema Online'
  
  const seoDescription = lang === 'ar'
    ? 'اكتشف أفضل الأفلام الكلاسيكية من العصر الذهبي للسينما. أفلام الثمانينات والتسعينات وما قبل 1970.'
    : 'Discover the best classic movies from the golden age of cinema. Films from the 80s, 90s, and pre-1970.'

  // Loading state with skeleton loaders
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
        <SeoHead title={seoTitle} description={seoDescription} />
        <SkeletonHero />
        <div className="space-y-2 pt-4">
          <SkeletonGrid count={18} variant="poster" />
        </div>
      </div>
    )
  }

  // Error state with ErrorMessage
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SeoHead title={seoTitle} description={seoDescription} noIndex />
        <ErrorMessage
          type="network"
          title={lang === 'ar' ? 'خطأ في تحميل الأفلام الكلاسيكية' : 'Error Loading Classic Movies'}
          message={lang === 'ar' 
            ? 'تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.'
            : 'Failed to connect to the server. Please try again.'}
          error={error}
          onRetry={() => refetch()}
          showHomeButton
          showBackButton
        />
      </div>
    )
  }

  const classics = classicsResponse?.data || []

  // Split by decade for better organization
  const goldenAge = classics.filter(movie => {
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0
    return year < 1970
  }).slice(0, 20)

  const eighties = classics.filter(movie => {
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0
    return year >= 1980 && year < 1990
  }).slice(0, 20)

  const nineties = classics.filter(movie => {
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 0
    return year >= 1990 && year < 2000
  }).slice(0, 20)

  const heroItems = classics.slice(0, 10)

  return (
    <div className="min-h-screen bg-black text-white pb-4 max-w-[2400px] mx-auto px-4 md:px-12 w-full">
      <SeoHead 
        title={seoTitle}
        description={seoDescription}
        type="website"
        image="https://cinma.online/og-classics.jpg"
      />

      <QuantumHero items={heroItems} />

      <div className="space-y-2 pt-4 relative z-10">
        {classics.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            {lang === 'ar' ? 'لا توجد أفلام كلاسيكية متاحة' : 'No classic movies available'}
          </div>
        ) : (
          <>
            <QuantumTrain 
              items={classics.slice(0, 20)} 
              title={lang === 'ar' ? 'أفضل الكلاسيكيات' : 'Top Classics'} 
              link="/search?types=movie&yto=1999"
            />

            {goldenAge.length > 0 && (
              <QuantumTrain 
                items={goldenAge} 
                title={lang === 'ar' ? 'العصر الذهبي (قبل 1970)' : 'Golden Age (Pre-1970)'} 
                link="/search?types=movie&yto=1970"
              />
            )}
            
            {eighties.length > 0 && (
              <QuantumTrain 
                items={eighties} 
                title={lang === 'ar' ? 'كلاسيكيات الثمانينات' : '80s Classics'} 
                link="/search?types=movie&yfrom=1980&yto=1989"
              />
            )}

            {nineties.length > 0 && (
              <QuantumTrain 
                items={nineties} 
                title={lang === 'ar' ? 'نوستالجيا التسعينات' : '90s Nostalgia'} 
                link="/search?types=movie&yfrom=1990&yto=1999"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
